import { COUNTRIES } from "@/data/countries";
import { capitalFlightPressure, nextNpl, nextRiskSpread } from "./risk";
import { CONFIG, clamp } from "./config";
import { calculateRealEconomy } from "./economy";
import { advanceEvents, sumEventEffects } from "./events";
import { calculateFiscal } from "./fiscal";
import { calculateMonetaryOutcome } from "./monetary";
import { adjustedRatingScore, calculateRawRatingScore, updateRatingFromSpread } from "./rating";
import { advanceResearch, getResearchEffects } from "./research";
import { updateIndicesAndSocial } from "./social";
import { updateTradeAndExchange } from "./trade";
import { evaluateEnding } from "./victory";
import type { Decisions, GameState, MonthlyRecord, Policy } from "./types";

const MONTH_NAMES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

function applyDecisions(policy: Policy, decisions: Decisions): Policy {
  const taxRates = decisions.taxRates
    ? {
        income: clamp(
          decisions.taxRates.income ?? policy.taxRates.income,
          CONFIG.decisions.minimumTaxRate,
          CONFIG.fiscal.maximumRates.income,
        ),
        corporate: clamp(
          decisions.taxRates.corporate ?? policy.taxRates.corporate,
          CONFIG.decisions.minimumTaxRate,
          CONFIG.fiscal.maximumRates.corporate,
        ),
        consumption: clamp(
          decisions.taxRates.consumption ?? policy.taxRates.consumption,
          CONFIG.decisions.minimumTaxRate,
          CONFIG.fiscal.maximumRates.consumption,
        ),
      }
    : { ...policy.taxRates };
  const spendingPct = decisions.spendingPct
    ? {
        health: clamp(
          decisions.spendingPct.health ?? policy.spendingPct.health,
          CONFIG.decisions.minimumSpending,
          CONFIG.decisions.maximumSpendingCategory,
        ),
        education: clamp(
          decisions.spendingPct.education ?? policy.spendingPct.education,
          CONFIG.decisions.minimumSpending,
          CONFIG.decisions.maximumSpendingCategory,
        ),
        infrastructure: clamp(
          decisions.spendingPct.infrastructure ??
            policy.spendingPct.infrastructure,
          CONFIG.decisions.minimumSpending,
          CONFIG.decisions.maximumSpendingCategory,
        ),
        defense: clamp(
          decisions.spendingPct.defense ?? policy.spendingPct.defense,
          CONFIG.decisions.minimumSpending,
          CONFIG.decisions.maximumSpendingCategory,
        ),
        research: clamp(
          decisions.spendingPct.research ?? policy.spendingPct.research,
          CONFIG.decisions.minimumSpending,
          CONFIG.decisions.maximumSpendingCategory,
        ),
        other: clamp(
          decisions.spendingPct.other ?? policy.spendingPct.other,
          CONFIG.decisions.minimumSpending,
          CONFIG.decisions.maximumSpendingCategory,
        ),
      }
    : { ...policy.spendingPct };

  return {
    ...policy,
    taxRates,
    spendingPct,
    rateMode: decisions.rateMode ?? policy.rateMode,
    manualInterestRate: clamp(
      decisions.manualInterestRate ?? policy.manualInterestRate,
      CONFIG.monetary.interestMinimum,
      CONFIG.monetary.interestMaximum,
    ),
    researchProjectId:
      decisions.researchProjectId === undefined
        ? policy.researchProjectId
        : decisions.researchProjectId,
    fxIntervention: decisions.fxIntervention ?? policy.fxIntervention,
  };
}

export function updatePolicy(state: GameState, patch: Decisions): GameState {
  return {
    ...state,
    policy: applyDecisions(state.policy, patch),
  };
}

