// Encode docs/media/frames/*.png into docs/media/gameplay.gif (no ffmpeg needed).
import { readdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { PNG } from 'pngjs';
import gifenc from 'gifenc';

const { GIFEncoder, quantize, applyPalette } = gifenc;
const dir = 'docs/media/frames';
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.png'))
  .sort();
const gif = GIFEncoder();
for (const f of files) {
  const png = PNG.sync.read(readFileSync(join(dir, f)));
  const palette = quantize(png.data, 128);
  const index = applyPalette(png.data, palette);
  gif.writeFrame(index, png.width, png.height, { palette, delay: 90 });
}
gif.finish();
writeFileSync('docs/media/gameplay.gif', gif.bytes());
rmSync(dir, { recursive: true, force: true });
console.log(`wrote docs/media/gameplay.gif from ${files.length} frames`);
