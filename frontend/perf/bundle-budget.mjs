// Bundle budget for the two mascot renderers (spec §8.4, "Performance work on the heavy mascot").
//
//   npm run perf:bundle              builds the app into a temp folder, then checks the budgets
//   node perf/bundle-budget.mjs --dir <dist>   checks an existing build, skipping the build
//
// Exits 1 if the heavy 3D engine chunk (`createEngine-*.js`) is over 100 KB gzip, or if the light
// renderer (`createLiteEngine-*.js` plus its stylesheet; the SVG is inlined in the script) is over
// 30 KB gzip. Sizes use Vite's convention (1 KB = 1000 bytes, default gzip level), so they match
// the numbers `vite build` prints and the 143 KB baseline recorded in the spec.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const KB = 1000;
/** One entry per renderer: every file in dist/assets whose name matches one pattern counts. */
const BUDGETS = [
  { name: 'heavy engine (createEngine)', patterns: [/^createEngine-.*\.js$/], limitKb: 100 },
  {
    name: 'light renderer (createLiteEngine)',
    patterns: [/^createLiteEngine-.*\.(js|css)$/],
    limitKb: 30,
  },
];

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const dirFlag = process.argv.indexOf('--dir');
let distDir = dirFlag > -1 ? resolve(process.argv[dirFlag + 1] ?? '') : null;
let tempDir = null;

if (!distDir) {
  tempDir = mkdtempSync(join(tmpdir(), 'cafeos-bundle-'));
  distDir = tempDir;
  const build = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules', 'vite', 'bin', 'vite.js'),
      'build',
      '--outDir',
      distDir,
      '--emptyOutDir',
      '--logLevel',
      'warn',
    ],
    { cwd: root, stdio: 'inherit' },
  );
  if (build.status !== 0) {
    console.error('vite build failed; no budget check was done.');
    process.exit(build.status ?? 1);
  }
}

const assetsDir = join(distDir, 'assets');
const assets = readdirSync(assetsDir);
let failed = false;

for (const { name, patterns, limitKb } of BUDGETS) {
  const files = assets.filter((file) => patterns.some((pattern) => pattern.test(file)));
  if (files.length === 0) {
    console.error(`FAIL  ${name}: no matching file in ${assetsDir}`);
    failed = true;
    continue;
  }
  let raw = 0;
  let gzip = 0;
  for (const file of files) {
    const bytes = readFileSync(join(assetsDir, file));
    raw += bytes.length;
    gzip += gzipSync(bytes).length;
  }
  const over = gzip > limitKb * KB;
  if (over) failed = true;
  console.log(
    `${over ? 'FAIL' : 'ok  '}  ${name}: ${(raw / KB).toFixed(1)} KB raw, ` +
      `${(gzip / KB).toFixed(1)} KB gzip (limit ${limitKb} KB)  [${files.join(', ')}]`,
  );
}

if (tempDir) rmSync(tempDir, { recursive: true, force: true });
process.exit(failed ? 1 : 0);
