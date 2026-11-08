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
  {
    id: 'EXP-001',
    title: 'Comparador de generadores de mazmorra',
    description: 'Compara BSP, salas+pasillos e híbrido con la misma semilla, métricas y decisión.',
    question: '¿Qué generador produce la mazmorra legible, variada y con los pasillos y huecos de puerta que queremos?',
    path: '/experiments/EXP-001-generador-mazmorra/',
    status: 'decided',
  },
  {
    id: 'EXP-002',
    title: 'Ritmo del movimiento animado',
    description: 'Compara duración de paso, pausa por tile y tratamiento de la diagonal con el recorrido real.',
    question: '¿Qué duración de paso, pausa por tile y tratamiento de la diagonal hacen que recorrer el camino se sienta ágil y legible?',
    path: '/experiments/EXP-002-ritmo-movimiento/',
    status: 'ready',
  },
];
