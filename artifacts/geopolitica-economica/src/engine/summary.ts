import { COUNTRIES } from "@/data/countries";
import { CONFIG } from "./config";
import { calculateFiscal } from "./fiscal";
import { getSectorOutputs } from "./sectors";
import { getResearchEffects } from "./research";
import { getVictoryProgress } from "./victory";
import type { FiscalSummary, GameState, GameSummary } from "./types";

export function getTaylorSuggestion(state: GameState): number {
  return (
    CONFIG.taylor.baseRate +
    state.current.inflation +
    CONFIG.taylor.inflationResponse *
      (state.current.inflation - state.current.inflationTarget) +
    CONFIG.taylor.gapResponse * state.current.gap
  );
}

function calculateFiscalSummary(state: GameState): FiscalSummary {
  const research = getResearchEffects(state.research);
  const fiscal = calculateFiscal(
    state.current.gdp,
    state.policy.taxRates,
    state.policy.spendingPct,
    research.taxEfficiency,
  );
  // anual, na mesma unidade da receita, da despesa e do saldo primário
  const debtInterest = state.current.debt * state.current.debtCostAvg;
  return {
    ...fiscal.summary,
    debtInterest,
    nominalDeficit: -fiscal.summary.primaryBalance + debtInterest,
  };
}

export function getGameSummary(state: GameState): GameSummary {
  const country = COUNTRIES[state.countryId];
  const victory = getVictoryProgress(state.current, state.anchor);
  return {
    fiscal: calculateFiscalSummary(state),
    monthlyHistory: state.history.slice(-CONFIG.history.summaryWindow),
    sectorOutputs: getSectorOutputs(state.current, country.sectors),
    taylorSuggestion: getTaylorSuggestion(state),
    nextMilestone: victory.nextMilestone,
    victoryProgress: victory.progress * CONFIG.rating.scoreScale,
  };
}

