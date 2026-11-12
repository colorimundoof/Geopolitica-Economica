import { CONFIG, clamp } from "./config";
import type { Economy, GameAnchor, Rating } from "./types";

const RATING_ORDER = CONFIG.rating.thresholds.map((item) => item.rating);

function descendingScore(value: number, best: number, worst: number): number {
  return clamp(
    (worst - value) / (worst - best),
    CONFIG.clamp.minimum,
    CONFIG.clamp.maximum,
  );
}

function ascendingScore(value: number, best: number, worst: number): number {
  return clamp(
    (value - best) / (worst - best),
    CONFIG.clamp.minimum,
    CONFIG.clamp.maximum,
  );
}

export function calculateRawRatingScore(economy: Economy): number {
  const reservesInImportMonths =
    economy.imports > 0
      ? (economy.reserves / economy.imports) *
        CONFIG.time.monthsPerYear
      : CONFIG.rating.reserveMonthsBest;
  const nominalDeficitRatio =
    -economy.primaryRatio + economy.debtCostAvg * economy.debtToGdp;

  return (
    descendingScore(
      economy.debtToGdp,
      CONFIG.rating.debtBest,
      CONFIG.rating.debtWorst,
    ) *
      CONFIG.rating.debtWeight +
    descendingScore(
      nominalDeficitRatio,
      CONFIG.rating.deficitBest,
      CONFIG.rating.deficitWorst,
    ) *
      CONFIG.rating.deficitWeight +
    descendingScore(
      economy.inflation,
      CONFIG.rating.inflationBest,
      CONFIG.rating.inflationWorst,
    ) *
      CONFIG.rating.inflationWeight +
    economy.stability * CONFIG.rating.stabilityWeight +
    ascendingScore(
      reservesInImportMonths,
      CONFIG.clamp.minimum,
      CONFIG.rating.reserveMonthsBest,
    ) *
      CONFIG.rating.reservesWeight
  );
}

export function getRatingMidpoint(rating: Rating): number {
  const index = RATING_ORDER.indexOf(rating);
  const current = CONFIG.rating.thresholds[index];
  if (!current) return 0;
  if (index === 0) {
    return (current.score + CONFIG.rating.scoreScale) / 2;
  }
  const previous = CONFIG.rating.thresholds[index - 1];
  return previous ? (current.score + previous.score) / 2 : current.score;
}

export function adjustedRatingScore(
  rawScore: number,
  anchor: GameAnchor,
  initialRating: Rating,
): number {
  const initialMidpoint = getRatingMidpoint(initialRating);
  return clamp(
    rawScore + (initialMidpoint - anchor.ratingScore),
    CONFIG.clamp.minimum,
    CONFIG.rating.scoreScale,
  );
}

export function ratingFromScore(score: number): Rating {
  for (const item of CONFIG.rating.thresholds) {
    if (score >= item.score) return item.rating;
  }
  return "D";
}

export function ratingFromSpread(spread: number): Rating {
  for (const band of CONFIG.risk.ratingBands) {
    if (spread < band.below) return band.rating;
  }
  return "D";
}

export function updateRatingWithHysteresis(
  score: number,
  currentRating: Rating,
  turn: number,
  lastChangeTurn: number,
): { rating: Rating; lastChangeTurn: number } {
  return stepRating(
    ratingFromScore(score),
    currentRating,
    turn,
    lastChangeTurn,
  );
}

/** Rating vira rótulo do risco-país, com histerese (1 nível por vez, 1 vez a cada 6 meses). */
export function updateRatingFromSpread(
  spread: number,
  currentRating: Rating,
  turn: number,
  lastChangeTurn: number,
): { rating: Rating; lastChangeTurn: number } {
  return stepRating(
    ratingFromSpread(spread),
    currentRating,
    turn,
    lastChangeTurn,
  );
}

function stepRating(
  desired: Rating,
  currentRating: Rating,
  turn: number,
  lastChangeTurn: number,
): { rating: Rating; lastChangeTurn: number } {
  const currentIndex = RATING_ORDER.indexOf(currentRating);
  const desiredIndex = RATING_ORDER.indexOf(desired);
  const elapsed = turn - lastChangeTurn;

  if (
    desiredIndex === currentIndex ||
    elapsed < CONFIG.rating.hysteresisTurns
  ) {
    return { rating: currentRating, lastChangeTurn };
  }

  const direction = desiredIndex < currentIndex ? -1 : 1;
  const nextIndex = clamp(
    currentIndex + direction * CONFIG.rating.levelsPerChange,
    CONFIG.clamp.minimum,
    RATING_ORDER.length - 1,
  );
  const rating = RATING_ORDER[nextIndex] ?? currentRating;
  return { rating, lastChangeTurn: turn };
}

export function isAtLeastRating(current: Rating, minimum: Rating): boolean {
  return RATING_ORDER.indexOf(current) <= RATING_ORDER.indexOf(minimum);
}

