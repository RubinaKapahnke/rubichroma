export type NotationTokenKind = 'note' | 'chord' | 'separator' | 'whitespace' | 'unknown';

export interface NotationToken {
  kind: NotationTokenKind;
  raw: string;
}

const notePattern = /^[1-7](?:['′’″]{0,2})?$/u;
const chordPattern = /^\([^)]*\)$/u;

/** A lossless read-only projection. The raw notation remains the source of truth. */
export function projectNotation(rawNotation: string): NotationToken[] {
  const rawParts =
    rawNotation.match(/\s+|\([^)]*\)|-|[1-7](?:['′’″]{0,2})?|[^()\s-]+|[()]/gu) ?? [];
  return rawParts.map((raw) => ({ raw, kind: classify(raw) }));
}

export function rejoinProjection(tokens: readonly NotationToken[]): string {
  return tokens.map((token) => token.raw).join('');
}

function classify(raw: string): NotationTokenKind {
  if (/^\s+$/u.test(raw)) return 'whitespace';
  if (raw === '-') return 'separator';
  if (notePattern.test(raw)) return 'note';
  if (chordPattern.test(raw)) return 'chord';
  return 'unknown';
}
