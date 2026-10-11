// Generates owned, illustrative video assets; no Discord data or remote media.
// Run deliberately after changing the storyboard, not on every build.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const destination = path.join(root, 'apps/helper-panel/public/feature-demos');
// Retain the original command; pass "suggestions" to generate that storyboard
// without replacing any existing Starboard assets.
const feature = process.argv[2] ?? 'starboard';
if (!['starboard', 'suggestions'].includes(feature)) throw new Error('Unknown feature demo');
await fs.mkdir(destination, { recursive: true });
const browser = await chromium.launch();
try {
  for (const locale of ['en', 'pt']) {
    const page = await browser.newPage();
    const output = await page.evaluate(async ({ locale, feature }) => {
      const canvas = document.createElement('canvas');
      canvas.width = 960; canvas.height = 540;
      const ctx = canvas.getContext('2d');
      const pt = locale === 'pt';
      const text = pt ? {
        demo: 'EXEMPLO ILUSTRATIVO · SEM AÇÕES NO DISCORD',
        title: 'Uma mensagem que merece destaque',
        message: 'Partilhei um guia para ajudar a comunidade!',
        one: '1. Um membro publica uma mensagem',
        two: '2. Outros membros adicionam estrelas',
        three: '3. Ao chegar a 3, aparece no #starboard',
        mirrored: 'Mensagem destacada pelo Vozen Helper',
        sample: 'Exemplo: 3 estrelas · canal #starboard',
      } : {
        demo: 'ILLUSTRATIVE EXAMPLE · NO DISCORD ACTIONS',
        title: 'A message worth highlighting',
        message: 'I shared a guide to help the community!',
        one: '1. A member posts a message',
        two: '2. Other members add stars',
        three: '3. At 3 stars, it appears in #starboard',
        mirrored: 'Message highlighted by Vozen Helper',
        sample: 'Example: 3 stars · channel #starboard',
      };
      function card(x, y, w, h, alpha = 1) {
        ctx.globalAlpha = alpha;
        ctx.fillStyle = '#152439'; ctx.beginPath(); ctx.roundRect(x, y, w, h, 16); ctx.fill();
        ctx.strokeStyle = '#33536d'; ctx.stroke(); ctx.globalAlpha = 1;
      }
      function label(content, x, y, size = 22, color = '#f4f7fb') {
        ctx.fillStyle = color; ctx.font = `${size >= 28 ? 'bold ' : ''}${size}px system-ui, sans-serif`;
        ctx.fillText(content, x, y);
      }
      function draw(time) {
        if (feature === 'suggestions') { drawSuggestions(time); return; }
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label('VOZEN HELPER / STARBOARD', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(text.title, 42, 115, 30);
        const stars = time < 2 ? 0 : time < 3.5 ? 1 : time < 5 ? 2 : 3;
        const reveal = Math.min(1, Math.max(0, (time - 5.3) / 0.35));
        const eased = 1 - (1 - reveal) ** 3;
        card(42, 140, 876, 150);
        label('# general', 65, 172, 16, '#a3b6d1');
        ctx.fillStyle = '#8ee5d2'; ctx.beginPath(); ctx.arc(83, 211, 18, 0, Math.PI * 2); ctx.fill();
        label('Alex · sample', 115, 208, 17, '#8ee5d2');
        label(text.message, 115, 238, 24);
        label(`★ ${stars} / 3`, 65, 272, 21, '#ffd170');
        if (reveal > 0) {
          const y = 311 + 12 * (1 - eased);
          card(42, y, 876, 128, eased);
          ctx.globalAlpha = eased;
          label('# starboard', 65, y + 32, 18, '#8ee5d2');
          label(text.mirrored, 65, y + 64, 17, '#a3b6d1');
          label(`★ 3   Alex: ${text.message}`, 65, y + 101, 22);
          ctx.globalAlpha = 1;
        }
        label(time < 2 ? text.one : time < 5.3 ? text.two : text.three, 42, 485, 22);
        label(text.sample, 42, 518, 14, '#a3b6d1');
        ctx.fillStyle = '#24354c'; ctx.fillRect(42, 531, 876, 3);
        ctx.fillStyle = '#8ee5d2'; ctx.fillRect(42, 531, 876 * Math.min(time / 10, 1), 3);
      }
      function drawSuggestions(time) {
        const idea = pt ? 'Criar um canal para eventos' : 'Create a channel for events';
        const voted = time >= 4.5;
        const approved = time >= 7;
        ctx.fillStyle = '#080f1c'; ctx.fillRect(0, 0, 960, 540);
        label(pt ? 'VOZEN HELPER / SUGESTÕES' : 'VOZEN HELPER / SUGGESTIONS', 42, 42, 18, '#8ee5d2');
        label(text.demo, 42, 70, 13, '#a3b6d1');
        label(pt ? 'Uma ideia, votos e uma decisão' : 'An idea, votes and a decision', 42, 111, 30);
        card(42, 135, 876, 75);
        label(pt ? 'Alex · membro de exemplo' : 'Alex · sample member', 62, 160, 15, '#a3b6d1');
        label(`/suggest text: ${idea}`, 62, 193, 23, '#8ee5d2');
        if (time >= 2) {
          const reveal = Math.min(1, (time - 2) / .3);
          card(42, 229, 876, 207, reveal);
          ctx.globalAlpha = reveal;
          label('# suggestions', 64, 258, 16, '#a3b6d1');
          label(pt ? 'Vozen Helper · Sugestão #1' : 'Vozen Helper · Suggestion #1', 64, 289, 21, '#8ee5d2');
          label(idea, 64, 323, 26);
          label(pt ? `Estado: ${approved ? 'APROVADA' : 'PENDENTE'}` : `Status: ${approved ? 'APPROVED' : 'PENDING'}`, 64, 355, 18, approved ? '#8ee5d2' : '#ffd170');
          ctx.fillStyle = '#245044'; ctx.beginPath(); ctx.roundRect(64, 376, 205, 41, 9); ctx.fill();
          label(`${pt ? 'A favor' : 'Support'} · ${voted ? 3 : 0}`, 82, 403, 19, '#8ee5d2');
          ctx.fillStyle = '#483141'; ctx.beginPath(); ctx.roundRect(284, 376, 205, 41, 9); ctx.fill();
          label(`${pt ? 'Contra' : 'Against'} · ${voted ? 1 : 0}`, 302, 403, 19, '#f9b4c6');
          if (approved) label('/suggestion id: 1 status: approved', 518, 402, 15, '#a3b6d1');
          ctx.globalAlpha = 1;
        }
        const step = time < 2 ? (pt ? '1. Um membro envia a ideia com /suggest' : '1. A member submits an idea with /suggest')
          : time < 7 ? (pt ? '2. O Helper publica a ideia e os membros votam' : '2. Helper posts the idea and members vote')
          : (pt ? '3. Um moderador aprova e o estado é atualizado' : '3. A moderator approves and the status updates');
        label(step, 42, 482, 23);
        label(pt ? 'Exemplo: canal #suggestions · votos a favor e contra' : 'Example: #suggestions channel · Support / Against voting', 42, 516, 14, '#a3b6d1');
        ctx.fillStyle = '#24354c'; ctx.fillRect(42, 531, 876, 3);
        ctx.fillStyle = '#8ee5d2'; ctx.fillRect(42, 531, 876 * Math.min(time / 10, 1), 3);
      }
      draw(0);
      const poster = canvas.toDataURL('image/png').split(',')[1];
      const stream = canvas.captureStream(24);
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm;codecs=vp8', videoBitsPerSecond: 700_000 });
      const chunks = [];
      recorder.ondataavailable = event => chunks.push(event.data);
      const done = new Promise(resolve => { recorder.onstop = resolve; });
      recorder.start();
      const start = performance.now();
      await new Promise(resolve => {
        function frame() {
          const time = (performance.now() - start) / 1000;
          draw(time);
          if (time >= 10) resolve(); else requestAnimationFrame(frame);
        }
        frame();
      });
      recorder.stop();
      await done;
      stream.getTracks().forEach(track => track.stop());
      const bytes = new Uint8Array(await new Blob(chunks).arrayBuffer());
      let binary = '';
      for (let offset = 0; offset < bytes.length; offset += 8192) binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192));
      return { poster, video: btoa(binary) };
    }, { locale, feature });
    await fs.writeFile(path.join(destination, `${feature}-${locale}.png`), Buffer.from(output.poster, 'base64'));
    await fs.writeFile(path.join(destination, `${feature}-${locale}.webm`), Buffer.from(output.video, 'base64'));
    console.log(`Generated 10-second ${locale} ${feature} demo`);
    await page.close();
  }
} finally { await browser.close(); }
