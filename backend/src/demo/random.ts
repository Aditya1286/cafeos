// Small randomness helpers for the demo simulation.

export const between = (min: number, max: number) => min + Math.random() * (max - min);

export const chance = (p: number) => Math.random() < p;

export const pickWeighted = <T>(entries: readonly (readonly [T, number])[]): T => {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = Math.random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1][0];
};

// Number of events in one interval with mean `lambda` (Knuth's method; lambda here is always small).
export const poisson = (lambda: number): number => {
  if (lambda <= 0) return 0;
  const limit = Math.exp(-lambda);
  let count = 0;
  let product = Math.random();
  while (product > limit) {
    count++;
    product *= Math.random();
  }
  return count;
};

// A stable number in [0, 1) for a string — the same day always gets the same swing in volume, even
// when that day is generated across several ticks.
export const stableUnit = (text: string): number => {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) / 4294967296;
};
