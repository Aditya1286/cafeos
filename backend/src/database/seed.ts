import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Subscription } from '../models/Subscription';
import { Category } from '../models/Category';
import { Product } from '../models/Product';
import { Table } from '../models/Table';
import { Order } from '../models/Order';
import { FinancialLedger } from '../models/FinancialLedger';
import { InventoryItem } from '../models/InventoryItem';
import { Recipe } from '../models/Recipe';
import { InventoryTransaction } from '../models/InventoryTransaction';

export const seedDatabase = async (forceClean: boolean = false) => {
  try {
    const existingUsers = await User.countDocuments();
    if (!forceClean && existingUsers > 0) {
      console.log('[Seed] Database already initialized with users. Skipping auto-seed.');
      return;
    }

    console.log('[Seed] Initializing database seed with 2 Dummy Cafés & Financial Ledgers...');

    if (forceClean || existingUsers === 0) {
      await Promise.all([
        User.deleteMany({}),
        Restaurant.deleteMany({}),
        SubscriptionPlan.deleteMany({}),
        Subscription.deleteMany({}),
        Category.deleteMany({}),
        Product.deleteMany({}),
        Table.deleteMany({}),
        Order.deleteMany({}),
        FinancialLedger.deleteMany({}),
        InventoryItem.deleteMany({}),
        Recipe.deleteMany({}),
        InventoryTransaction.deleteMany({})
      ]);
    }

    // 1. Subscription Plans
    console.log('[Seed] Creating Subscription Plans...');
    const plans = await SubscriptionPlan.create([
      {
        name: 'Free Starter',
        code: 'FREE',
        description: 'For small kiosks & trial cafés',
        monthlyPricePaise: 0,
        annualPricePaise: 0,
        perOrderFeePaise: 200,
        limits: { maxTables: 5, maxMenuItems: 20, maxStaff: 2, inventoryEnabled: false, analyticsAdvanced: false },
        isPopular: false,
        status: 'ACTIVE'
      },
      {
        name: 'Basic Pro',
        code: 'BASIC',
        description: 'Full digital menu, QR ordering, & standard order management',
        monthlyPricePaise: 29900, // ₹299
        annualPricePaise: 299000,
        perOrderFeePaise: 200,
        limits: { maxTables: 15, maxMenuItems: 60, maxStaff: 5, inventoryEnabled: true, analyticsAdvanced: false },
        isPopular: true,
        status: 'ACTIVE'
      },
      {
        name: 'Premium Growth',
        code: 'PREMIUM',
        description: 'Unlimited tables, advanced inventory BOM, KDS & detailed financial analytics',
        monthlyPricePaise: 79900, // ₹799
        annualPricePaise: 799000,
        perOrderFeePaise: 200,
        limits: { maxTables: 50, maxMenuItems: 200, maxStaff: 20, inventoryEnabled: true, analyticsAdvanced: true },
        isPopular: false,
        status: 'ACTIVE'
      }
    ]);

    const basicPlan = plans.find((p) => p.code === 'BASIC') || plans[0];
    const premiumPlan = plans.find((p) => p.code === 'PREMIUM') || plans[0];

    // 2. Super Admin User
    console.log('[Seed] Creating Super Admin Account...');
    const commonPasswordHash = await bcrypt.hash('password123', 10);

    await User.create({
      name: 'CaféOS Global Admin',
      email: 'admin@cafeos.com',
      passwordHash: commonPasswordHash,
      phone: '+919876543210',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE'
    });

    // -------------------------------------------------------------------------
    // 3. DUMMY CAFÉ #1: The Artisan Roastery & Café (slug: artisan-cafe)
    // -------------------------------------------------------------------------
    console.log('[Seed] Seeding Dummy Café #1: The Artisan Roastery...');
    const cafe1 = await Restaurant.create({
      name: 'The Artisan Roastery & Café',
      slug: 'artisan-cafe',
      logoUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=400&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80',
      phone: '+91 9876501234',
      email: 'owner@artisan.com',
      address: 'Plot 42, Bandra West, Mumbai, Maharashtra 400050',
      currency: 'INR',
      currencySymbol: '₹',
      taxRatePercentage: 5,
      perOrderFeePaise: 200,
      openingTime: '08:00',
      closingTime: '23:00',
      status: 'ACTIVE'
    });

    const sub1 = await Subscription.create({
      tenantId: cafe1._id,
      planId: premiumPlan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    cafe1.subscriptionId = sub1._id;
    await cafe1.save();

    // Cafe 1 Owner & Staff
    const hash1 = await bcrypt.hash('password123', 10);
    const u1 = await User.create({
      name: 'Aditya Sharma (Owner)',
      email: 'owner@artisan.com',
      passwordHash: hash1,
      phone: '+919876501234',
      role: 'OWNER',
      tenantId: cafe1._id,
      status: 'ACTIVE'
    });
    console.log(`[Seed] Created User: ${u1.email} (ID: ${u1._id})`);

    const u2 = await User.create({
      name: 'Priya Verma (Receptionist)',
      email: 'staff@artisan.com',
      passwordHash: hash1,
      phone: '+919876505678',
      role: 'RECEPTIONIST',
      tenantId: cafe1._id,
      status: 'ACTIVE'
    });
    console.log(`[Seed] Created User: ${u2.email} (ID: ${u2._id})`);

    // Cafe 1 Menu Categories & Products
    const cat1 = await Category.create([
      { tenantId: cafe1._id, name: 'Gourmet Pizza', description: 'Handcrafted sourdough artisan pizzas', displayOrder: 1 },
      { tenantId: cafe1._id, name: 'Specialty Coffee', description: 'Freshly roasted arabica coffee', displayOrder: 2 },
      { tenantId: cafe1._id, name: 'Sides & Snacks', description: 'Crispy sides and fries', displayOrder: 3 }
    ]);

    const prod1 = await Product.create([
      {
        tenantId: cafe1._id,
        categoryId: cat1[0]._id,
        name: 'Paneer Tikka Passion Pizza',
        description: 'Tandoori marinated cottage cheese, bell peppers & mozzarella',
        pricePaise: 24900,
        imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=500&q=80',
        isVeg: true,
        preparationTimeMinutes: 15,
        displayOrder: 1,
        variants: [{ name: 'Regular 8"', pricePaise: 24900 }, { name: 'Large 12"', pricePaise: 39900 }]
      },
      {
        tenantId: cafe1._id,
        categoryId: cat1[1]._id,
        name: 'Signature Cold Coffee',
        description: 'Double espresso blended with vanilla ice cream and cream milk',
        pricePaise: 12900,
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80',
        isVeg: true,
        preparationTimeMinutes: 5,
        displayOrder: 1
      },
      {
        tenantId: cafe1._id,
        categoryId: cat1[2]._id,
        name: 'Crispy Peri Peri Fries',
        description: 'Golden fries tossed in spicy african peri peri seasoning',
        pricePaise: 9900,
        imageUrl: 'https://images.unsplash.com/photo-1576107232684-1279f3908594?w=500&q=80',
        isVeg: true,
        preparationTimeMinutes: 8,
        displayOrder: 1
      }
    ]);

    // Cafe 1 Tables
    const tbls1 = await Table.create([
      { tenantId: cafe1._id, tableNumber: 'Table 01', capacity: 2, qrToken: 'tok_artisan_tbl_01', status: 'OCCUPIED' },
      { tenantId: cafe1._id, tableNumber: 'Table 02', capacity: 4, qrToken: 'tok_artisan_tbl_02', status: 'AVAILABLE' },
      { tenantId: cafe1._id, tableNumber: 'Table 03', capacity: 4, qrToken: 'tok_artisan_tbl_03', status: 'AVAILABLE' }
    ]);

    // Cafe 1 Orders
    const order1_1 = await Order.create({
      orderId: 'ART-120926-0001',
      orderNumber: 'ART-120926-0001',
      tenantId: cafe1._id,
      dateKey: '2026-09-12',
      sequenceNumber: 1,
      tableId: tbls1[0]._id,
      tableName: 'Table 01',
      customerName: 'Aarav Mehta',
      customerPhone: '9876543210',
      items: [
        { productId: prod1[0]._id, name: prod1[0].name, pricePaise: 24900, quantity: 2, itemTotalPaise: 49800 },
        { productId: prod1[1]._id, name: prod1[1].name, pricePaise: 12900, quantity: 1, itemTotalPaise: 12900 }
      ],
      subtotalPaise: 62700,
      taxPaise: 3135,
      platformFeePaise: 200,
      totalAmountPaise: 65835,
      restaurantEarningsPaise: 65635,
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: 'ONLINE'
    });

    const order1_2 = await Order.create({
      orderId: 'ART-120926-0002',
      orderNumber: 'ART-120926-0002',
      tenantId: cafe1._id,
      dateKey: '2026-09-12',
      sequenceNumber: 2,
      tableId: tbls1[0]._id,
      tableName: 'Table 01',
      customerName: 'Sneha Patel',
      customerPhone: '9812345678',
      items: [
        { productId: prod1[1]._id, name: prod1[1].name, pricePaise: 12900, quantity: 2, itemTotalPaise: 25800 },
        { productId: prod1[2]._id, name: prod1[2].name, pricePaise: 9900, quantity: 1, itemTotalPaise: 9900 }
      ],
      subtotalPaise: 35700,
      taxPaise: 1785,
      platformFeePaise: 200,
      totalAmountPaise: 37485,
      restaurantEarningsPaise: 37285,
      orderStatus: 'PREPARING',
      paymentStatus: 'UNPAID',
      paymentMethod: 'CASH'
    });

    // Financial Ledgers for Cafe 1
    await FinancialLedger.create([
      {
        transactionId: 'TXN_PAY_1042',
        tenantId: cafe1._id,
        orderId: order1_1._id,
        type: 'ORDER_PAYMENT',
        amountPaise: 65835,
        currency: 'INR',
        status: 'SUCCESS'
      },
      {
        transactionId: 'TXN_FEE_1042',
        tenantId: cafe1._id,
        orderId: order1_1._id,
        type: 'PLATFORM_FEE',
        amountPaise: 200,
        currency: 'INR',
        status: 'SUCCESS'
      }
    ]);

    // -------------------------------------------------------------------------
    // 4. DUMMY CAFÉ #2: Bean & Butter Bakery (slug: bean-and-butter)
    // -------------------------------------------------------------------------
    console.log('[Seed] Seeding Dummy Café #2: Bean & Butter Bakery...');
    const cafe2 = await Restaurant.create({
      name: 'Bean & Butter Artisan Bakery',
      slug: 'bean-and-butter',
      logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=1200&q=80',
      phone: '+91 9822099887',
      email: 'owner@beanandbutter.com',
      address: 'Shop 12, Indiranagar 100ft Road, Bengaluru, Karnataka 560038',
      currency: 'INR',
      currencySymbol: '₹',
      taxRatePercentage: 5,
      perOrderFeePaise: 200,
      openingTime: '07:30',
      closingTime: '22:00',
      status: 'ACTIVE'
    });

    const sub2 = await Subscription.create({
      tenantId: cafe2._id,
      planId: basicPlan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    cafe2.subscriptionId = sub2._id;
    await cafe2.save();

    // Cafe 2 Owner & Staff
    const hash2 = await bcrypt.hash('password123', 10);
    const u3 = await User.create({
      name: 'Vikram Sengupta (Owner)',
      email: 'owner@beanandbutter.com',
      passwordHash: hash2,
      phone: '+919822099887',
      role: 'OWNER',
      tenantId: cafe2._id,
      status: 'ACTIVE'
    });
    console.log(`[Seed] Created User: ${u3.email} (ID: ${u3._id})`);

    const u4 = await User.create({
      name: 'Rohan Deshmukh (Barista)',
      email: 'staff@beanandbutter.com',
      passwordHash: hash2,
      phone: '+919822011223',
      role: 'STAFF',
      tenantId: cafe2._id,
      status: 'ACTIVE'
    });
    console.log(`[Seed] Created User: ${u4.email} (ID: ${u4._id})`);

    // Cafe 2 Categories & Products
    const cat2 = await Category.create([
      { tenantId: cafe2._id, name: 'French Croissants & Pastries', description: 'Freshly baked butter croissants & pain au chocolat', displayOrder: 1 },
      { tenantId: cafe2._id, name: 'Matcha & Organic Teas', description: 'Ceremonial grade Japanese matcha & herbal infusions', displayOrder: 2 }
    ]);

    const prod2 = await Product.create([
      {
        tenantId: cafe2._id,
        categoryId: cat2[0]._id,
        name: 'Classic Almond Butter Croissant',
        description: 'Flaky double-baked croissant filled with almond frangipane',
        pricePaise: 18900,
        imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&q=80',
        isVeg: true,
        preparationTimeMinutes: 5,
        displayOrder: 1
      },
      {
        tenantId: cafe2._id,
        categoryId: cat2[1]._id,
        name: 'Iced Uji Matcha Latte',
        description: 'Ceremonial Japanese matcha whisked with oat milk and agave nectar',
        pricePaise: 21000,
        imageUrl: 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&q=80',
        isVeg: true,
        preparationTimeMinutes: 4,
        displayOrder: 1
      }
    ]);

    // Cafe 2 Tables
    const tbls2 = await Table.create([
      { tenantId: cafe2._id, tableNumber: 'Table 01', capacity: 2, qrToken: 'tok_bean_tbl_01', status: 'AVAILABLE' },
      { tenantId: cafe2._id, tableNumber: 'Table 02', capacity: 4, qrToken: 'tok_bean_tbl_02', status: 'OCCUPIED' }
    ]);

    // Cafe 2 Orders
    const order2_1 = await Order.create({
      orderId: 'BBB-120926-0001',
      orderNumber: 'BBB-120926-0001',
      tenantId: cafe2._id,
      dateKey: '2026-09-12',
      sequenceNumber: 1,
      tableId: tbls2[1]._id,
      tableName: 'Table 02',
      customerName: 'Karan Johar',
      customerPhone: '9988776655',
      items: [
        { productId: prod2[0]._id, name: prod2[0].name, pricePaise: 18900, quantity: 2, itemTotalPaise: 37800 },
        { productId: prod2[1]._id, name: prod2[1].name, pricePaise: 21000, quantity: 1, itemTotalPaise: 21000 }
      ],
      subtotalPaise: 58800,
      taxPaise: 2940,
      platformFeePaise: 200,
      totalAmountPaise: 61940,
      restaurantEarningsPaise: 61740,
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: 'ONLINE'
    });

    // Financial Ledgers for Cafe 2
    await FinancialLedger.create([
      {
        transactionId: 'TXN_PAY_2001',
        tenantId: cafe2._id,
        orderId: order2_1._id,
        type: 'ORDER_PAYMENT',
        amountPaise: 61940,
        currency: 'INR',
        status: 'SUCCESS'
      },
      {
        transactionId: 'TXN_FEE_2001',
        tenantId: cafe2._id,
        orderId: order2_1._id,
        type: 'PLATFORM_FEE',
        amountPaise: 200,
        currency: 'INR',
        status: 'SUCCESS'
      }
    ]);

    // -------------------------------------------------------------------------
    // 5. DUMMY CAFÉ #3: Verde Organic Bistro & Brew Bar (slug: verde-bistro)
    // -------------------------------------------------------------------------
    console.log('[Seed] Seeding Dummy Café #3: Verde Organic Bistro...');
    const cafe3 = await Restaurant.create({
      name: 'Verde Organic Bistro & Brew Bar',
      slug: 'verde-bistro',
      logoUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=400&q=80',
      coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200&q=80',
      phone: '+91 9910011223',
      email: 'owner@verdebistro.com',
      address: 'Block C, Connaught Place, New Delhi, Delhi 110001',
      currency: 'INR',
      currencySymbol: '₹',
      taxRatePercentage: 5,
      perOrderFeePaise: 200,
      openingTime: '08:30',
      closingTime: '23:30',
      status: 'ACTIVE'
    });

    const sub3 = await Subscription.create({
      tenantId: cafe3._id,
      planId: premiumPlan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });
    cafe3.subscriptionId = sub3._id;
    await cafe3.save();

    // Cafe 3 Owner & Staff
    const hash3 = await bcrypt.hash('password123', 10);
    const u5 = await User.create({
      name: 'Ananya Roy (Owner)',
      email: 'owner@verdebistro.com',
      passwordHash: hash3,
      phone: '+919910011223',
      role: 'OWNER',
      tenantId: cafe3._id,
      status: 'ACTIVE'
    });
    console.log(`[Seed] Created User: ${u5.email} (ID: ${u5._id})`);

    // Cafe 3 Categories & Products
    const cat3 = await Category.create([
      { tenantId: cafe3._id, name: 'Organic Bowls & Salads', description: 'Fresh farm-to-table organic bowls', displayOrder: 1 },
      { tenantId: cafe3._id, name: 'Cold Pressed Juices & Brews', description: 'Raw cold pressed juices & nitrogen cold brews', displayOrder: 2 }
    ]);

    const prod3 = await Product.create([
      {
        tenantId: cafe3._id,
        categoryId: cat3[0]._id,
        name: 'Avocado Quinoa Harvest Bowl',
        description: ' Hass avocado, organic quinoa, roasted chickpeas, kale & tahini lemon dressing',
        pricePaise: 34900,
        imageUrl: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=500&q=80',
        isVeg: true,
        preparationTimeMinutes: 10,
        displayOrder: 1
      },
      {
        tenantId: cafe3._id,
        categoryId: cat3[1]._id,
        name: 'Nitro Cold Brew Coffee',
        description: 'Steeped 24 hours infused with nitrogen for a velvety smooth cascade',
        pricePaise: 19900,
        imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&q=80',
        isVeg: true,
        preparationTimeMinutes: 3,
        displayOrder: 1
      }
    ]);

    // Cafe 3 Tables & Orders
    const tbls3 = await Table.create([
      { tenantId: cafe3._id, tableNumber: 'Table 01', capacity: 4, qrToken: 'tok_verde_tbl_01', status: 'AVAILABLE' },
      { tenantId: cafe3._id, tableNumber: 'Table 02', capacity: 6, qrToken: 'tok_verde_tbl_02', status: 'OCCUPIED' }
    ]);

    const order3_1 = await Order.create({
      orderId: 'VER-120926-0001',
      orderNumber: 'VER-120926-0001',
      tenantId: cafe3._id,
      dateKey: '2026-09-12',
      sequenceNumber: 1,
      tableId: tbls3[1]._id,
      tableName: 'Table 02',
      customerName: 'Rohan Kapoor',
      customerPhone: '9876123456',
      items: [
        { productId: prod3[0]._id, name: prod3[0].name, pricePaise: 34900, quantity: 2, itemTotalPaise: 69800 },
        { productId: prod3[1]._id, name: prod3[1].name, pricePaise: 19900, quantity: 2, itemTotalPaise: 39800 }
      ],
      subtotalPaise: 109600,
      taxPaise: 5480,
      platformFeePaise: 200,
      totalAmountPaise: 115280,
      restaurantEarningsPaise: 115080,
      orderStatus: 'COMPLETED',
      paymentStatus: 'PAID',
      paymentMethod: 'ONLINE'
    });

    await FinancialLedger.create([
      {
        transactionId: 'TXN_PAY_3001',
        tenantId: cafe3._id,
        orderId: order3_1._id,
        type: 'ORDER_PAYMENT',
        amountPaise: 115280,
        currency: 'INR',
        status: 'SUCCESS'
      },
      {
        transactionId: 'TXN_FEE_3001',
        tenantId: cafe3._id,
        orderId: order3_1._id,
        type: 'PLATFORM_FEE',
        amountPaise: 200,
        currency: 'INR',
        status: 'SUCCESS'
      }
    ]);

    console.log('===================================================');
    console.log('✅ Database Auto-Seed Complete!');
    console.log('🔑 Instant Login Accounts Ready:');
    console.log('  • Super Admin : admin@cafeos.com / password123');
    console.log('  • Café 1 Owner: owner@artisan.com / password123');
    console.log('  • Café 2 Owner: owner@beanandbutter.com / password123');
    console.log('  • Café 3 Owner: owner@verdebistro.com / password123');
    console.log('===================================================');
  } catch (error) {
    console.error('[Seed Error]:', error);
  }
};
