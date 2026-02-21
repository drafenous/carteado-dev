import { Component } from '@angular/core';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import { RouterLink } from '@angular/router';

@Component({
    selector: 'app-about',
    imports: [ContentBoxComponent, RouterLink],
    templateUrl: './about.component.html',
    styleUrl: './about.component.scss'
})
export class AboutComponent {}
