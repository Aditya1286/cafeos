import { DemoCafe, DemoMenuCategory } from './types';

// Third-wave specialty coffee bar, modelled on Third Wave Coffee's Bangalore cafés: espresso,
// pour-over and cold brew, iced and tonic drinks, bakes, and an all-day food menu. Anchor prices
// from their public listings: hot latte ₹249, iced Americano ₹245–249, butter croissant ₹219–225,
// espresso tonic from ₹315, seasonal lattes from ₹299, sandwiches and breakfast plates ₹150–350.
const menu: DemoMenuCategory[] = [
  {
    name: 'Hot Coffee',
    description: 'Single-origin espresso, roasted in small batches every week',
    items: [
      { name: 'Espresso', description: 'A double shot of the house single-origin', pricePaise: 16000, isVeg: true, prepMinutes: 3, weight: 3 },
      { name: 'Americano', description: 'Double espresso lengthened with hot water', pricePaise: 19900, isVeg: true, prepMinutes: 3, weight: 6 },
      { name: 'Cappuccino', description: 'Espresso with silky steamed milk and a thick foam cap', pricePaise: 23900, isVeg: true, prepMinutes: 4, weight: 12 },
      { name: 'Café Latte', description: 'Espresso with plenty of steamed milk and a thin layer of foam', pricePaise: 24900, isVeg: true, prepMinutes: 4, weight: 11 },
      { name: 'Flat White', description: 'A stronger, smaller latte with velvety microfoam', pricePaise: 25900, isVeg: true, prepMinutes: 4, weight: 7 },
      { name: 'Cortado', description: 'Equal parts espresso and warm milk', pricePaise: 21900, isVeg: true, prepMinutes: 3, weight: 3 },
      { name: 'Mocha', description: 'Espresso, dark chocolate and steamed milk', pricePaise: 26900, isVeg: true, prepMinutes: 5, weight: 5 },
      { name: 'Hazelnut Latte', description: 'Café latte with house hazelnut syrup', pricePaise: 27900, isVeg: true, prepMinutes: 5, weight: 5 },
      { name: 'Pour Over — Single Origin', description: 'Hand-brewed V60 of the estate coffee of the week', pricePaise: 28900, isVeg: true, prepMinutes: 7, weight: 3 },
      { name: 'Turkish Coffee', description: 'Finely ground coffee simmered in a cezve, served unfiltered', pricePaise: 22900, isVeg: true, prepMinutes: 6, weight: 2 }
    ]
  },
  {
    name: 'Cold Coffee',
    description: 'Iced, cold-brewed and shaken',
    items: [
      { name: 'Iced Americano', description: 'Double espresso over ice and cold water', pricePaise: 24500, isVeg: true, prepMinutes: 3, weight: 8 },
      { name: 'Iced Latte', description: 'Espresso and cold milk over ice', pricePaise: 26900, isVeg: true, prepMinutes: 3, weight: 8 },
      { name: 'Cold Brew', description: 'Steeped for 18 hours, smooth and low in acidity', pricePaise: 25900, isVeg: true, prepMinutes: 2, weight: 6 },
      { name: 'Vietnamese Iced Coffee', description: 'Strong coffee with condensed milk over ice', pricePaise: 27900, isVeg: true, prepMinutes: 4, weight: 6 },
      { name: 'Classic Cold Coffee', description: 'Blended coffee, milk and ice cream', pricePaise: 27900, isVeg: true, prepMinutes: 4, weight: 7 },
      { name: 'Espresso Tonic', description: 'Espresso poured over tonic water and ice with an orange peel', pricePaise: 31500, isVeg: true, prepMinutes: 3, weight: 4 },
      { name: 'Caramel Frappe', description: 'Blended iced coffee with caramel and whipped cream', pricePaise: 31900, isVeg: true, prepMinutes: 5, weight: 4 },
      { name: 'Mocha Frappe', description: 'Blended iced coffee with dark chocolate', pricePaise: 32900, isVeg: true, prepMinutes: 5, weight: 3 }
    ]
  },
  {
    name: 'Not Coffee',
    items: [
      { name: 'Hot Chocolate', description: 'Thick drinking chocolate made with 55% dark', pricePaise: 26900, isVeg: true, prepMinutes: 4, weight: 4 },
      { name: 'Matcha Latte', description: 'Ceremonial-grade matcha whisked into steamed milk', pricePaise: 29900, isVeg: true, prepMinutes: 4, weight: 3 },
      { name: 'Masala Chai', description: 'Assam tea brewed with ginger, cardamom and milk', pricePaise: 14900, isVeg: true, prepMinutes: 5, weight: 4 },
      { name: 'Chamomile Tea', description: 'Whole chamomile flowers, caffeine free', pricePaise: 17900, isVeg: true, prepMinutes: 4, weight: 2 },
      { name: 'Iced Peach Tea', description: 'Black tea shaken with peach and lemon', pricePaise: 19900, isVeg: true, prepMinutes: 3, weight: 3 }
    ]
  },
  {
    name: 'Bakes',
    description: 'Baked fresh every morning',
    items: [
      { name: 'Butter Croissant', description: 'Flaky, all-butter, laminated in-house', pricePaise: 21900, isVeg: true, prepMinutes: 3, weight: 8 },
      { name: 'Chocolate Croissant', description: 'Butter croissant with two batons of dark chocolate', pricePaise: 24900, isVeg: true, prepMinutes: 3, weight: 5 },
      { name: 'Mushroom & Cheese Croissant', description: 'Garlic mushrooms and cheddar baked into a croissant', pricePaise: 26900, isVeg: true, prepMinutes: 5, weight: 4 },
      { name: 'Banana Walnut Cake', description: 'Moist loaf slice with toasted walnuts', pricePaise: 18900, isVeg: true, prepMinutes: 2, weight: 4 },
      { name: 'Triple Chocolate Cookie', description: 'Chewy cookie with dark, milk and white chocolate', pricePaise: 14900, isVeg: true, prepMinutes: 2, weight: 5 },
      { name: 'Blueberry Muffin', description: 'Soft muffin with a crumble top', pricePaise: 17900, isVeg: true, prepMinutes: 2, weight: 3 },
      { name: 'Key Lime Pie', description: 'Tangy lime custard on a biscuit base', pricePaise: 23900, isVeg: false, prepMinutes: 2, weight: 2 }
    ]
  },
  {
    name: 'All Day Plates',
    items: [
      { name: 'Shakshuka with Sourdough', description: 'Eggs poached in a spiced tomato and pepper sauce', pricePaise: 34900, isVeg: false, prepMinutes: 14, weight: 4 },
      { name: 'Avocado Toast', description: 'Smashed avocado, chilli flakes and lime on sourdough', pricePaise: 32900, isVeg: true, prepMinutes: 8, weight: 4 },
      { name: 'Pesto Paneer Sandwich', description: 'Grilled paneer, basil pesto and peppers on focaccia', pricePaise: 29900, isVeg: true, prepMinutes: 9, weight: 5 },
      { name: 'Chicken Tikka Sandwich', description: 'Tandoori chicken, mint mayo and onions on focaccia', pricePaise: 32900, isVeg: false, prepMinutes: 10, weight: 5 },
      { name: 'Scrambled Egg Bagel', description: 'Soft scrambled eggs and chives in a toasted bagel', pricePaise: 28900, isVeg: false, prepMinutes: 9, weight: 3 },
      { name: 'Classic Grilled Cheese', description: 'Cheddar and mozzarella on buttered sourdough', pricePaise: 25900, isVeg: true, prepMinutes: 8, weight: 3 },
      { name: 'Peri Peri Fries', description: 'Skin-on fries tossed in peri peri seasoning', pricePaise: 18900, isVeg: true, prepMinutes: 8, weight: 4 }
    ]
  },
  {
    name: 'Take Home',
    items: [
      { name: 'House Espresso Blend — 250 g', description: 'Whole beans, medium-dark roast', pricePaise: 54900, isVeg: true, prepMinutes: 1, weight: 1 },
      { name: 'Cold Brew Bottle — 200 ml', description: 'Ready-to-drink cold brew concentrate', pricePaise: 19900, isVeg: true, prepMinutes: 1, weight: 1 }
    ]
  }
];

