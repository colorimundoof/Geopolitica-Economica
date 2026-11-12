import type { CountryId, GameState } from "./types";
import { SAVE_VERSION } from "./types";

interface SerializedGame {
  version: number;
  state: GameState;
}

export type ParsedSave =
  | { status: "valid"; state: GameState }
  | { status: "old-version" }
  | { status: "invalid" };

export function serializeSave(state: GameState): string {
  const save: SerializedGame = { version: SAVE_VERSION, state };
  return JSON.stringify(save);
}

function isCountryId(value: unknown): value is CountryId {
  return (
    typeof value === "string" &&
    ["brasil", "mexico", "indonesia", "turquia", "nigeria", "argentina"].includes(
      value,
    )
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasFiniteFields(value: unknown, fields: string[]): boolean {
  if (!isRecord(value)) return false;
  return fields.every((field) => Number.isFinite(value[field]));
}

function hasFiniteRecord(value: unknown, fields: string[]): boolean {
  return hasFiniteFields(value, fields);
}

function isValidGameState(value: unknown): value is GameState {
  if (!isRecord(value)) return false;
  const candidate = value as Partial<GameState>;
  const economyFields = [
    "gdp",
    "gdpPerCapita",
    "population",
    "unemployment",
    "inflation",
    "expectedInflation",
    "inflationTarget",
    "interestRate",
    "realRate",
    "exchangeRate",
    "investmentRate",
    "moneyGrowth",
    "gap",
    "potentialGrowth",
    "growth",
    "confidence",
    "stability",
    "happiness",
    "inequality",
    "institutions",
    "debt",
    "debtToGdp",
    "debtCostAvg",
    "reserves",
    "currentAccount",
    "exports",
    "imports",
    "priceLevel",
    "primaryRatio",
    "deficitRatio",
    "nominalDeficitRatio",
    "ratingScore",
    "riskSpread",
    "npl",
    "realRateLag",
    "capitalFlight",
  ];
  const anchorFields = [
    "gdp",
    "gdpPerCapita",
    "population",
    "exchangeRate",
    "investmentRate",
    "inflation",
    "interestRate",
    "realRate",
    "confidence",
    "stability",
    "happiness",
    "inequality",
    "unemployment",
    "nairu",
    "deficitRatio",
    "primaryRatio",
    "corporateRate",
    "consumptionRate",
    "ratingScore",
    "moneyBase",
    "potentialOffset",
    "priceLevel",
    "reserves",
    "debtToGdp",
    "riskSpread",
    "npl",
  ];
  const policy = candidate.policy;
  const current = candidate.current;

  return (
    candidate.version === SAVE_VERSION &&
    isCountryId(candidate.countryId) &&
    Number.isFinite(candidate.seed) &&
    Number.isInteger(candidate.turn) &&
    Number.isInteger(candidate.month) &&
    Number.isInteger(candidate.year) &&
    ["playing", "victory", "default", "political-crisis", "hyperinflation"].includes(
      String(candidate.status),
    ) &&
    hasFiniteFields(current, economyFields) &&
    hasFiniteFields(candidate.anchor, anchorFields) &&
    isRecord(current) &&
    isRecord(policy) &&
    hasFiniteRecord(current.indices, [
      "education",
      "health",
      "infrastructure",
      "technology",
      "institutions",
    ]) &&
    hasFiniteRecord(current.taxRates, [
      "income",
      "corporate",
      "consumption",
    ]) &&
    hasFiniteRecord(current.spendingPct, [
      "health",
      "education",
      "infrastructure",
      "defense",
      "research",
      "other",
    ]) &&
    hasFiniteRecord(policy.taxRates, [
      "income",
      "corporate",
      "consumption",
    ]) &&
    hasFiniteRecord(policy.spendingPct, [
      "health",
      "education",
      "infrastructure",
      "defense",
      "research",
      "other",
    ]) &&
    Number.isFinite(policy.manualInterestRate) &&
    (policy.rateMode === "auto" || policy.rateMode === "manual") &&
    typeof policy.fxIntervention === "boolean" &&
    Array.isArray(candidate.history) &&
    Array.isArray(candidate.research) &&
    Array.isArray(candidate.activeEvents) &&
    Array.isArray(candidate.report) &&
    isRecord(candidate.eventCooldowns)
  );
}

export function parseSave(raw: string): ParsedSave {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: "invalid" };
  }
  if (typeof parsed !== "object" || parsed === null) {
    return { status: "invalid" };
  }

  const save = parsed as Partial<SerializedGame>;
  if (!Number.isInteger(save.version)) {
    return { status: "invalid" };
  }
  if (save.version !== SAVE_VERSION) {
    if ((save.version ?? 0) > SAVE_VERSION) {
      return { status: "invalid" };
    }
    return { status: "old-version" };
  }
  if (!isValidGameState(save.state)) {
    return { status: "invalid" };
  }

  return { status: "valid", state: save.state };
}

