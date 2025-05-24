import { Injectable, OnDestroy, NgZone, PLATFORM_ID, Inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Participant {
  id: string;       // From CSV: ID
  name: string;     // From CSV: Ad
  surname: string;  // From CSV: Soyad
  company?: string;  // From CSV: Sirket
  position?: string; // From CSV: Pozisyon
  mezunYil?: number; // From CSV: MezunYil
  mail?: string;     // From CSV: Mail
  telefon?: string;  // From CSV: Telefon
  kartId?: string;   // From CSV: KartID
}

export type RaffleState = 'idle' | 'running' | 'winner_revealed';
export type NameStyle = 'normal' | 'win95' | 'codeEditor' | 'blueprint' | 'circuitBoard' | 'versionControl';

const LS_PARTICIPANTS_KEY = 'raffle_participants';
const LS_RAFFLE_STATE_KEY = 'raffle_state';
const LS_WINNER_KEY = 'raffle_winner';
const LS_LANDING_TITLE_PREFIX_KEY = 'raffle_landing_title_prefix';
const LS_LANDING_TITLE_SUFFIX_KEY = 'raffle_landing_title_suffix';
const LS_NAME_STYLE_KEY = 'raffle_name_style';
const LS_NAMES_VISIBLE_KEY = 'raffle_names_visible';

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

  private nameStyleSubject: BehaviorSubject<NameStyle>;
  nameStyle$: Observable<NameStyle>;

  private namesVisibleSubject: BehaviorSubject<boolean>;
  namesVisible$: Observable<boolean>;

  private isBrowser: boolean;

  constructor(private ngZone: NgZone, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);

    const loadedNames = this.loadFromLocalStorage(LS_PARTICIPANTS_KEY, [] as Participant[]);
    this.namesSubject = new BehaviorSubject<Participant[]>(loadedNames.map(p => this.formatParticipantName(p)));
    this.names$ = this.namesSubject.asObservable();

    this.raffleStateSubject = new BehaviorSubject<RaffleState>(this.loadFromLocalStorage(LS_RAFFLE_STATE_KEY, 'idle'));
    this.raffleState$ = this.raffleStateSubject.asObservable();

    this.winnerSubject = new BehaviorSubject<Participant | null>(this.loadFromLocalStorage(LS_WINNER_KEY, null));
    this.winner$ = this.winnerSubject.asObservable();

    this.landingPageTitlePrefixSubject = new BehaviorSubject<string>(this.loadFromLocalStorage(LS_LANDING_TITLE_PREFIX_KEY, ''));
    this.landingPageTitlePrefix$ = this.landingPageTitlePrefixSubject.asObservable();

    this.landingPageTitleSuffixSubject = new BehaviorSubject<string>(this.loadFromLocalStorage(LS_LANDING_TITLE_SUFFIX_KEY, ''));
    this.landingPageTitleSuffix$ = this.landingPageTitleSuffixSubject.asObservable();

    this.nameStyleSubject = new BehaviorSubject<NameStyle>(this.loadFromLocalStorage(LS_NAME_STYLE_KEY, 'normal'));
    this.nameStyle$ = this.nameStyleSubject.asObservable();

    this.namesVisibleSubject = new BehaviorSubject<boolean>(this.loadFromLocalStorage(LS_NAMES_VISIBLE_KEY, true));
    this.namesVisible$ = this.namesVisibleSubject.asObservable();

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
    if (!this.isBrowser) return;
    this.ngZone.run(() => {
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
      } else if (event.key === LS_NAME_STYLE_KEY && event.newValue) {
        const newStyle = JSON.parse(event.newValue) as NameStyle;
        if (this.nameStyleSubject.value !== newStyle) {
          this.nameStyleSubject.next(newStyle);
        }
      } else if (event.key === LS_NAMES_VISIBLE_KEY && event.newValue !== null) {
        const newVisibility = JSON.parse(event.newValue);
        if (this.namesVisibleSubject.value !== newVisibility) {
          this.namesVisibleSubject.next(newVisibility);
        }
      }
    });
  }

  private formatNameString(name: string): string {
    if (!name || name.length === 0) return '';
    return name
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  private formatSurnameString(surname: string): string {
    if (!surname || surname.length === 0) return '';
    return surname.toUpperCase();
  }

  private formatParticipantName(participant: Participant): Participant {
    return {
      ...participant,
      name: this.formatNameString(participant.name),
      surname: this.formatSurnameString(participant.surname),
    };
  }

  addNames(newNames: Participant[]): void {
    const currentNames = this.namesSubject.value;
    const formattedNewNames = newNames.map(p => this.formatParticipantName(p));
    const updatedNames = [
      ...currentNames,
      ...formattedNewNames.filter(nn =>
        !currentNames.some(cn =>
          cn.name === nn.name && cn.surname === nn.surname
        )
      )
    ];
    this.namesSubject.next(updatedNames);
    this.saveToLocalStorage(LS_PARTICIPANTS_KEY, updatedNames);
  }

  setParticipants(participants: Participant[]): void {
    const formattedParticipants = participants.map(p => this.formatParticipantName(p));
    this.namesSubject.next(formattedParticipants);
    this.saveToLocalStorage(LS_PARTICIPANTS_KEY, formattedParticipants);
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

  setNameStyle(style: NameStyle): void {
    this.nameStyleSubject.next(style);
    this.saveToLocalStorage(LS_NAME_STYLE_KEY, style);
  }

  toggleNamesVisibility(): void {
    const currentVisibility = this.namesVisibleSubject.value;
    this.namesVisibleSubject.next(!currentVisibility);
    this.saveToLocalStorage(LS_NAMES_VISIBLE_KEY, !currentVisibility);
  }

  setNamesVisibility(visible: boolean): void {
    this.namesVisibleSubject.next(visible);
    this.saveToLocalStorage(LS_NAMES_VISIBLE_KEY, visible);
  }

  ngOnDestroy(): void {
    if (this.isBrowser) {
      window.removeEventListener('storage', this.handleStorageChange.bind(this));
    }
  }
}
