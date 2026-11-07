export type RangeParameter = {
  id: string;
  label: string;
  type: 'range';
  min: number;
  max: number;
  step?: number;
  default: number;
  unit?: string;
};

export type SelectParameter = {
  id: string;
  label: string;
  type: 'select';
  options: Array<{ value: string; label: string }>;
  default: string;
};

export type ToggleParameter = {
  id: string;
  label: string;
  type: 'toggle';
  default: boolean;
};

export type ParameterDefinition = RangeParameter | SelectParameter | ToggleParameter;
export type ParameterValue = number | string | boolean;
export type ParameterValues = Record<string, ParameterValue>;

export type Metric = {
  label: string;
  value: string | number;
  hint?: string;
};

export type DecisionOption = {
  value: string;
  label: string;
};

export type VariantContext = {
  params: ParameterValues;
  seed: number;
  width: number;
  height: number;
  rng: () => number;
};

export type RenderContext = {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  params: ParameterValues;
  seed: number;
  dpr: number;
};

export type Variant = {
  id: string;
  label: string;
  description?: string;
  create: (context: VariantContext) => unknown;
  update?: (state: unknown, context: VariantContext & { dt: number }) => void;
  render: (state: unknown, context: RenderContext) => void;
  metrics?: (state: unknown, context: VariantContext) => Metric[];
};

export type ExperimentDefinition = {
  id: string;
  title: string;
  question: string;
  description?: string;
  parameters: ParameterDefinition[];
  variants: Variant[];
  decisionOptions: DecisionOption[];
  stageSize?: { width: number; height: number };
};

export type ExperimentTestApi = {
  id: string;
  getParams: () => ParameterValues;
  setParams: (next: Partial<ParameterValues>) => void;
  getSeed: () => number;
  setSeed: (seed: number) => void;
  reset: () => void;
  step: (dt?: number) => void;
  snapshot: () => {
    params: ParameterValues;
    seed: number;
    variants: Array<{ id: string; metrics: Metric[] }>;
  };
  getDecision: () => Record<string, unknown>;
};

declare global {
  interface Window {
    __experiment?: ExperimentTestApi;
  }
}