function createReport(
  state: GameState,
  previousRating: string,
  eventMessages: string[],
  completedProject: string | null,
  manualPenalty: number,
): string[] {
  const messages = [...eventMessages];
  messages.push(
    `O PIB cresceu ${(state.current.growth * CONFIG.rating.scoreScale).toFixed(1)}% em ritmo anualizado; a inflação está em ${(state.current.inflation * CONFIG.rating.scoreScale).toFixed(1)}%.`,
  );
  messages.push(
    `Saldo primário: ${(state.current.primaryRatio * CONFIG.rating.scoreScale).toFixed(1)}% do PIB. Dívida pública: ${(state.current.debtToGdp * CONFIG.rating.scoreScale).toFixed(1)}% do PIB.`,
  );
  if (manualPenalty > 0) {
    messages.push(
      "A mudança brusca nos juros reduziu a confiança dos agentes.",
    );
  }
  if (completedProject) {
    messages.push(`Pesquisa concluída: ${completedProject}.`);
  }
  if (state.current.capitalFlight > 0.001) {
    messages.push(
      `Fuga de capitais: o risco-país subiu e pressiona o câmbio em ${(state.current.capitalFlight * CONFIG.rating.scoreScale).toFixed(1)}% ao ano.`,
    );
  }
  if (state.current.npl > CONFIG.risk.highCreditMessageThreshold) {
    messages.push(
      `A inadimplência chegou a ${(state.current.npl * CONFIG.rating.scoreScale).toFixed(1)}% e trava o crédito e o investimento.`,
    );
  }
  if (state.current.rating !== previousRating) {
    messages.push(
      `O rating mudou de ${previousRating} para ${state.current.rating}.`,
    );
  }
  return messages;
}

