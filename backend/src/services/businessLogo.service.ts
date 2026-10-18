import mongoose from 'mongoose';
import { Business } from '../models/Business';
import { ServiceError } from '../utils/serviceError';
import { uploadImage, deleteFile } from './storage';

// A business's own logo, shown in the dashboard's top bar. Owners pick it themselves, like a profile
// picture: an image through the storage helper, replaced or removed at will. Without one, the top
// bar shows the default coffee-cup tile.

const loadBusiness = async (businessId: mongoose.Types.ObjectId) => {
  const business = await Business.findById(businessId);
  if (!business) throw new ServiceError(404, 'BUSINESS_NOT_FOUND', 'Business not found.');
  return business;
};

export const updateLogo = async (businessId: mongoose.Types.ObjectId, dataUrl: unknown) => {
  const business = await loadBusiness(businessId);
  const { url } = await uploadImage({ dataUrl, folder: 'logos', ownerId: business._id.toString() });
  const previous = business.logoUrl;
  business.logoUrl = url;
  await business.save();
  await deleteFile(previous); // a no-op for a logo that was never one of ours (for example an external link)
  return { logoUrl: url };
};

export const removeLogo = async (businessId: mongoose.Types.ObjectId) => {
  const business = await loadBusiness(businessId);
  const previous = business.logoUrl;
  business.logoUrl = '';
  await business.save();
  await deleteFile(previous);
  return { logoUrl: '' };
};