export const loamline: DemoCafe = {
  slug: 'loamline-coffee',
  name: 'Loamline Coffee Roasters',
  shortCode: 'LCR',
  ownerName: 'Kavya Menon',
  menuVersion: 1,
  phoneDigit: '1',
  profile: {
    address: '100 Feet Road, Indiranagar, Bengaluru 560038',
    phone: '+91 50000 01101',
    openingTime: '08:00',
    closingTime: '23:00',
    taxRatePercentage: 5,
    tables: 10
  },
  planCode: 'PREMIUM',
  traffic: {
    ordersPerDay: 90,
    weekendFactor: 1.35,
    hourly: { 8: 0.7, 9: 1, 10: 1, 11: 0.8, 12: 0.6, 13: 0.6, 14: 0.5, 15: 0.6, 16: 0.8, 17: 0.9, 18: 0.8, 19: 0.6, 20: 0.5, 21: 0.35, 22: 0.2 },
    tableShare: 0.65,
    onlineShare: 0.72,
    repeatShare: 0.4,
    basketSizes: [[1, 45], [2, 35], [3, 15], [4, 5]],
    leadCategories: { names: ['Hot Coffee', 'Cold Coffee', 'Not Coffee'], chance: 0.9 },
    doubleChance: 0.12,
    customerCancelRate: 0.025,
    staffCancelRate: 0.01
  },
  sources: [
    'https://magicpin.in/Bangalore/Hsr/Restaurant/Third-Wave-Coffee/store/5b42b1/menu/',
    'https://magicpin.in/Bangalore/Cunningham-Road/Restaurant/Third-Wave-Coffee/store/67a638/menu',
    'https://www.restaurantindia.in/news/third-wave-coffee-launches-new-summer-beverage-menu-during-lockdown.n19234',
    'https://www.restaurantindia.in/news/restaurant-india-news-third-wave-coffee-launches-espresso-tonic-range-with-schweppes-india.n16155',
    'https://platelicker.talvinder.com/restaurants/third-wave-coffee-bellandur'
  ],
  menu
};