export function processTurn(
  state: GameState,
  decisions: Decisions,
): GameState {
  if (state.status !== "playing") {
    return {
      ...state,
      current: { ...state.current },
      policy: { ...state.policy },
      history: [...state.history],
      report: [...state.report],
    };
  }

  const policy = applyDecisions(state.policy, decisions);
  const decidedState: GameState = {
    ...state,
    policy,
    current: {
      ...state.current,
      taxRates: { ...policy.taxRates },
      spendingPct: { ...policy.spendingPct },
      indices: { ...state.current.indices },
      sectors: { ...state.current.sectors },
    },
  };

  const eventAdvance = advanceEvents(decidedState);
  const eventEffects = sumEventEffects(eventAdvance.activeEvents);
  const researchProgress = advanceResearch(
    decidedState,
    policy.spendingPct.research,
  );
  const researchEffects = getResearchEffects(researchProgress.research);
  const fiscal = calculateFiscal(
    decidedState.current.gdp,
    policy.taxRates,
    policy.spendingPct,
    researchEffects.taxEfficiency,
  );

  const monetary = calculateMonetaryOutcome(
    decidedState,
    fiscal,
    eventEffects,
  );
  const currentAfterMonetary = {
    ...decidedState.current,
    ...monetary,
    confidence: clamp(
      decidedState.current.confidence - monetary.manualConfidencePenalty,
      CONFIG.clamp.confidenceMinimum,
      CONFIG.clamp.confidenceMaximum,
    ),
    primaryRatio: fiscal.primaryRatio,
    deficitRatio: fiscal.deficitRatio,
    taxRates: { ...policy.taxRates },
    spendingPct: { ...policy.spendingPct },
  };

  const tradeState: GameState = {
    ...decidedState,
    current: currentAfterMonetary,
    activeEvents: eventAdvance.activeEvents,
    eventCooldowns: eventAdvance.cooldowns,
  };
  const capitalFlight = capitalFlightPressure(
    decidedState.current.riskSpread,
    state.anchor,
  );
  const trade = updateTradeAndExchange(
    tradeState,
    eventEffects,
    capitalFlight,
  );
  const npl = nextNpl(currentAfterMonetary, state.anchor);
  const realRateLag =
    decidedState.current.realRateLag +
    CONFIG.lag.realRate *
      (monetary.realRate - decidedState.current.realRateLag);
  const currentAfterTrade = {
    ...currentAfterMonetary,
    ...trade,
    npl,
    realRateLag,
    capitalFlight,
    confidence: clamp(
      currentAfterMonetary.confidence -
        CONFIG.risk.flight.confidenceHit * capitalFlight,
      CONFIG.clamp.confidenceMinimum,
      CONFIG.clamp.confidenceMaximum,
    ),
  };
  const realEconomy = calculateRealEconomy(
    { ...tradeState, current: currentAfterTrade },
    fiscal,
    eventEffects,
    researchEffects,
  );
  const currentAfterGrowth = {
    ...currentAfterTrade,
    ...realEconomy,
  };

  const country = COUNTRIES[state.countryId];
  const initialRating = country.rating;
  const debtCostTarget =
    currentAfterGrowth.interestRate +
    (state.current.riskSpread - state.anchor.riskSpread);
  const debtCostAvg =
    currentAfterGrowth.debtCostAvg +
    CONFIG.debt.convergenceMonthly *
      (debtCostTarget - currentAfterGrowth.debtCostAvg);
  // dívida em moeda estrangeira: desvalorização do câmbio aumenta o estoque
  const monthlyDepreciation =
    state.current.exchangeRate > 0
      ? currentAfterGrowth.exchangeRate / state.current.exchangeRate - 1
      : 0;
  const foreignRevaluation =
    country.foreignDebtShare *
    currentAfterGrowth.debt *
    monthlyDepreciation;
  const debt =
    currentAfterGrowth.debt -
    (fiscal.summary.primaryBalance * currentAfterGrowth.priceLevel) /
      CONFIG.debt.primaryMonthlyDivisor +
    (debtCostAvg * currentAfterGrowth.debt) /
      CONFIG.debt.interestMonthlyDivisor +
    foreignRevaluation;
  const debtToGdp =
    debt /
    (currentAfterGrowth.gdp * currentAfterGrowth.priceLevel);
  const currentBeforeRating = {
    ...currentAfterGrowth,
    debt,
    debtToGdp,
    debtCostAvg,
    nominalDeficitRatio:
      -fiscal.primaryRatio + debtCostAvg * debtToGdp,
  };
  const rawRatingScore = calculateRawRatingScore(currentBeforeRating);
  const ratingScore = adjustedRatingScore(
    rawRatingScore,
    state.anchor,
    initialRating,
  );
  const nextTurn = state.turn + 1;
  const riskSpread = nextRiskSpread(state.current.riskSpread, state.anchor, {
    debtToGdp,
    deficitRatio: fiscal.deficitRatio,
    inflation: currentBeforeRating.inflation,
    reserves: currentBeforeRating.reserves,
    institutions: currentBeforeRating.indices.institutions,
    growth: currentBeforeRating.growth,
    potentialGrowth: currentBeforeRating.potentialGrowth,
    npl: currentBeforeRating.npl,
  });
  const ratingUpdate = updateRatingFromSpread(
    riskSpread,
    currentBeforeRating.rating,
    nextTurn,
    state.lastRatingChangeTurn,
  );
  const currentRated = {
    ...currentBeforeRating,
    ratingScore,
    riskSpread,
    rating: ratingUpdate.rating,
  };
  const current = updateIndicesAndSocial(
    currentRated,
    policy,
    state.anchor,
    researchEffects,
    eventEffects.confidence,
  );

  const month = (state.month % CONFIG.time.monthsPerYear) + 1;
  const year =
    state.year +
    (state.month >= CONFIG.time.monthsPerYear ? 1 : 0);
  const monthName = MONTH_NAMES[month - 1] ?? "Jan";
  const nextState: GameState = {
    ...state,
    turn: nextTurn,
    month,
    year,
    current,
    policy,
    researchPoints: researchProgress.researchPoints,
    research: researchProgress.research,
    activeEvents: eventAdvance.activeEvents,
    eventCooldowns: eventAdvance.cooldowns,
    lastRatingChangeTurn: ratingUpdate.lastChangeTurn,
    report: [],
  };
  const report = createReport(
    { ...nextState, report: [] },
    currentBeforeRating.rating,
    eventAdvance.messages,
    researchProgress.completedProject,
    monetary.manualConfidencePenalty,
  );
  const record: MonthlyRecord = {
    turn: nextTurn,
    label: `${monthName} • ${year}`,
    gdp: current.gdp,
    gdpPerCapita: current.gdpPerCapita,
    inflation: current.inflation,
    unemployment: current.unemployment,
    interestRate: current.interestRate,
    exchangeRate: current.exchangeRate,
    debtToGdp: current.debtToGdp,
    rating: current.rating,
    ratingScore: current.ratingScore,
    riskSpread: current.riskSpread,
    npl: current.npl,
    growth: current.growth,
    happiness: current.happiness,
    stability: current.stability,
    primaryRatio: current.primaryRatio,
    confidence: current.confidence,
    report,
  };
  const withHistory: GameState = {
    ...nextState,
    report,
    history: [...state.history, record].slice(-CONFIG.history.maximumRecords),
  };
  const ending = evaluateEnding(withHistory);

  return {
    ...withHistory,
    status: ending.status,
    victoryMonths: ending.victoryMonths,
    defaultMonths: ending.defaultMonths,
    politicalCrisisMonths: ending.politicalCrisisMonths,
    hyperinflationMonths: ending.hyperinflationMonths,
  };
}

