import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import mongoose from 'mongoose';
import { connectDB } from '../database';
import { Business } from '../models/Business';
import { Product } from '../models/Product';
import { getStorage, uploadImage } from '../services/storage';
import { mongoDriver } from '../services/storage/mongo.driver';

// One-off: gives every Batra's Bistro menu item its photo. Takes a manifest (JSON of
// { "<menu item name>": "<image file name>" }) and the folder the files sit in; each distinct file
// is shrunk to 800px JPEG, stored once through the configured storage driver, and every item that
// points at it gets that URL as its imageUrl.
//
//   npx ts-node src/scripts/uploadBatrasMenuImages.ts <folder> <manifest.json>           -> dry run
//   npx ts-node src/scripts/uploadBatrasMenuImages.ts <folder> <manifest.json> --apply   -> uploads
//
// Uses the same config as the server (config.<NODE_ENV>.json), so check the database it prints.
// Re-running is safe but re-uploads: items already holding an image are overwritten, and an old
// image kept in Mongo (the mongo driver's /api/v1/public/images/ URLs) is deleted once nothing
// points at it, so switching storage.driver to s3 doesn't leave the bytes behind in the database.

const SLUG = 'batras-bistro-dasuya';
const run = promisify(execFile);

const shrink = async (file: string): Promise<string> => {
  const out = `${file}.upload.jpg`;
  await run('convert', [file, '-auto-orient', '-background', 'white', '-flatten', '-resize', '800x800>', '-quality', '82', out]);
  return out;
};

const main = async () => {
  const [folder, manifestPath] = process.argv.slice(2).filter((a) => !a.startsWith('--'));
  const apply = process.argv.includes('--apply');
  if (!folder || !manifestPath) throw new Error('Usage: uploadBatrasMenuImages.ts <folder> <manifest.json> [--apply]');
  const manifest: Record<string, string> = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  await connectDB();
  console.log(`[images] Database: ${mongoose.connection.host}/${mongoose.connection.name}`);
  const business = await Business.findOne({ slug: SLUG });
  if (!business) throw new Error(`No business with slug ${SLUG}`);

  const products = await Product.find({ businessId: business._id, isDeleted: { $ne: true } });
  const byName = new Map(products.map((p) => [p.name, p]));
  const missing = Object.keys(manifest).filter((name) => !byName.has(name));
  const noImage = products.filter((p) => !manifest[p.name]).map((p) => p.name);
  const missingFiles = [...new Set(Object.values(manifest))].filter((f) => !fs.existsSync(path.join(folder, f)));
  console.log(`[images] ${products.length} products, ${Object.keys(manifest).length} in manifest, ${new Set(Object.values(manifest)).size} distinct files`);
  if (missing.length) console.log('[images] In manifest but not on menu:', missing);
  if (noImage.length) console.log('[images] On menu but no image in manifest:', noImage);
  if (missingFiles.length) throw new Error(`Image files not found in ${folder}: ${missingFiles.join(', ')}`);

  if (!apply) {
    console.log('[images] DRY RUN — nothing uploaded. Re-run with --apply.');
    await mongoose.disconnect();
    return;
  }

  const urlByFile = new Map<string, string>();
  let updated = 0;
  const replaced = new Set<string>();
  for (const [name, file] of Object.entries(manifest)) {
    const product = byName.get(name);
    if (!product) continue;
    let url = urlByFile.get(file);
    if (!url) {
      const small = await shrink(path.join(folder, file));
      try {
        const dataUrl = `data:image/jpeg;base64,${fs.readFileSync(small).toString('base64')}`;
        url = (await uploadImage({ dataUrl, folder: 'menu', ownerId: business._id.toString() })).url;
      } finally {
        fs.rmSync(small, { force: true });
      }
      urlByFile.set(file, url);
    }
    if (product.imageUrl && product.imageUrl !== url) replaced.add(product.imageUrl);
    product.imageUrl = url;
    await product.save();
    updated += 1;
  }
  const stillUsed = new Set((await Product.find({ imageUrl: { $in: [...replaced] } }).select('imageUrl')).map((p) => p.imageUrl));
  let removed = 0;
  for (const old of replaced) {
    if (!stillUsed.has(old) && (await mongoDriver.deleteByUrl(old))) removed += 1;
  }
  console.log(`[images] Storage driver: ${getStorage().name}; removed ${removed} old Mongo-stored images`);
  console.log(`[images] Uploaded ${urlByFile.size} images, set imageUrl on ${updated} items`);
  await mongoose.disconnect();
};

main().catch(async (err) => {
  console.error('[images] Failed:', err);
  await mongoose.disconnect();
  process.exit(1);
});
