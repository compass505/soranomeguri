#!/usr/bin/env python3
"""骨格v2の気象モデルと、その受け入れ検算。

vault: 30_Projects/ゆいゲーム/02_企画/骨格v2_空をつくる.md

つまみ4本（気温T・湿りW・気圧P・風V）→ 導出量（相対湿度・上昇気流・雲量・降水）→ 天気10種。
可動域は二十四節気で動く平常値からの一定距離。**レアリティはこの可動域からのみ出す**
（確率もガチャも通貨も置かない）ので、それが本当に成立するかをここで数える。

  /usr/bin/python3 sim/weather_v2.py
"""
from __future__ import annotations

import math
from collections import Counter

# ---------------------------------------------------------------- 暦

SEKKI = [
    "立春", "雨水", "啓蟄", "春分", "清明", "穀雨",
    "立夏", "小満", "芒種", "夏至", "小暑", "大暑",
    "立秋", "処暑", "白露", "秋分", "寒露", "霜降",
    "立冬", "小雪", "大雪", "冬至", "小寒", "大寒",
]
DAYS_PER_SEKKI = 3          # 1年 = 72日


def baseline(i: int) -> tuple[float, float, float]:
    """節気 i の平常値 (気温, 気圧, 風)。大暑で最も暑く、大寒で最も寒い。"""
    phase = 2 * math.pi * (i - 11) / 24
    t = 13.5 + 18.0 * math.cos(phase)      # 大暑 31.5 / 大寒 -4.5
    # ★気圧の平常値は季節でほとんど動かさない。季節の門は気温だけが担う。
    #   冬に平常値を高くすると上昇気流が作れず、雪が降らせられなくなる（検算で判明）
    p = 1013.0
    v = 4.0
    return t, p, v


REACH_T = 12.0    # 気温の可動域 ±
REACH_P = 40.0    # 気圧の可動域 ±（雷・ひょうに必要な上昇気流はここから出る）
REACH_V = 15.0    # 風は 0 〜 平常値+15


def reachable(i: int) -> tuple[tuple[float, float], tuple[float, float], tuple[float, float]]:
    t, p, v = baseline(i)
    return (t - REACH_T, t + REACH_T), (p - REACH_P, p + REACH_P), (0.0, v + REACH_V)


# ---------------------------------------------------------------- 気象モデル

def sat_abs_humidity(t: float) -> float:
    """飽和水蒸気量 g/m^3（Tetens式）。30℃≈30.4 / 0℃≈4.8 / -15℃≈1.6 になる。"""
    es = 6.1078 * 10 ** (7.5 * t / (t + 237.3))    # hPa
    return 217.0 * es / (t + 273.15)


WATER_MAX = 40.0     # 「湿り」つまみ100のときの絶対水蒸気量 g/m^3


def derive(t: float, w: float, p: float, v: float) -> dict:
    """つまみ4本から導出量を出す。プレイヤーはここには触れない。"""
    water = w / 100.0 * WATER_MAX
    rh = min(100.0, water / sat_abs_humidity(t) * 100.0)
    u = max(0.0, min(1.0, (1013.0 - p) / 50.0))

    # 雲量: 相対湿度が55を超えたところから立ち上がり、上昇気流が強いほど増える
    c = max(0.0, (rh - 55.0) / 45.0) * 10.0 * (0.35 + 0.65 * u)
    c *= 1.0 - min(v / 35.0, 1.0) * 0.5           # 強風は雲を流す
    c = max(0.0, min(10.0, c))

    # ★降水の閾値は曇の閾値より確実に上に置く。ここが逆転していると曇が数学的に作れない
    precip = c >= 7.0 and rh >= 82.0
    return {"rh": rh, "u": u, "cloud": c, "precip": precip, "sun": 10.0 - c}


def classify(t: float, w: float, p: float, v: float, prev_precip: bool = False) -> str:
    """レアな順に判定する。先に当たったものを採る。"""
    d = derive(t, w, p, v)
    rh, u, c, precip = d["rh"], d["u"], d["cloud"], d["precip"]

    if t <= -15 and v <= 0.5 and rh >= 90:
        return "ダイヤ"
    # 虹は状態ではなく遷移。雨/ひょうが止んだ直後に雲が晴れることが条件
    if prev_precip and not precip and c <= 4:
        return "虹"
    if precip and u >= 0.75 and 0 <= t <= 12:
        return "ひょう"
    if precip and u >= 0.70 and t >= 20 and rh >= 90:
        return "雷"
    if precip and t < -1:
        return "雪"
    if precip:
        return "雨"          # みぞれ（-1〜2℃）は雨に吸収する
    if rh >= 99 and v <= 0.8 and u <= 0.15:
        return "霧"
    if v >= 15 and c <= 5:
        return "風"
    # ★晴と曇の境目を隙間なく接する。以前は 晴<=3 / 曇>=7 で 3〜7 が空白だった
    if c > 4:
        return "曇"
    return "晴"


# ---------------------------------------------------------------- 検算

STEPS = 13


def sweep(i: int) -> Counter:
    (t0, t1), (p0, p1), (v0, v1) = reachable(i)
    hit = Counter()
    for a in range(STEPS):
        t = t0 + (t1 - t0) * a / (STEPS - 1)
        for b in range(STEPS):
            w = 100.0 * b / (STEPS - 1)
            for cc in range(STEPS):
                p = p0 + (p1 - p0) * cc / (STEPS - 1)
                for e in range(STEPS):
                    v = v0 + (v1 - v0) * e / (STEPS - 1)
                    hit[classify(t, w, p, v)] += 1
                    # 虹は遷移でしか出ないので、直前が降水だった場合も数える
                    hit[classify(t, w, p, v, prev_precip=True)] += 0
    return hit


ORDER = ["晴", "曇", "雨", "雪", "雷", "ひょう", "霧", "風", "ダイヤ", "虹"]


def main() -> None:
    total = Counter()
    print(f"{'節気':<6s}{'平常気温':>8s}  " + "".join(f"{n:>7s}" for n in ORDER))
    grid = {}
    for i, name in enumerate(SEKKI):
        hit = sweep(i)
        total.update(hit)
        grid[i] = hit
        t, _, _ = baseline(i)
        cells = sum(hit.values())
        row = "".join(f"{hit[n] / cells * 100:6.1f}%" for n in ORDER)
        print(f"{name:<6s}{t:7.1f}℃  {row}")

    print()
    blank = total["★空白"]
    print(f"■ 空白地帯（どの天気にも落ちない組み合わせ）: {blank} / {sum(total.values())}"
          f"  = {blank / sum(total.values()) * 100:.2f}%")

    print()
    print("■ 各キャラに会える節気の数（72日の年のうち、何節気で作れるか / 24）")
    for n in ORDER:
        seasons = [SEKKI[i] for i in range(24) if grid[i][n] > 0]
        if n == "虹":
            print(f"  {n:6s} — 遷移でのみ発生（この掃引では数えない）")
            continue
        span = f"{len(seasons):2d}/24"
        sample = "、".join(seasons[:3]) + ("…" if len(seasons) > 3 else "")
        print(f"  {n:6s} {span}  {sample if seasons else '**どの節気でも作れない**'}")


if __name__ == "__main__":
    main()
