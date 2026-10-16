// Thin HTTP client for the AI service's menu reader (musicFck: POST /api/v1/menu/extract) — no
// business rules here, those live in ../menuImport.service.ts. Every way the call can fail is
// turned into a ServiceError with an owner-readable message.
import { aiService } from '../../config';
import { ServiceError } from '../../utils/serviceError';

export interface AiPricedOption {
  name: string;
  pricePaise: number;
}

export interface AiMenuItem {
  name: string;
  description: string;
  pricePaise: number | null; // null = the AI couldn't read a price
  imageUrl: null;
  isVeg: boolean;
  isVegSource: 'marker' | 'inferred';
  variants: AiPricedOption[];
  addons: AiPricedOption[];
  displayOrder: number;
  confidence: number;
  warnings: string[];
  source: { page: number };
}

export interface AiMenuCategory {
  name: string;
  description: string;
  displayOrder: number;
  items: AiMenuItem[];
}

export interface AiMenuExtraction {
  log_id: string;
  request_id: string;
  status: 'success' | 'partial';
  cache_hit: boolean;
  menu: { currency: string; categories: AiMenuCategory[] };
  summary: { categories: number; items: number; pages: number; pages_failed: number };
  warnings: string[];
  page_errors: { page: number; error: string }[];
}

/**
 * A photo as the AI service takes it: inline as a data URL, or as a public https URL plus the
 * sha256 of its bytes (the URL alone can't tell it the same photo was uploaded before).
 */
export type AiMenuImage = string | { url: string; sha256: string };

export interface ExtractMenuInput {
  businessId: string;
  userId?: string;
  requestId: string;
  images: AiMenuImage[]; // in page order
}

export const extractMenu = async (input: ExtractMenuInput): Promise<AiMenuExtraction> => {
  const { url, key, menuTimeoutMs } = aiService;
  if (!url) {
    throw new ServiceError(503, 'AI_UNAVAILABLE', 'Menu upload is not set up yet. Please add your items manually.');
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), menuTimeoutMs);
  let res: Response;
  let data: any = {};
  try {
    res = await fetch(`${url}/api/v1/menu/extract`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(key ? { 'X-Service-Key': key } : {}) },
      body: JSON.stringify({
        business_id: input.businessId,
        user_id: input.userId,
        request_id: input.requestId,
        currency: 'INR',
        images: input.images
      }),
      signal: controller.signal
    });
    const text = await res.text();
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }
  } catch (err: any) {
    if (err?.name === 'AbortError') {
      throw new ServiceError(504, 'AI_TIMEOUT', 'Reading the menu took too long. Try fewer or clearer photos.');
    }
    throw new ServiceError(502, 'AI_UNAVAILABLE', 'Menu reader is unavailable right now. Please try again shortly.');
  } finally {
    clearTimeout(timer);
  }

  if (res.ok) return data as AiMenuExtraction;

  // musicFck errors look like { code, error, details? }.
  switch (res.status) {
    case 422:
      throw new ServiceError(
        422,
        'MENU_NOT_READABLE',
        "We couldn't find any menu items in these photos. Try a clearer, well-lit photo of the menu."
      );
    case 400:
    case 413:
      throw new ServiceError(400, 'INVALID_IMAGES', data?.error || 'Those photos could not be read. Please try different ones.');
    case 504:
      throw new ServiceError(504, 'AI_TIMEOUT', 'Reading the menu took too long. Try fewer or clearer photos.');
    default:
      throw new ServiceError(502, 'AI_UNAVAILABLE', 'Menu reader is unavailable right now. Please try again shortly.');
  }
};
