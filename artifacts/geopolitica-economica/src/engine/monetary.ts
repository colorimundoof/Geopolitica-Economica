import { CONFIG, clamp } from "./config";
import { annualizedDepreciation, baselineDepreciation } from "./trade";
import type {
  EventEffect,
  GameAnchor,
  GameState,
} from "./types";
import type { FiscalResult } from "./fiscal";

export interface MonetaryResult {
  expectedInflation: number;
  inflation: number;
  interestRate: number;
  realRate: number;
  moneyGrowth: number;
  priceLevel: number;
  manualConfidencePenalty: number;
}

export function calculateMonetaryOutcome(
  state: GameState,
  fiscal: FiscalResult,
  eventEffects: Pick<EventEffect, "inflation">,
): MonetaryResult {
  const current = state.current;
  const anchor: GameAnchor = state.anchor;
  const expectedInflation =
    current.expectedInflation +
    CONFIG.monetary.expectationPersistence *
      (current.inflation - current.expectedInflation) +
    CONFIG.monetary.expectationTargetResponse *
      current.institutions *
      (current.inflationTarget - current.expectedInflation);
  let interestRate: number;
  let manualConfidencePenalty = 0;

  if (state.policy.rateMode === "auto") {
    const target =
      expectedInflation +
      anchor.realRate +
      CONFIG.monetary.automaticRateInflationResponse *
        (current.inflation - anchor.inflation) +
      CONFIG.monetary.automaticRateGapResponse * current.gap;
    const difference = clamp(
      target - current.interestRate,
      -CONFIG.monetary.automaticRateMonthlyStep,
      CONFIG.monetary.automaticRateMonthlyStep,
    );
    interestRate = clamp(
      current.interestRate + difference,
      CONFIG.monetary.interestMinimum,
      CONFIG.monetary.interestMaximum,
    );
  } else {
    interestRate = clamp(
      state.policy.manualInterestRate,
      CONFIG.monetary.interestMinimum,
      CONFIG.monetary.interestMaximum,
    );
    if (
      Math.abs(interestRate - current.interestRate) >
      CONFIG.monetary.manualRateConfidencePenaltyThreshold
    ) {
      manualConfidencePenalty =
        CONFIG.monetary.manualRateConfidencePenalty;
    }
  }

  const realRate = interestRate - expectedInflation;
  const moneyGrowth =
    CONFIG.monetary.moneyGrowthBaseline +
    CONFIG.monetary.moneyGrowthDeficitResponse *
      Math.max(0, fiscal.deficitRatio) +
    CONFIG.monetary.moneyGrowthRealRateResponse *
      Math.max(
        0,
        CONFIG.monetary.moneyGrowthRealRateThreshold - current.realRate,
      );
  const inflationTarget =
    expectedInflation +
    CONFIG.monetary.inflationGapResponse * current.gap +
    CONFIG.monetary.inflationDepreciationResponse *
      (annualizedDepreciation(state) - baselineDepreciation(anchor)) +
    CONFIG.monetary.inflationMoneyResponse *
      (moneyGrowth - anchor.moneyBase) +
    eventEffects.inflation;
  const inflation = clamp(
    current.inflation +
      CONFIG.monetary.inflationSmoothing *
        (inflationTarget - current.inflation),
    CONFIG.monetary.inflationMinimum,
    CONFIG.monetary.inflationMaximum,
  );

  return {
    expectedInflation,
    inflation,
    interestRate,
    realRate,
    moneyGrowth,
    priceLevel:
      current.priceLevel *
      (1 + inflation) ** (1 / CONFIG.time.monthsPerYear),
    manualConfidencePenalty,
  };
}

