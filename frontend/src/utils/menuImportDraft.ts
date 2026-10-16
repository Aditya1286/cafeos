/**
 * The "Upload Menu" review screen's data: the AI's draft turned into something the owner can
 * edit (stable keys, price as typed text), and back into the commit payload. Pure functions only,
 * so the rules are testable without rendering anything.
 */
import type {
  MenuImportCommitCategory,
  MenuImportDraftCategory,
  MenuImportOption,
} from '../services/dashboard/menuImport/types';

export interface EditableMenuItem {
  key: string;
  name: string;
  description: string;
  /** Price as the owner typed it, in rupees ("180", "180.50"). Empty = no price yet. */
  priceInput: string;
  isVeg: boolean;
  variants: MenuImportOption[];
  addons: MenuImportOption[];
  warnings: string[];
}

export interface EditableMenuCategory {
  key: string;
  name: string;
  items: EditableMenuItem[];
}

let keySeq = 0;
const nextKey = () => `mi-${++keySeq}`;

/** 18000 → "180", 18050 → "180.50", null → "". */
export const paiseToPriceInput = (paise: number | null | undefined): string => {
  if (paise === null || paise === undefined) return '';
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
};

/** "180" → 18000, "₹ 180.5" → 18050, "" / "abc" / negative → null. */
export const priceInputToPaise = (input: string): number | null => {
  const cleaned = input.replace(/[₹,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
};

export const toEditableMenu = (categories: MenuImportDraftCategory[]): EditableMenuCategory[] =>
  categories.map((category) => ({
    key: nextKey(),
    name: category.name,
    items: category.items.map((item) => ({
      key: nextKey(),
      name: item.name,
      description: item.description,
      priceInput: paiseToPriceInput(item.pricePaise),
      isVeg: item.isVeg,
      variants: item.variants,
      addons: item.addons,
      warnings: item.warnings,
    })),
  }));

/** Items with sizes take their price from the sizes, so only size-less items need a typed price. */
export const itemNeedsPrice = (item: EditableMenuItem): boolean =>
  item.variants.length === 0 && priceInputToPaise(item.priceInput) === null;

export const countItems = (categories: EditableMenuCategory[]): number =>
  categories.reduce((sum, c) => sum + c.items.length, 0);

/** Everything that would make the commit fail, counted so the Save button can say why it's off. */
export const countProblems = (categories: EditableMenuCategory[]) => ({
  missingPrice: categories.reduce((sum, c) => sum + c.items.filter(itemNeedsPrice).length, 0),
  missingName:
    categories.filter((c) => c.items.length > 0 && !c.name.trim()).length +
    categories.reduce((sum, c) => sum + c.items.filter((i) => !i.name.trim()).length, 0),
});

export const toCommitPayload = (categories: EditableMenuCategory[]): MenuImportCommitCategory[] =>
  categories
    .filter((c) => c.items.length > 0)
    .map((c) => ({
      name: c.name.trim(),
      items: c.items.map((item) => ({
        name: item.name.trim(),
        description: item.description.trim(),
        pricePaise: item.variants.length
          ? Math.min(...item.variants.map((v) => v.pricePaise))
          : (priceInputToPaise(item.priceInput) ?? 0),
        isVeg: item.isVeg,
        variants: item.variants,
        addons: item.addons,
      })),
    }));

// The AI service's per-item warning codes, in words an owner understands. Codes not listed here
// (e.g. per-option notes) aren't worth interrupting the owner for.
const WARNING_LABELS: Record<string, string> = {
  price_missing: 'Price not found',
  price_suspicious: 'Check this price',
  price_outlier: 'Price looks unusual',
  low_confidence: 'Check spelling & price',
  duplicate_name: 'Appears twice',
};

export const warningLabels = (item: EditableMenuItem): string[] =>
  item.warnings.map((code) => WARNING_LABELS[code]).filter((label): label is string => !!label);
