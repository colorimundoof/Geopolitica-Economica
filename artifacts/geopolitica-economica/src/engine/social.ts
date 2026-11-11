import { CONFIG, clamp } from "./config";
import type {
  Economy,
  GameAnchor,
  Policy,
} from "./types";
import type { ResearchEffects } from "./research";

export function updateIndicesAndSocial(
  economy: Economy,
  policy: Policy,
  anchor: GameAnchor,
  research: ResearchEffects,
  eventConfidence: number,
): Economy {
  const educationTarget = clamp(
    anchor.indices.education *
      (1 +
        CONFIG.indices.budgetResponse *
          (policy.spendingPct.education /
            anchor.spendingPct.education -
            1)),
    CONFIG.clamp.indexMinimum,
    CONFIG.clamp.indexMaximum,
  );
  const healthTarget = clamp(
    anchor.indices.health *
      (1 +
        CONFIG.indices.budgetResponse *
          (policy.spendingPct.health / anchor.spendingPct.health - 1)),
    CONFIG.clamp.indexMinimum,
    CONFIG.clamp.indexMaximum,
  );
  const infrastructureTarget = clamp(
    anchor.indices.infrastructure *
      (1 +
        CONFIG.indices.budgetResponse *
          (policy.spendingPct.infrastructure /
            anchor.spendingPct.infrastructure -
            1)),
    CONFIG.clamp.indexMinimum,
    CONFIG.clamp.indexMaximum,
  );
  const technologyTarget = clamp(
    anchor.indices.technology *
      (1 +
        CONFIG.indices.budgetResponse *
          (policy.spendingPct.research / anchor.spendingPct.research - 1)) +
      research.technology,
    CONFIG.clamp.indexMinimum,
    CONFIG.clamp.indexMaximum,
  );
  const technologySmoothing = CONFIG.indices.technologySmoothing;
  const indices = {
    education:
      economy.indices.education +
      CONFIG.indices.spendingSmoothing *
        (educationTarget - economy.indices.education),
    health:
      economy.indices.health +
      CONFIG.indices.spendingSmoothing *
        (healthTarget - economy.indices.health),
    infrastructure:
      economy.indices.infrastructure +
      CONFIG.indices.spendingSmoothing *
        (infrastructureTarget - economy.indices.infrastructure),
    technology:
      economy.indices.technology +
      technologySmoothing * (technologyTarget - economy.indices.technology),
    institutions: economy.indices.institutions,
  };

  const institutionsTarget = clamp(
      CONFIG.indices.institutionsBase +
      CONFIG.indices.institutionsStability * economy.stability +
      CONFIG.indices.institutionsRating *
        (economy.ratingScore / CONFIG.rating.scoreScale) -
      CONFIG.indices.institutionsInflationPenalty *
        Math.max(
          0,
          economy.inflation -
            CONFIG.indices.institutionsHighInflationThreshold,
        ) +
      research.institutions,
    CONFIG.clamp.minimum,
    CONFIG.clamp.maximum,
  );
  indices.institutions +=
    CONFIG.indices.institutionsSmoothing *
    (institutionsTarget - indices.institutions);

  const happinessTarget = clamp(
    anchor.happiness +
      CONFIG.social.happinessUnemploymentResponse *
        (anchor.unemployment - economy.unemployment) -
      CONFIG.social.happinessInflationResponse *
        (Math.max(
          0,
          economy.inflation - CONFIG.social.highInflationThreshold,
        ) -
          Math.max(
            0,
            anchor.inflation - CONFIG.social.highInflationThreshold,
          )) +
      CONFIG.social.healthResponse *
        (indices.health - anchor.indices.health) +
      CONFIG.social.educationResponse *
        (indices.education - anchor.indices.education) +
      CONFIG.social.incomeResponse *
        (economy.gdpPerCapita / anchor.gdpPerCapita -
          CONFIG.scale.identity) +
      research.happiness,
    CONFIG.clamp.minimum,
    CONFIG.clamp.maximum,
  );
  const happiness = clamp(
    economy.happiness +
      CONFIG.social.happinessSmoothing *
        (happinessTarget - economy.happiness),
    CONFIG.clamp.minimum,
    CONFIG.clamp.maximum,
  );

  const stabilityTarget = clamp(
    anchor.stability +
      CONFIG.social.stabilityHappinessResponse *
        (happiness - anchor.happiness) -
      CONFIG.social.stabilityUnemploymentResponse *
        (economy.unemployment - anchor.unemployment) -
      CONFIG.social.stabilityInflationResponse *
        (Math.max(
          0,
          economy.inflation - CONFIG.social.highInflationThreshold,
        ) -
          Math.max(
            0,
            anchor.inflation - CONFIG.social.highInflationThreshold,
          )) +
      CONFIG.social.institutionsResponse *
        (indices.institutions - anchor.indices.institutions) +
      research.stability +
      eventConfidence,
    CONFIG.clamp.minimum,
    CONFIG.clamp.maximum,
  );
  const stability = clamp(
    economy.stability +
      CONFIG.social.stabilitySmoothing *
        (stabilityTarget - economy.stability),
    CONFIG.clamp.minimum,
    CONFIG.clamp.maximum,
  );

  const inequalityPressure =
    Math.max(
      0,
      economy.inflation - CONFIG.social.highInflationThreshold,
    ) +
    Math.max(
      0,
      economy.unemployment -
        anchor.unemployment,
    ) +
    Math.max(
      0,
      policy.taxRates.consumption -
        anchor.consumptionRate,
    ) -
    Math.max(
      0,
      anchor.inflation - CONFIG.social.highInflationThreshold,
    );
  const inequality = clamp(
    economy.inequality +
      CONFIG.social.inequalitySmoothing * inequalityPressure,
    CONFIG.clamp.minimum,
    CONFIG.clamp.maximum,
  );

  const confidenceTarget = clamp(
    anchor.confidence +
      CONFIG.confidence.stabilityResponse *
        (stability - anchor.stability) +
      CONFIG.confidence.ratingResponse *
        (economy.ratingScore / CONFIG.rating.scoreScale -
          anchor.ratingScore / CONFIG.rating.scoreScale) -
      CONFIG.confidence.inflationResponse *
        Math.max(
          0,
          economy.inflation -
            Math.max(
              CONFIG.confidence.inflationFloor,
              anchor.inflation,
            ),
        ) +
      eventConfidence,
    CONFIG.clamp.confidenceMinimum,
    CONFIG.clamp.confidenceMaximum,
  );
  const confidence = clamp(
    economy.confidence +
      CONFIG.confidence.smoothing *
        (confidenceTarget - economy.confidence),
    CONFIG.clamp.confidenceMinimum,
    CONFIG.clamp.confidenceMaximum,
  );

  return {
    ...economy,
    indices,
    institutions: indices.institutions,
    happiness,
    stability,
    inequality,
    confidence,
  };
}

