import { COUNTRIES } from "@/data/countries";
import { CONFIG } from "./config";
import { calculateFiscal } from "./fiscal";
import { calculatePotentialGrowth } from "./economy";
import { initializeResearch } from "./research";
import { adjustedRatingScore, calculateRawRatingScore } from "./rating";
import { calculateTrade } from "./trade";
import type {
  CountryId,
  Economy,
  GameAnchor,
  GameState,
  MonthlyRecord,
} from "./types";
import { SAVE_VERSION } from "./types";

export function createGameState(
  countryId: CountryId,
  seed: number,
): GameState {
  const country = COUNTRIES[countryId];
  const debt = country.gdp * country.debtToGdp;
  const economy: Economy = {
    gdp: country.gdp,
    gdpPerCapita: country.gdp / country.population,
    population: country.population,
    unemployment: country.unemployment,
    inflation: country.inflation,
    expectedInflation: country.inflation,
    inflationTarget: country.inflationTarget,
    interestRate: country.interestRate,
    realRate: country.interestRate - country.inflation,
    exchangeRate: country.exchangeRate,
    investmentRate: country.investmentRate,
    moneyGrowth: country.moneyGrowth,
    gap: country.gap,
    potentialGrowth: country.baseGrowth,
    growth: country.baseGrowth,
    confidence: country.confidence,
    stability: country.social.stability,
    happiness: country.social.happiness,
    inequality: country.social.inequality,
    institutions: country.indices.institutions,
    debt,
    debtToGdp: country.debtToGdp,
    debtCostAvg: country.interestRate,
    reserves: country.reserves,
    currentAccount: 0,
    exports: 0,
    imports: 0,
    priceLevel: 1,
    primaryRatio: 0,
    deficitRatio: 0,
    nominalDeficitRatio: 0,
    ratingScore: 0,
    rating: country.rating,
    riskSpread: CONFIG.debt.ratingPremium[country.rating],
    npl: CONFIG.credit.initialNpl,
    realRateLag: country.interestRate - country.inflation,
    capitalFlight: 0,
    indices: { ...country.indices },
    spendingPct: { ...country.spendingPct },
    taxRates: { ...country.taxRates },
    sectors: { ...country.sectors },
  };
  const fiscal = calculateFiscal(
    economy.gdp,
    country.taxRates,
    country.spendingPct,
  );
  economy.primaryRatio = fiscal.primaryRatio;
  economy.deficitRatio = fiscal.deficitRatio;
  economy.nominalDeficitRatio =
    -fiscal.primaryRatio + economy.debtCostAvg * economy.debtToGdp;

  const anchor: GameAnchor = {
    gdp: economy.gdp,
    gdpPerCapita: economy.gdpPerCapita,
    population: economy.population,
    exchangeRate: economy.exchangeRate,
    investmentRate: economy.investmentRate,
    inflation: economy.inflation,
    interestRate: economy.interestRate,
    realRate: economy.realRate,
    confidence: economy.confidence,
    stability: economy.stability,
    happiness: economy.happiness,
    inequality: economy.inequality,
    unemployment: economy.unemployment,
    nairu: country.nairu,
    deficitRatio: fiscal.deficitRatio,
    primaryRatio: fiscal.primaryRatio,
    indices: { ...economy.indices },
    spendingPct: { ...country.spendingPct },
    corporateRate: country.taxRates.corporate,
    consumptionRate: country.taxRates.consumption,
    ratingScore: 0,
    moneyBase: country.moneyGrowth,
    potentialOffset: 0,
    priceLevel: economy.priceLevel,
    reserves: economy.reserves,
    debtToGdp: economy.debtToGdp,
    riskSpread: economy.riskSpread,
    npl: economy.npl,
  };
  anchor.potentialOffset =
    country.baseGrowth -
    calculatePotentialGrowth(economy, anchor, {
      potentialGrowth: 0,
      investment: 0,
      taxEfficiency: 0,
      institutions: 0,
      technology: 0,
      happiness: 0,
      stability: 0,
    });
  const trade = calculateTrade(
    economy.gdp,
    economy.exchangeRate,
    anchor,
    economy.priceLevel,
  );
  Object.assign(economy, trade);

  const rawRatingScore = calculateRawRatingScore(economy);
  anchor.ratingScore = rawRatingScore;
  economy.ratingScore = adjustedRatingScore(
    rawRatingScore,
    anchor,
    country.rating,
  );

  const historyRecord: MonthlyRecord = {
    turn: 0,
    label: `${CONFIG.time.monthNames[CONFIG.time.initialMonth - 1]} • ${CONFIG.time.initialYear}`,
    gdp: economy.gdp,
    gdpPerCapita: economy.gdpPerCapita,
    inflation: economy.inflation,
    unemployment: economy.unemployment,
    interestRate: economy.interestRate,
    exchangeRate: economy.exchangeRate,
    debtToGdp: economy.debtToGdp,
    rating: economy.rating,
    ratingScore: economy.ratingScore,
    riskSpread: economy.riskSpread,
    npl: economy.npl,
    growth: economy.growth,
    happiness: economy.happiness,
    stability: economy.stability,
    primaryRatio: economy.primaryRatio,
    confidence: economy.confidence,
    report: ["Você assumiu o governo. Suas decisões começam a valer neste mês."],
  };

  return {
    version: SAVE_VERSION,
    countryId,
    seed: seed >>> 0,
    turn: 0,
    month: CONFIG.time.initialMonth,
    year: CONFIG.time.initialYear,
    status: "playing",
    current: economy,
    anchor,
    policy: {
      taxRates: { ...country.taxRates },
      spendingPct: { ...country.spendingPct },
      rateMode: "auto",
      manualInterestRate: country.interestRate,
      researchProjectId: null,
      fxIntervention: false,
    },
    researchPoints: 0,
    research: initializeResearch(),
    activeEvents: [],
    eventCooldowns: {},
    history: [historyRecord],
    report: historyRecord.report,
    victoryMonths: 0,
    defaultMonths: 0,
    politicalCrisisMonths: 0,
    hyperinflationMonths: 0,
    lastRatingChangeTurn: 0,
  };
}

