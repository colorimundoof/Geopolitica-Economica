import type { ResearchProject } from "@/engine/types";

export type ResearchDefinition = Pick<
  ResearchProject,
  "id" | "name" | "area" | "description" | "cost" | "bonus"
>;

export const RESEARCH_CATALOG: ResearchDefinition[] = [
  {
    id: "productive-credit",
    name: "Crédito produtivo",
    area: "Econômica",
    description: "Amplia o acesso a capital para empresas e novos investimentos.",
    cost: 25,
    bonus: 0.003,
  },
  {
    id: "tax-modernization",
    name: "Modernização tributária",
    area: "Econômica",
    description: "Reduz distorções na arrecadação e melhora a eficiência fiscal.",
    cost: 30,
    bonus: 0.004,
  },
  {
    id: "public-health",
    name: "Rede pública de saúde",
    area: "Social",
    description: "Melhora resultados sociais e resiliência da população.",
    cost: 25,
    bonus: 0.025,
  },
  {
    id: "technical-education",
    name: "Educação técnica",
    area: "Social",
    description: "Prepara trabalhadores para setores de maior produtividade.",
    cost: 35,
    bonus: 0.03,
  },
  {
    id: "defense-logistics",
    name: "Logística de defesa",
    area: "Militar",
    description: "Fortalece a capacidade de resposta e a segurança nacional.",
    cost: 30,
    bonus: 0.025,
  },
  {
    id: "domestic-industry",
    name: "Indústria estratégica",
    area: "Militar",
    description: "Desenvolve fornecedores nacionais de materiais essenciais.",
    cost: 40,
    bonus: 0.002,
  },
  {
    id: "digital-government",
    name: "Governo digital",
    area: "Governamental",
    description: "Simplifica serviços públicos e fortalece a capacidade do Estado.",
    cost: 30,
    bonus: 0.035,
  },
  {
    id: "regulatory-quality",
    name: "Qualidade regulatória",
    area: "Governamental",
    description: "Dá previsibilidade às regras e melhora o ambiente de negócios.",
    cost: 40,
    bonus: 0.04,
  },
  {
    id: "advanced-computing",
    name: "Computação avançada",
    area: "Tecnológica",
    description: "Acelera a inovação e a difusão de tecnologia na economia.",
    cost: 45,
    bonus: 0.006,
  },
  {
    id: "clean-energy",
    name: "Energia limpa",
    area: "Tecnológica",
    description: "Diversifica a matriz energética e reduz riscos de oferta.",
    cost: 50,
    bonus: 0.007,
  },
];

