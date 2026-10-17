const channels = (rgb: string): [number, number, number] => {
  const parts = rgb.trim().split(/\s+/);
  const nums = parts.map(Number);
  if (parts.length !== 3 || nums.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    throw new Error(`Expected an "r g b" colour, got "${rgb}"`);
  }
  return [nums[0], nums[1], nums[2]];
};

/** WCAG relative luminance of an "r g b" colour. */
const luminance = (rgb: string): number => {
  const [r, g, b] = channels(rgb).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

/** WCAG contrast ratio (1 to 21) between two "r g b" colours. Order does not matter. */
export const contrastRatio = (a: string, b: string): number => {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (light + 0.05) / (dark + 0.05);
};
