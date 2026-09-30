import mongoose, { HydratedDocument } from 'mongoose';
import { Business, IBusiness } from '../models/Business';
import { User, IUser } from '../models/User';
import { Table, ITable } from '../models/Table';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Subscription } from '../models/Subscription';
import { hashPassword } from '../utils/password';
import { DemoCafe } from './cafes';
import { DemoSimState, IDemoSimState } from './models/DemoSimState';
import { MenuEntry } from './demand';
import { demoConfig } from './demo.config';

// Sets up a demo café the way database/seed.ts sets up its dummy businesses — business, plan, owner
// and kitchen logins, tables, menu — straight through the models. Safe to run on every tick: it
// only creates what's missing, and only rewrites the menu when the café's menuVersion changes.

export interface CafeContext {
  cafe: DemoCafe;
  business: HydratedDocument<IBusiness>;
  kitchenUser: IUser;
  tables: ITable[];
  menu: MenuEntry[];
  state: HydratedDocument<IDemoSimState>;
}

export type ProvisionResult = { ok: true; ctx: CafeContext; created: boolean } | { ok: false; reason: string };

export const stateKeyOf = (cafe: DemoCafe) => `cafe:${cafe.slug}`;
// example.com is reserved for examples, so these addresses can never receive mail.
export const ownerEmailOf = (cafe: DemoCafe) => `owner.${cafe.slug}@example.com`;
export const kitchenEmailOf = (cafe: DemoCafe) => `kitchen.${cafe.slug}@example.com`;
const tableTokenOf = (cafe: DemoCafe, n: number) => `demo-${cafe.slug}-t${n}`;

const KITCHEN_USER_NAME = 'Kitchen Team';

