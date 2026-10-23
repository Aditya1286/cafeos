import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDB } from '../database';
import { Business } from '../models/Business';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { commitMenuImport } from '../services/menuImport.service';

// One-off: creates the Batra's Bistro (Dasuya) café account and loads its printed menu
// (read by hand from the 4 menu photos in batra.zip, not through the AI import).
//
//   npm run ts-node src/scripts/provisionBatrasBistro.ts             -> dry run, writes nothing
//   npx ts-node src/scripts/provisionBatrasBistro.ts --apply         -> creates account + menu
//
// Uses the same config as the server (config.<NODE_ENV>.json), so check the database it prints.
// Re-running --apply is safe: an existing business is reused (its email/phone and its owner's are
// brought in line with BUSINESS below) and commitMenuImport skips items that are already on the menu.

const BUSINESS = {
  name: "Batra's Bistro",
  slug: 'batras-bistro-dasuya',
  phone: '9187368908',
  email: 'order.caosai@gmail.com',
  address: 'NH-1, Jalandhar to Pathankot Road, Opp. President Cinema, Dasuya, Distt. Hoshiarpur (Pb.)'
};
const OWNER_NAME = "Batra's Bistro Owner";

type Row = { name: string; price: number; veg: boolean; half?: number };
const V = (name: string, price: number): Row => ({ name, price, veg: true });
const N = (name: string, price: number): Row => ({ name, price, veg: false });
// Full/Half dishes: `price` is the Full portion, `half` the Half portion.
const NH = (name: string, full: number, half: number): Row => ({ name, price: full, half, veg: false });

