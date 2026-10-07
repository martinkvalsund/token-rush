import {
  CATEGORIES,
  DAILY_GIFT,
  ITEMS_BY_ID,
  SHOP_ITEMS,
  type ShopCategory,
  type ShopItem,
} from '../data/shop';
import type { Loadout, SaveData } from '../core/storage';
import { buy, claimDaily, dailyReady, equip, owns } from '../core/shop';
import { ICON_BACK, ICON_CHECK, ICON_GIFT, ICON_LOCK, ICON_SHOP, ICON_TOKEN } from './icons';

export interface ShopHooks {
  save: () => SaveData;
  /** Show a (possibly unbought) loadout on the 3D character. */
  preview: (loadout: Loadout) => void;
  /** Persist the save after a purchase, equip or daily gift. */
  commit: () => void;
  /** Card pictures of the Blender models, rendered on first open. */
  thumbnails: () => Map<string, string>;
  onBuy: (item: ShopItem) => void;
  onDaily: (amount: number) => void;
  onDeny: () => void;
  click: () => void;
  back: () => void;
}

const h = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  cls = '',
  html = '',
): HTMLElementTagNameMap[K] => {
  const el = document.createElement(tag);
  if (cls) el.className = cls;
  if (html) el.innerHTML = html;
  return el;
};

const fmt = (n: number) => Math.floor(n).toLocaleString('en-US');

/**
 * The token shop: browse cosmetics by category, try them on the 3D character (the camera
 * moves in close), buy with banked tokens and equip. Nothing here affects gameplay.
 */
export class ShopScreen {
  readonly el = h('div', 'shop');
  private readonly walletEl = h('b', 'wallet-amount');
  private readonly dailyBtn = h('button', 'btn secondary daily');
  private readonly tabs = h('div', 'shop-tabs');
  private readonly grid = h('div', 'shop-grid');
  private readonly detailName = h('h3');
  private readonly detailBlurb = h('p');
  private readonly actionBtn = h('button', 'btn shop-action');
  private tab: ShopCategory = 'outfit';
  private selected: string | null = null;
  private thumbs: Map<string, string> | null = null;

