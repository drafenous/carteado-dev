import { Component } from '@angular/core';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../common/i18n/translate.pipe';

@Component({
    selector: 'app-about',
    imports: [ContentBoxComponent, RouterLink, TranslatePipe],
    templateUrl: './about.component.html',
    styleUrl: './about.component.scss'
})
export class AboutComponent {}
