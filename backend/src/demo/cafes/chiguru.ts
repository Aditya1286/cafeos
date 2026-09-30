import { DemoCafe, DemoMenuCategory } from './types';

// Classic Bangalore darshini / tiffin room (counter service, no tables), modelled on CTR, Brahmin's
// Coffee Bar and The Rameshwaram Cafe. Anchor prices from their public listings: idli ₹30 a piece,
// vade ₹25, plain dose ₹50, masala dose ₹70, rava dose ₹60, upma/khara bath ₹40, pongal ₹45, bisi
// bele bath ₹55, filter coffee ₹20; CTR's staples sit in the ₹50–60 band; Rameshwaram's tatte idli
// ₹85, ghee idli ₹120, fruit punch ₹90, mango shake ₹135, water ₹10. Prices include GST, as at most
// darshinis.
const menu: DemoMenuCategory[] = [
  {
    name: 'Idli & Vade',
    description: 'Steamed fresh through the morning, with chutney and sambar',
    items: [
      { name: 'Idli (2 pcs)', description: 'Soft steamed rice cakes', pricePaise: 6000, isVeg: true, prepMinutes: 2, weight: 10 },
      { name: 'Idli Vade', description: 'One idli and one crisp medu vade', pricePaise: 5500, isVeg: true, prepMinutes: 2, weight: 9 },
      { name: 'Medu Vade (2 pcs)', description: 'Crisp urad dal fritters', pricePaise: 5000, isVeg: true, prepMinutes: 2, weight: 6 },
      { name: 'Rava Idli', description: 'Semolina idli with cashews and curry leaves, with saagu', pricePaise: 6000, isVeg: true, prepMinutes: 3, weight: 3 },
      { name: 'Tatte Idli', description: 'Large plate-shaped idli, a Bidadi speciality', pricePaise: 8500, isVeg: true, prepMinutes: 3, weight: 3 },
      { name: 'Ghee Idli', description: 'Idlis soaked in ghee and sprinkled with podi', pricePaise: 12000, isVeg: true, prepMinutes: 3, weight: 5 }
    ]
  },
  {
    name: 'Dose',
    description: 'Off the tawa, made to order',
    items: [
      { name: 'Plain Dose', description: 'Thin, crisp rice and lentil crêpe', pricePaise: 5000, isVeg: true, prepMinutes: 5, weight: 4 },
      { name: 'Masala Dose', description: 'Crisp dose with potato palya and red chutney', pricePaise: 7000, isVeg: true, prepMinutes: 6, weight: 12 },
      { name: 'Set Dose', description: 'Three soft, spongy doses with saagu', pricePaise: 6000, isVeg: true, prepMinutes: 6, weight: 4 },
      { name: 'Rava Dose', description: 'Lacy semolina dose with onion and green chilli', pricePaise: 6000, isVeg: true, prepMinutes: 7, weight: 3 },
      { name: 'Benne Masala Dose', description: 'Golden dose cooked in butter, with potato palya', pricePaise: 9000, isVeg: true, prepMinutes: 7, weight: 8 },
      { name: 'Ghee Podi Masala Dose', description: 'Masala dose with ghee and spiced chutney powder', pricePaise: 11000, isVeg: true, prepMinutes: 7, weight: 4 }
    ]
  },
  {
    name: 'Bath & Rice',
    items: [
      { name: 'Khara Bath', description: 'Savoury semolina upma with vegetables', pricePaise: 4000, isVeg: true, prepMinutes: 2, weight: 5 },
      { name: 'Kesari Bath', description: 'Sweet semolina with ghee, saffron and cashews', pricePaise: 4000, isVeg: true, prepMinutes: 2, weight: 5 },
      { name: 'Chow Chow Bath', description: 'Khara bath and kesari bath on one plate', pricePaise: 7500, isVeg: true, prepMinutes: 2, weight: 5 },
      { name: 'Ven Pongal', description: 'Rice and moong dal with pepper, cumin and ghee', pricePaise: 4500, isVeg: true, prepMinutes: 3, weight: 4 },
      { name: 'Bisi Bele Bath', description: 'Spiced rice, lentils and vegetables with boondi', pricePaise: 5500, isVeg: true, prepMinutes: 3, weight: 5 },
      { name: 'Mosaru Anna', description: 'Curd rice with mustard, curry leaves and pomegranate', pricePaise: 5000, isVeg: true, prepMinutes: 2, weight: 3 }
    ]
  },
  {
    name: 'Coffee & Drinks',
    items: [
      { name: 'Filter Coffee', description: 'Strong decoction with frothy hot milk, served in a davara', pricePaise: 2000, isVeg: true, prepMinutes: 2, weight: 22 },
      { name: 'Tea', description: 'Milky, sweet and strong', pricePaise: 2000, isVeg: true, prepMinutes: 2, weight: 4 },
      { name: 'Badam Milk', description: 'Warm milk with almonds, saffron and cardamom', pricePaise: 4000, isVeg: true, prepMinutes: 2, weight: 2 },
      { name: 'Majjige', description: 'Spiced buttermilk with ginger and coriander', pricePaise: 2500, isVeg: true, prepMinutes: 1, weight: 3 },
      { name: 'Fruit Punch', description: 'Fresh seasonal fruits blended with juice', pricePaise: 9000, isVeg: true, prepMinutes: 3, weight: 1 },
      { name: 'Mango Milkshake', description: 'Alphonso mango blended with milk and ice cream', pricePaise: 13500, isVeg: true, prepMinutes: 3, weight: 1 },
      { name: 'Water Bottle — 500 ml', description: 'Packaged drinking water', pricePaise: 1000, isVeg: true, prepMinutes: 1, weight: 2 }
    ]
  },
  {
    name: 'Sweets',
    items: [
      { name: 'Mysore Pak', description: 'Ghee-rich gram flour fudge', pricePaise: 4000, isVeg: true, prepMinutes: 1, weight: 2 },
      { name: 'Holige', description: 'Sweet lentil-stuffed flatbread with a spoon of ghee', pricePaise: 4500, isVeg: true, prepMinutes: 2, weight: 2 }
    ]
  }
];

