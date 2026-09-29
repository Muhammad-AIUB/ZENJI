export const STACK_GAP = 12;
export const MAX_SHRINK = 0.04;

// How far card `index` is covered by the next card, as a scale factor.
// Inputs come from untransformed layout (stage rect + card height), never from
// the card's own getBoundingClientRect, which includes the transform we apply.
export function stackScale({ stageTop, cardHeight, index, count, vh }) {
  if (index >= count - 1) return 1;
  const nextTop = stageTop + (index + 1) * (cardHeight + STACK_GAP);
  const progress = Math.min(1, Math.max(0, (vh - nextTop) / vh));
  return 1 - MAX_SHRINK * progress;
}
