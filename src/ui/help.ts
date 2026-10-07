import { POWERUP_ICONS, POWERUP_NAMES } from './icons';
import type { PowerupType } from '../sim/entities';

const POWERUP_TEXT: Record<PowerupType, string> = {
  magnet: 'Pulls in every token within 10 m, all lanes.',
  jetpack: 'Fly above everything and grab the sky trail of tokens.',
  shield: 'Absorbs one stumble or crash.',
  double: 'Doubles distance and token score.',
  boots: 'Super jump — clear (or land on) lower vehicles.',
  mystery: 'Random power-up, a token shower or bonus score.',
};

export function buildHelp(onBack: () => void): HTMLElement {
  const screen = document.createElement('div');
  screen.className = 'overlay';
  const pu = (Object.keys(POWERUP_TEXT) as PowerupType[])
    .map((t) => `${POWERUP_ICONS[t]}<div><b>${POWERUP_NAMES[t]}</b> — ${POWERUP_TEXT[t]}</div>`)
    .join('');
  const swatch = (bg: string) => `<div class="swatch" style="background:${bg}"></div>`;
  screen.innerHTML = `
  <div class="panel">
    <h2>How to play</h2>
    <div class="help">
      <p>You're a developer sprinting across the site. Collect <b>tokens</b> to afford your prompts, dodge obstacles, and keep ahead of the <b>Tech Debt boulder</b>.</p>
      <h3>Controls</h3>
      <div class="grid">
        <span class="kbd">A</span><div>Move left (or <span class="kbd">←</span> / swipe left)</div>
        <span class="kbd">D</span><div>Move right (or <span class="kbd">→</span> / swipe right)</div>
        <span class="kbd">W</span><div>Jump (or <span class="kbd">↑</span>, <span class="kbd">Space</span>, swipe up)</div>
        <span class="kbd">S</span><div>Slide; in the air: fast-fall (or <span class="kbd">↓</span>, swipe down)</div>
        <span class="kbd">Esc</span><div>Pause (<span class="kbd">P</span> too) · <span class="kbd">M</span> mute</div>
      </div>
      <p><b>Trackpad:</b> choose “Trackpad” in Settings, then just flick one finger left, right, up or down — no clicking, like swiping on a phone. Two-finger swipes work in every mode. Press Esc to get the cursor back.</p>
      <h3>Obstacles</h3>
      <div class="grid">
        ${swatch('repeating-linear-gradient(-45deg,#ffc72c 0 6px,#111 6px 12px)')}<div><b>Low</b> (yellow/black stripes): jump over.</div>
        ${swatch('repeating-linear-gradient(-45deg,#d9302c 0 6px,#f2f2ee 6px 12px)')}<div><b>Overhead</b> (red/white bar at head height): slide under.</div>
        ${swatch('#546e7a')}<div><b>Vehicles and containers</b>: change lane — hitting one head-on ends the run. Ramps lead onto container roofs.</div>
        ${swatch('#ff8a1a')}<div><b>Moving hazards</b> (flashing beacon, beeps, lane arrow): get out of that lane.</div>
      </div>
      <h3>Lives</h3>
      <p>Stumbling brings the boulder into view and greys out a hard hat. Stumble again before it falls back and it catches you.</p>
      <h3>Power-ups</h3>
      <div class="grid">${pu}</div>
    </div>
  </div>`;
  const back = document.createElement('button');
  back.className = 'btn';
  back.type = 'button';
  back.textContent = 'Back';
  back.addEventListener('click', onBack);
  screen.querySelector('.panel')?.appendChild(back);
  return screen;
}
