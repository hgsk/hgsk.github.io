/**
 * Qero サンプルプラグイン: 放送・ライブ配信向けスコアボード（PRD 4）。
 *
 * 得点データソース（CSV/REST）の {{home_score}} / {{away_score}} 等を
 * バインドしたテロップ風コンポーネントを追加します。
 * 「データ変更で再生」を有効にすると得点変化でアニメーションが発火します。
 */
/* global Qero */
Qero.registerComponent({
  type: "scoreboard",
  name: "スコアボード",
  icon: "🏆",
  defaultSize: { w: 520, h: 84 },
  defaultProps: {
    home: "{{home}}",
    away: "{{away}}",
    homeScore: "{{home_score}}",
    awayScore: "{{away_score}}",
    homeColor: "#d32f2f",
    awayColor: "#1565c0",
    label: "LIVE",
  },
  inspector: [
    { key: "home", label: "ホーム名", kind: "text" },
    { key: "homeScore", label: "ホーム得点", kind: "text" },
    { key: "homeColor", label: "ホーム色", kind: "color" },
    { key: "away", label: "アウェイ名", kind: "text" },
    { key: "awayScore", label: "アウェイ得点", kind: "text" },
    { key: "awayColor", label: "アウェイ色", kind: "color" },
    { key: "label", label: "ラベル", kind: "text" },
  ],
  render(el, comp, ctx) {
    const p = comp.props;
    let root = el.querySelector(".sb-root");
    if (!root) {
      el.innerHTML =
        '<div class="sb-root" style="display:flex;width:100%;height:100%;font-family:sans-serif;' +
        'font-weight:800;color:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.4)">' +
        '<div class="sb-home" style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 14px"><span class="sb-hn"></span><span class="sb-hs" style="font-size:1.6em"></span></div>' +
        '<div class="sb-label" style="flex:0 0 auto;display:flex;align-items:center;padding:0 10px;background:#111;font-size:.75em;letter-spacing:.15em"></div>' +
        '<div class="sb-away" style="flex:1;display:flex;align-items:center;justify-content:space-between;padding:0 14px"><span class="sb-as" style="font-size:1.6em"></span><span class="sb-an"></span></div>' +
        "</div>";
      root = el.querySelector(".sb-root");
    }
    const fs = Math.max(12, Math.min(comp.h * 0.34, comp.w * 0.06));
    root.style.fontSize = fs + "px";
    el.querySelector(".sb-home").style.background = String(p.homeColor || "#d32f2f");
    el.querySelector(".sb-away").style.background = String(p.awayColor || "#1565c0");
    el.querySelector(".sb-hn").textContent = ctx.resolve(String(p.home ?? ""));
    el.querySelector(".sb-an").textContent = ctx.resolve(String(p.away ?? ""));
    el.querySelector(".sb-hs").textContent = ctx.resolve(String(p.homeScore ?? ""));
    el.querySelector(".sb-as").textContent = ctx.resolve(String(p.awayScore ?? ""));
    el.querySelector(".sb-label").textContent = ctx.resolve(String(p.label ?? ""));
  },
});
