import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import { LocalStorageService } from '../services/local-storage.service';

export const roomEntryGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const roomId = route.paramMap.get('roomId') || undefined;
  const localStorageService = inject(LocalStorageService);

  // Check persisted user identity (name + teamRole) via LocalStorageService
  let name = '';
  let teamRole = '';
  try {
    name = localStorageService.getItem('user-name') || '';
    teamRole = localStorageService.getItem('user-team-role') || '';
  } catch {
    name = '';
    teamRole = '';
  }

  if (name && teamRole) {
    return true;
  }

  // redirect to home with roomId preset
  const query: Record<string, string> = {};
  if (roomId) query['roomId'] = roomId;
  return router.createUrlTree(['/'], { queryParams: query });
};

