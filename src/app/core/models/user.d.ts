export type TeamRole = 'frontend' | 'backend' | 'staff' | 'engineer' | 'qa' | 'fullstack' | 'other';

export interface User {
  id: string;
  name: string;
  // role in the app: admin | admin_spectator | voter | spectator
  role: 'admin' | 'admin_spectator' | 'voter' | 'spectator';
  joinedAt: number;
  lastSeen?: number;
  isConnected?: boolean;
  // team role for profile
  teamRole?: TeamRole;
  teamRoleCustom?: string | null;
  // optional session id for reconnection
  sessionId?: string;
}
