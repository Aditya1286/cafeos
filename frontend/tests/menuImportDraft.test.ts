import { describe, it, expect } from 'vitest';
import {
  countItems,
  countProblems,
  itemNeedsPrice,
  paiseToPriceInput,
  priceInputToPaise,
  toCommitPayload,
  toEditableMenu,
  warningLabels,
} from '../src/utils/menuImportDraft';
import type { MenuImportDraftCategory } from '../src/services/dashboard/menuImport/types';

const draft: MenuImportDraftCategory[] = [
  {
    name: 'Hot Coffee',
    items: [
      {
        name: 'Cappuccino',
        description: 'Double shot',
        pricePaise: 18000,
        isVeg: true,
        variants: [],
        addons: [{ name: 'Extra Shot', pricePaise: 4000 }],
        confidence: 0.9,
        warnings: [],
      },
      {
        name: 'Latte',
        description: '',
        pricePaise: 19000,
        isVeg: true,
        confidence: 0.9,
        warnings: [],
        variants: [
          { name: 'Regular', pricePaise: 19000 },
          { name: 'Large', pricePaise: 24000 },
        ],
        addons: [],
      },
      {
        name: 'Mocha',
        description: '',
        pricePaise: null,
        isVeg: true,
        variants: [],
        addons: [],
        confidence: 0.4,
        warnings: ['price_missing', 'low_confidence', 'addon_price_missing: Cream'],
      },
    ],
  },
];

describe('price conversion', () => {
  it('shows paise as rupees the way an owner would type them', () => {
    expect(paiseToPriceInput(18000)).toBe('180');
    expect(paiseToPriceInput(18050)).toBe('180.50');
    expect(paiseToPriceInput(null)).toBe('');
  });

  it('reads typed rupees back into paise, rejecting anything that is not a price', () => {
    expect(priceInputToPaise('180')).toBe(18000);
    expect(priceInputToPaise('₹ 1,180.5')).toBe(118050);
    expect(priceInputToPaise('0.1')).toBe(10);
    for (const bad of ['', 'abc', '-5', '1.234', '12a']) expect(priceInputToPaise(bad)).toBeNull();
  });
});

describe('editable draft', () => {
  it('keeps every item, gives each a unique key, and pre-fills prices', () => {
    const menu = toEditableMenu(draft);
    const keys = [menu[0].key, ...menu[0].items.map((i) => i.key)];
    expect(new Set(keys).size).toBe(keys.length);
    expect(menu[0].items.map((i) => i.priceInput)).toEqual(['180', '190', '']);
    expect(countItems(menu)).toBe(3);
  });

  it('only flags a missing price on items without sizes', () => {
    const [cappuccino, latte, mocha] = toEditableMenu(draft)[0].items;
    expect(itemNeedsPrice(cappuccino)).toBe(false);
    expect(itemNeedsPrice({ ...latte, priceInput: '' })).toBe(false); // priced by its sizes
    expect(itemNeedsPrice(mocha)).toBe(true);
  });

  it('counts what blocks saving', () => {
    const menu = toEditableMenu(draft);
    expect(countProblems(menu)).toEqual({ missingPrice: 1, missingName: 0 });
    menu[0].name = '  ';
    menu[0].items[0].name = '';
    expect(countProblems(menu)).toEqual({ missingPrice: 1, missingName: 2 });
  });

  it('turns warning codes into owner-readable labels and hides the rest', () => {
    const mocha = toEditableMenu(draft)[0].items[2];
    expect(warningLabels(mocha)).toEqual(['Price not found', 'Check spelling & price']);
  });
});

describe('commit payload', () => {
  it('sends trimmed names, paise prices, cheapest size as base price, and drops empty sections', () => {
    const menu = toEditableMenu(draft);
    menu[0].name = ' Coffee ';
    menu[0].items[2].priceInput = '210';
    menu[0].items[0].name = ' Cappuccino  ';
    const payload = toCommitPayload([...menu, { key: 'empty', name: 'Empty', items: [] }]);

    expect(payload).toHaveLength(1);
    expect(payload[0].name).toBe('Coffee');
    expect(payload[0].items.map((i) => [i.name, i.pricePaise])).toEqual([
      ['Cappuccino', 18000],
      ['Latte', 19000],
      ['Mocha', 21000],
    ]);
    expect(payload[0].items[0].addons).toEqual([{ name: 'Extra Shot', pricePaise: 4000 }]);
    expect(payload[0].items[0]).not.toHaveProperty('warnings');
    expect(payload[0].items[0]).not.toHaveProperty('key');
  });
});
