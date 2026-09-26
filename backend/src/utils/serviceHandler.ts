import { Request, Response } from 'express';
import { handleServiceError } from './serviceError';

/**
 * Turns a service call into an Express handler with the standard response shape:
 * `{ success: true, data, message? }` on success, a ServiceError's own status/code on an expected
 * failure, and a 500 otherwise. Keeps controllers down to "which service call, with what input".
 *
 *   router.get('/', serviceHandler((req: AuthRequest) => staffService.listStaff(req.businessId!)));
 */
export const serviceHandler =
  <R extends Request>(run: (req: R) => Promise<unknown>, options: { status?: number; message?: string } = {}) =>
  async (req: R, res: Response) => {
    try {
      const data = await run(req);
      return res.status(options.status ?? 200).json({ success: true, data, ...(options.message ? { message: options.message } : {}) });
    } catch (error: any) {
      return handleServiceError(res, error);
    }
  };
