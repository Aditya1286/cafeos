// Fills the {placeholders} in a copy-bank line (constants/guestQuestions.ts, constants/mascotCopy.ts).
// A line whose placeholders cannot all be filled is not used at all: the caller skips it and tries
// another, so the mascot never says "Welcome back, !" or names a dish it does not know about.

export const TEMPLATE_PLACEHOLDERS = ['name', 'usual', 'cafe', 'category', 'dish'] as const;

export type TemplatePlaceholder = (typeof TEMPLATE_PLACEHOLDERS)[number];

export type TemplateValues = Partial<Record<TemplatePlaceholder, string>>;

const PLACEHOLDER = /\{([^{}]*)\}/g;

const isAllowed = (key: string): key is TemplatePlaceholder => (TEMPLATE_PLACEHOLDERS as readonly string[]).includes(key);

/**
 * Replaces each `{name}`, `{usual}`, `{cafe}`, `{category}` and `{dish}` in `text` with its value.
 * Returns null if any placeholder in the text has no non-blank value, or is not an allowed
 * placeholder. Extra values are ignored. Values go in as given (trimmed): a value that itself looks
 * like a placeholder, or like a replacement pattern such as `$&`, is not expanded.
 */
export const fillTemplate = (text: string, values: TemplateValues): string | null => {
  let complete = true;
  const filled = text.replace(PLACEHOLDER, (_match, key: string) => {
    const value = isAllowed(key) && Object.prototype.hasOwnProperty.call(values, key) ? values[key] : undefined;
    if (typeof value !== 'string' || value.trim() === '') {
      complete = false;
      return '';
    }
    return value.trim();
  });
  return complete ? filled : null;
};
