import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Restaurant } from '../models/Restaurant';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Subscription } from '../models/Subscription';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';

const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id, role: user.role, tenantId: user.tenantId },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, restaurantName, slug } = req.body;

    if (!name || !email || !password || !restaurantName || !slug) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, password, restaurant name, and slug are required.' }
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { code: 'EMAIL_EXISTS', message: 'User with this email already exists.' }
      });
    }

    const cleanSlug = slug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '-');
    const existingRestaurant = await Restaurant.findOne({ slug: cleanSlug });
    if (existingRestaurant) {
      return res.status(400).json({
        success: false,
        error: { code: 'SLUG_EXISTS', message: 'Restaurant URL slug is already taken. Please choose another.' }
      });
    }

    // 1. Create Restaurant Tenant
    const restaurant = await Restaurant.create({
      name: restaurantName,
      slug: cleanSlug,
      email: email.toLowerCase(),
      phone: phone || '',
      address: 'Default Café Address, City',
      currency: 'INR',
      currencySymbol: '₹',
      taxRatePercentage: 5,
      perOrderFeePaise: 200, // ₹2
      status: 'ACTIVE'
    });

    // 2. Attach default Free or Basic Plan
    let freePlan = await SubscriptionPlan.findOne({ code: 'FREE' });
    if (!freePlan) {
      freePlan = await SubscriptionPlan.create({
        name: 'Basic Free',
        code: 'FREE',
        description: 'Starter plan for new cafés',
        monthlyPricePaise: 0,
        annualPricePaise: 0,
        perOrderFeePaise: 200,
        limits: { maxTables: 10, maxMenuItems: 50, maxStaff: 3, inventoryEnabled: true, analyticsAdvanced: false }
      });
    }

    const subscription = await Subscription.create({
      tenantId: restaurant._id,
      planId: freePlan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    restaurant.subscriptionId = subscription._id;
    await restaurant.save();

    // 3. Create Owner User
    const passwordHash = await require('bcryptjs').hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: 'OWNER',
      tenantId: restaurant._id,
      status: 'ACTIVE'
    });

    const token = generateToken(user);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: 'Restaurant registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId
        },
        restaurant: {
          id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug
        }
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Email and password are required.' }
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail }).select('+passwordHash');

    if (!user) {
      console.warn(`[Auth] Login failed: User not found for email '${cleanEmail}'`);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    const isMatch = await user.comparePassword(password);
    console.log("MATCH>>>")
    if (!isMatch) {
      console.warn(`[Auth] Login failed: Password mismatch for email '${cleanEmail}'`);
      return res.status(401).json({
        success: false,
        error: { code: 'INVALID_CREDENTIALS', message: 'Invalid email or password.' }
      });
    }

    if (user.status !== 'ACTIVE') {
      return res.status(403).json({
        success: false,
        error: { code: 'ACCOUNT_INACTIVE', message: 'Your account is currently inactive or suspended.' }
      });
    }

    let restaurant = null;
    if (user.tenantId) {
      restaurant = await Restaurant.findById(user.tenantId);
      if (restaurant && restaurant.status === 'SUSPENDED' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: { code: 'RESTAURANT_SUSPENDED', message: 'Your café account is suspended. Please contact platform support.' }
        });
      }
    }

    const token = generateToken(user);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          tenantId: user.tenantId
        },
        restaurant: restaurant ? {
          id: restaurant._id,
          name: restaurant.name,
          slug: restaurant.slug,
          logoUrl: restaurant.logoUrl,
          currencySymbol: restaurant.currencySymbol
        } : null
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};

export const getMe = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    let restaurant = null;
    if (user?.tenantId) {
      restaurant = await Restaurant.findById(user.tenantId);
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user?._id,
          name: user?.name,
          email: user?.email,
          role: user?.role,
          tenantId: user?.tenantId
        },
        restaurant
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};
