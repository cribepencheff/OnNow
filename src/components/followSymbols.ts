// The follow controls' symbols, in one place: a plus to follow, a check
// once followed (the follow circles in Search and on poster cards, Show
// detail's Follow button). The My shows tab draws the same check, so it
// reads as "shows I follow" (CRI-133).

export const FOLLOW_CHECK_SYMBOL = {
  ios: "checkmark",
  android: "check",
  web: "check",
} as const;

export const FOLLOW_PLUS_SYMBOL = {
  ios: "plus",
  android: "add",
  web: "add",
} as const;

export function followSymbol(followed: boolean) {
  return followed ? FOLLOW_CHECK_SYMBOL : FOLLOW_PLUS_SYMBOL;
}
