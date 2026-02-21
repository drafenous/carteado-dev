import { User } from './user';
import { CardModel } from './card-model';

export interface VotingRoundSummary {
  roundNumber: number;
  timestamp: number;
  ticketId?: string;
  average: number;
  min: number;
  max: number;
  sum: number;
  totalVotes: number;
  votesWithValue: number;
  votesIgnored: number;
  perUser: { userId: string; userName: string; role?: string; card: string; numericValue: number; contributes: boolean }[];
  perRole?: { role: string; average: number; min: number; max: number; totalVotes: number; votesWithValue: number; votesIgnored: number }[];
}

export interface VotingState {
  isActive: boolean;
  isRevealed: boolean;
  votes: Record<string, string | null>; // userId -> card value
  startedAt?: number | null;
}

export interface RoomState {
  roomId: string;
  createdAt: number;
  updatedAt: number;
  createdBy: string; // userId of creator/admin
  users: User[];
  voting: VotingState;
  settings?: {
    cardSetId?: string;
    allowSpectators?: boolean;
    maxUsers?: number;
    cardModel?: CardModel;
    ticketId?: string;
    votingHistory?: VotingRoundSummary[];
  };
}

