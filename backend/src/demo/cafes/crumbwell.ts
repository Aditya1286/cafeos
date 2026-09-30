import { DemoCafe, DemoMenuCategory } from './types';

// Bakehouse café, modelled on Glen's Bakehouse: cheesecakes, cupcakes, brownies, doughnuts, tarts,
// croissants, pizza and pancakes, plus coffee and shakes. Anchor prices from public listings: New
// York cheesecake ₹180 a slice, walnut brownie ₹120, about ₹800 for two. Items made with egg are
// marked non-veg, as Indian menus do.
const menu: DemoMenuCategory[] = [
  {
    name: 'Cheesecakes',
    items: [
      { name: 'New York Cheesecake', description: 'Dense, creamy baked cheesecake on a biscuit base', pricePaise: 18000, isVeg: false, prepMinutes: 2, weight: 6 },
      { name: 'Blueberry Cheesecake', description: 'Baked cheesecake topped with blueberry compote', pricePaise: 21000, isVeg: false, prepMinutes: 2, weight: 6 },
      { name: 'Biscoff Cheesecake', description: 'Baked cheesecake with Lotus Biscoff spread and crumb', pricePaise: 24000, isVeg: false, prepMinutes: 2, weight: 5 },
      { name: 'Nutella Cheesecake Jar', description: 'No-bake cheesecake layered with Nutella in a jar', pricePaise: 22000, isVeg: true, prepMinutes: 2, weight: 3 }
    ]
  },
  {
    name: 'Cakes & Cupcakes',
    items: [
      { name: 'Red Velvet Cupcake', description: 'With cream cheese frosting', pricePaise: 11000, isVeg: false, prepMinutes: 1, weight: 7 },
      { name: 'Chocolate Truffle Pastry', description: 'Layers of chocolate sponge and dark ganache', pricePaise: 15000, isVeg: false, prepMinutes: 1, weight: 6 },
      { name: 'Tiramisu Jar', description: 'Coffee-soaked sponge and mascarpone cream', pricePaise: 23000, isVeg: false, prepMinutes: 1, weight: 4 },
      { name: 'Banana Bread Slice', description: 'Warm slice with a crunchy sugar top', pricePaise: 12000, isVeg: false, prepMinutes: 2, weight: 3 },
      { name: 'Lemon Drizzle Slice', description: 'Soft lemon loaf with a sharp lemon glaze', pricePaise: 13000, isVeg: false, prepMinutes: 1, weight: 2 }
    ]
  },
  {
    name: 'Brownies & Cookies',
    items: [
      { name: 'Walnut Brownie', description: 'Fudgy dark chocolate brownie with walnuts', pricePaise: 12000, isVeg: false, prepMinutes: 1, weight: 7 },
      { name: 'Sizzling Brownie', description: 'Warm brownie on a hot plate with vanilla ice cream and chocolate sauce', pricePaise: 26000, isVeg: false, prepMinutes: 6, weight: 4 },
      { name: 'Chocolate Chip Cookie', description: 'Chewy centre, crisp edges', pricePaise: 8000, isVeg: false, prepMinutes: 1, weight: 4 },
      { name: 'Oatmeal Raisin Cookie', description: 'Rolled oats, raisins and cinnamon', pricePaise: 8000, isVeg: false, prepMinutes: 1, weight: 2 }
    ]
  },
  {
    name: 'Doughnuts & Tarts',
    items: [
      { name: 'Cinnamon Sugar Doughnut', description: 'Yeast-raised and rolled in cinnamon sugar', pricePaise: 11000, isVeg: false, prepMinutes: 1, weight: 5 },
      { name: 'Chocolate Glazed Doughnut', description: 'Yeast-raised with a dark chocolate glaze', pricePaise: 13000, isVeg: false, prepMinutes: 1, weight: 4 },
      { name: 'Mini Fruit Tart', description: 'Vanilla custard and fresh fruit in a butter crust', pricePaise: 12000, isVeg: false, prepMinutes: 1, weight: 3 },
      { name: 'Lemon Meringue Tart', description: 'Lemon curd under toasted meringue', pricePaise: 15000, isVeg: false, prepMinutes: 1, weight: 2 }
    ]
  },
  {
    name: 'Croissants & Breads',
    items: [
      { name: 'Butter Croissant', description: 'Flaky, all-butter croissant', pricePaise: 17000, isVeg: false, prepMinutes: 2, weight: 5 },
      { name: 'Almond Croissant', description: 'Filled with almond cream and topped with flaked almonds', pricePaise: 22000, isVeg: false, prepMinutes: 2, weight: 3 },
      { name: 'Cinnamon Roll', description: 'Soft roll with cinnamon swirl and cream cheese glaze', pricePaise: 16000, isVeg: false, prepMinutes: 2, weight: 4 },
      { name: 'Garlic Cheese Bread', description: 'Toasted baguette with garlic butter and mozzarella', pricePaise: 18000, isVeg: true, prepMinutes: 7, weight: 3 }
    ]
  },
  {
    name: 'Savoury',
    items: [
      { name: 'Veg Puff', description: 'Flaky pastry with spiced vegetables', pricePaise: 4500, isVeg: true, prepMinutes: 3, weight: 5 },
      { name: 'Egg Puff', description: 'Flaky pastry with a boiled egg and masala', pricePaise: 5000, isVeg: false, prepMinutes: 3, weight: 3 },
      { name: 'Chicken Puff', description: 'Flaky pastry with spicy chicken filling', pricePaise: 6000, isVeg: false, prepMinutes: 3, weight: 4 },
      { name: 'Margherita Pizza', description: 'Tomato, mozzarella and basil, 9 inch', pricePaise: 38000, isVeg: true, prepMinutes: 14, weight: 3 },
      { name: 'Farmhouse Pizza', description: 'Peppers, onion, mushroom, corn and olives, 9 inch', pricePaise: 42000, isVeg: true, prepMinutes: 14, weight: 2 },
      { name: 'Chicken Pepperoni Pizza', description: 'Chicken pepperoni and mozzarella, 9 inch', pricePaise: 46000, isVeg: false, prepMinutes: 15, weight: 2 },
      { name: 'Pesto Pasta', description: 'Penne in basil pesto cream with parmesan', pricePaise: 34000, isVeg: true, prepMinutes: 12, weight: 2 },
      { name: 'Buttermilk Pancakes', description: 'Stack of three with maple syrup and butter', pricePaise: 29000, isVeg: false, prepMinutes: 10, weight: 3 }
    ]
  },
  {
    name: 'Coffee & Shakes',
    items: [
      { name: 'Cappuccino', description: 'Double shot with steamed milk and foam', pricePaise: 18000, isVeg: true, prepMinutes: 4, weight: 5 },
      { name: 'Signature Hot Chocolate', description: 'Rich hot chocolate topped with marshmallows', pricePaise: 22000, isVeg: true, prepMinutes: 4, weight: 4 },
      { name: 'Iced Latte', description: 'Espresso and cold milk over ice', pricePaise: 21000, isVeg: true, prepMinutes: 3, weight: 4 },
      { name: 'Cold Coffee', description: 'Blended with vanilla ice cream', pricePaise: 22000, isVeg: true, prepMinutes: 4, weight: 5 },
      { name: 'Oreo Milkshake', description: 'Thick shake blended with Oreo cookies', pricePaise: 24000, isVeg: true, prepMinutes: 4, weight: 3 },
      { name: 'Fresh Lemonade', description: 'Fresh lime, mint and soda', pricePaise: 15000, isVeg: true, prepMinutes: 3, weight: 2 }
    ]
  }
];

