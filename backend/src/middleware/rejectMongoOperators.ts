import { Request, Response, NextFunction } from 'express';

// Controllers pass request fields straight into Mongo filters (`Order.findOne({ idempotencyKey })`),
// so a JSON body like {"idempotencyKey": {"$ne": null}} — or a query string like ?q[$ne]=x — turns
// a lookup into "match anything". No legitimate client ever sends a key starting with '$', so any
// request carrying one is rejected outright, before a controller sees it. (Mongoose's global
// sanitizeFilter isn't used instead: it would also neuter the app's own $nin/$gt/$in queries.)
const MAX_DEPTH = 32;

const hasOperatorKey = (value: unknown, depth: number): boolean => {
  if (depth > MAX_DEPTH) return true; // absurdly deep input: refuse rather than walk it
  if (Array.isArray(value)) return value.some((item) => hasOperatorKey(item, depth + 1));
  if (value && typeof value === 'object') {
    return Object.entries(value).some(([key, child]) => key.startsWith('$') || hasOperatorKey(child, depth + 1));
  }
  return false;
};

export const rejectMongoOperators = (req: Request, res: Response, next: NextFunction) => {
  if (hasOperatorKey(req.body, 0) || hasOperatorKey(req.query, 0)) {
    return res.status(400).json({
      success: false,
      error: { code: 'INVALID_INPUT', message: 'Request contains invalid field names.' }
    });
  }
  next();
};
