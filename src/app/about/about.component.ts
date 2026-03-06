import { Component } from '@angular/core';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../common/i18n/translate.pipe';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';

@Component({
    selector: 'app-about',
    imports: [ContentBoxComponent, RouterLink, TranslatePipe, FontAwesomeModule],
    templateUrl: './about.component.html',
    styleUrl: './about.component.scss'
})
export class AboutComponent {
  protected readonly ICONS = { house: faHouse };
}
