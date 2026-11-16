export interface TaskScopeData {
  readonly task_type?: string;
  readonly scope?: unknown;
}

export const TYPE_SCOPE: Record<string, readonly string[]>;
export const SCOPE_ROOTS: readonly string[];
export const ALWAYS_ALLOWED: readonly string[];

export function normalizeScope(value: unknown): string[] | null;
export function unknownScopeEntries(scope: string[] | null | undefined): string[];
export function resolveScope(data?: TaskScopeData | null): string[];
export function allowedFor(data: TaskScopeData, taskRel?: string | null): string[];
export function sameScope(a: string[] | null | undefined, b: string[] | null | undefined): boolean;
export function isInScope(file: string, allowed: readonly string[]): boolean;