const MENU: Record<string, Row[]> = {
  Snacks: [
    V('French Fries', 100), V('Peri-Peri Fries', 130), V('Plain Peanut', 80), V('Masala Peanut', 120),
    V('Plain Papad', 30), V('Masala Papad', 70), V('Paneer Pakora', 200), V('Veg. Spring Roll', 180),
    V('Veg. Manchurian Dry', 200), V('Veg. Manchurian Gravy', 220), V('Cheese Finger', 280),
    V('Cheese Chilly', 300), V('Cheese Corn Roll', 290), V('Cheese Balls', 290), V('Mushroom Chilly', 280),
    V('Mushroom Duplex', 280), V('Crispy Veg.', 200), V('Honey Chilly Potato', 200),
    V('Honey Chilly Cauliflower', 200), V('Crispy Chana', 200), V('Crispy Corn', 200),
    V('Aloo Chana Chat', 180), V('Onion Rings', 180),
    NH('Fry Chicken', 520, 300), NH('Fry Chicken Boneless', 560, 330), NH('Fried Chicken', 520, 300),
    NH('Fried Chicken Boneless', 560, 330), NH('Chicken Pakora', 520, 300), NH('Chicken Pakora Boneless', 560, 330),
    NH('Garlic Chicken', 540, 320), NH('Garlic Chicken Boneless', 570, 340), NH('Lemon Chicken', 520, 300),
    NH('Lemon Chicken Boneless', 560, 330), NH('Chilly Chicken', 520, 300), NH('Chilly Chicken Boneless', 560, 330),
    NH('Jeera Chicken', 520, 300), NH('Jeera Chicken Boneless', 560, 330),
    N('Fish Fry (12 Pcs.)', 550), N('Fish (Crunchy) (12 Pcs.)', 550), N('Fish Amritsari (12 Pcs.)', 550),
    N('Fish Finger (12 Pcs.)', 550)
  ],
  Omelette: [
    N('Sunshine Egg (Half Fry 1 Pcs)', 30), N('Boiled Fried Egg (5 Pcs)', 180), N('Masala Omelette', 120),
    N('Chicken Seekh Kabab Omelette', 160), N('Chicken Omelette', 160), N('Boiled Egg (5 Pcs.)', 150),
    N('Plain Omelette', 80), N('Cheese Omelette', 140), N('Egg Bhurji', 130)
  ],
  'Tandoori Snack': [
    V('Veg Seekh Kabab', 300), V('Paneer Seekh Kabab', 350), V('Paneer Tikka', 320), V('Paneer Chilli Tikka', 330),
    V('Paneer Malai Tikka', 340), V('Paneer Achari Tikka', 330), V('Mushroom Tikka', 300),
    V('Mushroom Malai Tikka', 320), V('Mushroom Shabnam Moti', 330), V('Champ Tikka', 280),
    V('Champ Malai Tikka', 300), V('Special Veg. Platter (45 min)', 500),
    NH('Tandoori Chicken', 520, 300), NH('Chicken Tikka', 560, 330), NH('Chicken Malai Tikka', 560, 330),
    NH('Chicken Ginger Tikka', 560, 330), NH('Chicken Achari Tikka', 560, 330), NH('Tandoori Haryali Tikka', 560, 330),
    NH('White Tandoori Chicken', 560, 330), NH('Stuff Afghani Chicken', 600, 380), NH('Irani Chicken', 560, 330),
    NH('Irani Chicken Tikka', 600, 350), NH('Chicken Seekh Kabab', 520, 300), N('Fish Tikka (12 pcs)', 550),
    N('Spl. Non-Veg. Platter (45 min)', 620)
  ],
  'Indian Dawat-E-Lazeez': [
    V('Veg. Gravy (1 Bowl)', 150), V('Dal Makhni', 180), V('Dal Fry', 200), V('Mix Veg.', 280),
    V('Mix Veg. White Gravy', 300), V('Chana Masala', 280), V('Tawa Chaap', 300),
    V('Champ Tikka Butter Masala', 310), V('Masala Chaap', 300), V('Cheese Tomato', 300),
    V('Paneer Butter Masala', 320), V('Kadai Paneer', 300), V('Shahi Paneer Red Gravy', 300),
    V('Shahi Paneer White Gravy', 320), V('Paneer Do Pyaza', 300), V('Paneer Tikka Butter Masala', 350),
    V('Paneer Makhani', 320), V('Paneer Pasanda', 320), V('Palak Paneer', 300), V('Palak Corn', 300),
    V('Palak Chana', 300), V('Matar Paneer', 300), V('Paneer Lababdar', 320), V('Paneer Bhurji', 320),
    V('Malai Kofta Red Gravy', 300), V('Malai Kofta White Gravy', 320), V('Mushroom Do Pyaza', 300),
    V('Mushroom Masala', 300), V('Mushroom Matar', 300), V('Methi Malai Matar', 310), V('Kaju Mushroom Masala', 340),
    N('Chicken Gravy (1 Bowl)', 200),
    NH('Butter Chicken Bone', 520, 300), NH('Butter Chicken Boneless', 560, 330), NH('Kadai Chicken', 520, 300),
    NH('Kadai Chicken Boneless', 560, 330), NH('Chicken Do Pyaza', 520, 300), NH('Chicken Do Pyaza Boneless', 560, 330),
    NH('Chicken Rara', 560, 330), NH('Chicken Rara Boneless', 590, 350), NH('Chicken Curry', 520, 300),
    NH('Chicken Tikka Butter Masala', 600, 350), NH('Chicken Home Style', 520, 300), NH('Masala Chicken', 560, 330),
    NH('Masala Chicken Boneless', 590, 350), N('Fish Masala', 550), N('Fish Chilly', 550),
    N('Fish Tikka Butter Masala', 600), N('Fish Tomato', 550)
  ],
  'Beverages & Shakes': [
    V('Chocolate Shake with Icecream', 140), V('Strawberry Shake with Icecream', 120), V('Strawberry Shake', 100),
    V('Butter Scotch Shake', 110), V('Mineral Water 1 Ltr.', 20), V('Cold Drink 750 ml.', 50), V('Soda', 30),
    V('Fresh Lime Soda', 80), V('Mojito', 100), V('Lemon Tea', 30), V('Vanilla Shake with Icecream', 120),
    V('Butter Scotch with Ice Cream', 140), V('Chocolate Shake', 110), V('Vanilla Shake', 100),
    V('Cold Coffee', 100), V('Cold Drink 2 ltr.', 120), V('Ice Cube', 50), V('Lassi (Sweet & Salty)', 100),
    V('Tea', 30), V('Hot Coffee', 40)
  ],
  Soups: [
    V('Veg Clear Soup', 90), V('Tomato Soup', 100), V('Veg. Manchow Soup', 90), V('Hot & Sour Soup', 90),
    V('Sweet Corn Soup', 100), V('Lemon Coriander Soup', 100),
    N('Chicken Soup', 120), N('Chicken Manchow Soup', 120), N('Chicken Hot & Sour Soup', 120),
    N('Chicken Sweet Corn Soup', 120), N('Chicken Lemon Coriander Soup', 120)
  ],
  'Burgers & Sandwich': [
    V('Veg. Burger', 60), V('Veg. Noodles Burger', 80), V('Cheese Burger', 90), V('Paneer Tikka Burger', 110),
    V('Paneer Tikka Sandwich', 130), V('Cold Sandwich', 90), V('Veg Grilled Sandwich', 100),
    V('Cheese Grilled Sandwich', 120), V('Toasty Paneer Sandwich', 140), V('Aloo Grilled Sandwich', 100),
    N('Chicken Burger', 100), N('Chicken Noodle Burger', 110), N('Egg Burger', 90), N('Egg Noodle Burger', 100),
    N('Egg Grilled Sandwich', 140), N('Chicken Grilled Sandwich', 150), N('Chicken Seekh Kabab Sandwich', 150)
  ],
  Noodles: [
    V('Veg. Noodle', 160), V('Veg. Hakka Noodle', 180), V('Paneer Cheese Noodle', 200), V('Veg. Garlic Noodle', 190),
    N('Chicken Noodle', 190), N('Chicken Hakka Noodle', 210), N('Garlic Chicken Noodle', 210), N('Egg Noodle', 180)
  ],
  Rice: [
    V('Steamed Rice', 100), V('Jeera Rice', 120), V('Veg. Pulao', 180), V('Peas Pulao', 180),
    V('Veg. Fried Rice', 200), V('Cheese Fried Rice', 230), V('Vegetable Biryani', 230),
    V('Veg. Hyderabadi Biryani', 250),
    N('Chicken Biryani', 250), N('Chicken Hyderabadi Biryani', 260), N('Chicken Fried Rice', 230),
    N('Egg Fried Rice', 200)
  ],
  'Salad and Raita': [
    V('Green Salad', 60), V('Cucumber Salad', 100), V('Plain Curd', 70), V('Pudina Raita', 80),
    V('Boondi Raita', 90), V('Cream Salad', 120), V('Russian Salad', 150), V('Mix Raita', 100),
    V('Pineapple Raita', 120), V('Carrot Raita', 100)
  ],
  'Indian Bread': [
    V('Tandori Roti', 10), V('Butter Roti', 15), V('Plain Naan', 40), V('Lachha Paratha', 40),
    V('Mix Paratha', 80), V('Aloo Paratha', 80), V('Onion Paratha', 80), V('Paneer Paratha', 100),
    V('Butter Naan', 50), V('Garlic Naan', 60), V('Cheese Naan', 110), V('Cheese Naan (1pcs) + Gravy', 180),
    V('Stuff Naan', 90), N('Chicken Keema Naan', 140), N('Chicken Keema Naan with Gravy (1pcs)', 240)
  ],
  Desserts: [
    V('Gulab Jamun', 40), V('Chocolate Ice Cream', 80), V('Strawberry Ice Cream', 70),
    V('Gulab Jamun with Ice Cream', 90), V('Vanilla Ice Cream', 70), V('Butter Scotch Ice Cream', 80)
  ]
};

