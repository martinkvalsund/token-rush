import type { Settings } from '../core/storage';

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html = '',
): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
  if (html) e.innerHTML = html;
  return e;
};

/** Settings screen. Every change is applied and saved immediately. */
export function buildSettings(
  settings: Settings,
  onChange: () => void,
  onReset: () => void,
  onBack: () => void,
): HTMLElement {
  const screen = el('div', { class: 'overlay' });
  const panel = el('div', { class: 'panel' });
  panel.appendChild(el('h2', {}, 'Settings'));
  const form = el('div', { class: 'form' });

  const row = (label: string, input: HTMLElement) => {
    const id = `set-${label.replace(/\W+/g, '-').toLowerCase()}`;
    input.id = id;
    form.append(el('label', { for: id }, label), input);
  };
  const select = (label: string, key: keyof Settings, options: [string, string][]) => {
    const s = el('select');
    for (const [v, t] of options) s.appendChild(el('option', { value: v }, t));
    s.value = String(settings[key]);
    s.addEventListener('change', () => {
      (settings as unknown as Record<string, unknown>)[key] = s.value;
      onChange();
    });
    row(label, s);
  };
  const range = (label: string, key: keyof Settings, min: number, max: number, step: number) => {
    const r = el('input', {
      type: 'range',
      min: String(min),
      max: String(max),
      step: String(step),
    });
    r.value = String(settings[key]);
    r.addEventListener('input', () => {
      (settings as unknown as Record<string, unknown>)[key] = Number(r.value);
      onChange();
    });
    row(label, r);
  };
  const check = (label: string, key: keyof Settings) => {
    const c = el('input', { type: 'checkbox' });
    c.checked = Boolean(settings[key]);
    c.addEventListener('change', () => {
      (settings as unknown as Record<string, unknown>)[key] = c.checked;
      onChange();
    });
    row(label, c);
  };

  select('Controls', 'controls', [
    ['keys', 'Keyboard: WASD (+ arrow keys)'],
    ['trackpad', 'Trackpad swipe (+ keys)'],
  ]);
  range('Swipe sensitivity', 'swipeSensitivity', 0.25, 3, 0.05);
  range('Master volume', 'masterVolume', 0, 1, 0.05);
  range('Music volume', 'musicVolume', 0, 1, 0.05);
  range('Effects volume', 'sfxVolume', 0, 1, 0.05);
  check('Mute (M)', 'muted');
  select('Graphics', 'quality', [
    ['auto', 'Auto'],
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low'],
  ]);
  check('Reduce motion / camera shake', 'reduceMotion');
  check('Show FPS', 'showFps');
  panel.appendChild(form);

  const reset = el('button', { class: 'btn secondary', type: 'button' }, 'Reset saved data');
  let armed = false;
  reset.addEventListener('click', () => {
    if (!armed) {
      armed = true;
      reset.textContent = 'Click again to erase highscore and stats';
      window.setTimeout(() => {
        armed = false;
        reset.textContent = 'Reset saved data';
      }, 3000);
      return;
    }
    armed = false;
    reset.textContent = 'Saved data erased';
    onReset();
  });
  const back = el('button', { class: 'btn', type: 'button' }, 'Back');
  back.addEventListener('click', onBack);
  const r = el('div', { class: 'row' });
  r.append(back, reset);
  panel.appendChild(r);
  screen.appendChild(panel);
  return screen;
}
