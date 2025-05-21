import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface SlideshowSource {
  type: 'local' | 'youtube' | 'drive';
  url: string;
  name: string;
}

@Injectable({
  providedIn: 'root'
})
export class SlideshowService {
  private currentSourceSubject = new BehaviorSubject<string | null>(null);
  private playbackSpeedSubject = new BehaviorSubject<number>(1);
  private sourcesSubject = new BehaviorSubject<SlideshowSource[]>([]);

  currentSource$: Observable<string | null> = this.currentSourceSubject.asObservable();
  playbackSpeed$: Observable<number> = this.playbackSpeedSubject.asObservable();
  sources$: Observable<SlideshowSource[]> = this.sourcesSubject.asObservable();

  constructor() {
    // Load saved sources from localStorage if available
    const savedSources = localStorage.getItem('slideshowSources');
    if (savedSources) {
      this.sourcesSubject.next(JSON.parse(savedSources));
    }

    // Load saved playback speed if available
    const savedSpeed = localStorage.getItem('slideshowSpeed');
    if (savedSpeed) {
      this.playbackSpeedSubject.next(parseFloat(savedSpeed));
    }
  }

  setCurrentSource(source: string | null): void {
    this.currentSourceSubject.next(source);
  }

  setPlaybackSpeed(speed: number): void {
    this.playbackSpeedSubject.next(speed);
    localStorage.setItem('slideshowSpeed', speed.toString());
  }

  addSource(source: SlideshowSource): void {
    const currentSources = this.sourcesSubject.value;
    this.sourcesSubject.next([...currentSources, source]);
    localStorage.setItem('slideshowSources', JSON.stringify([...currentSources, source]));
  }

  removeSource(index: number): void {
    const currentSources = this.sourcesSubject.value;
    const newSources = currentSources.filter((_, i) => i !== index);
    this.sourcesSubject.next(newSources);
    localStorage.setItem('slideshowSources', JSON.stringify(newSources));
  }

  getProcessedUrl(source: SlideshowSource): string {
    switch (source.type) {
      case 'youtube':
        // Convert YouTube URL to embed URL with restrictive parameters
        const videoId = this.extractYouTubeId(source.url);
        return `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=0&loop=1&playlist=${videoId}&mute=1&disablekb=1&fs=0&modestbranding=1&rel=0&showinfo=0&iv_load_policy=3&playsinline=1&enablejsapi=0`;
      case 'drive':
        // Convert Google Drive URL to direct download URL
        return this.convertDriveUrl(source.url);
      default:
        return source.url;
    }
  }

  private extractYouTubeId(url: string): string {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : '';
  }

  private convertDriveUrl(url: string): string {
    // Convert Google Drive sharing URL to direct download URL
    const fileId = url.match(/[-\w]{25,}/);
    return fileId ? `https://drive.google.com/uc?export=download&id=${fileId[0]}` : url;
  }
}
