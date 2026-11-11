import type { CountrySectors, Economy } from "./types";

export interface SectorOutput {
  id: keyof CountrySectors;
  label: string;
  share: number;
  output: number;
}

const SECTOR_LABELS: Record<keyof CountrySectors, string> = {
  agriculture: "Agropecuária",
  industry: "Indústria",
  services: "Serviços",
  technology: "Tecnologia",
};

export function getSectorOutputs(
  economy: Economy,
  sectors: CountrySectors,
): SectorOutput[] {
  return (Object.keys(sectors) as (keyof CountrySectors)[]).map((id) => ({
    id,
    label: SECTOR_LABELS[id],
    share: sectors[id],
    output: economy.gdp * sectors[id],
  }));
}

