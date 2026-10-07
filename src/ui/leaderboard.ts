import { ITEMS_BY_ID } from '../data/shop';
import {
  NAME_MAX,
  cleanName,
  type LeaderboardEntry,
  type LeaderboardResponse,
} from '../core/scoreRules';
import type { ApiResult } from '../core/leaderboardClient';
import { ICON_BACK, ICON_TROPHY } from './icons';

export interface LeaderboardHooks {
  /** Fetch the top list (with the player's own row). */
  load: () => Promise<ApiResult<LeaderboardResponse>>;
  /** The player's current display name ('' if not set). */
  name: () => string;
  /** Save a new name locally and on the server. Returns an error message or null. */
  rename: (name: string) => Promise<string | null>;
  /** Hat pictures from the shop thumbnails (may be empty). */
  thumbnails: () => Map<string, string>;
  click: () => void;
  back: () => void;
}

const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  text = '',
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (text) el.textContent = text;
  return el;
};

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

/** A name input with validation, used on the leaderboard screen and the game-over panel. */
export function nameField(
  initial: string,
  label: string,
  onSubmit: (name: string) => Promise<string | null>,
): HTMLFormElement {
  const form = h('form', 'name-field');
  const input = h('input');
  input.type = 'text';
  input.maxLength = NAME_MAX;
  input.placeholder = 'Your name';
  input.setAttribute('autocomplete', 'nickname');
  input.spellcheck = false;
  input.value = initial;
  input.setAttribute('aria-label', 'Your name');
  const btn = h('button', 'btn', label);
  btn.type = 'submit';
  const msg = h('small', 'name-msg');
  form.append(input, btn, msg);
  // Keep game keys (WASD, space, Enter) from reaching the game while typing.
  input.addEventListener('keydown', (e) => e.stopPropagation());
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const name = cleanName(input.value);
    if (!name) {
      msg.textContent = `Use 2–${NAME_MAX} letters or numbers, and keep it friendly.`;
      msg.classList.add('err');
      return;
    }
    btn.disabled = true;
    msg.classList.remove('err');
    msg.textContent = 'Saving…';
    void onSubmit(name).then((err) => {
      btn.disabled = false;
      msg.textContent = err ?? '';
      msg.classList.toggle('err', !!err);
    });
  });
  return form;
}

/** The global leaderboard: top players by best score, with the player's own rank. */
export class LeaderboardScreen {
  readonly el = h('div', 'overlay');
  private readonly list = h('ol', 'lb-list');
  private readonly status = h('p', 'lb-status');
  private readonly nameSlot = h('div', 'lb-name');
  private loading = 0;

  constructor(private readonly hooks: LeaderboardHooks) {
    const panel = h('div', 'panel lb-panel');
    const head = h('div', 'lb-head');
    const back = h('button', 'icon-btn');
    back.innerHTML = ICON_BACK;
    back.type = 'button';
    back.setAttribute('aria-label', 'Back');
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      hooks.click();
      hooks.back();
    });
    const title = h('h2', 'lb-title');
    title.innerHTML = `${ICON_TROPHY}<span>Leaderboard</span>`;
    head.append(back, title, h('span'));
    panel.append(head, this.nameSlot, this.status, this.list);
    this.el.appendChild(panel);
  }

  open(): void {
    this.renderName();
    void this.refresh();
  }

  private renderName(): void {
    this.nameSlot.innerHTML = '';
    const current = this.hooks.name();
    this.nameSlot.append(
      h('small', 'lb-label', current ? 'Playing as' : 'Pick a name to get on the board'),
      nameField(current, current ? 'Rename' : 'Save', async (name) => {
        const err = await this.hooks.rename(name);
        if (!err) void this.refresh();
        return err;
      }),
    );
  }

  async refresh(): Promise<void> {
    const token = ++this.loading;
    this.status.textContent = 'Loading the board…';
    this.status.className = 'lb-status';
    const res = await this.hooks.load();
    if (token !== this.loading) return;
    this.list.innerHTML = '';
    if (!res.ok) {
      this.status.textContent =
        res.error === 'offline'
          ? 'The leaderboard is offline right now. Your runs still count locally.'
          : `Could not load the board (${res.error}).`;
      this.status.classList.add('err');
      return;
    }
    const { entries, me, total } = res.data;
    this.status.textContent = entries.length
      ? `${fmt(total)} player${total === 1 ? '' : 's'} on the board${me ? ` · you are #${fmt(me.rank)}` : ''}`
      : 'No scores yet. Be the first!';
    const thumbs = this.hooks.thumbnails();
    for (const e of entries) this.list.appendChild(this.row(e, thumbs));
    if (me && !entries.some((e) => e.you)) {
      this.list.appendChild(h('li', 'lb-gap', '⋯'));
      this.list.appendChild(this.row(me, thumbs));
    }
  }

  private row(e: LeaderboardEntry, thumbs: Map<string, string>): HTMLLIElement {
    const li = h('li', `lb-row${e.you ? ' you' : ''}${e.rank <= 3 ? ` top${e.rank}` : ''}`);
    li.append(h('span', 'rank', String(e.rank)));
    const who = h('span', 'who');
    const avatar = h('span', 'avatar');
    const outfit = ITEMS_BY_ID.get(e.outfit);
    avatar.style.background = outfit?.swatch[0] ?? '#C6FF00';
    const hat = thumbs.get(e.hat) ?? thumbs.get('hat_hardhat');
    if (hat) {
      const img = h('img');
      img.src = hat;
      img.alt = '';
      avatar.appendChild(img);
    }
    who.append(avatar, h('span', 'nm', e.name));
    if (e.you) who.append(h('em', 'me', 'you'));
    li.append(who, h('span', 'dist', `${fmt(e.distance)} m`), h('b', 'score', fmt(e.score)));
    return li;
  }
}
