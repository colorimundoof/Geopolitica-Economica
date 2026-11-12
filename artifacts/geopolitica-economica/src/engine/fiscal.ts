import { CONFIG, clamp } from "./config";
import type {
  CountrySpending,
  CountryTaxRates,
  FiscalLine,
  FiscalSummary,
  GameState,
  SpendingCategory,
  TaxType,
} from "./types";

export interface FiscalResult {
  summary: FiscalSummary;
  primaryRatio: number;
  deficitRatio: number;
}

const TAX_LABELS: Record<TaxType, string> = {
  income: "Imposto de renda",
  corporate: "Imposto corporativo",
  consumption: "Imposto sobre consumo",
};

const TAX_TYPES: TaxType[] = ["income", "corporate", "consumption"];
const SPENDING_CATEGORIES: SpendingCategory[] = [
  "health",
  "education",
  "infrastructure",
  "defense",
  "research",
  "other",
];

export function calculateFiscal(
  gdp: number,
  taxRates: CountryTaxRates,
  spendingPct: CountrySpending,
  efficiencyBonus = 0,
): FiscalResult {
  const revenueLines: FiscalLine[] = TAX_TYPES.map((category) => {
    const rate = taxRates[category];
    const maximumRate = CONFIG.fiscal.maximumRates[category];
    const efficiency = Math.max(
      CONFIG.fiscal.minimumEfficiency,
      1 - CONFIG.fiscal.lafferCurvature * (rate / maximumRate) ** 2,
    );
    const amount =
      gdp *
      (1 + efficiencyBonus) *
      CONFIG.fiscal.baseShares[category] *
      rate *
      efficiency;

    return {
      category,
      label: TAX_LABELS[category],
      amount,
      shareOfGdp: gdp > 0 ? amount / gdp : 0,
    };
  });

  const spendingLines: FiscalLine[] = SPENDING_CATEGORIES.map((category) => {
    const amount = gdp * spendingPct[category];
    return {
      category,
      label: CONFIG.spendingLabels[category],
      amount,
      shareOfGdp: spendingPct[category],
    };
  });

  const revenue = revenueLines.reduce((total, line) => total + line.amount, 0);
  const expenditure = spendingLines.reduce(
    (total, line) => total + line.amount,
    0,
  );
  const primaryBalance = revenue - expenditure;
  const primaryRatio = gdp > 0 ? primaryBalance / gdp : 0;

  return {
    summary: {
      revenue,
      expenditure,
      primaryBalance,
      nominalDeficit: -primaryBalance,
      debtInterest: 0,
      revenueLines,
      spendingLines,
    },
    primaryRatio,
    deficitRatio: -primaryRatio,
  };
}

export function getFiscalSummary(state: GameState): FiscalSummary {
  const fiscal = calculateFiscal(
    state.current.gdp,
    state.policy.taxRates,
    state.policy.spendingPct,
  );
  // anual, na mesma unidade da receita, da despesa e do saldo primário
  const debtInterest = state.current.debt * state.current.debtCostAvg;
  return {
    ...fiscal.summary,
    debtInterest,
    nominalDeficit: -fiscal.summary.primaryBalance + debtInterest,
  };
}

export function getFiscalRatios(
  state: GameState,
): { primaryRatio: number; deficitRatio: number } {
  const fiscal = calculateFiscal(
    state.current.gdp,
    state.policy.taxRates,
    state.policy.spendingPct,
  );
  return {
    primaryRatio: fiscal.primaryRatio,
    deficitRatio: clamp(
      fiscal.deficitRatio,
      -CONFIG.clamp.maximum,
      CONFIG.clamp.maximum,
    ),
  };
}

