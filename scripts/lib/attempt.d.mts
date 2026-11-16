export interface BriefCheck {
  readonly ok: boolean;
  readonly detail: string;
}

export function briefCheck(
  attemptDir: string | null | undefined,
  attempt: number | null | undefined,
): BriefCheck | null;
