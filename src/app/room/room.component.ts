
import { ChangeDetectorRef, Component, NgZone, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { Router, RouterModule } from '@angular/router';
import { FontAwesomeModule } from '@fortawesome/angular-fontawesome';
import { faChartSimple, faClockRotateLeft, faFileCsv, faCopy, faLink, faXmark, faRotateRight, faEye } from '@fortawesome/free-solid-svg-icons';
import { ContentBoxComponent } from '../common/content-box/content-box.component';
import { PopupAlertComponent } from '../common/popup-alert/popup-alert.component';
import { TooltipComponent } from '../common/tooltip/tooltip.component';
import { CardModel } from '../core/models/card-model';
import { User } from '../core/models/user';
import { AppService } from '../core/services/app.service';
import { LocalStorageService } from '../core/services/local-storage.service';
import { CardSelectorComponent } from './card-selector/card-selector.component';
import { UserActionsComponent } from './user-actions/user-actions.component';
import { UserBoxComponent } from './user-box/user-box.component';
import { RoomStoreService } from '../core/services/room-store.service';
import { RoomState, VotingRoundSummary } from '../core/models/room-state';
import { ActivatedRoute } from '@angular/router';
import { TranslatePipe } from '../common/i18n/translate.pipe';
import { I18nService } from '../core/services/i18n.service';

@Component({
    selector: 'app-room',
    imports: [
    ContentBoxComponent,
    RouterModule,
    FontAwesomeModule,
    CardSelectorComponent,
    UserBoxComponent,
    UserActionsComponent,
    PopupAlertComponent
    , TooltipComponent,
    TranslatePipe
],
    templateUrl: './room.component.html',
    styleUrl: './room.component.scss'
})
export class RoomComponent implements OnDestroy {
  private _subs: Subscription[] = [];
  public userName!: string;
  public selectedCard: string | null = null;
  public roomState: RoomState | null = null;

  public currentUserId: string | null = null;
  public showSummaryPopup = false;
  public showHistoryPopup = false;
  public selectedRoundForSummary: VotingRoundSummary | null = null;
  public ICONS = { chartSimple: faChartSimple, clockRotateLeft: faClockRotateLeft, fileCsv: faFileCsv, copy: faCopy, link: faLink, xmark: faXmark, rotateRight: faRotateRight, eye: faEye };

  constructor(
    private appService: AppService,
    public roomStore: RoomStoreService,
    private route: ActivatedRoute,
    private router: Router,
    private localStorage: LocalStorageService,
    private i18n: I18nService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {
    this.appService.userName$.subscribe((userName) => {
      this.userName = userName;
    });
  }

  ngOnInit(): void {
    if (typeof window === 'undefined') {
      return;
    }
    const roomId = this.route.snapshot.paramMap.get('roomId') || '';
    const mode = this.route.snapshot.queryParamMap.get('mode') || '';
    const allowCreate = mode === 'create';
    // Defensive fallback in case guard is bypassed on direct URL access.
    const storedName = (this.localStorage.getItem('user-name') || '').trim();
    const storedRole = (this.localStorage.getItem('user-team-role') || '').trim();
    const storedRoleCustom = (this.localStorage.getItem('user-team-role-custom') || '').trim();
    const hasIdentity = !!storedName && !!storedRole && (storedRole !== 'other' || !!storedRoleCustom);
    if (!hasIdentity) {
      this.router.navigate(['/'], { queryParams: roomId ? { roomId } : {} });
      return;
    }
    // build user object from stored details (SSR-safe)
    let name = this.userName || 'Guest';
    let teamRole: string | undefined = undefined;
    let teamRoleCustom: string | undefined = undefined;
    // read via LocalStorageService (SSR-safe)
    try {
      const storedName = this.localStorage.getItem('user-name') || '';
      if (storedName.trim()) name = storedName.trim();
    } catch {}
    try {
      const storedRole = this.localStorage.getItem('user-team-role') || '';
      if (storedRole) teamRole = storedRole;
    } catch {}
    try {
      const storedRoleCustom = this.localStorage.getItem('user-team-role-custom') || '';
      if (storedRoleCustom) teamRoleCustom = storedRoleCustom;
    } catch {}
    const userId = `u_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,6)}`;
    this.currentUserId = userId;
    try {
      this.localStorage.setItem('user-id', userId);
    } catch {}
    try {
      this.localStorage.setItem('room-id', roomId);
    } catch {}
    const user = {
      id: userId,
      name,
      role: 'voter' as const,
      joinedAt: Date.now(),
      teamRole: (teamRole as any) || undefined,
      teamRoleCustom: teamRoleCustom || undefined,
    };

    this.roomStore.connect(roomId, user, allowCreate);

    const stateSub = this.roomStore.roomState$.subscribe((state) => {
      this.ngZone.run(() => {
        const wasRevealed = this.roomState?.voting?.isRevealed;
        this.roomState = state;
        if (!wasRevealed && state?.voting?.isRevealed) {
          this.selectedRoundForSummary = null;
          this.showSummaryPopup = true;
          // Defer to next tick so summary renders first, then popup opens
          setTimeout(() => {
            this.showSummaryPopup = true;
            this.cdr.detectChanges();
          }, 0);
        }
        if (wasRevealed && !state?.voting?.isRevealed) {
          this.selectedCard = null;
          this.showSummaryPopup = false;
          this.selectedRoundForSummary = null;
        }
        this.cdr.detectChanges();
      });
    });
    this._subs.push(stateSub);

    // Listen for explicit reveal signals so popup opens even if already revealed previously
    const revealSub = this.roomStore.revealSignal$.subscribe(() => {
      this.ngZone.run(() => {
        this.selectedRoundForSummary = null;
        this.showSummaryPopup = true;
        this.cdr.detectChanges();
      });
    });
    this._subs.push(revealSub);

    const errorsSub = this.roomStore.errors$.subscribe((err) => {
      if (err?.code === 'ROOM_NOT_FOUND') {
        this.ngZone.run(() => {
          this.router.navigate(['/'], { queryParams: { roomId, invalidRoom: '1' } });
        });
      }
    });
    this._subs.push(errorsSub);
  }

  ngOnDestroy(): void {
    const roomId = this.roomState?.roomId ?? this.localStorage.getItem('room-id') ?? '';
    const userId = this.currentUserId ?? this.localStorage.getItem('user-id') ?? '';
    if (roomId && userId) {
      this.roomStore.disconnect(roomId, userId);
    }
    for (const s of this._subs) {
      try { s.unsubscribe(); } catch {}
    }
  }

  public handleKickuserByName(kickedUserId: string) {
    if (!this.roomState || !this.currentUserId) return;
    this.roomStore.sendKick(this.roomState.roomId, this.currentUserId, kickedUserId);
  }

  public get isCurrentUserAdmin(): boolean {
    if (!this.roomState || !this.currentUserId) return false;
    const current = this.roomState.users.find((u) => u.id === this.currentUserId);
    return !!current && (current.role === 'admin' || current.role === 'admin_spectator');
  }

  public get isCurrentUserSpectator(): boolean {
    if (!this.roomState || !this.currentUserId) return false;
    const current = this.roomState.users.find((u) => u.id === this.currentUserId);
    return !!current && (current.role === 'spectator' || current.role === 'admin_spectator');
  }

  public get roomCardModel(): CardModel | null | undefined {
    return this.roomState?.settings?.cardModel;
  }

  private getTeamRoleLabel(user: User): string {
    const role = user.teamRole;
    if (!role) return this.i18n.t('roles.unspecified');
    if (role === 'other') {
      const custom = String(user.teamRoleCustom ?? '').trim();
      return custom || this.i18n.t('roles.other');
    }
    return this.i18n.t(`roles.${role}`);
  }

  public get votingHistory(): VotingRoundSummary[] {
    return this.roomState?.settings?.votingHistory ?? [];
  }

  public get summaryLegendItems(): { card: string; value: number; ignored: boolean }[] {
    const summary = this.displayedSummary;
    if (!summary) return [];

    // Historical rounds don't persist deck snapshots yet, so we build legend from round votes.
    if (this.selectedRoundForSummary) {
      const seen = new Set<string>();
      const items: { card: string; value: number; ignored: boolean }[] = [];
      for (const item of summary.perUser) {
        if (seen.has(item.card)) continue;
        seen.add(item.card);
        items.push({
          card: item.card,
          value: item.numericValue,
          ignored: item.numericValue === 0,
        });
      }
      return items;
    }

    const model = this.roomCardModel;
    if (!model) return [];
    return model.cards.map((card) => {
      let value = 0;
      if (model.cardValues && model.cardValues[card] != null) {
        value = model.cardValues[card];
      } else {
        const n = parseInt(String(card), 10);
        if (!isNaN(n)) value = n;
      }
      return { card, value, ignored: value === 0 };
    });
  }

  /** Summary to display: selected historical round or current */
  public get displayedSummary(): VotingRoundSummary | null {
    if (this.selectedRoundForSummary) return this.selectedRoundForSummary;
    const current = this.votingSummaryDetail;
    if (!current) return null;
    return {
      roundNumber: 0,
      timestamp: Date.now(),
      ticketId: this.roomState?.settings?.ticketId?.trim() || '',
      ...current,
    };
  }

  /** Detailed voting summary for popup */
  public get votingSummaryDetail(): {
    average: number;
    min: number;
    max: number;
    sum: number;
    totalVotes: number;
    votesWithValue: number;
    votesIgnored: number;
    perUser: { userId: string; userName: string; role?: string; card: string; numericValue: number; contributes: boolean }[];
    perRole: { role: string; average: number; min: number; max: number; totalVotes: number; votesWithValue: number; votesIgnored: number }[];
  } | null {
    const room = this.roomState;
    const model = room?.settings?.cardModel;
    const votes = room?.voting?.votes ?? {};
    if (!room?.voting?.isRevealed) return null;
    const cardValues = model?.cardValues;
    const values: number[] = [];
    const perUser: { userId: string; userName: string; role?: string; card: string; numericValue: number; contributes: boolean }[] = [];
    const roleBuckets = new Map<string, { role: string; values: number[]; totalVotes: number; votesWithValue: number; votesIgnored: number }>();

    for (const user of room.users) {
      const card = votes[user.id];
      if (card == null) continue;
      let val = 0;
      if (cardValues && cardValues[card] != null) {
        val = cardValues[card];
      } else {
        const n = parseInt(String(card), 10);
        if (!isNaN(n)) val = n;
      }
      const contributes = val > 0;
      if (contributes) values.push(val);
      perUser.push({
        userId: user.id,
        userName: user.name,
        role: this.getTeamRoleLabel(user as User),
        card,
        numericValue: val,
        contributes,
      });

      const role = this.getTeamRoleLabel(user as User);
      const bucket = roleBuckets.get(role) ?? { role, values: [], totalVotes: 0, votesWithValue: 0, votesIgnored: 0 };
      bucket.totalVotes += 1;
      if (contributes) {
        bucket.values.push(val);
        bucket.votesWithValue += 1;
      } else {
        bucket.votesIgnored += 1;
      }
      roleBuckets.set(role, bucket);
    }

    // Return summary even with 0 votes so popup can display
    const votesWithValue = values.length;
    const votesIgnored = perUser.length - votesWithValue;
    const sum = values.reduce((a, b) => a + b, 0);
    const average = votesWithValue > 0
      ? Math.round((sum / votesWithValue) * 10) / 10
      : 0;
    const min = values.length > 0 ? Math.min(...values) : 0;
    const max = values.length > 0 ? Math.max(...values) : 0;
    const perRole = Array.from(roleBuckets.values()).map((bucket) => {
      const sumByRole = bucket.values.reduce((a, b) => a + b, 0);
      const averageByRole = bucket.votesWithValue > 0 ? Math.round((sumByRole / bucket.votesWithValue) * 10) / 10 : 0;
      const minByRole = bucket.values.length > 0 ? Math.min(...bucket.values) : 0;
      const maxByRole = bucket.values.length > 0 ? Math.max(...bucket.values) : 0;
      return {
        role: bucket.role,
        average: averageByRole,
        min: minByRole,
        max: maxByRole,
        totalVotes: bucket.totalVotes,
        votesWithValue: bucket.votesWithValue,
        votesIgnored: bucket.votesIgnored,
      };
    });

    return {
      average,
      min,
      max,
      sum,
      totalVotes: perUser.length,
      votesWithValue,
      votesIgnored,
      perUser,
      perRole,
    };
  }

  public handleCardSelected(card: string): void {
    if (this.roomState?.voting?.isRevealed) return;
    this.selectedCard = card;
    if (this.roomState && this.currentUserId) {
      this.roomStore.sendVote(this.roomState.roomId, this.currentUserId, card);
    }
  }

  public openRoundSummary(round: VotingRoundSummary): void {
    this.selectedRoundForSummary = round;
    this.showHistoryPopup = false;
    this.showSummaryPopup = true;
  }

  public closeSummaryPopup(): void {
    this.showSummaryPopup = false;
    this.selectedRoundForSummary = null;
  }

  public downloadHistoryCsv(): void {
    const history = this.votingHistory;
    if (history.length === 0) return;
    const roomId = this.roomState?.roomId ?? 'sala';
    const escapeCsv = (v: string | number | boolean) => {
      const s = String(v);
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const header = [
      this.i18n.t('csv.round'),
      this.i18n.t('csv.dateTime'),
      this.i18n.t('csv.ticketId'),
      this.i18n.t('csv.average'),
      this.i18n.t('csv.min'),
      this.i18n.t('csv.max'),
      this.i18n.t('csv.sum'),
      this.i18n.t('csv.totalVotes'),
      this.i18n.t('csv.votesWithValue'),
      this.i18n.t('csv.ignored'),
      this.i18n.t('csv.participant'),
      this.i18n.t('csv.participantRole'),
      this.i18n.t('csv.roleAverage'),
      this.i18n.t('csv.roleMin'),
      this.i18n.t('csv.roleMax'),
      this.i18n.t('csv.card'),
      this.i18n.t('csv.numericValue'),
      this.i18n.t('csv.contributes'),
    ].map(escapeCsv).join(',');
    const rows: string[] = [header];
    for (const round of history) {
      const dateStr = new Date(round.timestamp).toLocaleString(this.i18n.currentLanguage);
      const roleMap = new Map((round.perRole ?? []).map((r) => [r.role, r]));
      const summary = [
        round.roundNumber,
        dateStr,
        round.ticketId ?? '',
        round.average,
        round.min,
        round.max,
        round.sum,
        round.totalVotes,
        round.votesWithValue,
        round.votesIgnored,
      ];
      if (round.perUser.length > 0) {
        for (const p of round.perUser) {
          const participantRole = p.role ?? '';
          const roleStats = participantRole ? roleMap.get(participantRole) : undefined;
          rows.push([
            ...summary,
            p.userName,
            participantRole,
            roleStats?.average ?? '',
            roleStats?.min ?? '',
            roleStats?.max ?? '',
            p.card,
            p.numericValue,
            p.contributes ? this.i18n.t('common.yes') : this.i18n.t('common.no'),
          ].map(escapeCsv).join(','));
        }
      } else {
        rows.push([...summary, '', '', '', '', '', '', '', this.i18n.t('common.notAvailable')].map(escapeCsv).join(','));
      }
    }
    const csv = '\uFEFF' + rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `planning-${roomId}-history.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public copyRoomId(): void {
    const id = this.roomState?.roomId;
    if (!id) return;
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        navigator.clipboard.writeText(id);
      }
    } catch (_) {}
  }

  public copyRoomLink(): void {
    const id = this.roomState?.roomId;
    if (!id) return;
    try {
      if (typeof window !== 'undefined') {
        const url = `${window.location.origin}/room/${id}`;
        if (navigator.clipboard) {
          navigator.clipboard.writeText(url);
        }
      }
    } catch (_) {}
  }

  public handleModelChanged(model: CardModel): void {
    this.selectedCard = null;
    if (this.isCurrentUserAdmin && this.roomState && this.currentUserId) {
      this.roomStore.sendSetCardModel(this.roomState.roomId, this.currentUserId, model);
    }
  }

  public handleTicketIdChanged(ticketId: string): void {
    if (this.isCurrentUserAdmin && this.roomState && this.currentUserId) {
      this.roomStore.setTicketId(this.roomState.roomId, this.currentUserId, ticketId);
    }
  }
}
