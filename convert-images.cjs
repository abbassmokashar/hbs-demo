const fs = require('node:fs/promises');
const path = require('node:path');
const sharp = require('sharp');

const assetsRoot = path.resolve(__dirname, 'assets');
const convertible = new Set(['.jpg', '.jpeg', '.png', '.svg']);
const recompressWebp = process.argv.includes('--recompress-webp');

async function walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(fullPath));
    else files.push(fullPath);
  }
  return files;
}

async function main() {
  const sourceFiles = (await walk(assetsRoot)).filter((file) => {
    const extension = path.extname(file).toLowerCase();
    const isPhotoLibrary = /images[\\/](gallery|faculty)[\\/]/.test(file);
    return convertible.has(extension) || (recompressWebp && extension === '.webp' && isPhotoLibrary);
  });
  let sourceBytes = 0;
  let webpBytes = 0;

  for (const source of sourceFiles) {
  const extension = path.extname(source).toLowerCase();
  const isExistingWebp = extension === '.webp';
  const destination = isExistingWebp ? `${source}.optimized.webp` : source.slice(0, -extension.length) + '.webp';
  const sourceStat = await fs.stat(source);
  const isPhoto = /images[\\/](gallery|faculty)[\\/]/.test(source);
  const sharpInput = isExistingWebp ? await fs.readFile(source) : source;
  const pipeline = sharp(sharpInput, extension === '.svg' ? { density: 240 } : undefined)
    .rotate()
    .resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true });

  const metadata = await pipeline.webp(isPhoto
    ? { quality: 82, alphaQuality: 100, effort: 6, smartSubsample: true }
    : { quality: 92, alphaQuality: 100, effort: 6, nearLossless: true }
  ).toFile(destination);

  if (metadata.format !== 'webp' || !metadata.width || !metadata.height) {
    throw new Error(`Invalid WebP output: ${destination}`);
  }

    const convertedStat = await fs.stat(destination);
    sourceBytes += sourceStat.size;
    if (isExistingWebp && convertedStat.size >= sourceStat.size) {
      webpBytes += sourceStat.size;
      await fs.unlink(destination);
      console.log(`${path.relative(assetsRoot, source)} kept (${metadata.width}×${metadata.height})`);
    } else {
      webpBytes += convertedStat.size;
      // Rename over the original rather than deleting it first. The old order
      // left a window where an interrupted run could delete the source and
      // never restore it, stranding the image as a *.optimized.webp orphan.
      if (isExistingWebp) await fs.rename(destination, source);
      else await fs.unlink(source);
      console.log(`${path.relative(assetsRoot, source)} -> WebP (${metadata.width}×${metadata.height})`);
    }
  }

  const saved = sourceBytes - webpBytes;
  console.log(`Converted ${sourceFiles.length} assets to WebP.`);
  console.log(`Before: ${(sourceBytes / 1024 / 1024).toFixed(2)} MB · After: ${(webpBytes / 1024 / 1024).toFixed(2)} MB · Saved: ${(saved / 1024 / 1024).toFixed(2)} MB`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
