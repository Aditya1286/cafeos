import crypto from 'crypto';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as menuImportDao from '../dao/menuImport.dao';
import { NewCategoryRow, NewProductRow } from '../dao/menuImport.dao';
import { AiMenuExtraction, AiMenuImage, extractMenu } from './ai/menuAi.client';
import { parseImageDataUrl, uploadImage } from './storage';
import { config } from '../config';
import { logger } from '../utils/logger';
import { ServiceError } from '../utils/serviceError';

// "Upload Menu": the owner photographs their printed menu, the AI service reads it into
// categories + items (step 1, extractMenuFromPhotos — nothing is saved), the owner reviews and
// edits that draft, and only then is it written to the real menu (step 2, commitMenuImport).
// The AI never writes to the menu itself: a misread price would otherwise go straight to customers.

export const MAX_MENU_PHOTOS = 6;
const MAX_IMPORT_CATEGORIES = 60;
const MAX_IMPORT_ITEMS = 500;
const MAX_OPTIONS_PER_ITEM = 20;
const MAX_NAME_LENGTH = 120;
const MAX_DESCRIPTION_LENGTH = 500;
const MAX_PRICE_PAISE = 1_00_000 * 100; // ₹1 lakh — anything above is a typo, not a dish

const clean = (value: unknown): string => (typeof value === 'string' ? value.split(/\s+/).filter(Boolean).join(' ') : '');
const normName = (value: string) => clean(value).toLowerCase();

// ── Step 1: photos → draft ───────────────────────────────────────────────────

export interface DraftOption {
  name: string;
  pricePaise: number;
}

export interface DraftItem {
  name: string;
  description: string;
  pricePaise: number | null;
  isVeg: boolean;
  variants: DraftOption[];
  addons: DraftOption[];
  confidence: number;
  warnings: string[];
}

export interface DraftCategory {
  name: string;
  items: DraftItem[];
}

export interface MenuImportDraft {
  aiLogId: string;
  status: 'success' | 'partial';
  categories: DraftCategory[];
  notes: string[]; // owner-readable notes about the photos themselves
}

// The AI service's menu-level warnings are machine codes; turn the ones worth showing into plain words.
const photoNotes = (ai: AiMenuExtraction): string[] => {
  const notes: string[] = [];
  for (const failed of ai.page_errors || []) notes.push(`Photo ${failed.page} couldn't be read.`);
  for (const warning of ai.warnings || []) {
    const notMenu = warning.match(/^page_(\d+)_not_a_menu$/);
    if (notMenu) notes.push(`Photo ${notMenu[1]} doesn't look like a menu.`);
    const unreadable = warning.match(/^page_(\d+)_unreadable: (.+)$/);
    if (unreadable) notes.push(`Couldn't read on photo ${unreadable[1]}: "${unreadable[2]}"`);
  }
  return notes;
};

/**
 * What the AI service gets for each photo. With S3 storage (production: R2) the photos are saved
 * under menu-imports/<businessId>/ and sent as their public https URLs — a far smaller request,
 * and the AI service's log keeps the link, so a misread price can be checked against the real
 * photo later. Each link carries the sha256 of the photo, because every upload gets a fresh random
 * key — without it the AI service could never tell a re-uploaded menu from a new one, and would
 * re-read (and re-bill) it every time. The Mongo driver's URLs are relative to this server and
 * unreachable from outside, so there (local dev) — or if the upload fails — the photos travel
 * inline as base64 instead.
 */
const photosForAi = async (businessId: string, images: string[]): Promise<AiMenuImage[]> => {
  if (config.storageDriver !== 's3') return images;
  try {
    const uploaded = await Promise.all(
      images.map(async (dataUrl) => ({
        url: (await uploadImage({ dataUrl, folder: 'menu-imports', ownerId: businessId })).url,
        sha256: crypto.createHash('sha256').update(parseImageDataUrl(dataUrl).data).digest('hex')
      }))
    );
    if (uploaded.every((photo) => photo.url.startsWith('https://'))) return uploaded;
    logger.warn({ businessId }, '[menuImport] storage URLs are not public https — sending photos inline');
  } catch (error: any) {
    logger.warn({ businessId, err: error?.message }, '[menuImport] photo upload failed — sending photos inline');
  }
  return images;
};

