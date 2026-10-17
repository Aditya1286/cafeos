import { AuthRequest } from '../middleware/auth';
import * as menuImportService from '../services/menuImport.service';
import { serviceHandler } from '../utils/serviceHandler';

// "Upload Menu" — see services/menuImport.service.ts for the two-step flow.

// Step 1: photos → AI-read draft. Nothing is saved to the menu.
export const extractMenuImport = serviceHandler((req: AuthRequest) =>
  menuImportService.extractMenuFromPhotos(req.businessId!.toString(), req.user?._id?.toString(), req.body?.images)
);

// Step 2: the owner-reviewed draft → categories + products on the real menu.
export const commitMenuImport = serviceHandler(
  (req: AuthRequest) => menuImportService.commitMenuImport(req.businessId!.toString(), req.body?.categories),
  { status: 201, message: 'Menu imported' }
);
