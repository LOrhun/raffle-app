import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface VideoSource {
  type: 'local' | 'youtube' | 'drive';
  url: string;
  playbackSpeed: number;
}

@Injectable({
  providedIn: 'root'
})
export class VideoService {
  private currentSource = new BehaviorSubject<VideoSource>({
    type: 'local',
    url: '',
    playbackSpeed: 1
  });

  constructor() { }

  setVideoSource(source: VideoSource) {
    this.currentSource.next(source);
  }

  getVideoSource() {
    return this.currentSource.asObservable();
  }

  processVideoUrl(source: VideoSource): string {
    switch (source.type) {
      case 'youtube':
        return this.processYoutubeUrl(source.url);
      case 'drive':
        return this.processDriveUrl(source.url);
      default:
        return source.url;
    }
  }

  private processYoutubeUrl(url: string): string {
    // Extract video ID from various YouTube URL formats
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return match && match[2].length === 11 ?
      `https://www.youtube.com/embed/${match[2]}?autoplay=1&loop=1&playlist=${match[2]}&mute=1` :
      url;
  }

  private processDriveUrl(url: string): string {
    const fileId = url.match(/[-\w]{25,}/);
    return fileId ? `https://drive.google.com/uc?export=view&id=${fileId[0]}` : url;
  }
}
