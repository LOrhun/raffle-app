import { Component, OnInit, OnDestroy, ChangeDetectorRef, NgZone } from '@angular/core';
import { RaffleService, Participant, RaffleState } from '../raffle.service';
import { Subscription } from 'rxjs';

interface BackgroundNameDisplay {
  text: string;
  x: number;
  y: number;
  opacity: number;
  id: number;
}

@Component({
  selector: 'app-landing',
  standalone: false,
  templateUrl: './landing.component.html',
  styleUrls: ['./landing.component.css']
})
export class LandingComponent implements OnInit, OnDestroy {
  bigTextVisible = true;
  participants: Participant[] = [];
  raffleState: RaffleState = 'idle';
  winner: Participant | null = null;

  backgroundNames: BackgroundNameDisplay[] = [];
  private nameDisplayInterval: any; // For 'idle' state interval
  private raffleRunTimeout: any; // For selecting winner
  private nextNameId = 0;

  // Properties for accelerating name spawn
  private currentNameSpawnInterval = 200; // ms
  private readonly minNameSpawnInterval = 30; // ms, fastest spawn rate
  private readonly initialNameSpawnIntervalRunning = 200; // ms, starting spawn rate for 'running'
  private readonly nameSpawnIntervalDecrement = 5; // ms, how much to decrease interval by each step
  private nameSpawnAccelerationTimeout: any; // Holds the setTimeout for accelerating spawn

  private subscriptions = new Subscription();

  constructor(
    private raffleService: RaffleService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.subscriptions.add(
      this.raffleService.names$.subscribe(names => {
        this.participants = names;
        if (this.raffleState === 'idle' && this.participants.length > 0 && !this.nameDisplayInterval && !this.nameSpawnAccelerationTimeout) {
          this.startDisplayingBackgroundNames();
        }
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.add(
      this.raffleService.raffleState$.subscribe(state => {
        const previousState = this.raffleState;
        this.raffleState = state;
        this.clearTimersAndBackgroundNames();

        if (state === 'running') {
          this.bigTextVisible = false;
          this.startDisplayingBackgroundNames();

          this.ngZone.runOutsideAngular(() => {
            this.raffleRunTimeout = setTimeout(() => {
              this.ngZone.run(() => {
                this.raffleService.selectWinner();
              });
            }, 10000);
          });

        } else if (state === 'winner_revealed') {
          this.bigTextVisible = false;
          if (this.participants.length > 0) {
            this.startDisplayingBackgroundNames();
          }
        } else if (state === 'idle') {
          this.bigTextVisible = true;
          if (this.participants.length > 0) {
            this.startDisplayingBackgroundNames();
          }
        }
        this.cdr.detectChanges();
      })
    );

    this.subscriptions.add(
      this.raffleService.winner$.subscribe(winner => {
        this.winner = winner;
        this.cdr.detectChanges();
      })
    );
  }

  trackById(index: number, item: BackgroundNameDisplay): number {
    return item.id;
  }

  private startDisplayingBackgroundNames(): void {
    this.clearTimersAndBackgroundNames();

    if (this.raffleState === 'running') {
      this.currentNameSpawnInterval = this.initialNameSpawnIntervalRunning;
      this.scheduleAcceleratingNameSpawn();
    } else if ((this.raffleState === 'idle' || this.raffleState === 'winner_revealed') && this.participants.length > 0) {
      this.ngZone.runOutsideAngular(() => {
        this.nameDisplayInterval = setInterval(() => {
          this.ngZone.run(() => {
            this.addRandomName();
          });
        }, 600);
      });
    }
  }

  private scheduleAcceleratingNameSpawn(): void {
    if (this.raffleState !== 'running') return; // Stop if state changes

    this.ngZone.run(() => {
        this.addRandomName();
    });

    this.currentNameSpawnInterval = Math.max(
      this.minNameSpawnInterval,
      this.currentNameSpawnInterval - this.nameSpawnIntervalDecrement
    );

    this.ngZone.runOutsideAngular(() => {
      this.nameSpawnAccelerationTimeout = setTimeout(() => {
        this.scheduleAcceleratingNameSpawn();
      }, this.currentNameSpawnInterval);
    });
  }

  private addRandomName(): void {
    if (this.participants.length === 0) return;

    const randomIndex = Math.floor(Math.random() * this.participants.length);
    const participant = this.participants[randomIndex];
    const nameId = this.nextNameId++;

    let displayName = `${participant.name} ${participant.surname}`;
    if (participant.mezunYil) {
      displayName += ` (${participant.mezunYil})`;
    }

    const newName: BackgroundNameDisplay = {
      text: displayName,
      x: Math.random() * 90,
      y: Math.random() * 90,
      opacity: 0,
      id: nameId,
    };
    this.backgroundNames.push(newName);
    this.cdr.detectChanges();

    setTimeout(() => {
      const nameToShow = this.backgroundNames.find(n => n.id === nameId);
      if (nameToShow) {
        nameToShow.opacity = 1;
        this.cdr.detectChanges();
      }
    }, 30);

    const maxNames = this.raffleState === 'running' ? 60 : 25;
    if (this.backgroundNames.length > maxNames) {
      this.backgroundNames.shift();
    }

    const visibleDuration = this.raffleState === 'running' ? 500 : 2500;
    const timeUntilFadeOutStarts = 1000 + visibleDuration;

    this.ngZone.runOutsideAngular(() => {
      setTimeout(() => {
        this.ngZone.run(() => {
          const nameToFade = this.backgroundNames.find(n => n.id === nameId);
          if (nameToFade) {
            nameToFade.opacity = 0;
            this.cdr.detectChanges();
            setTimeout(() => {
              this.ngZone.run(() => {
                this.backgroundNames = this.backgroundNames.filter(n => n.id !== nameId);
                this.cdr.detectChanges();
              });
            }, 1000);
          }
        });
      }, timeUntilFadeOutStarts);
    });
  }

  private clearTimersAndBackgroundNames(): void {
    if (this.nameDisplayInterval) {
      clearInterval(this.nameDisplayInterval);
      this.nameDisplayInterval = null;
    }
    if (this.raffleRunTimeout) {
      clearTimeout(this.raffleRunTimeout);
      this.raffleRunTimeout = null;
    }
    if (this.nameSpawnAccelerationTimeout) {
      clearTimeout(this.nameSpawnAccelerationTimeout);
      this.nameSpawnAccelerationTimeout = null;
    }
    this.backgroundNames = []; // Clear names immediately when timers are cleared
    this.cdr.detectChanges();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.clearTimersAndBackgroundNames();
  }
}
