import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { ServiceError } from '../utils/serviceError';
import { uploadImage, deleteFile } from './storage';

// A business's own pictures: its logo (the dashboard's top bar; without one, the default coffee-cup
// tile) and its cover banner (the top of the guests' menu; without one, the stock or theme cover).
// Owners pick them themselves, like a profile picture: an image through the storage helper, replaced
// or removed at will.

type ImageSlot = { field: 'logoUrl' | 'coverImageUrl'; folder: 'logos' | 'covers' };
const LOGO: ImageSlot = { field: 'logoUrl', folder: 'logos' };
const COVER: ImageSlot = { field: 'coverImageUrl', folder: 'covers' };

const loadBusiness = async (businessId: mongoose.Types.ObjectId) => {
  const business = await Business.findById(businessId);
  if (!business) throw new ServiceError(404, 'BUSINESS_NOT_FOUND', 'Business not found.');
  return business;
};

const replaceImage = async (businessId: mongoose.Types.ObjectId, slot: ImageSlot, dataUrl: unknown) => {
  const business = await loadBusiness(businessId);
  const { url } = await uploadImage({ dataUrl, folder: slot.folder, ownerId: business._id.toString() });
  const previous = business[slot.field];
  business[slot.field] = url;
  await business.save();
  await deleteFile(previous); // a no-op for an image that was never one of ours (for example an external link)
  return url;
};

const clearImage = async (businessId: mongoose.Types.ObjectId, slot: ImageSlot) => {
  const business = await loadBusiness(businessId);
  const previous = business[slot.field];
  business[slot.field] = '';
  await business.save();
  await deleteFile(previous);
};

export const updateLogo = async (businessId: mongoose.Types.ObjectId, dataUrl: unknown) => ({
  logoUrl: await replaceImage(businessId, LOGO, dataUrl)
});

export const removeLogo = async (businessId: mongoose.Types.ObjectId) => {
  await clearImage(businessId, LOGO);
  return { logoUrl: '' };
};

export const updateCover = async (businessId: mongoose.Types.ObjectId, dataUrl: unknown) => ({
  coverImageUrl: await replaceImage(businessId, COVER, dataUrl)
});

export const removeCover = async (businessId: mongoose.Types.ObjectId) => {
  await clearImage(businessId, COVER);
  return { coverImageUrl: '' };
};
