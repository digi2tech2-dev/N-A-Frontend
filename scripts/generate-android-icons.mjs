import path from 'node:path';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

const projectRoot = path.resolve(import.meta.dirname, '..');
const sourcePath = path.join(projectRoot, 'src', 'assets', 'IMG_logo_app.PNG');
const resourceRoot = path.join(projectRoot, 'android', 'app', 'src', 'main', 'res');

const densities = {
  mdpi: { legacy: 48, adaptive: 108 },
  hdpi: { legacy: 72, adaptive: 162 },
  xhdpi: { legacy: 96, adaptive: 216 },
  xxhdpi: { legacy: 144, adaptive: 324 },
  xxxhdpi: { legacy: 192, adaptive: 432 },
};

const transparent = { r: 0, g: 0, b: 0, alpha: 0 };

const renderContainedIcon = async (size, insetRatio = 0) => {
  const contentSize = Math.round(size * (1 - insetRatio * 2));
  const icon = await sharp(sourcePath)
    .rotate()
    .resize(contentSize, contentSize, { fit: 'contain', background: transparent })
    .png()
    .toBuffer();

  return sharp({
    create: { width: size, height: size, channels: 4, background: transparent },
  })
    .composite([{ input: icon, gravity: 'centre' }])
    .png()
    .toBuffer();
};

for (const [density, sizes] of Object.entries(densities)) {
  const outputDir = path.join(resourceRoot, `mipmap-${density}`);
  await mkdir(outputDir, { recursive: true });

  const legacyIcon = await renderContainedIcon(sizes.legacy);
  const circleMask = Buffer.from(`
    <svg width="${sizes.legacy}" height="${sizes.legacy}">
      <circle cx="50%" cy="50%" r="50%" fill="white" />
    </svg>
  `);
  const roundIcon = await sharp(legacyIcon)
    .composite([{ input: circleMask, blend: 'dest-in' }])
    .png()
    .toBuffer();

  // Adaptive icons use a larger canvas. The inset protects the logo from the
  // different circle/squircle masks used by Android launchers.
  const adaptiveForeground = await renderContainedIcon(sizes.adaptive, 0.08);

  await Promise.all([
    sharp(legacyIcon).toFile(path.join(outputDir, 'ic_launcher.png')),
    sharp(roundIcon).toFile(path.join(outputDir, 'ic_launcher_round.png')),
    sharp(adaptiveForeground).toFile(path.join(outputDir, 'ic_launcher_foreground.png')),
  ]);
}

console.log(`Android launcher icons generated from ${sourcePath}`);
