export interface CardModel {
  id: string;
  name: string;
  cards: string[];
  /** Maps card display string to numeric value for voting summary. Cards with 0 or missing are ignored. */
  cardValues?: Record<string, number>;
  isPreset?: boolean;
}

