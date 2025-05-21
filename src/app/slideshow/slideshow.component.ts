import { Component, OnInit, ElementRef, ViewChild, OnDestroy } from '@angular/core';
import { VideoService, VideoSource } from '../services/video.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.css'],
  standalone: false
})
export class SlideshowComponent implements OnInit, OnDestroy {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;
  @ViewChild('youtubeFrame') youtubeFrame!: ElementRef<HTMLIFrameElement>;

  currentSource: VideoSource;
  private subscription: Subscription;

  constructor(private videoService: VideoService) {
    this.currentSource = this.videoService.getVideoSource();
    this.subscription = new Subscription();
  }

  ngOnInit() {
    this.subscription.add(
      this.videoService.getVideoSource().subscribe(source => {
        this.currentSource = source;
        this.updateVideoSource();
      })
    );
  }

  ngAfterViewInit() {
    this.updateVideoSource();
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private updateVideoSource() {
    if (this.currentSource.type === 'youtube') {
      this.setupYoutubeVideo();
    } else {
      this.setupRegularVideo();
    }
  }

  private setupYoutubeVideo() {
    if (this.youtubeFrame) {
      const processedUrl = this.videoService.processVideoUrl(this.currentSource);
      this.youtubeFrame.nativeElement.src = processedUrl;
    }
  }

  private setupRegularVideo() {
    if (this.videoPlayer) {
      const video = this.videoPlayer.nativeElement;
      video.src = this.videoService.processVideoUrl(this.currentSource);
      video.playbackRate = this.currentSource.playbackSpeed;
      video.loop = true;
      video.play().catch(error => {
        console.error('Error playing video:', error);
      });
    }
  }

  // Method to get the direct video URL from Google Drive
  getDirectVideoUrl(shareUrl: string): string {
    // Extract the file ID from the Google Drive share URL
    const fileId = shareUrl.match(/[-\w]{25,}/);
    if (fileId) {
      // Return the direct video URL format
      return `https://drive.google.com/uc?export=view&id=${fileId[0]}`;
    }
    return shareUrl;
  }
}
