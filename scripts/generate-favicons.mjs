import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import toIco from 'to-ico';

const repoRoot = process.cwd();
const inputPath = path.join(repoRoot, 'src', 'assets', 'logo.PNG');
const outDir = path.join(repoRoot, 'public');

const ensureDir = async (dir) => {
  await fs.mkdir(dir, { recursive: true });
};

const renderPng = async (size) => {
  const image = sharp(inputPath, { failOn: 'none' });

  // Keep logo identity without harsh cropping: contain + transparent padding.
  const buffer = await image
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();

  return buffer;
};

const main = async () => {
  await ensureDir(outDir);

  const png16 = await renderPng(16);
  const png32 = await renderPng(32);
  const png180 = await renderPng(180);

  await Promise.all([
    fs.writeFile(path.join(outDir, 'favicon-16x16.png'), png16),
    fs.writeFile(path.join(outDir, 'favicon-32x32.png'), png32),
    fs.writeFile(path.join(outDir, 'apple-touch-icon.png'), png180),
  ]);

  const ico = await toIco([png16, png32]);
  await fs.writeFile(path.join(outDir, 'favicon.ico'), ico);

  // Optional: also keep a higher-res PNG for Android/desktop shortcuts.
  const png192 = await renderPng(192);
  await fs.writeFile(path.join(outDir, 'android-chrome-192x192.png'), png192);

  // eslint-disable-next-line no-console
  console.log('Favicons generated in public/: favicon.ico, favicon-16x16.png, favicon-32x32.png, apple-touch-icon.png, android-chrome-192x192.png');
};

main().catch((error) => {
  // eslint-disable-next-line no-console
  console.error(error);
  process.exitCode = 1;
});