const paise = (rupees: number) => rupees * 100;

// Shape expected by menuImport.service's commitMenuImport. A Full/Half dish is stored with both
// portions as variants; its base price is the cheaper (Half) one, as the service does itself.
const draft = () =>
  Object.entries(MENU).map(([name, rows]) => ({
    name,
    items: rows.map((row) => ({
      name: row.name,
      description: '',
      pricePaise: paise(row.price),
      isVeg: row.veg,
      variants: row.half
        ? [
            { name: 'Half', pricePaise: paise(row.half) },
            { name: 'Full', pricePaise: paise(row.price) }
          ]
        : [],
      addons: []
    }))
  }));

const run = async () => {
  const apply = process.argv.includes('--apply');
  const itemCount = Object.values(MENU).reduce((n, rows) => n + rows.length, 0);

  await connectDB();
  console.log(`[batra] Database: ${mongoose.connection.host}/${mongoose.connection.name}`);
  console.log(`[batra] Menu: ${Object.keys(MENU).length} categories, ${itemCount} items`);

  const existingBusiness = await Business.findOne({ slug: BUSINESS.slug });
  const existingUser = existingBusiness
    ? await User.findOne({ businessId: existingBusiness._id, role: 'OWNER' })
    : await User.findOne({ email: BUSINESS.email });
  const emailClash = await User.findOne({ email: BUSINESS.email, _id: { $ne: existingUser?._id } });
  if (emailClash) throw new Error(`Email ${BUSINESS.email} already belongs to another user.`);
  const phoneClash = await User.findOne({ phone: BUSINESS.phone, _id: { $ne: existingUser?._id } });
  console.log(`[batra] Business exists: ${!!existingBusiness} | owner exists: ${!!existingUser}`);
  if (phoneClash) console.log(`[batra] WARNING: phone ${BUSINESS.phone} already belongs to ${phoneClash.email}`);

  if (!apply) {
    console.log('[batra] DRY RUN — nothing written. Re-run with --apply.');
    await mongoose.disconnect();
    return;
  }

  let business = existingBusiness;
  let password: string | null = null;
  if (!business) {
    business = await Business.create({
      ...BUSINESS,
      currency: 'INR',
      currencySymbol: '₹',
      taxRatePercentage: 0,
      perOrderFeePaise: 200,
      status: 'ACTIVE'
    });
    const plan = await SubscriptionPlan.findOne({ code: 'FREE' });
    if (!plan) throw new Error('FREE subscription plan is missing — create it before provisioning.');
    const subscription = await Subscription.create({
      businessId: business._id,
      planId: plan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    business.subscriptionId = subscription._id;
    await business.save();
    console.log(`[batra] Created business ${business._id} (/c/${business.slug})`);
  }

  if (existingBusiness) {
    // save() rather than an update query, so User's phoneKey hook keeps phone login in sync.
    business.email = BUSINESS.email;
    business.phone = BUSINESS.phone;
    await business.save();
  }
  if (existingUser) {
    existingUser.email = BUSINESS.email;
    existingUser.phone = BUSINESS.phone;
    await existingUser.save();
    console.log(`[batra] Owner now ${BUSINESS.email} / ${BUSINESS.phone}`);
  } else {
    password = crypto.randomBytes(6).toString('base64url');
    await User.create({
      name: OWNER_NAME,
      email: BUSINESS.email,
      passwordHash: await bcrypt.hash(password, 10),
      phone: BUSINESS.phone,
      role: 'OWNER',
      businessId: business._id,
      status: 'ACTIVE'
    });
    console.log(`[batra] Created owner ${BUSINESS.email} / ${BUSINESS.phone} — password: ${password}`);
  }

  const result = await commitMenuImport(business._id.toString(), draft());
  console.log('[batra] Menu import:', JSON.stringify(result));
  await mongoose.disconnect();
};

run().catch(async (err) => {
  console.error('[batra] Failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
