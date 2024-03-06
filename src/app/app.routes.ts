import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./layouts/default-layout/default-layout.component').then(
        (c) => c.DefaultLayoutComponent
      ),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./home/home.component').then((c) => c.HomeComponent),
      },
      {
        path: 'about',
        loadComponent: () =>
          import('./about/about.component').then((c) => c.AboutComponent),
      },
      {
        path: 'room/:roomId',
        loadComponent: () =>
          import('./room/room.component').then((c) => c.RoomComponent),
      },
    ],
  },
];
