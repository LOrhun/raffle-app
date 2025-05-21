import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.css'],
  standalone: false
})
export class SlideshowComponent implements OnInit {
  @ViewChild('videoPlayer') videoPlayer!: ElementRef<HTMLVideoElement>;

  // Replace this URL with your Google Drive video URL
  videoUrl: string = 'https://drive.google.com/file/d/0BwHmtM9HI_CSQ3BjVlpQNVJkdUk/view?usp=sharing&resourcekey=0-FulSdv2nrfdkJ7w9nBfeMg';

  ngOnInit() {
    // Initialize component
  }

  ngAfterViewInit() {
    // Set up video loop
    const video = this.videoPlayer.nativeElement;
    video.loop = true;
    video.play().catch(error => {
      console.error('Error playing video:', error);
    });
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
