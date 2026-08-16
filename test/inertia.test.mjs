// 空の慣性と、子が来る/帰るタイミングの約束。
//
// ★問題: つまみの値をそのまま classify に渡していたので、空はつまみの鏡でしかなかった。
//   骨格v2 の8節は「つまみを回す → 空がゆっくり動く（数十秒かけて落ち着く）→
//   安定した天気の子が現れる」と書いているが、その「途中」が1フレームも存在しなかった。
//   実害: スライダーを一気に引くと、通り過ぎただけの天気の子が次々に生まれては消える。
//
// ★ここで測るのは「遅いこと」ではない。遅くするだけなら操作不能にすれば満たせる。
//   測るのは関係:
//     - 通り過ぎただけの空では子が来ない  ↔  それでも虹の3体は必ず居合わせる
//     - 手を離せば必ず落ち着く            ↔  落ち着くまでには数十秒かかる
//   この2組はどちらも引っ張り合っていて、片方だけ満たすと他方が壊れる。
//
//   node --test

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relax, settled, TAU } from '../js/inertia.js';
import { Roster, ARRIVE_AFTER, LEAVE_SECS, COMPANIONS } from '../js/arrival.js';
import { classify, derive, AFTER_RAIN_WINDOW } from '../js/weather.js';

const FPS = 60;
const DT = 1 / FPS;

/** つまみを固定したまま secs 秒ぶん空を進める。各フレームで fn(sky, t) を呼ぶ。 */
function run(sky, dials, secs, fn) {
  let s = { ...sky };
  const steps = Math.round(secs * FPS);
  for (let i = 0; i < steps; i++) {
    s = relax(s, dials, DT);
    if (fn) fn(s, (i + 1) * DT);
  }
  return s;
}

// ---------------------------------------------------------------- 一次遅れ

test('relax は入力を書き換えない（純粋）', () => {
  const sky = { t: 0, w: 50, p: 1013, v: 3 };
  const dials = { t: 30, w: 90, p: 970, v: 20 };
  const before = JSON.stringify({ sky, dials });
  relax(sky, dials, DT);
  assert.equal(JSON.stringify({ sky, dials }), before, 'relax が引数を破壊している');
});

test('★空はつまみに一瞬では追いつかない — 3秒後にまだ道半ば', () => {
  const sky = { t: 0, w: 20, p: 1013, v: 3 };
  const dials = { t: 30, w: 90, p: 1013, v: 3 };
  const after = run(sky, dials, 3);
  const doneT = (after.t - sky.t) / (dials.t - sky.t);
  assert.ok(doneT < 0.5,
    `気温が3秒で ${(doneT * 100).toFixed(0)}% 進んでいる。これでは「ゆっくり動く」にならない`);
});

test('★手を止めれば必ず落ち着く — 永遠に届かないのは操作不能と同じ', () => {
  const sky = { t: -18, w: 5, p: 1040, v: 0 };
  const dials = { t: 38, w: 98, p: 962, v: 33 };
  const after = run(sky, dials, 60);
  assert.ok(settled(after, dials),
    `60秒つまみを止めても落ち着かない: ${JSON.stringify(after)}`);
});

test('落ち着くまでに「数十秒」かかる（一瞬でも一生でもない）', () => {
  const sky = { t: 0, w: 20, p: 1013, v: 3 };
  const dials = { t: 30, w: 90, p: 970, v: 20 };
  let settledAt = null;
  run(sky, dials, 90, (s, at) => { if (settledAt === null && settled(s, dials)) settledAt = at; });
  assert.ok(settledAt !== null, '90秒でも落ち着かない');
  assert.ok(settledAt >= 15, `${settledAt.toFixed(1)}秒で落ち着くのは速すぎる（手応えが出ない）`);
  assert.ok(settledAt <= 70, `${settledAt.toFixed(1)}秒は待たされすぎ`);
});

