// Convert the owned storyboards to infinitely looping GIFs. FFmpeg is needed
// only for deliberate regeneration; the deployment ships committed assets.
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = resolve(dirname(fileURLToPath(import.meta.url)), '../apps/helper-panel/public/feature-demos');
const features = process.argv.slice(2).length ? process.argv.slice(2) : ['starboard', 'suggestions', 'giveaways', 'tickets'];
if (features.some(feature => !['starboard', 'suggestions', 'giveaways', 'tickets'].includes(feature))) throw new Error('Unknown feature demo');
for (const feature of features) {
  for (const locale of ['en', 'pt']) {
    const asset = resolve(directory, `${feature}-${locale}`);
    execFileSync('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', `${asset}.webm`,
      '-filter_complex', 'drawbox=x=0:y=528:w=iw:h=12:color=0x080f1c:t=fill,fps=8,scale=640:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=96:stats_mode=full[p];[b][p]paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle',
      '-loop', '0', `${asset}.gif`], { stdio: 'inherit' });
    console.log(`Generated ${feature}-${locale}.gif with infinite looping`);
  }
}
