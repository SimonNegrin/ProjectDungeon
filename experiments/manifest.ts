export type ExperimentManifestEntry = {
  id: string;
  title: string;
  description: string;
  question: string;
  path: string;
  status: string;
};

export const experiments: ExperimentManifestEntry[] = [
  {
    id: 'EXP-000',
    title: 'Shell de experimentos',
    description: 'Prueba de humo del shell: controles, A/B, métricas y decisión.',
    question: '¿El shell permite ajustar parámetros, comparar variantes y exportar una decisión?',
    path: '/experiments/EXP-000-shell-demo/',
    status: 'decided',
  },
];