export const crumbwell: DemoCafe = {
  slug: 'crumbwell-bakehouse',
  name: 'Crumbwell Bakehouse',
  shortCode: 'CWB',
  ownerName: "Sarah D'Costa",
  menuVersion: 1,
  phoneDigit: '3',
  profile: {
    address: '80 Feet Road, Koramangala 4th Block, Bengaluru 560034',
    phone: '+91 50000 03303',
    openingTime: '09:00',
    closingTime: '22:00',
    taxRatePercentage: 5,
    tables: 6
  },
  planCode: 'BASIC',
  traffic: {
    ordersPerDay: 65,
    weekendFactor: 1.5,
    hourly: { 9: 0.5, 10: 0.7, 11: 0.8, 12: 0.7, 13: 0.8, 14: 0.7, 15: 0.8, 16: 1, 17: 1.1, 18: 1, 19: 0.9, 20: 0.8, 21: 0.5 },
    tableShare: 0.45,
    onlineShare: 0.75,
    repeatShare: 0.35,
    basketSizes: [[1, 30], [2, 40], [3, 20], [4, 10]],
    doubleChance: 0.15,
    customerCancelRate: 0.02,
    staffCancelRate: 0.01
  },
  sources: [
    'https://wanderlog.com/place/details/1323826/glens-bakehouse',
    'https://platelicker.talvinder.com/restaurants/glens-bakehouse-koramangala',
    'https://platelicker.talvinder.com/restaurants/glens-bakehouse-hsr-layout',
    'https://www.eazydiner.com/food-trends/bangalore-bakeries-the-best-bakeries-in-bangalore-for-cakes-pastries-croissants-and-celebrations'
  ],
  menu
};
