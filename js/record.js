// めぐりの記録。親密度は数値にせず、既存アトラスの姿勢と一文だけで見せる。

import { calendar } from './weather.js';
import { bondLevel } from './garden.js';
import { FRUIT, LIKES, devShiftDays, windLikes } from './state.js';

export const RING_ORDER = Object.freeze([
  'sunny', 'cloudy', 'rainy', 'thunder', 'hail', 'snow', 'fog',
]);

export const OUTSIDE_ORDER = Object.freeze(['rainbow', 'wind', 'diamonddust']);

export const RECORD_NAME = Object.freeze({
  sunny: '晴', cloudy: '曇', rainy: '雨', thunder: '雷', hail: 'ひょう',
  snow: '雪', fog: '霧', rainbow: '虹', wind: '風',
  diamonddust: 'ダイヤモンドダスト',
});

// 骨格v2 §6「挙動」欄の逐語。親密度はこの一文と姿勢以外では表さない。
// 骨格v2 §6 の4段階を、プレイヤーの言葉で言い直したもの。
// ★ 企画の表の右列（idle / waving / running…）はスプライトの行の名前であって、
//   画面に出す文ではない。見えている事実だけを書く。
export const BOND_TEXT = Object.freeze([
  'まだ こちらを 見ない',
  'ときどき 目が合う',
  '来ると 手を あげてくれる',
  'ひらくと 駆けてくる',
]);

const BOND_POSE = Object.freeze(['idle', 'waiting', 'waving', 'running']);

const HINT = Object.freeze({
  diamonddust: '冬の いちばん 冷える朝。風のない、湿った空に',
  thunder: '夏の 蒸した空。気圧を 深く 下げた先に',
  hail: '春と秋の あいだの 冷たい雨が、荒れたとき',
  snow: '冬の 降る空',
  fog: '湿りきって、風のない 底',
  rainbow: '雨が あがって、雲が ひらいた ほんの少しのあいだ',
});

const OUTSIDE_REASON = Object.freeze({
  rainbow: '点ではなく道。雨あがりの空にしか いない',
  wind: '好みが 毎日 変わる',
  diamonddust: '餌を 食べない。静けさで そばに来る',
});

const EDGE_COLOR = Object.freeze({
  fog: '#cdd4d3', sunny: '#e0a63c', cloudy: '#a9adaa', rainy: '#7fa8c9',
  thunder: '#8b7fb0', hail: '#93a7b3', snow: '#e8eef0',
});

const PET_ID = (id) => `yui-${id}`;
const SVG_NS = 'http://www.w3.org/2000/svg';
const DAY_WORD = ['一日目', '二日目', '三日目'];

/**
 * 環の対応は LIKES からその都度作る。記録画面側に好み表を複製しない。
 */
export function ringEntries(state = {}) {
  const meals = state.meals || {};
  return RING_ORDER.map((to) => {
    const from = LIKES[to];
    return {
      from,
      to,
      fruit: FRUIT[from],
      passed: (meals[to]?.[from] || 0) > 0,
      color: EDGE_COLOR[from],
    };
  });
}

function firstMetText(state, id) {
  const metAt = Number(state.seen[id]);
  if (!Number.isFinite(metAt)) return '';
  const metDay = Math.floor(metAt / 86400000) + devShiftDays();
  const cal = calendar(metDay - state.startDay);
  return `${cal.sekkiMonth} の${DAY_WORD[cal.dayOfYear % 3]}`;
}

