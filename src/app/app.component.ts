import { afterNextRender, Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CookieConsentService } from './core/services/cookie-consent.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'Carteado Dev';
  private cookieConsent = inject(CookieConsentService);

  constructor() {
    afterNextRender(() => {
      void this.cookieConsent.init();
    });
  }
}
