import { Component, ElementRef, ViewChild, OnInit, OnDestroy, AfterViewInit, NgZone, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, NavigationEnd } from '@angular/router';
import { filter, Subscription, delay, tap } from 'rxjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  standalone: false,
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit, OnDestroy, AfterViewInit {
  title = 'raffle-app';
  showVideoBackground = false; // Initialize to false, let router decide
  private routerSubscription!: Subscription;
  private videoEventSubscriptions: (() => void)[] = [];

  private _videoElementRef?: ElementRef<HTMLVideoElement>;
  @ViewChild('appBackgroundVideo') set videoElementRef(el: ElementRef<HTMLVideoElement> | undefined) {
    this._videoElementRef = el;
    if (el) {
      this.videoElement = el.nativeElement;
      // If video is meant to be shown and element is now available, init playback
      if (this.isBrowser && this.showVideoBackground) {
        this.ngZone.runOutsideAngular(() => { // Give DOM a moment
            setTimeout(() => this.initVideoPlayback(), 0);
        });
      }
    } else {
      this.videoElement = undefined; // Element removed from DOM
      this.clearVideoEventListeners();
    }
  }
  private videoElement?: HTMLVideoElement;

  @ViewChild('videoOverlay') private videoOverlayRef?: ElementRef<HTMLDivElement>;
  private videoOverlayElement?: HTMLDivElement;

  private readonly videoStartTime = 15;
  private readonly videoEndTimeOffset = 4;
  private readonly fadeDuration = 1000; // milliseconds (1 second)
  private isVideoPlaying = false;
  private isBrowser: boolean;
  private fadeTimeout: any;

  constructor(
    private router: Router,
    private ngZone: NgZone,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return; // No router events or video logic on server

    this.routerSubscription = this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      tap(event => {
        const shouldShow = !event.urlAfterRedirects.startsWith('/admin');
        if (this.showVideoBackground !== shouldShow) {
            this.showVideoBackground = shouldShow;
            if (!shouldShow && this.videoElement) {
                this.videoElement.pause();
                this.isVideoPlaying = false;
                // Video element will be removed by *ngIf, ViewChild setter handles listener cleanup
            }
            // If shouldShow is true, the ViewChild setter will handle initVideoPlayback when the element appears
        }
      })
    ).subscribe();

    // Initial route check
    const initialShouldShow = !this.router.url.startsWith('/admin');
    if (this.showVideoBackground !== initialShouldShow) {
        this.showVideoBackground = initialShouldShow;
    }
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    if (this.videoOverlayRef) {
      this.videoOverlayElement = this.videoOverlayRef.nativeElement;
    }

    if (this.showVideoBackground && this.videoElement) {
      this.ngZone.runOutsideAngular(() => {
        setTimeout(() => this.initVideoPlayback(), 0);
      });
    }
  }

  private setOverlayOpacity(opacity: number): void {
    if (this.videoOverlayElement) {
      this.videoOverlayElement.style.opacity = opacity.toString();
    }
  }

  private initVideoPlayback(): void {
    if (!this.isBrowser || !this.videoElement) {
      return;
    }
    if (!this.videoOverlayElement && this.videoOverlayRef) { // Ensure overlay element is set if ref is available
        this.videoOverlayElement = this.videoOverlayRef.nativeElement;
    }

    this.clearVideoEventListeners();
    const video = this.videoElement;
    this.isVideoPlaying = false;
    clearTimeout(this.fadeTimeout); // Clear any pending fade timeouts

    const onLoadedMetadata = () => {
      const currentVideoDuration = video.duration || 0; // Use 0 if duration is undefined/NaN initially

      const targetStartTime = this.videoStartTime;
      const targetEndTime = currentVideoDuration - this.videoEndTimeOffset;
      let actualStartTime = 0;

      if (!currentVideoDuration) {
        console.warn("Video duration is not available or 0 when metadata loaded. Attempting to play from the beginning.");
        actualStartTime = 0;
      } else if (targetEndTime <= 0) {
        console.warn(`Video duration (${currentVideoDuration}s) is too short for defined end offset (${this.videoEndTimeOffset}s). Playing from beginning to actual end.`);
        actualStartTime = 0;
      } else if (targetStartTime >= targetEndTime) {
        console.warn(`Video start time (${targetStartTime}s) is at or after the effective end point (${targetEndTime}s based on duration ${currentVideoDuration}s). Playing from 0 to effective end.`);
        actualStartTime = 0;
      } else {
        actualStartTime = targetStartTime;
      }

      video.currentTime = actualStartTime;

      this.setOverlayOpacity(1); // Start with black screen

      video.play().then(() => {
        this.isVideoPlaying = true;
        this.fadeTimeout = setTimeout(() => this.setOverlayOpacity(0), 50); // Fade to transparent
      }).catch(error => {
        console.error(`Error trying to play video from time ${video.currentTime} (duration: ${currentVideoDuration}s):`, error);
        this.isVideoPlaying = false;
        this.setOverlayOpacity(0); // Ensure overlay is clear if play fails
      });
    };

    const onTimeUpdate = () => {
      if (!this.isVideoPlaying || !video.duration || !this.videoElement) return;

      const targetStartTime = this.videoStartTime;
      const targetEndTime = video.duration - this.videoEndTimeOffset;
      let loopToTime = 0;
      let effectiveLoopPoint = video.duration - 0.1;

      if (targetEndTime <= 0) {
        loopToTime = 0;
      } else if (targetStartTime >= targetEndTime) {
        loopToTime = 0;
        effectiveLoopPoint = targetEndTime - 0.1;
      } else {
        loopToTime = targetStartTime;
        effectiveLoopPoint = targetEndTime - 0.1;
      }
      if (effectiveLoopPoint < 0) effectiveLoopPoint = 0;

      // Start fade-out 1 second before the loop point
      if (video.currentTime >= effectiveLoopPoint - (this.fadeDuration / 1000) && video.currentTime < effectiveLoopPoint) {
        if (this.videoOverlayElement && parseFloat(this.videoOverlayElement.style.opacity || '0') < 1) {
            this.setOverlayOpacity(1);
        }
      }

      if (video.currentTime >= effectiveLoopPoint) {
        // Ensure overlay is fully black before loop
        this.setOverlayOpacity(1);
        video.currentTime = loopToTime;
        video.play().then(() => {
          // Fade to transparent again after loop/play starts
          this.fadeTimeout = setTimeout(() => this.setOverlayOpacity(0), 50);
        }).catch(error => {
          console.error("Error re-playing video after loop:", error);
          this.setOverlayOpacity(0); // Clear overlay if replay fails
        });
      }
    };

    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('timeupdate', onTimeUpdate);

    this.videoEventSubscriptions.push(() => video.removeEventListener('loadedmetadata', onLoadedMetadata));
    this.videoEventSubscriptions.push(() => video.removeEventListener('timeupdate', onTimeUpdate));

    if (video.readyState >= 2) { // HAVE_METADATA or greater
        // console.log("Video metadata already loaded (readyState >= 2), manually triggering onLoadedMetadata.");
        onLoadedMetadata();
    } else {
        // console.log("Video metadata not ready, calling video.load()");
        // video.load(); // video.load() is not needed if <source> changes or for initial load with `muted`
    }
  }

  private clearVideoEventListeners(): void {
    // console.log("Clearing video event listeners. Count:", this.videoEventSubscriptions.length);
    this.videoEventSubscriptions.forEach(unlisten => unlisten());
    this.videoEventSubscriptions = [];
  }

  ngOnDestroy(): void {
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    this.clearVideoEventListeners();
    if (this.isBrowser && this.videoElement) {
        try {
            this.videoElement.pause();
        } catch (e) {
            console.warn("Error pausing video on destroy:", e);
        }
    }
  }
}
