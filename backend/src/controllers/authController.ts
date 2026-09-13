import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User';
import { Business } from '../models/Business';
import { SubscriptionPlan } from '../models/SubscriptionPlan';
import { Subscription } from '../models/Subscription';
import { config } from '../config';
import { AuthRequest } from '../middleware/auth';
import { isPhoneVerified, clearVerifiedPhone } from '../services/otp.service';

const generateToken = (user: IUser): string => {
  return jwt.sign(
    { id: user._id, role: user.role, businessId: user.businessId },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, phone, businessName, slug } = req.body;

    if (!name || !email || !password || !phone || !businessName || !slug) {
      return res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: 'Name, email, password, phone, business name, and slug are required.' }
      });
    }

    // The frontend gates registration on completing phone OTP verification, but that's
    // only a UI convenience — without this, anyone could call this endpoint directly and
    // skip verification entirely. isPhoneVerified checks the short-lived record otp.service
    // sets on a successful /otp/verify call for this exact phone; clearVerifiedPhone below
    // consumes it once registration actually succeeds, so it can't be replayed.
    if (!isPhoneVerified(phone)) {
      return res.status(400).json({
        success: false,
        error: { code: 'PHONE_NOT_VERIFIED', message: 'Please verify your phone number with the OTP sent to it before registering.' }
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
    const existingBusiness = await Business.findOne({ slug: cleanSlug });
    if (existingBusiness) {
      return res.status(400).json({
        success: false,
        error: { code: 'SLUG_EXISTS', message: 'Business URL slug is already taken. Please choose another.' }
      });
    }

    // 1. Create Business Business
    const business = await Business.create({
      name: businessName,
      slug: cleanSlug,
      email: email.toLowerCase(),
      phone: phone || '',
      address: 'Default Business Address, City',
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
        description: 'Starter plan for new businesses',
        monthlyPricePaise: 0,
        annualPricePaise: 0,
        perOrderFeePaise: 200,
        limits: { maxTables: 10, maxMenuItems: 50, maxStaff: 3, inventoryEnabled: true, analyticsAdvanced: false }
      });
    }

    const subscription = await Subscription.create({
      businessId: business._id,
      planId: freePlan._id,
      status: 'ACTIVE',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    });

    business.subscriptionId = subscription._id;
    await business.save();

    // 3. Create Owner User
    const passwordHash = await require('bcryptjs').hash(password, 10);
    const user = await User.create({
      name,
      email: email.toLowerCase(),
      passwordHash,
      phone,
      role: 'OWNER',
      businessId: business._id,
      status: 'ACTIVE'
    });

    // Consume the verification only now that registration has actually succeeded —
    // checking it earlier without clearing means a later failure (duplicate email, etc.)
    // wouldn't force the user to redo OTP verification just to retry.
    clearVerifiedPhone(phone);

    const token = generateToken(user);

    res.cookie('jwt', token, {
      httpOnly: true,
      secure: config.nodeEnv === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(201).json({
      success: true,
      message: 'Business registered successfully',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          businessId: user.businessId
        },
        business: {
          id: business._id,
          name: business.name,
          slug: business.slug
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

    let business = null;
    if (user.businessId) {
      business = await Business.findById(user.businessId);
      if (business && business.status === 'SUSPENDED' && user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({
          success: false,
          error: { code: 'BUSINESS_SUSPENDED', message: 'Your business account is suspended. Please contact platform support.' }
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
          businessId: user.businessId
        },
        business: business ? {
          id: business._id,
          name: business.name,
          slug: business.slug,
          logoUrl: business.logoUrl,
          currencySymbol: business.currencySymbol
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
    let business = null;
    if (user?.businessId) {
      business = await Business.findById(user.businessId);
    }

    return res.json({
      success: true,
      data: {
        user: {
          id: user?._id,
          name: user?.name,
          email: user?.email,
          role: user?.role,
          businessId: user?.businessId
        },
        business
      }
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: { code: 'SERVER_ERROR', message: error.message }
    });
  }
};