test('★つまみごとに速さが違う — 風はすぐ吹き、気温は遅れて動く', () => {
  // 空気の熱容量は大きく、風は吹けばすぐ吹く。手触りの差であると同時に気象的にも正しい
  assert.ok(TAU.v < TAU.p, '風は気圧より速く追いつくべき');
  assert.ok(TAU.p < TAU.t, '気温は一番遅く動くべき');

  const sky = { t: 0, w: 50, p: 1013, v: 0 };
  const dials = { t: 24, w: 50, p: 1013, v: 24 };
  const after = run(sky, dials, 5);
  const doneV = after.v / dials.v;
  const doneT = after.t / dials.t;
  assert.ok(doneV > doneT * 1.5,
    `5秒後: 風 ${(doneV * 100).toFixed(0)}% / 気温 ${(doneT * 100).toFixed(0)}%。差が出ていない`);
});

// ---------------------------------------------------------------- 通過点で子を呼ばない

/**
 * 空とつまみと庭を通しで回す。dialsAt(秒) がその時刻のつまみの値を返す。
 * 戻り値は「庭に来た子」の順列と、各時刻の顔ぶれ。
 */
function play(sky0, dialsAt, secs) {
  let sky = { ...sky0 };
  let afterRain = 0;
  const roster = new Roster();
  const arrived = [];
  const frames = [];
  const steps = Math.round(secs * FPS);
  for (let i = 0; i < steps; i++) {
    const at = i * DT;
    sky = relax(sky, dialsAt(at), DT);
    const kind = classify(sky, afterRain > 0);
    const { precip } = derive(sky);
    const wet = precip && sky.t > -1;                 // 虹の窓は雨とひょうだけが開ける
    afterRain = wet ? AFTER_RAIN_WINDOW : Math.max(0, afterRain - DT);
    const r = roster.step(kind, DT);
    for (const k of r.arrived) arrived.push(k);
    frames.push({ at, kind, present: r.present.slice() });
  }
  return { arrived, frames, sky };
}

test('★1秒でスライダーを端まで引いても、その間に子は来ない（空はまだ動いている途中）', () => {
  // 指でのドラッグは1秒くらい。今までは通過した全部の天気の子が呼ばれていた
  const sky0 = { t: 18, w: 92, p: 978, v: 3 };       // 雨
  const dialsAt = (at) => ({ t: 18, w: 92, v: 3, p: 978 + Math.min(1, at / 1.0) * (1035 - 978) });
  const { arrived } = play(sky0, dialsAt, 1.0);
  assert.deepEqual(arrived, [],
    `ドラッグ中に ${arrived.join('・')} が庭に来た。通り過ぎただけの空で子を呼んではいけない`);
});

test('★行き過ぎて戻すと、行き過ぎた先の子は来ない', () => {
  // 雪の位置まで一瞬下げて、0.6秒で戻す。空はそこまで冷えきらない
  const warm = { t: 10, w: 92, p: 978, v: 3 };
  const dialsAt = (at) => ({ ...warm, t: at < 0.6 ? -10 : 10 });
  const { arrived } = play(warm, dialsAt, 12);
  assert.ok(!arrived.includes('snow'),
    `手が滑って通り過ぎただけで雪の子が来た（来た順: ${arrived.join('→')}）`);
});

test('手を離して空が落ち着けば、狙った子はちゃんと来る', () => {
  const sky0 = { t: 18, w: 92, p: 978, v: 3 };       // 雨
  const target = { t: 18, w: 20, p: 1035, v: 3 };    // 晴れ
  const { arrived, frames } = play(sky0, () => target, 140);
  assert.ok(arrived.includes('sunny'), `晴れの子が来ない（来た順: ${arrived.join('→')}）`);
  assert.equal(frames.at(-1).present.includes('sunny'), true, '最後に晴れの子が庭にいない');
});

// ---------------------------------------------------------------- 虹（壊してはいけない側）

