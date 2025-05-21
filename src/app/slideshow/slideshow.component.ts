import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SlideshowService, SlideshowSource } from './slideshow.service';
import { Subscription } from 'rxjs';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';

@Component({
  selector: 'app-slideshow',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="slideshow-container">
      <!-- Local Video -->
      <div *ngIf="currentSource && currentSourceType === 'local'" class="video-wrapper">
        <video
          #videoPlayer
          [src]="currentSource"
          [playbackRate]="playbackSpeed"
          autoplay
          loop
          muted
          playsinline
          disablePictureInPicture
          disableRemotePlayback
          class="slideshow-video"
          (ended)="onVideoEnded()"
          (contextmenu)="$event.preventDefault()"
          (keydown)="$event.preventDefault()"
        ></video>
      </div>

      <!-- YouTube Video -->
      <div *ngIf="currentSource && currentSourceType === 'youtube'" class="video-wrapper">
        <iframe
          [src]="currentSource"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
          class="slideshow-video"
          (contextmenu)="$event.preventDefault()"
          (keydown)="$event.preventDefault()"
        ></iframe>
      </div>

      <!-- Google Drive Video -->
      <div *ngIf="currentSource && currentSourceType === 'drive'" class="video-wrapper">
        <video
          #videoPlayer
          [src]="currentSource"
          [playbackRate]="playbackSpeed"
          autoplay
          loop
          muted
          playsinline
          disablePictureInPicture
          disableRemotePlayback
          class="slideshow-video"
          (ended)="onVideoEnded()"
          (contextmenu)="$event.preventDefault()"
          (keydown)="$event.preventDefault()"
        ></video>
      </div>
    </div>
  `,
  styles: [`
    .slideshow-container {
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      position: fixed;
      top: 0;
      left: 0;
      background: #000;
    }
    .video-wrapper {
      width: 100%;
      height: 100%;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .slideshow-video {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  `]
})
export class SlideshowComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  currentSource: string | SafeResourceUrl | null = null;
  currentSourceType: 'local' | 'youtube' | 'drive' | null = null;
  playbackSpeed: number = 1;
  private currentSourceIndex: number = 0;
  private subscription: Subscription = new Subscription();

  constructor(
    private slideshowService: SlideshowService,
    private sanitizer: DomSanitizer
  ) {}

  ngOnInit() {
    this.subscription.add(
      this.slideshowService.sources$.subscribe((sources: SlideshowSource[]) => {
        if (sources.length > 0) {
          this.playNextSource(sources);
        }
      })
    );

    this.subscription.add(
      this.slideshowService.playbackSpeed$.subscribe((speed: number) => {
        this.playbackSpeed = speed;
        if (this.videoPlayer?.nativeElement) {
          this.videoPlayer.nativeElement.playbackRate = speed;
        }
      })
    );

    // Prevent keyboard shortcuts and context menu
    document.addEventListener('keydown', this.preventKeyboardShortcuts);
    document.addEventListener('contextmenu', this.preventContextMenu);
  }

  ngAfterViewInit() {
    if (this.videoPlayer?.nativeElement) {
      this.videoPlayer.nativeElement.playbackRate = this.playbackSpeed;
    }
  }

  private playNextSource(sources: SlideshowSource[]) {
    if (sources.length === 0) return;

    const source = sources[this.currentSourceIndex];
    this.currentSourceType = source.type;

    if (source.type === 'youtube') {
      const processedUrl = this.slideshowService.getProcessedUrl(source);
      this.currentSource = this.sanitizer.bypassSecurityTrustResourceUrl(processedUrl);
    } else {
      this.currentSource = this.slideshowService.getProcessedUrl(source);
    }

    this.currentSourceIndex = (this.currentSourceIndex + 1) % sources.length;
  }

  onVideoEnded() {
    this.slideshowService.sources$.subscribe((sources: SlideshowSource[]) => {
      if (sources.length > 0) {
        this.playNextSource(sources);
      }
    });
  }

  private preventKeyboardShortcuts = (event: KeyboardEvent) => {
    // Prevent space bar, arrow keys, and other common media control keys
    if ([' ', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'k', 'm'].includes(event.key)) {
      event.preventDefault();
    }
  };

  private preventContextMenu = (event: MouseEvent) => {
    event.preventDefault();
  };

  ngOnDestroy() {
    this.subscription.unsubscribe();
    document.removeEventListener('keydown', this.preventKeyboardShortcuts);
    document.removeEventListener('contextmenu', this.preventContextMenu);
  }
}
