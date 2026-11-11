import { CONFIG, clamp } from "./config";
import { isAtLeastRating } from "./rating";
import type { GameAnchor, GameState, Rating } from "./types";

export interface EndingResult {
  status: GameState["status"];
  victoryMonths: number;
  defaultMonths: number;
  politicalCrisisMonths: number;
  hyperinflationMonths: number;
  progress: number;
  nextMilestone: string;
}

export function isVictoryEligible(
  current: GameState["current"],
  anchor: GameAnchor,
  requiredRating: Rating = "A",
): boolean {
  return (
    current.gdp >= anchor.gdp * CONFIG.victory.gdpMultiple &&
    current.gdpPerCapita >=
      anchor.gdpPerCapita * CONFIG.victory.gdpPerCapitaMultiple &&
    current.indices.technology >= CONFIG.victory.technologyMinimum &&
    current.institutions >= CONFIG.victory.institutionsMinimum &&
    current.stability >= CONFIG.victory.stabilityMinimum &&
    isAtLeastRating(current.rating, requiredRating)
  );
}

export function getVictoryProgress(
  current: GameState["current"],
  anchor: GameAnchor,
): { progress: number; nextMilestone: string } {
  const checks: { complete: boolean; label: string }[] = [
    {
      complete: current.gdp >= anchor.gdp * CONFIG.victory.gdpMultiple,
      label: "Levar o PIB a 2,2 vezes o valor inicial",
    },
    {
      complete:
        current.gdpPerCapita >=
        anchor.gdpPerCapita * CONFIG.victory.gdpPerCapitaMultiple,
      label: "Elevar o PIB per capita a 2,4 vezes o inicial",
    },
    {
      complete: current.indices.technology >= CONFIG.victory.technologyMinimum,
      label: "Atingir tecnologia de 0,80",
    },
    {
      complete: current.institutions >= CONFIG.victory.institutionsMinimum,
      label: "Atingir instituições de 0,75",
    },
    {
      complete: current.stability >= CONFIG.victory.stabilityMinimum,
      label: "Manter estabilidade em 0,70",
    },
    {
      complete: isAtLeastRating(current.rating, "A"),
      label: "Alcançar rating A ou superior",
    },
  ];
  const completed = checks.filter((check) => check.complete).length;
  return {
    progress: completed / checks.length,
    nextMilestone:
      checks.find((check) => !check.complete)?.label ??
      "Manter todas as metas por 24 meses",
  };
}

export function evaluateEnding(state: GameState): EndingResult {
  const current = state.current;
  const victoryMonths = isVictoryEligible(current, state.anchor)
    ? state.victoryMonths + 1
    : 0;
  const defaultMonths =
    current.rating === "D" ? state.defaultMonths + 1 : 0;
  const politicalCrisisMonths =
    current.stability < CONFIG.victory.politicalStabilityMaximum
      ? state.politicalCrisisMonths + 1
      : 0;
  const hyperinflationMonths =
    current.inflation >= CONFIG.victory.hyperinflationMinimum
      ? state.hyperinflationMonths + 1
      : 0;
  let status: GameState["status"] = "playing";

  if (victoryMonths >= CONFIG.victory.requiredMonths) {
    status = "victory";
  } else if (defaultMonths >= CONFIG.victory.defaultRatingMonths) {
    status = "default";
  } else if (
    politicalCrisisMonths >= CONFIG.victory.politicalCrisisMonths
  ) {
    status = "political-crisis";
  } else if (
    hyperinflationMonths >= CONFIG.victory.hyperinflationMonths
  ) {
    status = "hyperinflation";
  }

  const { progress, nextMilestone } = getVictoryProgress(
    current,
    state.anchor,
  );
  return {
    status,
    victoryMonths,
    defaultMonths,
    politicalCrisisMonths,
    hyperinflationMonths,
    progress: clamp(progress, 0, 1),
    nextMilestone,
  };
}