function html(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function pointAt(index, radius = 118) {
  const a = (-90 + index * (360 / RING_ORDER.length)) * Math.PI / 180;
  return { x: 160 + Math.cos(a) * radius, y: 160 + Math.sin(a) * radius };
}

function arcPath(index, radius = 118) {
  const step = 360 / RING_ORDER.length;
  const target = -90 + index * step;
  const source = target - step;
  const trim = 14;
  const at = (degrees) => {
    const a = degrees * Math.PI / 180;
    return { x: 160 + Math.cos(a) * radius, y: 160 + Math.sin(a) * radius };
  };
  const a = at(source + trim);
  const b = at(target - trim);
  return `M ${a.x.toFixed(2)} ${a.y.toFixed(2)} A ${radius} ${radius} 0 0 1 ${b.x.toFixed(2)} ${b.y.toFixed(2)}`;
}

export class RecordScreen {
  constructor({ root, openButton, getState, bank }) {
    this.root = root;
    this.openButton = openButton;
    this.getState = getState;
    this.bank = bank;
    this.selected = null;
    this.ring = root.querySelector('#record-ring');
    this.outside = root.querySelector('#record-outside');
    this.sheet = root.querySelector('#record-sheet');
    this.closeButton = root.querySelector('#record-close');

    openButton.addEventListener('click', () => this.open());
    this.closeButton.addEventListener('click', () => this.close());
    root.addEventListener('keydown', (event) => this.moveNodeFocus(event));
  }

  open() {
    this.root.hidden = false;
    this.root.setAttribute('aria-hidden', 'false');
    document.body.classList.add('record-open');
    this.render();
    this.closeButton.focus();
  }

  close() {
    this.root.hidden = true;
    this.root.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('record-open');
    this.openButton.focus();
  }

  render() {
    this.renderRing();
    this.renderOutside();
    if (this.selected) this.renderSheet(this.selected, false);
    else this.sheet.hidden = true;
  }

  renderRing() {
    const state = this.getState();
    this.ring.replaceChildren();

    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'record-ring-lines');
    svg.setAttribute('viewBox', '0 0 320 320');
    svg.setAttribute('aria-hidden', 'true');
    const defs = document.createElementNS(SVG_NS, 'defs');
    svg.appendChild(defs);

    for (const [index, edge] of ringEntries(state).entries()) {
      const edgeColor = edge.passed ? edge.color : '#cdd4d3';
      const marker = document.createElementNS(SVG_NS, 'marker');
      marker.setAttribute('id', `record-arrow-${index}`);
      marker.setAttribute('viewBox', '0 0 10 10');
      marker.setAttribute('refX', '8');
      marker.setAttribute('refY', '5');
      marker.setAttribute('markerWidth', '6');
      marker.setAttribute('markerHeight', '6');
      marker.setAttribute('orient', 'auto-start-reverse');
      const arrow = document.createElementNS(SVG_NS, 'path');
      arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
      arrow.setAttribute('fill', edgeColor);
      marker.appendChild(arrow);
      defs.appendChild(marker);

      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('d', arcPath(index));
      path.setAttribute('class', `record-edge${edge.passed ? ' is-passed' : ''}`);
      path.setAttribute('data-target', edge.to);
      path.setAttribute('marker-end', `url(#record-arrow-${index})`);
      path.style.setProperty('--edge-color', edgeColor);
      svg.appendChild(path);
    }
    this.ring.appendChild(svg);

    for (const [index, id] of RING_ORDER.entries()) {
      const point = pointAt(index);
      const node = this.makeNode(id, point);
      this.ring.appendChild(node);
    }
  }

  renderOutside() {
    this.outside.replaceChildren();
    for (const id of OUTSIDE_ORDER) {
      const item = html('div', 'record-outside-item');
      item.appendChild(this.makeNode(id));
      item.appendChild(html('p', 'record-outside-reason', OUTSIDE_REASON[id]));
      this.outside.appendChild(item);
    }
  }

  makeNode(id, point) {
    const state = this.getState();
    const seen = Boolean(state.seen[id]);
    const button = html('button', `record-node${seen ? '' : ' is-unseen'}`);
    button.type = 'button';
    button.dataset.recordNode = id;
    button.setAttribute('aria-label', RECORD_NAME[id]);
    button.setAttribute('aria-pressed', String(this.selected === id));
    if (point) {
      button.style.left = `${point.x}px`;
      button.style.top = `${point.y}px`;
    }

    if (seen) {
      const canvas = html('canvas', 'record-node-sprite');
      canvas.setAttribute('aria-hidden', 'true');
      button.appendChild(canvas);
      this.drawPose(canvas, id, 56, 58);
    } else {
      button.appendChild(html('span', 'record-empty'));
    }
    button.appendChild(html('span', 'record-node-name', RECORD_NAME[id]));
    button.addEventListener('click', () => this.select(id));
    return button;
  }

  select(id) {
    this.selected = id;
    for (const node of this.root.querySelectorAll('[data-record-node]')) {
      node.setAttribute('aria-pressed', String(node.dataset.recordNode === id));
    }
    this.renderSheet(id, true);
  }

  renderSheet(id, animateArc) {
    const state = this.getState();
    const seen = Boolean(state.seen[id]);
    this.sheet.replaceChildren();
    this.sheet.hidden = false;

    const portrait = html('div', `record-portrait${seen ? '' : ' is-unseen'}`);
    if (seen) {
      const canvas = html('canvas', 'record-portrait-sprite');
      canvas.setAttribute('aria-hidden', 'true');
      portrait.appendChild(canvas);
      this.drawPose(canvas, id, 156, 156);
    } else {
      portrait.appendChild(html('span', 'record-portrait-empty'));
    }
    this.sheet.appendChild(portrait);

    this.sheet.appendChild(html('h2', 'record-character-name', `${RECORD_NAME[id]} の子`));
    if (!seen) {
      if (HINT[id]) this.sheet.appendChild(html('p', 'record-unseen-hint', HINT[id]));
      if (animateArc) this.animateIncoming(id);
      return;
    }

    const level = bondLevel(state.bond[id] || 0);
    this.sheet.appendChild(html('p', 'record-bond-word', BOND_TEXT[level]));

    const history = html('dl', 'record-history');
    this.addFact(history, 'はじめて会った', firstMetText(state, id), true);
    this.addFact(history, '会った日数', `${state.metDays[id] || 0}日`, false, true);
    this.sheet.appendChild(history);

    if (id === 'diamonddust') {
      const quiet = html('dl', 'record-history record-quiet');
      this.addFact(quiet, '静かな空を 保った時間', `${Math.floor((state.quiet || 0) / 60)}分`, false, true);
      this.sheet.appendChild(quiet);
    } else {
      this.sheet.appendChild(this.mealSection(state, id));
      this.sheet.appendChild(this.favoriteSection(state, id));
    }

    if (animateArc) this.animateIncoming(id);
  }

  addFact(list, label, value, mincho = false, numeric = false) {
    list.appendChild(html('dt', '', label));
    const dd = html('dd', `${mincho ? ' is-mincho' : ''}${numeric ? ' is-number' : ''}`.trim(), value);
    list.appendChild(dd);
  }

  mealSection(state, id) {
    const section = html('section', 'record-meals');
    section.appendChild(html('h3', '', '食べたもの'));
    const list = html('ul', 'record-meal-list');
    const liked = id === 'wind' ? windLikes(state) : LIKES[id];
    for (const [kind, count] of Object.entries(state.meals[id] || {})) {
      if (!(count > 0)) continue;
      const item = html('li');
      item.appendChild(html('span', '', FRUIT[kind]));
      item.appendChild(html('span', 'record-meal-count is-number', `×${count}`));
      if (kind === liked) item.appendChild(html('span', 'record-liked-note', '← 好物'));
      list.appendChild(item);
    }
    section.appendChild(list);
    return section;
  }

  favoriteSection(state, id) {
    const section = html('section', 'record-favorite');
    if (id === 'wind') {
      const today = windLikes(state);
      section.appendChild(html('p', '', `今日の好み ${FRUIT[today]}`));
      section.appendChild(html('p', '', '風の好みは 毎日 変わる'));
      return section;
    }

    const liked = LIKES[id];
    const found = (state.meals[id]?.[liked] || 0) > 0;
    const value = found
      ? `${FRUIT[liked]}（${RECORD_NAME[liked]}の実り）`
      : '——（まだ わからない）';
    section.appendChild(html('p', '', `好きなもの ${value}`));
    return section;
  }

  drawPose(canvas, id, width, height) {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const state = this.getState();
    const level = bondLevel(state.bond[id] || 0);
    const baseScale = width <= 60 ? 0.38 : 0.94;
    const scale = baseScale * (id === 'diamonddust' ? 0.68 : 1);
    const flip = RING_ORDER.indexOf(id) > 3;
    this.bank.draw(ctx, PET_ID(id), BOND_POSE[level], 0, width / 2, height - 3, scale, flip);
  }

  animateIncoming(id) {
    for (const edge of this.root.querySelectorAll('.record-edge.is-drawing')) {
      edge.classList.remove('is-drawing');
    }
    const edge = this.root.querySelector(`.record-edge[data-target="${id}"]`);
    if (!edge) return;
    edge.getTotalLength();
    edge.classList.add('is-drawing');
  }

  moveNodeFocus(event) {
    if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
    const active = document.activeElement;
    if (!active?.matches?.('[data-record-node]')) return;
    const order = [...RING_ORDER, ...OUTSIDE_ORDER];
    const at = order.indexOf(active.dataset.recordNode);
    if (at < 0) return;
    event.preventDefault();
    const delta = event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1;
    const next = order[(at + delta + order.length) % order.length];
    this.root.querySelector(`[data-record-node="${next}"]`)?.focus();
  }
}
