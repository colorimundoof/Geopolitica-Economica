import { CONFIG, clamp } from "./config";
import { normalSample, mulberry32 } from "./rng";
import type { EventEffect, GameAnchor, GameState } from "./types";

export interface TradeResult {
  exchangeRate: number;
  reserves: number;
  exports: number;
  imports: number;
  currentAccount: number;
}

function getCurrencyShock(state: GameState): number {
  const random = mulberry32(
    (state.seed ^ state.turn ^ CONFIG.events.seedOffset) >>> 0,
  );
  return (
    normalSample(random) * CONFIG.trade.currencyShockStandardDeviation
  );
}

export function calculateTrade(
  gdp: number,
  exchangeRate: number,
  anchor: GameAnchor,
  priceLevel: number,
): Pick<TradeResult, "exports" | "imports" | "currentAccount"> {
  const outputRatio =
    anchor.gdp > 0 ? gdp / anchor.gdp : CONFIG.scale.identity;
  const exchangeRatio =
    anchor.exchangeRate > 0
      ? clamp(
          (exchangeRate / anchor.exchangeRate) *
            (anchor.priceLevel / priceLevel),
          CONFIG.trade.depreciationMinimum,
          CONFIG.trade.depreciationMaximum,
        )
      : CONFIG.scale.identity;
  const exports =
    anchor.gdp *
    CONFIG.trade.exportShare *
    outputRatio ** CONFIG.trade.exportGdpElasticity *
    exchangeRatio ** CONFIG.trade.exportExchangeElasticity;
  const imports =
    anchor.gdp *
    CONFIG.trade.importShare *
    outputRatio ** CONFIG.trade.importGdpElasticity *
    exchangeRatio ** -CONFIG.trade.importExchangeElasticity;

  return { exports, imports, currentAccount: exports - imports };
}

/** Depreciação anual "normal" do país (diferencial de inflação da âncora). */
export function baselineDepreciation(anchor: GameAnchor): number {
  return (
    CONFIG.trade.inflationPassThrough *
    (anchor.inflation - CONFIG.trade.worldInflation)
  );
}

export function updateTradeAndExchange(
  state: GameState,
  eventEffects: Pick<EventEffect, "exchangeRate">,
  capitalFlight = 0,
): TradeResult {
  const current = state.current;
  const pressure =
    CONFIG.trade.inflationPassThrough *
      (current.inflation - CONFIG.trade.worldInflation) +
    capitalFlight +
    CONFIG.trade.currentAccountResponse *
      (-current.currentAccount /
        Math.max(current.gdp, CONFIG.scale.identity)) -
    CONFIG.trade.realRateResponse *
      (current.realRate - CONFIG.trade.realRateReference) -
    CONFIG.trade.confidenceResponse *
      (current.confidence - CONFIG.trade.confidencePivot) +
    getCurrencyShock(state) +
    eventEffects.exchangeRate;

  const interventionOffset = state.policy.fxIntervention
    ? CONFIG.trade.interventionMonthlyOffset
    : 0;
  const monthlyVariation =
    pressure / CONFIG.time.monthsPerYear - interventionOffset;
  const exchangeRate = Math.max(
    CONFIG.clamp.exchangeMinimum,
    current.exchangeRate * (CONFIG.scale.identity + monthlyVariation),
  );
  const afterIntervention = state.policy.fxIntervention
    ? Math.max(
        0,
        current.reserves *
          (1 - CONFIG.trade.interventionReserveCost),
      )
    : current.reserves;
  const reserves = Math.max(
    0,
    afterIntervention *
      (1 - CONFIG.risk.flight.reserveDrain * capitalFlight),
  );
  const trade = calculateTrade(
    current.gdp,
    exchangeRate,
    state.anchor,
    current.priceLevel,
  );

  return { exchangeRate, reserves, ...trade };
}

export function annualizedDepreciation(state: GameState): number {
  const historyIndex = Math.max(
    0,
    state.history.length -
      CONFIG.monetary.inflationHistoryMonths -
      1,
  );
  const referenceRate =
    state.history[historyIndex]?.exchangeRate ?? state.anchor.exchangeRate;
  if (referenceRate <= 0) return 0;
  return state.current.exchangeRate / referenceRate - CONFIG.scale.identity;
}

