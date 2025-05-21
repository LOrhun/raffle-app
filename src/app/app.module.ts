import { NgModule } from '@angular/core';
import { BrowserModule, provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { LandingComponent } from './landing/landing.component';
import { AdminComponent } from './admin/admin.component';
import { AuthGuard } from './auth.guard';
import { RaffleService } from './raffle.service';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { Analytics } from "@vercel/analytics/next"
import { SlideshowComponent } from './slideshow/slideshow.component';

@NgModule({
  declarations: [
    AppComponent,
    LandingComponent,
    AdminComponent,
    SlideshowComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    HttpClientModule
  ],
  providers: [
    provideClientHydration(withEventReplay()),
    AuthGuard,
    RaffleService
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
