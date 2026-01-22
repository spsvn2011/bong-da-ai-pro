
export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  league: string;
  time: string;
  date: string; // "Today" or "Tomorrow"
  scannedOdds?: BettingOdds; // The "Main" odd to display in the list
  allOdds?: BettingOdds[]; // All extracted odds (Corners, Cards, Main, etc.)
}

export interface BettingOdds {
  type: string; // e.g., "Kèo Góc", "Kèo Tỷ Số", "Kèo Thẻ", "Kèo Chấp"
  
  // Handicap
  handicap?: string; // e.g., "0.5", "-0.25"
  homeOdds?: string; // e.g., "0.95"
  awayOdds?: string; // e.g., "0.88"
  
  // Over/Under
  overUnder?: string; // e.g., "9.5"
  overOdds?: string; // e.g., "0.82"
  underOdds?: string; // e.g., "0.98"

  // 1x2 (European)
  europeanHome?: string;
  europeanDraw?: string;
  europeanAway?: string;

  rawText: string; // Summary text of what was read
}

export enum PredictionConfidence {
  HIGH = 'Cao',
  MEDIUM = 'Trung bình',
  LOW = 'Thấp'
}

export interface StatAnalysis {
  homeForm: string; // Describe last 5-10 games
  awayForm: string;
  headToHead: string;
  referee: string;
  stadiumInfluence: string;
}

// NEW: Advanced Logic Metrics with Data Source Inspiration
export interface AdvancedMetrics {
  impliedProbability: string; // e.g. "56% (Smart Money)"
  dominanceIndex: string; // e.g. "Chelsea áp đảo (Market Value 5x)"
  
  // Data Source: Understat / FBref
  poissonXG: string; // e.g. "Home 1.8 - Away 0.5 (xG)"
  
  motivation: string; // e.g. "Must Win (Knock-out)"
  
  // Data Source: API-Football / Sofascore
  wingerType?: string; // e.g. "Inverted (Cut-inside) -> Giảm Góc"
  
  // Data Source: Whoscored
  refereeStyle?: string; // e.g. "Bắt rát (Avg 29 fouls) -> Vụn trận"
  
  matchContext?: string; // e.g. "Thủ tục (Dead Rubber)"
  
  // Data Source: OddsPortal / The Odds API
  marketTrend?: string; // e.g. "Tài giảm mạnh (Opening 0.9 -> Closing 0.8)"
}

export interface PredictionResult {
  matchId: string;
  scorePrediction: string;
  cornerPrediction: {
    prediction: string; // e.g., "Over 9.5"
    analysis: string;
  };
  cardPrediction: {
    prediction: string; // e.g., "Under 3.5 cards"
    analysis: string;
  };
  mainPick: {
    pick: string; // The "Brightest" kèo (kèo sáng)
    confidence: PredictionConfidence;
    reasoning: string;
  };
  detailedAnalysis: StatAnalysis;
  // Optional for backward compatibility, but we will populate it
  advancedMetrics?: AdvancedMetrics;
}

export interface LoadingState {
  isLoading: boolean;
  message: string;
}

export interface CustomInputState {
  text: string;
  image: string | null; // Base64
}

export type PickStatus = 'pending' | 'won' | 'lost';

export interface PickOutcomes {
  main: PickStatus;
  score: PickStatus;
  corner: PickStatus;
  card: PickStatus;
}

// New Interface for Match Verification
export interface MatchVerificationResult {
  actualScore: string;
  actualCorners: string;
  actualCards: string;
  outcomes: PickOutcomes;
  note: string; // Short summary
}

export interface SavedPick {
  id: string; // Unique ID for the saved entry
  match: Match;
  result: PredictionResult;
  timestamp: number;
  status: PickStatus; // Overall status (usually Main Pick)
  outcomes?: PickOutcomes; // Granular status for specific bets
  note?: string;
  // New field to store actual stats after verification
  verification?: {
    checkedAt: number;
    actualScore: string;
    actualCorners?: string;
    actualCards?: string;
  };
}