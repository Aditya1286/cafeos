import { AuthRequest } from '../middleware/auth';
import { serviceHandler } from '../utils/serviceHandler';
import * as businessLogoService from '../services/businessLogo.service';

export const uploadMyLogo = serviceHandler((req: AuthRequest) => businessLogoService.updateLogo(req.businessId!, req.body?.image), {
  message: 'Logo updated.'
});

export const removeMyLogo = serviceHandler((req: AuthRequest) => businessLogoService.removeLogo(req.businessId!), {
  message: 'Logo removed.'
});

export const uploadMyCover = serviceHandler((req: AuthRequest) => businessLogoService.updateCover(req.businessId!, req.body?.image), {
  message: 'Banner updated.'
});

export const removeMyCover = serviceHandler((req: AuthRequest) => businessLogoService.removeCover(req.businessId!), {
  message: 'Banner removed.'
});