export const extractMenuFromPhotos = async (
  businessId: string,
  userId: string | undefined,
  images: unknown
): Promise<MenuImportDraft> => {
  if (!Array.isArray(images) || images.length === 0) {
    throw new ServiceError(400, 'VALIDATION_ERROR', 'Add at least one photo of your menu.');
  }
  if (images.length > MAX_MENU_PHOTOS) {
    throw new ServiceError(400, 'VALIDATION_ERROR', `You can upload up to ${MAX_MENU_PHOTOS} photos at a time.`);
  }
  // Same JPEG/PNG/WEBP + 5MB rule as every other image upload; throws a 400 ServiceError.
  images.forEach((image) => parseImageDataUrl(image));

  const ai = await extractMenu({
    businessId,
    userId,
    requestId: uuidv4(),
    images: await photosForAi(businessId, images as string[])
  });

  return {
    aiLogId: ai.log_id,
    status: ai.status,
    categories: (ai.menu?.categories || []).map((category) => ({
      name: category.name,
      items: category.items.map((item) => ({
        name: item.name,
        description: item.description || '',
        pricePaise: item.pricePaise,
        isVeg: item.isVeg,
        variants: item.variants || [],
        addons: item.addons || [],
        confidence: item.confidence,
        warnings: item.warnings || []
      }))
    })),
    notes: photoNotes(ai)
  };
};

// ── Step 2: reviewed draft → real menu ───────────────────────────────────────

interface ValidItem {
  name: string;
  description: string;
  pricePaise: number;
  isVeg: boolean;
  variants: DraftOption[];
  addons: DraftOption[];
}

interface ValidCategory {
  name: string;
  items: ValidItem[];
}

const invalid = (message: string) => new ServiceError(400, 'VALIDATION_ERROR', message);

const validPrice = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_PRICE_PAISE;

const validateOptions = (raw: unknown, kind: 'size' | 'extra', itemLabel: string): DraftOption[] => {
  if (raw === undefined || raw === null) return [];
  if (!Array.isArray(raw) || raw.length > MAX_OPTIONS_PER_ITEM) {
    throw invalid(`${itemLabel} has too many ${kind} options.`);
  }
  const seen = new Set<string>();
  const options: DraftOption[] = [];
  for (const option of raw) {
    const name = clean(option?.name);
    if (!name) throw invalid(`Every ${kind} option on ${itemLabel} needs a name.`);
    if (!validPrice(option?.pricePaise)) throw invalid(`The "${name}" ${kind} on ${itemLabel} needs a valid price.`);
    if (seen.has(name.toLowerCase())) continue;
    seen.add(name.toLowerCase());
    options.push({ name: name.slice(0, MAX_NAME_LENGTH), pricePaise: option.pricePaise });
  }
  return options;
};

/** Validates the owner-reviewed draft and merges categories that ended up with the same name. */
const validateImport = (raw: unknown): ValidCategory[] => {
  if (!Array.isArray(raw) || raw.length === 0) throw invalid('There is nothing to import.');
  if (raw.length > MAX_IMPORT_CATEGORIES) throw invalid(`At most ${MAX_IMPORT_CATEGORIES} categories per import.`);

  const merged = new Map<string, ValidCategory>();
  let itemCount = 0;

  for (const rawCategory of raw) {
    const categoryName = clean(rawCategory?.name).slice(0, MAX_NAME_LENGTH);
    if (!categoryName) throw invalid('Every category needs a name.');
    if (!Array.isArray(rawCategory?.items)) throw invalid(`Category "${categoryName}" has no items list.`);

    const category = merged.get(normName(categoryName)) ?? { name: categoryName, items: [] };
    merged.set(normName(categoryName), category);

    for (const rawItem of rawCategory.items) {
      const name = clean(rawItem?.name);
      if (!name) throw invalid(`An item in "${categoryName}" has no name.`);
      if (name.length > MAX_NAME_LENGTH) throw invalid(`"${name.slice(0, 40)}…" in ${categoryName} has too long a name.`);
      const itemLabel = `"${name}" (${categoryName})`;

      const variants = validateOptions(rawItem?.variants, 'size', itemLabel);
      const addons = validateOptions(rawItem?.addons, 'extra', itemLabel);
      // A dish with sizes is charged the chosen size's price, so its base price is the cheapest size.
      const pricePaise = variants.length ? Math.min(...variants.map((v) => v.pricePaise)) : rawItem?.pricePaise;
      if (!validPrice(pricePaise)) throw invalid(`${itemLabel} needs a price.`);

      if (rawItem?.isVeg !== undefined && typeof rawItem.isVeg !== 'boolean') {
        throw invalid(`${itemLabel} must be marked veg or non-veg.`);
      }

      category.items.push({
        name,
        description: clean(rawItem?.description).slice(0, MAX_DESCRIPTION_LENGTH),
        pricePaise,
        isVeg: rawItem?.isVeg ?? true,
        variants,
        addons
      });
      itemCount += 1;
    }
  }

  if (itemCount === 0) throw invalid('There is nothing to import.');
  if (itemCount > MAX_IMPORT_ITEMS) throw invalid(`At most ${MAX_IMPORT_ITEMS} items per import.`);
  return [...merged.values()];
};

