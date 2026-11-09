export interface BundleFinding {
  readonly marker: string;
  readonly location: string;
}

export interface BundleStats {
  readonly distFiles: number;
  readonly distDirs: number;
  readonly graphModules: number;
}

export interface BundleCheckResult {
  readonly findings: readonly BundleFinding[];
  readonly stats: BundleStats;
}

export interface BundleCheckOptions {
  readonly rootDir: string;
  readonly distDir?: string;
  readonly indexHtml?: string;
}

export function scanDist(options: {
  rootDir: string;
  distDir: string;
}): { findings: BundleFinding[]; files: number; dirs: number };

export function collectProductionGraph(options: {
  rootDir: string;
  indexHtml?: string;
}): { findings: BundleFinding[]; modules: number };

export function checkBundle(options?: BundleCheckOptions): BundleCheckResult;
