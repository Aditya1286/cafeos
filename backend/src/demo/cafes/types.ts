// Shape of one demo café: who it is, what it sells, and how busy it is. The three cafés are made
// up — names, phones and emails belong to nobody — but their menus and price levels follow the
// publicly listed menus of the Bangalore cafés each one is modelled on (see `sources`).

export interface DemoMenuItem {
  name: string;
  description: string;
  pricePaise: number;
  isVeg: boolean;
  prepMinutes: number;
  // Relative popularity — how often it lands in a basket compared to the café's other items.
  weight: number;
}

export interface DemoMenuCategory {
  name: string;
  description?: string;
  items: DemoMenuItem[];
}

export interface DemoCafe {
  slug: string;
  name: string;
  // Prefix of the café's order numbers, e.g. LCR-011026-0001.
  shortCode: string;
  ownerName: string;
  // Bump whenever `menu` changes: the next tick re-syncs the café's products to it.
  menuVersion: number;
  // One digit, unique per café — the second digit of its made-up customer numbers.
  phoneDigit: string;
  profile: {
    address: string;
    // Starts with 5: no Indian mobile number does, so it can never reach a real person.
    phone: string;
    openingTime: string; // "HH:MM", Bangalore time
    closingTime: string;
    taxRatePercentage: number;
    tables: number; // 0 = counter service only (tables switched off)
  };
  planCode: string;
  traffic: {
    // Orders on an ordinary weekday; the day-to-day swing is ±15% around it.
    ordersPerDay: number;
    weekendFactor: number;
    // Relative order volume per hour of the day (Bangalore time) while open.
    hourly: Record<number, number>;
    // Share of orders placed from a table QR (the rest are counter/takeaway orders).
    tableShare: number;
    onlineShare: number; // paid by UPI; the rest pay cash at the counter
    repeatShare: number; // orders from the café's regulars
    // Items per order: [count, relative weight].
    basketSizes: [number, number][];
    // The first item of an order comes from these categories this often (e.g. a drink first).
    leadCategories?: { names: string[]; chance: number };
    // Chance an item is ordered twice (two filter coffees, two croissants...).
    doubleChance: number;
    customerCancelRate: number;
    staffCancelRate: number;
  };
  // Public pages whose menus and prices this café is modelled on.
  sources: string[];
  menu: DemoMenuCategory[];
}