test('★慣性を入れても虹は出る — 窓90秒を空の遅さが食い潰さない', () => {
  // ここが一番危ない回帰。「空はゆっくり動く」だけを条件にすると、
  // 晴れるまでに afterRain の窓が閉じて虹が二度と出なくなる
  const sky0 = { t: 18, w: 92, p: 978, v: 3 };
  const target = { t: 18, w: 92, p: 1035, v: 3 };
  const { frames } = play(sky0, () => target, 140);
  assert.ok(frames.some((f) => f.kind === 'rainbow'),
    '雨から晴れへ動かしても虹が一度も出ない。慣性が窓を食い潰している');
});

test('★虹のすれ違いは壊れない — 雨の子・虹の子・晴れの子が同時に庭にいる瞬間がある', () => {
  // 骨格v2 の8節が「狙って作れる一番きれいな瞬間」と呼んだ見せ場。
  // 慣性を入れると雨の子は先に帰ってしまうので、虹の日だけは道連れを保証する
  const sky0 = { t: 18, w: 92, p: 978, v: 3 };
  const target = { t: 18, w: 92, p: 1035, v: 3 };
  const { frames } = play(sky0, () => target, 140);
  const together = frames.find((f) =>
    f.present.includes('rainy') && f.present.includes('rainbow') && f.present.includes('sunny'));
  assert.ok(together, '3体が居合わせる瞬間が一度も無い');
  assert.deepEqual([...COMPANIONS.rainbow].sort(), ['rainy', 'sunny']);
});

// ---------------------------------------------------------------- 来る・帰るの尺

test('★子が来るまでの間は、すれ違いの尺より短い', () => {
  // 来るのが遅く帰るのが速いと、庭が空っぽの時間ができて場面が途切れる
  assert.ok(ARRIVE_AFTER < LEAVE_SECS,
    `来るまで${ARRIVE_AFTER}秒 / 帰るまで${LEAVE_SECS}秒。これでは入れ替わりに庭が無人になる`);
});

test('天気が続かなければ子は来ない、続けば来る', () => {
  const r1 = new Roster();
  let came = [];
  for (let i = 0; i < Math.round((ARRIVE_AFTER - 0.3) * FPS); i++) came.push(...r1.step('rainy', DT).arrived);
  assert.deepEqual(came, [], `${ARRIVE_AFTER}秒未満で子が来ている`);
  for (let i = 0; i < Math.round(0.6 * FPS); i++) came.push(...r1.step('rainy', DT).arrived);
  assert.deepEqual(came, ['rainy']);
});

test('同じ子が二重に来ない', () => {
  const r = new Roster();
  const came = [];
  for (let i = 0; i < 60 * FPS; i++) came.push(...r.step('sunny', DT).arrived);
  assert.deepEqual(came, ['sunny'], `${came.join('・')} — 同じ子が何度も呼ばれている`);
});

test('帰る子は LEAVE_SECS かけて消える（ぱっと消えない）', () => {
  const r = new Roster();
  for (let i = 0; i < 10 * FPS; i++) r.step('sunny', DT);
  assert.ok(r.step('fog', DT).present.includes('sunny'), '天気が変わった瞬間に消えている');
  for (let i = 0; i < Math.round((LEAVE_SECS - 1) * FPS); i++) r.step('fog', DT);
  assert.ok(r.present.includes('sunny'), `${LEAVE_SECS}秒より早く消えている`);
  for (let i = 0; i < Math.round(2 * FPS); i++) r.step('fog', DT);
  assert.ok(!r.present.includes('sunny'), `${LEAVE_SECS}秒たっても帰らない`);
});

test('帰りかけた子は、天気が戻れば帰るのをやめる', () => {
  // 一瞬別の天気をかすめただけで庭から追い出されると、餌をやる手が止まる
  const r = new Roster();
  for (let i = 0; i < 10 * FPS; i++) r.step('sunny', DT);
  for (let i = 0; i < Math.round(1.5 * FPS); i++) r.step('cloudy', DT);
  for (let i = 0; i < Math.round(10 * FPS); i++) r.step('sunny', DT);
  assert.ok(r.present.includes('sunny'), '戻ってきたのに晴れの子が帰ってしまった');
});
