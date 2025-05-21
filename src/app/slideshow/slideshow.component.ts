import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.css'],
  standalone: false
})
export class SlideshowComponent implements OnInit {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  // Replace this with your Google Drive video ID
  private readonly DRIVE_VIDEO_ID = '1CUs5W8RCeL8AOA0qBgqI8GiXfTrfM0Kp';
  videoUrl: string = '';

  ngOnInit() {
    // Convert Google Drive sharing link to direct download link
    this.videoUrl = `https://drive.google.com/uc?export=download&id=${this.DRIVE_VIDEO_ID}`;
  }

  ngAfterViewInit() {
    // Set up video loop
    const video = this.videoPlayer.nativeElement;
    video.loop = true;
    video.play().catch(error => {
      console.error('Error playing video:', error);
    });
  }
}
