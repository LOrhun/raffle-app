import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { RaffleService, Participant, NameStyle } from '../raffle.service';
import * as Papa from 'papaparse';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-admin',
  standalone: false,
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.css']
})
export class AdminComponent implements OnInit, OnDestroy {
  titlePrefix: string = '';
  titleSuffix: string = '';
  selectedNameStyle: NameStyle = 'normal';
  private subscriptions: Subscription = new Subscription();

  constructor(public raffleService: RaffleService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.subscriptions.add(
      this.raffleService.landingPageTitlePrefix$.subscribe(prefix => {
        this.titlePrefix = prefix;
        this.cdr.detectChanges();
      })
    );
    this.subscriptions.add(
      this.raffleService.landingPageTitleSuffix$.subscribe(suffix => {
        this.titleSuffix = suffix;
        this.cdr.detectChanges();
      })
    );
    this.subscriptions.add(
      this.raffleService.nameStyle$.subscribe(style => {
        this.selectedNameStyle = style;
        this.cdr.detectChanges();
      })
    );
  }

  saveTitlePrefix(): void {
    this.raffleService.setLandingPageTitlePrefix(this.titlePrefix);
    alert('Ön ek kaydedildi!');
  }

  saveTitleSuffix(): void {
    this.raffleService.setLandingPageTitleSuffix(this.titleSuffix);
    alert('Son ek kaydedildi!');
  }

  selectNameStyle(style: NameStyle): void {
    this.raffleService.setNameStyle(style);
  }

  onFileSelect(event: Event): void {
    const element = event.currentTarget as HTMLInputElement;
    const fileList: FileList | null = element.files;
    if (fileList && fileList.length > 0) {
      const file = fileList[0];
      console.log('Selected file:', file.name);
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (result) => {
          console.log('PapaParse result:', result);
          if (result.errors && result.errors.length > 0) {
            console.error('Errors parsing CSV:', result.errors);
            alert('Error parsing CSV. Check console for details.');
            return;
          }
          if (!result.data || result.data.length === 0) {
            console.warn('CSV parsing resulted in no data.');
            alert('CSV file is empty or could not be parsed correctly.');
            return;
          }

          const rawParticipants = result.data as any[];
          const participants: Participant[] = rawParticipants.map(p => {
            return {
              id: p.ID || p.id || '',
              name: p.Ad || p.name || '',
              surname: p.Soyad || p.surname || '',
              sirket: p.Sirket || p.company,
              pozisyon: p.Pozisyon || p.position,
              mezunYil: p.MezunYil || p.mezunYil ? Number(p.MezunYil || p.mezunYil) : undefined,
              mail: p.Mail || p.mail,
              telefon: p.Telefon || p.telefon,
              kartId: p.KartID || p.kartId
            };
          }).filter(p => p.name && p.surname);

          if (participants.length > 0) {
            console.log('Mapped participants:', participants);
            this.raffleService.setParticipants(participants);
            alert(`${participants.length} participants loaded successfully!`);
          } else {
            console.warn('No valid participants found after mapping. Check CSV headers and content.');
            alert('No valid participants (with Ad and Soyad) found. Check CSV content and headers (ID, Ad, Soyad, Sirket, Pozisyon, MezunYil, Mail, Telefon, KartID).');
          }
          element.value = '';
        },
        error: (error) => {
          console.error('Error during PapaParse operation:', error);
          alert('Failed to parse CSV file. See console for details.');
          element.value = '';
        }
      });
    }
  }

  startRaffle(): void {
    this.raffleService.startRaffle();
  }

  resetRaffle(): void {
    this.raffleService.resetRaffle();
  }

  resetRaffleStateOnly(): void {
    this.raffleService.resetRaffleStateAndWinner();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }
}
