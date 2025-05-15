import { Injectable, OnDestroy, NgZone, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Participant {
  id: string;       // From CSV: ID
  name: string;     // From CSV: Ad
  surname: string;  // From CSV: Soyad
  company?: string;  // From CSV: Sirket
  position?: string; // From CSV: Pozisyon
  mezunYil?: string; // From CSV: MezunYil
  mail?: string;     // From CSV: Mail
  telefon?: string;  // From CSV: Telefon
  kartId?: string;   // From CSV: KartID
}

export type RaffleState = 'idle' | 'running' | 'winner_revealed';

const LS_PARTICIPANTS_KEY = 'raffle_participants';
const LS_RAFFLE_STATE_KEY = 'raffle_state';
const LS_WINNER_KEY = 'raffle_winner';
const LS_LANDING_TITLE_PREFIX_KEY = 'raffle_landing_title_prefix';
const LS_LANDING_TITLE_SUFFIX_KEY = 'raffle_landing_title_suffix';

@Injectable({
  providedIn: 'root'
})
export class RaffleService implements OnDestroy {
  private namesSubject: BehaviorSubject<Participant[]>;
  names$: Observable<Participant[]>;

  private raffleStateSubject: BehaviorSubject<RaffleState>;
  raffleState$: Observable<RaffleState>;

  private winnerSubject: BehaviorSubject<Participant | null>;
  winner$: Observable<Participant | null>;

  private landingPageTitlePrefixSubject: BehaviorSubject<string>;
  landingPageTitlePrefix$: Observable<string>;

  private landingPageTitleSuffixSubject: BehaviorSubject<string>;
  landingPageTitleSuffix$: Observable<string>;

  private isBrowser: boolean;

  constructor(private ngZone: NgZone, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    // Initialize from LocalStorage or defaults
    this.namesSubject = new BehaviorSubject<Participant[]>(this.loadFromLocalStorage(LS_PARTICIPANTS_KEY, []));
    this.names$ = this.namesSubject.asObservable();

    this.raffleStateSubject = new BehaviorSubject<RaffleState>(this.loadFromLocalStorage(LS_RAFFLE_STATE_KEY, 'idle'));
    this.raffleState$ = this.raffleStateSubject.asObservable();

    this.winnerSubject = new BehaviorSubject<Participant | null>(this.loadFromLocalStorage(LS_WINNER_KEY, null));
    this.winner$ = this.winnerSubject.asObservable();

    this.landingPageTitlePrefixSubject = new BehaviorSubject<string>(this.loadFromLocalStorage(LS_LANDING_TITLE_PREFIX_KEY, ''));
    this.landingPageTitlePrefix$ = this.landingPageTitlePrefixSubject.asObservable();

    this.landingPageTitleSuffixSubject = new BehaviorSubject<string>(this.loadFromLocalStorage(LS_LANDING_TITLE_SUFFIX_KEY, ''));
    this.landingPageTitleSuffix$ = this.landingPageTitleSuffixSubject.asObservable();

    // Listen to storage events from other tabs
    if (this.isBrowser) {
      window.addEventListener('storage', this.handleStorageChange.bind(this));
    }
  }

  private loadFromLocalStorage<T>(key: string, defaultValue: T): T {
    if (this.isBrowser && window.localStorage) {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    }
    return defaultValue;
  }

  private saveToLocalStorage<T>(key: string, value: T): void {
    if (this.isBrowser && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }

  private handleStorageChange(event: StorageEvent): void {
    if (!this.isBrowser) return; // Should not be called on server anyway, but as a safeguard
    this.ngZone.run(() => { // Ensure updates run in Angular's zone
      if (event.key === LS_PARTICIPANTS_KEY && event.newValue) {
        const newNames = JSON.parse(event.newValue);
        if (JSON.stringify(this.namesSubject.value) !== JSON.stringify(newNames)) {
          this.namesSubject.next(newNames);
        }
      } else if (event.key === LS_RAFFLE_STATE_KEY && event.newValue) {
        const newState = JSON.parse(event.newValue) as RaffleState;
        if (this.raffleStateSubject.value !== newState) {
          this.raffleStateSubject.next(newState);
        }
      } else if (event.key === LS_WINNER_KEY) { // event.newValue can be null for removed items
        const newWinner = event.newValue ? JSON.parse(event.newValue) : null;
        if (JSON.stringify(this.winnerSubject.value) !== JSON.stringify(newWinner)) {
          this.winnerSubject.next(newWinner);
        }
      } else if (event.key === LS_LANDING_TITLE_PREFIX_KEY && event.newValue !== null) {
        const newPrefix = JSON.parse(event.newValue);
        if (this.landingPageTitlePrefixSubject.value !== newPrefix) {
          this.landingPageTitlePrefixSubject.next(newPrefix);
        }
      } else if (event.key === LS_LANDING_TITLE_SUFFIX_KEY && event.newValue !== null) {
        const newSuffix = JSON.parse(event.newValue);
        if (this.landingPageTitleSuffixSubject.value !== newSuffix) {
          this.landingPageTitleSuffixSubject.next(newSuffix);
        }
      }
    });
  }

  addNames(newNames: Participant[]): void {
    const currentNames = this.namesSubject.value;
    const updatedNames = [...currentNames, ...newNames.filter(nn => !currentNames.some(cn => cn.name === nn.name && cn.surname === nn.surname))]; // Avoid duplicates
    this.namesSubject.next(updatedNames);
    this.saveToLocalStorage(LS_PARTICIPANTS_KEY, updatedNames);
  }

  clearNames(): void {
    this.namesSubject.next([]);
    this.saveToLocalStorage(LS_PARTICIPANTS_KEY, []);
    this.winnerSubject.next(null); // Also clear winner
    this.saveToLocalStorage(LS_WINNER_KEY, null);
    this.setRaffleState('idle'); // This will also save state to LS
  }

  setRaffleState(state: RaffleState): void {
    this.raffleStateSubject.next(state);
    this.saveToLocalStorage(LS_RAFFLE_STATE_KEY, state);
  }

  startRaffle(): void {
    if (this.namesSubject.value.length === 0) {
      console.warn("Cannot start raffle with no participants.");
      // Optionally, alert the user or set an error state
      return;
    }
    this.winnerSubject.next(null);
    this.saveToLocalStorage(LS_WINNER_KEY, null);
    this.setRaffleState('running');
  }

  selectWinner(): void {
    const names = this.namesSubject.value;
    if (names.length > 0) {
      const randomIndex = Math.floor(Math.random() * names.length);
      const winner = names[randomIndex];
      this.winnerSubject.next(winner);
      this.saveToLocalStorage(LS_WINNER_KEY, winner);
      this.setRaffleState('winner_revealed');
    }
  }

  resetRaffle(): void {
    this.clearNames();
    // setRaffleState('idle') is called within clearNames
  }

  resetRaffleStateAndWinner(): void {
    this.winnerSubject.next(null);
    this.saveToLocalStorage(LS_WINNER_KEY, null);
    this.setRaffleState('idle'); // This will also save state to LS
  }

  setLandingPageTitlePrefix(prefix: string): void {
    this.landingPageTitlePrefixSubject.next(prefix);
    this.saveToLocalStorage(LS_LANDING_TITLE_PREFIX_KEY, prefix);
  }

  setLandingPageTitleSuffix(suffix: string): void {
    this.landingPageTitleSuffixSubject.next(suffix);
    this.saveToLocalStorage(LS_LANDING_TITLE_SUFFIX_KEY, suffix);
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('storage', this.handleStorageChange.bind(this));
    }
  }
}