export interface MenuImportResult {
  categoriesCreated: number;
  categoriesReused: number;
  itemsCreated: number;
  itemsSkipped: string[]; // already on the menu (same name, same category)
}

/**
 * Writes the reviewed draft to the menu. Categories are matched to the café's existing ones by
 * name (case-insensitive) and only created when missing; an item already in that category under
 * the same name is skipped, so importing the same menu twice doesn't duplicate anything.
 */
export const commitMenuImport = async (businessId: string, rawCategories: unknown): Promise<MenuImportResult> => {
  const categories = validateImport(rawCategories);

  const existing = await menuImportDao.listCategoriesForBusiness(businessId);
  const existingByName = new Map(existing.map((c) => [normName(c.name), c]));

  const reusedIds = categories
    .map((c) => existingByName.get(normName(c.name))?._id)
    .filter((id): id is NonNullable<typeof id> => !!id);
  const taken = new Set(
    (await menuImportDao.listProductNamesInCategories(businessId, reusedIds)).map(
      (p) => `${p.categoryId.toString()}|${normName(p.name)}`
    )
  );

  // Plan every category first so a category is only created if it actually gets an item.
  const itemsSkipped: string[] = [];
  const plan = categories.map((category) => {
    const existingCategory = existingByName.get(normName(category.name));
    const seen = new Set<string>();
    const items = category.items.filter((item) => {
      const key = normName(item.name);
      const alreadyOnMenu = existingCategory && taken.has(`${existingCategory._id.toString()}|${key}`);
      if (alreadyOnMenu || seen.has(key)) {
        if (alreadyOnMenu) itemsSkipped.push(item.name);
        return false;
      }
      seen.add(key);
      return true;
    });
    return { category, existingCategory, items };
  });

  const businessObjectId = new mongoose.Types.ObjectId(businessId);
  let nextCategoryOrder = existing.reduce((max, c) => Math.max(max, c.displayOrder ?? 0), -1) + 1;
  const toCreate = plan.filter((p) => !p.existingCategory && p.items.length > 0);
  const newCategoryRows: NewCategoryRow[] = toCreate.map((p) => ({
    businessId: businessObjectId,
    name: p.category.name,
    description: '',
    displayOrder: nextCategoryOrder++
  }));
  const created = await menuImportDao.insertCategories(newCategoryRows);
  toCreate.forEach((p, i) => {
    p.existingCategory = created[i];
  });

  let nextProductOrder = (await menuImportDao.maxProductDisplayOrder(businessId)) + 1;
  const productRows: NewProductRow[] = plan.flatMap((p) =>
    p.items.map((item) => ({
      _id: new mongoose.Types.ObjectId(),
      businessId: businessObjectId,
      categoryId: p.existingCategory!._id,
      name: item.name,
      description: item.description,
      pricePaise: item.pricePaise,
      imageUrl: '', // AI imports never carry photos — the owner adds them per item later
      isVeg: item.isVeg,
      displayOrder: nextProductOrder++,
      variants: item.variants,
      addons: item.addons
    }))
  );

  try {
    await menuImportDao.insertProducts(productRows);
  } catch (error) {
    // No multi-document transaction (single-node Mongo is supported), so undo by hand: an
    // insertMany that fails part-way has already saved the rows before the failure. These were
    // created moments ago, so no order can reference them yet — a hard delete is safe.
    await menuImportDao.deleteProductsByIds(
      businessId,
      productRows.map((row) => row._id)
    );
    await menuImportDao.deleteCategoriesByIds(
      businessId,
      created.map((c) => c._id)
    );
    throw error;
  }

  return {
    categoriesCreated: created.length,
    categoriesReused: plan.filter((p) => p.items.length > 0).length - created.length,
    itemsCreated: productRows.length,
    itemsSkipped
  };
};