const createBusiness = async (cafe: DemoCafe) => {
  const business = await Business.create({
    name: cafe.name,
    slug: cafe.slug,
    shortCode: cafe.shortCode,
    phone: cafe.profile.phone,
    email: ownerEmailOf(cafe),
    address: cafe.profile.address,
    currency: 'INR',
    currencySymbol: '₹',
    taxRatePercentage: cafe.profile.taxRatePercentage,
    openingTime: cafe.profile.openingTime,
    closingTime: cafe.profile.closingTime,
    timezone: 'Asia/Kolkata',
    // No UPI ID on purpose: customers are told to pay at the counter, so nobody can ever send real
    // money to a café that doesn't exist.
    upiVpa: '',
    tablesEnabled: cafe.profile.tables > 0,
    masterQrEnabled: true,
    status: 'ACTIVE',
    isDemo: true
  });

  const plan =
    (await SubscriptionPlan.findOne({ code: cafe.planCode, status: 'ACTIVE' })) ||
    (await SubscriptionPlan.findOne({ status: 'ACTIVE' }).sort({ monthlyPricePaise: -1 }));
  if (plan) {
    const subscription = await Subscription.create({
      businessId: business._id,
      planId: plan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    business.subscriptionId = subscription._id;
    await business.save();
  }
  return business;
};

const syncMenu = async (cafe: DemoCafe, businessId: mongoose.Types.ObjectId) => {
  const productOps: any[] = [];
  const names: string[] = [];

  for (const [c, category] of cafe.menu.entries()) {
    const saved = await Category.findOneAndUpdate(
      { businessId, name: category.name },
      { $set: { description: category.description || '', displayOrder: c + 1, isAvailable: true } },
      { upsert: true, new: true }
    );
    for (const [i, item] of category.items.entries()) {
      names.push(item.name);
      productOps.push({
        updateOne: {
          filter: { businessId, name: item.name },
          update: {
            $set: {
              categoryId: saved._id,
              description: item.description,
              pricePaise: item.pricePaise,
              isVeg: item.isVeg,
              preparationTimeMinutes: item.prepMinutes,
              displayOrder: (c + 1) * 100 + i,
              isAvailable: true,
              isDeleted: false
            },
            $setOnInsert: { imageUrl: '', variants: [], addons: [], discountPercentage: 0 }
          },
          upsert: true
        }
      });
    }
  }
  await Product.bulkWrite(productOps);
  // Anything dropped from the definition comes off the menu (never deleted: past orders point at it).
  await Product.updateMany({ businessId, name: { $nin: names } }, { $set: { isAvailable: false } });
  await Category.updateMany({ businessId, name: { $nin: cafe.menu.map((c) => c.name) } }, { $set: { isAvailable: false } });
};

const loadMenu = async (cafe: DemoCafe, businessId: mongoose.Types.ObjectId): Promise<MenuEntry[]> => {
  const definition = new Map(cafe.menu.flatMap((category) => category.items.map((item) => [item.name, { item, category }] as const)));
  const products = await Product.find({ businessId, isAvailable: true, isDeleted: { $ne: true } });
  return products.flatMap((product) => {
    const defined = definition.get(product.name);
    if (!defined) return [];
    return [
      {
        productId: product._id,
        name: product.name,
        pricePaise: product.pricePaise,
        categoryName: defined.category.name,
        prepMinutes: product.preparationTimeMinutes || defined.item.prepMinutes,
        weight: defined.item.weight
      }
    ];
  });
};

export const provisionCafe = async (cafe: DemoCafe): Promise<ProvisionResult> => {
  let business = await Business.findOne({ slug: cafe.slug });
  if (business && !business.isDemo) {
    return { ok: false, reason: `/c/${cafe.slug} belongs to a real business, so this demo café was skipped.` };
  }

  const ownerEmail = ownerEmailOf(cafe);
  const kitchenEmail = kitchenEmailOf(cafe);
  const [owner, kitchen] = await Promise.all([User.findOne({ email: ownerEmail }), User.findOne({ email: kitchenEmail })]);
  for (const user of [owner, kitchen]) {
    if (user && (!business || String(user.businessId) !== String(business._id))) {
      return { ok: false, reason: `${user.email} already belongs to another account, so this demo café was skipped.` };
    }
  }

  const { accountPassword } = demoConfig();
  if ((!business || !owner || !kitchen) && accountPassword.length < 8) {
    return { ok: false, reason: 'DEMO_ACCOUNT_PASSWORD (8+ characters) must be set before the demo cafés can be created.' };
  }

  let created = false;
  if (!business) {
    business = await createBusiness(cafe);
    created = true;
  }

  let kitchenUser: IUser | null = kitchen;
  if (!owner || !kitchen) {
    const passwordHash = await hashPassword(accountPassword);
    const base = { passwordHash, businessId: business._id, status: 'ACTIVE' as const };
    if (!owner) {
      await User.create({ ...base, name: cafe.ownerName, email: ownerEmail, phone: cafe.profile.phone, role: 'OWNER' });
    }
    if (!kitchen) {
      kitchenUser = await User.create({ ...base, name: KITCHEN_USER_NAME, email: kitchenEmail, role: 'STAFF' });
    }
  }

  const tokens = Array.from({ length: cafe.profile.tables }, (_, i) => tableTokenOf(cafe, i + 1));
  const existingTokens = new Set((await Table.find({ qrToken: { $in: tokens } }).select('qrToken')).map((t) => t.qrToken));
  const missing = tokens
    .map((qrToken, i) => ({ qrToken, n: i + 1 }))
    .filter(({ qrToken }) => !existingTokens.has(qrToken))
    .map(({ qrToken, n }) => ({ businessId: business!._id, tableNumber: `Table ${n}`, capacity: n % 3 === 0 ? 2 : 4, qrToken }));
  if (missing.length) await Table.insertMany(missing);
  const tables = await Table.find({ businessId: business._id, qrToken: { $in: tokens } });

  const state = await DemoSimState.findOneAndUpdate(
    { key: stateKeyOf(cafe) },
    { $set: { businessId: business._id } },
    { upsert: true, new: true }
  );
  if (state.menuVersion !== cafe.menuVersion) {
    await syncMenu(cafe, business._id);
    state.menuVersion = cafe.menuVersion;
    await state.save();
  }

  return {
    ok: true,
    created,
    ctx: { cafe, business, kitchenUser: kitchenUser!, tables, menu: await loadMenu(cafe, business._id), state }
  };
};
