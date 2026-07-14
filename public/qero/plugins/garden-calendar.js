/** Qero bundled plugin: household garden calendar and animated crop growth guide. @version 1.0.0 */
/* global Qero */
(function () {
  "use strict";

  const en = document.documentElement.lang.toLowerCase().startsWith("en");
  const text = en
    ? {
      name: "Garden calendar",
      source: "Schedule datasource",
      date: "Date field",
      title: "Task field",
      crop: "Crop field",
      plot: "Plot field",
      status: "Status field",
      base: "Initial month",
      previous: "Previous month",
      next: "Next month",
      agenda: "Agenda",
      empty: "No scheduled work",
      weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
      growthName: "Crop growth guide",
      stagesSource: "Growth stages datasource",
      cropId: "Crop ID",
      play: "Play",
      pause: "Pause",
      previousStage: "Previous stage",
      nextStage: "Next stage",
      noStages: "No growth stages found",
      above: "Above ground",
      below: "Below ground",
      management: "Care now",
      avoid: "Avoid",
      trigger: "Advance after observing",
      physiology: "What the plant is doing",
      interval: "Playback interval (ms)",
      sourceLabel: "Source",
    }
    : {
      name: "家庭菜園カレンダー",
      source: "予定データソース",
      date: "日付フィールド",
      title: "作業フィールド",
      crop: "作物フィールド",
      plot: "区画フィールド",
      status: "状態フィールド",
      base: "初期表示月",
      previous: "前の月",
      next: "次の月",
      agenda: "今月の予定",
      empty: "予定はありません",
      weekdays: ["日", "月", "火", "水", "木", "金", "土"],
      growthName: "作物の育ち方・生理",
      stagesSource: "生育ステージデータソース",
      cropId: "作物ID",
      play: "再生",
      pause: "一時停止",
      previousStage: "前のステージ",
      nextStage: "次のステージ",
      noStages: "生育ステージがありません",
      above: "地上部",
      below: "地下部",
      management: "この時期の管理",
      avoid: "避けること",
      trigger: "実物で確認して次へ",
      physiology: "植物の中で起きていること",
      interval: "再生間隔 (ms)",
      sourceLabel: "出典",
    };

  function parseDate(value) {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || ""));
    if (!match) return null;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    return date.getFullYear() === Number(match[1]) &&
        date.getMonth() === Number(match[2]) - 1 && date.getDate() === Number(match[3])
      ? date
      : null;
  }

  function monthStart(value) {
    const parsed = parseDate(value);
    const now = parsed || new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }

  function iso(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function node(tag, styles, value) {
    const result = document.createElement(tag);
    if (styles) Object.assign(result.style, styles);
    if (value !== undefined) result.textContent = value;
    return result;
  }

  function renderCalendar(el, comp, ctx) {
    const p = comp.props || {};
    const base = String(p.displayDate || "");
    const state = el.__gardenCalendarState || (el.__gardenCalendarState = {});
    if (!state.month || state.base !== base) {
      state.month = monthStart(base);
      state.base = base;
    }
    const month = state.month;
    const source = String(p.source || "schedule");
    const dateField = String(p.dateField || "date");
    const titleField = String(p.titleField || "title");
    const cropField = String(p.cropField || "crop");
    const plotField = String(p.plotField || "plot");
    const statusField = String(p.statusField || "status");
    const events = ctx.rows(source).map((row) => ({ row, date: parseDate(row[dateField]) }))
      .filter((event) => event.date)
      .sort((a, b) => a.date - b.date);
    const current = events.filter((event) =>
      event.date.getFullYear() === month.getFullYear() && event.date.getMonth() === month.getMonth()
    );

    const root = node("div", {
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateColumns: "minmax(0, 2fr) minmax(180px, 1fr)",
      color: "#24301f",
      background: "#f7f4e8",
      border: "1px solid #a5b792",
      borderRadius: "10px",
      overflow: "hidden",
      fontFamily: "system-ui, sans-serif",
      boxSizing: "border-box",
    });
    root.className = "garden-calendar";
    const calendar = node("div", { display: "flex", flexDirection: "column", minWidth: "0" });
    const header = node("div", {
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      padding: "8px 10px",
      background: "#e4ecd8",
      borderBottom: "1px solid #b9c6aa",
    });
    const monthLabel = node(
      "strong",
      { fontSize: "16px" },
      new Intl.DateTimeFormat(en ? "en" : "ja", { year: "numeric", month: "long" }).format(month),
    );
    const move = (delta) => {
      state.month = new Date(month.getFullYear(), month.getMonth() + delta, 1);
      renderCalendar(el, comp, ctx);
    };
    const nav = node("div", { display: "flex", gap: "4px" });
    for (const [label, title, delta] of [["‹", text.previous, -1], ["›", text.next, 1]]) {
      const button = node("button", {
        width: "30px",
        height: "28px",
        border: "1px solid #91a57e",
        borderRadius: "5px",
        background: "#fff",
        color: "#344b2b",
        cursor: ctx.static ? "default" : "pointer",
      }, label);
      button.type = "button";
      button.title = title;
      button.setAttribute("aria-label", title);
      button.disabled = !!ctx.static;
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        move(delta);
      });
      nav.append(button);
    }
    header.append(monthLabel, nav);
    calendar.append(header);

    const grid = node("div", {
      display: "grid",
      gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
      gridTemplateRows: "24px repeat(6, minmax(42px, 1fr))",
      flex: "1",
      minHeight: "0",
    });
    text.weekdays.forEach((weekday, index) => {
      grid.append(node("div", {
        padding: "4px",
        textAlign: "center",
        fontSize: "11px",
        color: index === 0 ? "#b3483e" : index === 6 ? "#3971a5" : "#55634d",
        borderBottom: "1px solid #d8dfcd",
      }, weekday));
    });
    const first = new Date(month.getFullYear(), month.getMonth(), 1 - month.getDay());
    for (let index = 0; index < 42; index++) {
      const date = new Date(first.getFullYear(), first.getMonth(), first.getDate() + index);
      const key = iso(date);
      const inMonth = date.getMonth() === month.getMonth();
      const day = node("div", {
        minWidth: "0",
        padding: "3px",
        overflow: "hidden",
        background: inMonth ? "#fffdf5" : "#f0eee5",
        color: inMonth ? "#34402e" : "#9a9a91",
        borderRight: "1px solid #e1e3d9",
        borderBottom: "1px solid #e1e3d9",
        boxSizing: "border-box",
      });
      day.append(node("div", { fontSize: "11px", fontWeight: "600" }, String(date.getDate())));
      events.filter((event) => String(event.row[dateField]) === key).slice(0, 3).forEach(
        (event) => {
          day.append(node("div", {
            marginTop: "2px",
            padding: "1px 3px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            borderRadius: "3px",
            background: "#dcebcf",
            color: "#315128",
            fontSize: "10px",
          }, String(event.row[titleField] || "")));
        },
      );
      grid.append(day);
    }
    calendar.append(grid);

    const agenda = node("aside", {
      minWidth: "0",
      padding: "10px",
      overflow: "auto",
      background: "#f3f0e3",
      borderLeft: "1px solid #b9c6aa",
      boxSizing: "border-box",
    });
    agenda.append(node("strong", { display: "block", marginBottom: "8px" }, text.agenda));
    if (!current.length) {
      agenda.append(node("div", { color: "#76806f", fontSize: "12px" }, text.empty));
    }
    current.forEach((event) => {
      const item = node("div", {
        marginBottom: "7px",
        padding: "7px",
        borderRadius: "6px",
        background: "#fff",
        borderLeft: "4px solid #71965c",
        boxShadow: "0 1px 2px rgba(40,60,30,.08)",
      });
      item.append(
        node("div", { color: "#617057", fontSize: "10px" }, String(event.row[dateField] || "")),
        node("div", { fontSize: "12px", fontWeight: "700" }, String(event.row[titleField] || "")),
      );
      const details = [event.row[cropField], event.row[plotField], event.row[statusField]].filter(
        Boolean,
      );
      if (details.length) {
        item.append(node("div", { color: "#677160", fontSize: "10px" }, details.join(" · ")));
      }
      agenda.append(item);
    });
    root.append(calendar, agenda);
    el.replaceChildren(root);
  }

  function reducedMotion() {
    return typeof window !== "undefined" && typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function ensureGrowthStyles() {
    if (document.getElementById("qero-garden-growth-styles")) return;
    const style = document.createElement("style");
    style.id = "qero-garden-growth-styles";
    style.textContent = `
      @keyframes qero-garden-rise { from { transform: translateY(9px); opacity: .25 } to { transform: translateY(-9px); opacity: .9 } }
      @keyframes qero-garden-sway { 0%,100% { transform: rotate(-1.5deg) } 50% { transform: rotate(1.5deg) } }
      .garden-growth__particle { animation: qero-garden-rise 1.8s ease-in-out infinite alternate }
      .garden-growth__plant { transform-origin: 50% 100%; animation: qero-garden-sway 2.6s ease-in-out infinite }
      @media (prefers-reduced-motion: reduce) { .garden-growth__particle,.garden-growth__plant { animation: none !important } }
    `;
    document.head.append(style);
  }

  function growthVisual(stage, progress, cropId, animate) {
    const scene = node("div", {
      position: "relative",
      minHeight: "210px",
      overflow: "hidden",
      borderRadius: "10px",
      border: "1px solid #adc39b",
      background: "linear-gradient(#dff1fa 0 49%, #8a6848 50% 100%)",
    });
    scene.setAttribute("role", "img");
    scene.setAttribute("aria-label", `${stage.crop || cropId}: ${stage.stage || ""}`);
    const topLabel = node("span", {
      position: "absolute",
      top: "7px",
      left: "9px",
      color: "#47606b",
      fontSize: "11px",
    }, text.above);
    const bottomLabel = node("span", {
      position: "absolute",
      top: "calc(50% + 7px)",
      left: "9px",
      color: "#f5e4c8",
      fontSize: "11px",
    }, text.below);
    const plantHeight = Math.round(35 + progress * 72);
    const plant = node("div", {
      position: "absolute",
      left: "50%",
      bottom: "50%",
      width: "7px",
      height: `${plantHeight}px`,
      borderRadius: "8px 8px 0 0",
      background: "#3f7c39",
    });
    plant.className = animate ? "garden-growth__plant" : "";
    for (let i = 0; i < Math.max(1, Math.round(progress * 4)); i++) {
      const leaf = node("i", {
        position: "absolute",
        left: i % 2 ? "5px" : "-20px",
        bottom: `${18 + i * 17}px`,
        width: "22px",
        height: "11px",
        borderRadius: "100% 10% 100% 10%",
        background: "#64a552",
        transform: i % 2 ? "rotate(-22deg)" : "rotate(22deg)",
      });
      plant.append(leaf);
    }
    const isTuber = /potato|radish|じゃが|ジャガ|だいこん|ダイコン/i.test(
      `${cropId} ${stage.crop || ""}`,
    );
    const underground = node("div", {
      position: "absolute",
      left: "calc(50% - 35px)",
      top: "50%",
      width: "70px",
      height: "46%",
      borderLeft: "3px solid #e5c99e",
      borderRight: "3px solid #e5c99e",
      clipPath: "polygon(42% 0,58% 0,100% 100%,70% 72%,50% 100%,30% 72%,0 100%)",
      opacity: String(.45 + progress * .55),
    });
    scene.append(topLabel, bottomLabel, plant, underground);
    if (isTuber && progress > .45) {
      const organ = node("div", {
        position: "absolute",
        left: `calc(50% - ${12 + progress * 15}px)`,
        top: "58%",
        width: `${24 + progress * 30}px`,
        height: `${22 + progress * 46}px`,
        borderRadius: /radish|だいこん|ダイコン/i.test(`${cropId} ${stage.crop || ""}`)
          ? "45% 45% 70% 70%"
          : "45%",
        background: /radish|だいこん|ダイコン/i.test(`${cropId} ${stage.crop || ""}`)
          ? "#f6f1df"
          : "#d4ae68",
        boxShadow: "inset -5px -4px 0 rgba(80,55,25,.12)",
      });
      scene.append(organ);
    } else if (progress > .58) {
      const fruit = node("div", {
        position: "absolute",
        left: "calc(50% + 13px)",
        top: `${42 + (1 - progress) * 35}px`,
        width: `${13 + progress * 9}px`,
        height: `${13 + progress * 9}px`,
        borderRadius: "50%",
        background: /pea|えんどう|エンドウ/i.test(`${cropId} ${stage.crop || ""}`)
          ? "#79a943"
          : "#dc5547",
      });
      scene.append(fruit);
    }
    const particleColors = ["#55a9e8", "#f1c84b", "#44aaa1"];
    particleColors.forEach((color, i) => {
      const particle = node("b", {
        position: "absolute",
        left: `${42 + i * 8}%`,
        top: `${59 + i * 7}%`,
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        background: color,
        animationDelay: `${i * .35}s`,
      });
      particle.className = animate ? "garden-growth__particle" : "";
      scene.append(particle);
    });
    return scene;
  }

  function renderGrowth(el, comp, ctx) {
    ensureGrowthStyles();
    const p = comp.props || {};
    const source = String(p.stageSource || "crop_stages");
    const cropId = String(p.cropId || "tomato");
    const stages = ctx.rows(source).filter((row) =>
      String(row.cropId || row.crop || "").toLocaleLowerCase() === cropId.toLocaleLowerCase()
    ).sort((a, b) => Number(a.order || 0) - Number(b.order || 0));
    const state = el.__gardenGrowthState || (el.__gardenGrowthState = { index: 0, playing: false });
    if (state.cropId !== cropId) {
      state.cropId = cropId;
      state.index = 0;
    }
    state.index = Math.max(0, Math.min(stages.length - 1, state.index || 0));
    if (state.timer) {
      clearTimeout(state.timer);
      state.timer = 0;
    }
    const root = node("section", {
      width: "100%",
      height: "100%",
      display: "grid",
      gridTemplateRows: "auto minmax(210px, 1fr) auto",
      gap: "10px",
      padding: "12px",
      boxSizing: "border-box",
      color: "#253823",
      background: "#f7f4e8",
      border: "1px solid #a5b792",
      borderRadius: "12px",
      overflow: "auto",
      fontFamily: "system-ui, sans-serif",
    });
    root.className = "garden-growth";
    if (!stages.length) {
      state.playing = false;
      root.append(node("div", { margin: "auto", color: "#687561" }, text.noStages));
      el.replaceChildren(root);
      return;
    }
    const stage = stages[state.index];
    const maxOrder = Math.max(1, ...stages.map((row) => Number(row.order || 0)));
    const progress = Math.max(.08, Number(stage.order || state.index + 1) / maxOrder);
    const header = node("header", {
      display: "flex",
      alignItems: "baseline",
      justifyContent: "space-between",
      gap: "8px",
    });
    header.append(
      node("strong", { fontSize: "17px" }, `${stage.crop || cropId} — ${stage.stage || ""}`),
      node(
        "span",
        { color: "#687561", fontSize: "11px" },
        `${state.index + 1} / ${stages.length} · day ${stage.dayFrom || "?"}–${stage.dayTo || "?"}`,
      ),
    );
    const motion = !ctx.static && !reducedMotion();
    const visual = growthVisual(stage, progress, cropId, motion && state.playing);
    const info = node("div", {
      display: "grid",
      gridTemplateColumns: "repeat(2,minmax(0,1fr))",
      gap: "7px",
      fontSize: "12px",
    });
    const detail = (label, value, color) => {
      if (!value) return;
      const item = node("div", { padding: "7px", borderRadius: "7px", background: color });
      item.append(
        node("b", { display: "block", marginBottom: "2px", fontSize: "11px" }, label),
        document.createTextNode(String(value)),
      );
      info.append(item);
    };
    detail(text.physiology, stage.physiology, "#edf5e8");
    detail(text.management, stage.management, "#e9f2fb");
    detail(text.avoid, stage.avoid || stage.stress, "#fff0e8");
    detail(text.trigger, stage.trigger, "#fff8da");
    detail(text.sourceLabel, stage.source, "#f1f1ed");
    const controls = node("div", {
      display: "flex",
      justifyContent: "center",
      gap: "6px",
      alignItems: "center",
    });
    const rerender = () => renderGrowth(el, comp, ctx);
    const button = (label, title, action) => {
      const b = node("button", {
        padding: "5px 10px",
        border: "1px solid #91a57e",
        borderRadius: "6px",
        background: "#fff",
        cursor: ctx.static ? "default" : "pointer",
      }, label);
      b.type = "button";
      b.title = title;
      b.setAttribute("aria-label", title);
      b.disabled = !!ctx.static;
      b.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        action();
        rerender();
      });
      return b;
    };
    controls.append(
      button("‹", text.previousStage, () => {
        state.playing = false;
        state.index = (state.index - 1 + stages.length) % stages.length;
      }),
      button(state.playing ? "❚❚" : "▶", state.playing ? text.pause : text.play, () => {
        state.playing = !state.playing;
      }),
      button("›", text.nextStage, () => {
        state.playing = false;
        state.index = (state.index + 1) % stages.length;
      }),
    );
    const center = node("div", {
      display: "grid",
      gridTemplateColumns: "minmax(260px,1.2fr) minmax(250px,1fr)",
      gap: "10px",
      minHeight: "0",
    });
    center.append(visual, info);
    root.append(header, center, controls);
    el.replaceChildren(root);
    if (state.playing && motion) {
      state.timer = setTimeout(() => {
        if (!el.isConnected) {
          state.playing = false;
          state.timer = 0;
          return;
        }
        state.index = (state.index + 1) % stages.length;
        renderGrowth(el, comp, ctx);
      }, Math.max(1200, Number(p.intervalMs || 3500)));
    }
  }

  Qero.registerComponent({
    type: "garden-calendar",
    name: text.name,
    icon: "🌱",
    defaultSize: { w: 900, h: 520 },
    defaultProps: {
      source: "schedule",
      dateField: "date",
      titleField: "title",
      cropField: "crop",
      plotField: "plot",
      statusField: "status",
      displayDate: "",
    },
    inspector: [
      { key: "source", label: text.source, kind: "datasource" },
      { key: "displayDate", label: text.base, kind: "date" },
      { key: "dateField", label: text.date, kind: "text" },
      { key: "titleField", label: text.title, kind: "text" },
      { key: "cropField", label: text.crop, kind: "text" },
      { key: "plotField", label: text.plot, kind: "text" },
      { key: "statusField", label: text.status, kind: "text" },
    ],
    render: renderCalendar,
  });

  Qero.registerComponent({
    type: "garden-growth",
    name: text.growthName,
    icon: "🌿",
    defaultSize: { w: 820, h: 480 },
    defaultProps: { stageSource: "crop_stages", cropId: "tomato", intervalMs: 3500 },
    inspector: [
      { key: "stageSource", label: text.stagesSource, kind: "datasource" },
      { key: "cropId", label: text.cropId, kind: "text" },
      { key: "intervalMs", label: text.interval, kind: "number" },
    ],
    render: renderGrowth,
  });
})();