export const chiguru: DemoCafe = {
  slug: 'chiguru-tiffin-room',
  name: 'Chiguru Tiffin Room',
  shortCode: 'CTF',
  ownerName: 'Raghavendra Bhat',
  menuVersion: 1,
  phoneDigit: '2',
  profile: {
    address: '8th Cross, Malleshwaram, Bengaluru 560003',
    phone: '+91 50000 02202',
    openingTime: '06:30',
    closingTime: '22:00',
    taxRatePercentage: 0,
    tables: 0
  },
  planCode: 'BASIC',
  traffic: {
    ordersPerDay: 160,
    weekendFactor: 1.25,
    hourly: { 6: 0.6, 7: 1.1, 8: 1.4, 9: 1.3, 10: 0.9, 11: 0.5, 12: 0.7, 13: 0.8, 14: 0.4, 15: 0.4, 16: 0.7, 17: 1, 18: 0.9, 19: 0.7, 20: 0.5, 21: 0.3 },
    tableShare: 0,
    onlineShare: 0.55,
    repeatShare: 0.5,
    basketSizes: [[1, 25], [2, 40], [3, 25], [4, 10]],
    doubleChance: 0.3,
    customerCancelRate: 0.015,
    staffCancelRate: 0.005
  },
  sources: [
    'https://magicpin.in/Bangalore/Hal-2nd-Stage/Restaurant/The-Rameshwaram-Cafe/store/5b72aa',
    'https://www.timeout.com/mumbai/news/rameshwaram-cafe-and-its-famous-benne-dosas-are-finally-in-mumbai-030626',
    'https://karnatakatourism.org/en/experiences/ctr-central-tiffin-room',
    'https://www.timeout.com/bangalore/restaurants/brahmins-coffee-bar',
    'https://imvoyager.com/brahmins-coffee-bar-basavanagudi-bangalore/'
  ],
  menu
};
