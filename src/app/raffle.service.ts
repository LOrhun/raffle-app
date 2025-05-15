import { Injectable, OnDestroy, NgZone } from '@angular/core';
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

  constructor(private ngZone: NgZone) {
    // Initialize from LocalStorage or defaults
    this.namesSubject = new BehaviorSubject<Participant[]>(this.loadFromLocalStorage(LS_PARTICIPANTS_KEY, []));
    this.names$ = this.namesSubject.asObservable();

    this.raffleStateSubject = new BehaviorSubject<RaffleState>(this.loadFromLocalStorage(LS_RAFFLE_STATE_KEY, 'idle'));
    this.raffleState$ = this.raffleStateSubject.asObservable();

    this.winnerSubject = new BehaviorSubject<Participant | null>(this.loadFromLocalStorage(LS_WINNER_KEY, null));
    this.winner$ = this.winnerSubject.asObservable();

    // Listen to storage events from other tabs
    window.addEventListener('storage', this.handleStorageChange.bind(this));
  }

  private loadFromLocalStorage<T>(key: string, defaultValue: T): T {
    if (typeof window !== 'undefined' && window.localStorage) {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    }
    return defaultValue;
  }

  private saveToLocalStorage<T>(key: string, value: T): void {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(value));
    }
  }

  private handleStorageChange(event: StorageEvent): void {
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

  ngOnDestroy(): void {
    window.removeEventListener('storage', this.handleStorageChange.bind(this));
  }
}
