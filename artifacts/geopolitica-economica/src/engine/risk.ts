import { CONFIG, clamp } from "./config";
import type { Economy, GameAnchor } from "./types";

/** Desvio positivo = pior. Melhora conta menos que piora (assimetria). */
function contribution(deviation: number, weight: number): number {
  return (
    weight *
    (deviation > 0 ? deviation : CONFIG.risk.improvementFactor * deviation)
  );
}

export interface RiskInputs {
  debtToGdp: number;
  deficitRatio: number;
  inflation: number;
  reserves: number;
  institutions: number;
  growth: number;
  potentialGrowth: number;
  npl: number;
}

/**
 * Risco-país contínuo (spread), calculado como desvio da âncora.
 * Sobe depressa (speedUp) e desce devagar (speedDown).
 */
export function nextRiskSpread(
  previous: number,
  anchor: GameAnchor,
  input: RiskInputs,
): number {
  const w = CONFIG.risk.weights;
  const reservesGap =
    anchor.reserves > 0
      ? (anchor.reserves - input.reserves) / anchor.reserves
      : 0;
  const target =
    anchor.riskSpread +
    contribution(input.debtToGdp - anchor.debtToGdp, w.debt) +
    contribution(input.deficitRatio - anchor.deficitRatio, w.deficit) +
    contribution(input.inflation - anchor.inflation, w.inflation) +
    contribution(reservesGap, w.reserves) +
    contribution(anchor.indices.institutions - input.institutions, w.institutions) +
    contribution(input.potentialGrowth - input.growth, w.growth) +
    w.credit * Math.max(0, input.npl - anchor.npl);
  const floor =
    anchor.riskSpread *
    clamp(
      1 -
        CONFIG.risk.floorInstitutionsResponse *
          (input.institutions - anchor.indices.institutions),
      CONFIG.risk.floorMinimum,
      1,
    );
  const bounded = clamp(target, floor, CONFIG.risk.maximum);
  const speed =
    bounded > previous ? CONFIG.risk.speedUp : CONFIG.risk.speedDown;
  return previous + speed * (bounded - previous);
}

/** Pressão anual extra sobre o câmbio quando o risco-país sobe acima da âncora. */
export function capitalFlightPressure(
  riskSpread: number,
  anchor: GameAnchor,
): number {
  const f = CONFIG.risk.flight;
  return clamp(
    f.weight * Math.max(0, riskSpread - anchor.riskSpread - f.tolerance),
    0,
    f.maximum,
  );
}

/** Inadimplência: sobe com juro real alto e desemprego; cai devagar (cicatriz). */
export function nextNpl(current: Economy, anchor: GameAnchor): number {
  const c = CONFIG.credit;
  const target = clamp(
    anchor.npl +
      c.rateWeight * (current.realRate - anchor.realRate) +
      c.unemploymentWeight * (current.unemployment - anchor.nairu) -
      c.gapWeight * current.gap,
    c.minimum,
    c.maximum,
  );
  return current.npl + c.speed * (target - current.npl);
}

export function creditExcess(npl: number, anchor: GameAnchor): number {
  return Math.max(0, npl - anchor.npl);
}
