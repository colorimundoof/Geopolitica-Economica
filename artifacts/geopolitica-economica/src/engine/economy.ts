import { CONFIG, clamp } from "./config";
import type {
  EventEffect,
  Economy,
  GameAnchor,
  GameState,
} from "./types";
import type { FiscalResult } from "./fiscal";
import type { ResearchEffects } from "./research";
import { creditExcess } from "./risk";

export interface RealEconomyResult {
  gdp: number;
  gdpPerCapita: number;
  unemployment: number;
  investmentRate: number;
  potentialGrowth: number;
  growth: number;
  gap: number;
}

export function calculatePotentialGrowth(
  economy: Economy,
  anchor: GameAnchor,
  research: ResearchEffects,
): number {
  return (
    CONFIG.growth.baseline +
    CONFIG.growth.education *
      (economy.indices.education - CONFIG.scale.midpoint) +
    CONFIG.growth.infrastructure *
      (economy.indices.infrastructure - CONFIG.scale.midpoint) +
    CONFIG.growth.technology *
      (economy.indices.technology - CONFIG.scale.midpoint) +
    CONFIG.growth.investment *
      (economy.investmentRate - CONFIG.scale.investmentReference) +
    research.potentialGrowth +
    anchor.potentialOffset
  );
}

export function calculateRealEconomy(
  state: GameState,
  fiscal: FiscalResult,
  eventEffects: Pick<EventEffect, "growth">,
  research: ResearchEffects,
): RealEconomyResult {
  const current = state.current;
  const anchor = state.anchor;
  const potentialGrowth = calculatePotentialGrowth(
    current,
    anchor,
    research,
  );
  const creditDrag = creditExcess(current.npl, anchor);
  const effectiveGrowth = clamp(
    potentialGrowth -
      CONFIG.credit.growthDrag * creditDrag +
      CONFIG.growth.deficitResponse *
        (fiscal.deficitRatio - anchor.deficitRatio) -
      CONFIG.growth.realRateResponse *
        clamp(
          current.realRateLag - anchor.realRate,
          CONFIG.clamp.realRateDifferenceMinimum,
          CONFIG.clamp.realRateDifferenceMaximum,
        ) +
      CONFIG.growth.confidenceResponse *
        (current.confidence - anchor.confidence) -
      CONFIG.growth.highInflationResponse *
        Math.max(
          0,
          current.inflation -
            Math.max(
              CONFIG.growth.highInflationFloor,
              anchor.inflation + CONFIG.growth.highInflationAnchorBuffer,
            ),
        ) +
      eventEffects.growth,
    CONFIG.clamp.effectiveGrowthMinimum,
    CONFIG.clamp.effectiveGrowthMaximum,
  );
  const gap = clamp(
    CONFIG.growth.gapPersistence * current.gap +
      (effectiveGrowth - potentialGrowth),
    CONFIG.clamp.gapMinimum,
    CONFIG.clamp.gapMaximum,
  );
  const gdp =
    current.gdp *
    (CONFIG.scale.identity + effectiveGrowth) **
      (1 / CONFIG.victory.monthlyGrowthExponentDivisor);
  const gdpPerCapita = gdp / current.population;
  const unemploymentTarget =
    anchor.nairu -
    CONFIG.growth.unemploymentGapResponse *
      clamp(
        gap,
        CONFIG.clamp.unemploymentGapMinimum,
        CONFIG.clamp.unemploymentGapMaximum,
      );
  const unemployment = clamp(
    current.unemployment +
      CONFIG.growth.unemploymentResponse *
        (unemploymentTarget - current.unemployment),
    CONFIG.clamp.unemploymentMinimum,
    CONFIG.clamp.unemploymentMaximum,
  );

  const corporateBenchmark = Math.max(
    CONFIG.investment.corporateTaxFloor,
    anchor.corporateRate,
  );
  const taxPointsAboveBenchmark =
    Math.max(0, state.policy.taxRates.corporate - corporateBenchmark) *
    CONFIG.fiscal.corporateTaxPointsPerRate;
  const investmentTarget =
    anchor.investmentRate +
    CONFIG.investment.confidenceResponse *
      (current.confidence - anchor.confidence) +
    CONFIG.investment.realRateResponse *
      (anchor.realRate - current.realRateLag) -
    CONFIG.investment.corporateTaxPenalty * taxPointsAboveBenchmark -
    CONFIG.credit.investmentDrag * creditDrag +
    research.investment;
  const investmentRate = clamp(
    current.investmentRate +
      CONFIG.investment.confidenceSmoothing *
        (investmentTarget - current.investmentRate),
    CONFIG.clamp.investmentMinimum,
    CONFIG.clamp.investmentMaximum,
  );

  return {
    gdp,
    gdpPerCapita,
    unemployment,
    investmentRate,
    potentialGrowth,
    growth: effectiveGrowth,
    gap,
  };
}

