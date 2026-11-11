import type { EventEffect } from "@/engine/types";

export interface EventDefinition extends Omit<EventEffect, "monthsRemaining"> {
  duration: number;
}

export const EVENT_CATALOG: EventDefinition[] = [
  {
    id: "commodity-boom",
    title: "Alta das commodities",
    description:
      "A procura global por matérias-primas aumenta. Exportadores ganham fôlego, mas a pressão de preços cresce.",
    duration: 3,
    growth: 0.012,
    inflation: 0.008,
    confidence: 0.025,
    exchangeRate: -0.01,
  },
  {
    id: "energy-shock",
    title: "Choque de energia",
    description:
      "O custo internacional de energia sobe e encarece a produção em vários setores.",
    duration: 3,
    growth: -0.018,
    inflation: 0.035,
    confidence: -0.025,
    exchangeRate: 0.015,
  },
  {
    id: "drought",
    title: "Seca prolongada",
    description:
      "A quebra de safra pressiona alimentos, exportações e a confiança no curto prazo.",
    duration: 2,
    growth: -0.012,
    inflation: 0.02,
    confidence: -0.018,
    exchangeRate: 0.006,
  },
  {
    id: "trade-agreement",
    title: "Acordo comercial",
    description:
      "Novas rotas de comércio abrem oportunidades para exportadores e investidores.",
    duration: 3,
    growth: 0.01,
    inflation: -0.003,
    confidence: 0.035,
    exchangeRate: -0.012,
  },
  {
    id: "global-risk",
    title: "Aversão global ao risco",
    description:
      "Investidores buscam segurança. O câmbio sente a saída de capital e o crédito fica mais cauteloso.",
    duration: 3,
    growth: -0.014,
    inflation: 0.006,
    confidence: -0.04,
    exchangeRate: 0.028,
  },
];