  constructor(private readonly hooks: ShopHooks) {
    const panel = h('div', 'shop-panel');
    const head = h('div', 'shop-head');
    const back = h('button', 'icon-btn', ICON_BACK);
    back.type = 'button';
    back.setAttribute('aria-label', 'Back');
    back.addEventListener('click', (e) => {
      e.stopPropagation();
      hooks.click();
      hooks.back();
    });
    const title = h('div', 'shop-title', `${ICON_SHOP}<span>Token Shop</span>`);
    const wallet = h('div', 'wallet', ICON_TOKEN);
    wallet.title = 'Tokens to spend';
    wallet.appendChild(this.walletEl);
    head.append(back, title, wallet);

    this.dailyBtn.type = 'button';
    this.dailyBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const got = claimDaily(this.hooks.save());
      if (got > 0) {
        this.hooks.commit();
        this.hooks.onDaily(got);
        this.walletEl.classList.remove('pop');
        void this.walletEl.offsetWidth;
        this.walletEl.classList.add('pop');
      }
      this.refresh();
    });

    for (const c of CATEGORIES) {
      const t = h('button', 'shop-tab', c.name);
      t.type = 'button';
      t.dataset.tab = c.id;
      t.addEventListener('click', (e) => {
        e.stopPropagation();
        this.hooks.click();
        this.tab = c.id;
        this.selected = null;
        this.refresh();
      });
      this.tabs.appendChild(t);
    }

    const detail = h('div', 'shop-detail');
    const text = h('div', 'shop-detail-text');
    text.append(this.detailName, this.detailBlurb);
    this.actionBtn.type = 'button';
    this.actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.act();
    });
    detail.append(text, this.actionBtn);

    panel.append(head, this.dailyBtn, this.tabs, this.grid, detail);
    this.el.appendChild(panel);
  }

  /** Called when the screen opens: render pictures once, reset selection to what is worn. */
  open(): void {
    this.thumbs ??= this.hooks.thumbnails();
    this.selected = null;
    this.refresh();
  }

  private get save(): SaveData {
    return this.hooks.save();
  }

  /** The item the detail bar is about: the selected card, else what is equipped. */
  private get focus(): ShopItem | undefined {
    return ITEMS_BY_ID.get(this.selected ?? this.save.loadout[this.tab]);
  }

  private act(): void {
    const item = this.focus;
    if (!item) return;
    const s = this.save;
    if (owns(s, item.id)) {
      if (s.loadout[item.category] === item.id) return;
      equip(s, item.id);
      this.hooks.commit();
    } else {
      const r = buy(s, item.id);
      if (r === 'poor') {
        this.hooks.onDeny();
        this.actionBtn.classList.remove('shake');
        void this.actionBtn.offsetWidth;
        this.actionBtn.classList.add('shake');
        return;
      }
      this.hooks.commit();
      this.hooks.onBuy(item);
    }
    this.selected = null;
    this.refresh();
  }

  private refresh(): void {
    const s = this.save;
    this.walletEl.textContent = fmt(s.wallet);
    const ready = dailyReady(s);
    this.dailyBtn.innerHTML = ready
      ? `${ICON_GIFT}<span>Open daily crate · +${DAILY_GIFT}</span>`
      : `${ICON_GIFT}<span>Daily crate opened · back tomorrow</span>`;
    this.dailyBtn.disabled = !ready;
    this.dailyBtn.classList.toggle('ready', ready);
    for (const t of this.tabs.children)
      (t as HTMLElement).classList.toggle('on', (t as HTMLElement).dataset.tab === this.tab);

    // Rebuild the cards, keeping scroll position and keyboard focus.
    const scroll = this.grid.scrollTop;
    const focusedId = (document.activeElement as HTMLElement | null)?.dataset.id;
    this.grid.innerHTML = '';
    for (const item of SHOP_ITEMS) {
      if (item.category !== this.tab) continue;
      const card = this.card(item);
      this.grid.appendChild(card);
      if (item.id === focusedId) card.focus({ preventScroll: true });
    }
    this.grid.scrollTop = scroll;

    const item = this.focus;
    const preview = { ...s.loadout };
    if (item) preview[item.category] = item.id;
    this.hooks.preview(preview);
    if (!item) return;
    this.detailName.textContent = item.name;
    this.detailBlurb.textContent = item.blurb;
    const btn = this.actionBtn;
    btn.disabled = false;
    btn.classList.remove('poor', 'done');
    if (owns(s, item.id)) {
      const on = s.loadout[item.category] === item.id;
      btn.innerHTML = on ? `${ICON_CHECK}<span>Equipped</span>` : '<span>Equip</span>';
      btn.disabled = on;
      btn.classList.toggle('done', on);
    } else if (s.wallet >= item.price) {
      btn.innerHTML = `<span>Buy</span>${ICON_TOKEN}<span>${fmt(item.price)}</span>`;
    } else {
      btn.innerHTML = `${ICON_LOCK}<span>Need ${fmt(item.price - s.wallet)} more</span>`;
      btn.classList.add('poor');
    }
  }

  private card(item: ShopItem): HTMLButtonElement {
    const s = this.save;
    const owned = owns(s, item.id);
    const equipped = s.loadout[item.category] === item.id;
    const focused = (this.selected ?? s.loadout[this.tab]) === item.id;
    const c = h('button', 'shop-item');
    c.type = 'button';
    c.dataset.id = item.id;
    c.classList.toggle('equipped', equipped);
    c.classList.toggle('selected', focused);
    c.classList.toggle('locked', !owned && s.wallet < item.price);
    const pic = h('div', 'pic');
    const src = this.thumbs?.get(item.id);
    if (src) {
      const img = h('img');
      img.src = src;
      img.alt = '';
      img.draggable = false;
      pic.appendChild(img);
    } else {
      pic.classList.add('swatches');
      for (const col of item.swatch) {
        const dot = h('i');
        dot.style.background = col;
        pic.appendChild(dot);
      }
      if (item.trail && item.trail !== 'none') pic.classList.add('trail');
    }
    const price = owned
      ? equipped
        ? `<span class="tag on">${ICON_CHECK}Equipped</span>`
        : '<span class="tag">Owned</span>'
      : `<span class="price">${ICON_TOKEN}${fmt(item.price)}</span>`;
    c.append(pic, h('span', 'name', item.name), h('span', 'meta', price));
    c.addEventListener('click', (e) => {
      e.stopPropagation();
      this.hooks.click();
      this.selected = item.id;
      this.refresh();
    });
    c.addEventListener('dblclick', (e) => {
      e.stopPropagation();
      if (owns(this.save, item.id)) this.act();
    });
    return c;
  }
}
