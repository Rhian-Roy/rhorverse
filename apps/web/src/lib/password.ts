export const MIN_PASSWORD = 8;

/** 0 (empty) to 4. A rough guide for the meter, not a security check: Supabase enforces the real rules. */
export function passwordScore(pw: string): 0 | 1 | 2 | 3 | 4 {
  if (!pw) return 0;
  if (pw.length < MIN_PASSWORD) return 1;
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((re) => re.test(pw)).length;
  let score = 1 + (classes >= 2 ? 1 : 0) + (classes >= 3 || pw.length >= 12 ? 1 : 0) + (pw.length >= 14 && classes >= 3 ? 1 : 0);
  score = Math.min(score, 4);
  return score as 1 | 2 | 3 | 4;
}

export const SCORE_LABEL = ["", "Too short or easy to guess", "Fair", "Good", "Strong"] as const;
