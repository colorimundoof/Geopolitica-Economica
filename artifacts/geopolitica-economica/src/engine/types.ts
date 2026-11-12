export type CountryId =
  | "brasil"
  | "mexico"
  | "indonesia"
  | "turquia"
  | "nigeria"
  | "argentina";

export type Rating =
  | "AAA"
  | "AA"
  | "A"
  | "BBB"
  | "BB"
  | "B"
  | "CCC"
  | "D";

export type TaxType = "income" | "corporate" | "consumption";
export type SpendingCategory =
  | "health"
  | "education"
  | "infrastructure"
  | "defense"
  | "research"
  | "other";
export type IndexName =
  | "education"
  | "health"
  | "infrastructure"
  | "technology"
  | "institutions";

export interface CountryIndices {
  education: number;
  health: number;
  infrastructure: number;
  technology: number;
  institutions: number;
}

export interface CountrySocial {
  stability: number;
  happiness: number;
  inequality: number;
}

export interface CountryTaxRates {
  income: number;
  corporate: number;
  consumption: number;
}

export interface CountrySpending {
  health: number;
  education: number;
  infrastructure: number;
  defense: number;
  research: number;
  other: number;
}

export interface CountrySectors {
  agriculture: number;
  industry: number;
  services: number;
  technology: number;
}

export interface CountryDefinition {
  id: CountryId;
  name: string;
  difficulty: "Acessível" | "Moderado" | "Difícil";
  population: number;
  gdp: number;
  unemployment: number;
  inflation: number;
  inflationTarget: number;
  interestRate: number;
  exchangeRate: number;
  reserves: number;
  debtToGdp: number;
  rating: Rating;
  gap: number;
  confidence: number;
  investmentRate: number;
  moneyGrowth: number;
  nairu: number;
  baseGrowth: number;
  foreignDebtShare: number;
  indices: CountryIndices;
  social: CountrySocial;
  taxRates: CountryTaxRates;
  spendingPct: CountrySpending;
  sectors: CountrySectors;
}

export interface GameAnchor {
  gdp: number;
  gdpPerCapita: number;
  population: number;
  exchangeRate: number;
  investmentRate: number;
  inflation: number;
  interestRate: number;
  realRate: number;
  confidence: number;
  stability: number;
  happiness: number;
  inequality: number;
  unemployment: number;
  nairu: number;
  deficitRatio: number;
  primaryRatio: number;
  indices: CountryIndices;
  spendingPct: CountrySpending;
  corporateRate: number;
  consumptionRate: number;
  ratingScore: number;
  moneyBase: number;
  potentialOffset: number;
  priceLevel: number;
  reserves: number;
  debtToGdp: number;
  riskSpread: number;
  npl: number;
}

export interface Policy {
  taxRates: CountryTaxRates;
  spendingPct: CountrySpending;
  rateMode: "auto" | "manual";
  manualInterestRate: number;
  researchProjectId: string | null;
  fxIntervention: boolean;
}

export interface Decisions {
  taxRates?: Partial<CountryTaxRates>;
  spendingPct?: Partial<CountrySpending>;
  rateMode?: "auto" | "manual";
  manualInterestRate?: number;
  researchProjectId?: string | null;
  fxIntervention?: boolean;
}

export interface Economy {
  gdp: number;
  gdpPerCapita: number;
  population: number;
  unemployment: number;
  inflation: number;
  expectedInflation: number;
  inflationTarget: number;
  interestRate: number;
  realRate: number;
  exchangeRate: number;
  investmentRate: number;
  moneyGrowth: number;
  gap: number;
  potentialGrowth: number;
  growth: number;
  confidence: number;
  stability: number;
  happiness: number;
  inequality: number;
  institutions: number;
  debt: number;
  debtToGdp: number;
  debtCostAvg: number;
  reserves: number;
  currentAccount: number;
  exports: number;
  imports: number;
  priceLevel: number;
  primaryRatio: number;
  deficitRatio: number;
  nominalDeficitRatio: number;
  ratingScore: number;
  rating: Rating;
  riskSpread: number;
  npl: number;
  realRateLag: number;
  capitalFlight: number;
  indices: CountryIndices;
  spendingPct: CountrySpending;
  taxRates: CountryTaxRates;
  sectors: CountrySectors;
}

export interface EventEffect {
  id: string;
  title: string;
  description: string;
  monthsRemaining: number;
  growth: number;
  inflation: number;
  confidence: number;
  exchangeRate: number;
}

export interface ResearchProject {
  id: string;
  name: string;
  area: "Econômica" | "Social" | "Militar" | "Governamental" | "Tecnológica";
  description: string;
  cost: number;
  progress: number;
  completed: boolean;
  bonus: number;
}

export interface MonthlyRecord {
  turn: number;
  label: string;
  gdp: number;
  gdpPerCapita: number;
  inflation: number;
  unemployment: number;
  interestRate: number;
  exchangeRate: number;
  debtToGdp: number;
  rating: Rating;
  ratingScore: number;
  riskSpread: number;
  npl: number;
  growth: number;
  happiness: number;
  stability: number;
  primaryRatio: number;
  confidence: number;
  report: string[];
}

export interface GameState {
  version: number;
  countryId: CountryId;
  seed: number;
  turn: number;
  month: number;
  year: number;
  status: "playing" | "victory" | "default" | "political-crisis" | "hyperinflation";
  current: Economy;
  anchor: GameAnchor;
  policy: Policy;
  researchPoints: number;
  research: ResearchProject[];
  activeEvents: EventEffect[];
  eventCooldowns: Record<string, number>;
  history: MonthlyRecord[];
  report: string[];
  victoryMonths: number;
  defaultMonths: number;
  politicalCrisisMonths: number;
  hyperinflationMonths: number;
  lastRatingChangeTurn: number;
}

export interface FiscalLine {
  category: TaxType | SpendingCategory;
  label: string;
  amount: number;
  shareOfGdp: number;
}

export interface FiscalSummary {
  revenue: number;
  expenditure: number;
  primaryBalance: number;
  nominalDeficit: number;
  debtInterest: number;
  revenueLines: FiscalLine[];
  spendingLines: FiscalLine[];
}

export interface GameSummary {
  fiscal: FiscalSummary;
  monthlyHistory: MonthlyRecord[];
  sectorOutputs: {
    id: keyof CountrySectors;
    label: string;
    share: number;
    output: number;
  }[];
  taylorSuggestion: number;
  nextMilestone: string;
  victoryProgress: number;
}

export const SAVE_VERSION = 2;
