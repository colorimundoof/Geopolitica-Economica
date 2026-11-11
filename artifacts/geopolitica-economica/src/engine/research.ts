import { RESEARCH_CATALOG } from "@/data/research";
import { CONFIG } from "./config";
import type { GameState, ResearchProject } from "./types";

export interface ResearchEffects {
  potentialGrowth: number;
  investment: number;
  taxEfficiency: number;
  institutions: number;
  technology: number;
  happiness: number;
  stability: number;
}

export interface ResearchProgressResult {
  research: ResearchProject[];
  researchPoints: number;
  completedProject: string | null;
}

export function initializeResearch(): ResearchProject[] {
  return RESEARCH_CATALOG.map((project) => ({
    ...project,
    progress: 0,
    completed: false,
  }));
}

export function advanceResearch(
  state: GameState,
  researchShare: number,
): ResearchProgressResult {
  const earned =
    CONFIG.research.basePointsPerMonth +
    CONFIG.research.pointsPerResearchShare * researchShare;
  let researchPoints = state.researchPoints + earned;
  let completedProject: string | null = null;

  const research = state.research.map((project) => {
    if (
      project.id !== state.policy.researchProjectId ||
      project.completed ||
      completedProject !== null
    ) {
      return { ...project };
    }

    const completedPoints = project.cost * project.progress;
    const remaining = Math.max(0, project.cost - completedPoints);
    const invested = Math.min(researchPoints, remaining);
    researchPoints -= invested;
    const progress = Math.min(1, (completedPoints + invested) / project.cost);
    const completed = progress >= 1;
    if (completed) completedProject = project.name;

    return { ...project, progress, completed };
  });

  return { research, researchPoints, completedProject };
}

export function getResearchEffects(
  research: ResearchProject[],
): ResearchEffects {
  return research.reduce<ResearchEffects>(
    (effects, project) => {
      if (!project.completed) return effects;

      switch (project.area) {
        case "Econômica":
          effects.potentialGrowth +=
            project.bonus * CONFIG.research.completionGrowthPerBonus;
          effects.investment += project.bonus;
          effects.taxEfficiency += CONFIG.fiscal.taxEfficiencyResearchBonus;
          break;
        case "Social":
          effects.happiness +=
            project.bonus * CONFIG.research.socialHappinessMultiplier;
          break;
        case "Militar":
          effects.stability +=
            project.bonus * CONFIG.research.militaryStabilityMultiplier;
          break;
        case "Governamental":
          effects.institutions +=
            project.bonus *
            CONFIG.research.governmentInstitutionsMultiplier;
          break;
        case "Tecnológica":
          effects.potentialGrowth +=
            project.bonus * CONFIG.research.completionGrowthPerBonus;
          effects.investment += project.bonus;
          effects.technology +=
            project.bonus * CONFIG.research.technologyIndexMultiplier;
          break;
      }

      return effects;
    },
    {
      potentialGrowth: 0,
      investment: 0,
      taxEfficiency: 0,
      institutions: 0,
      technology: 0,
      happiness: 0,
      stability: 0,
    },
  );
}

