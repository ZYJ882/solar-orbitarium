import { useEffect, useRef, useCallback } from "react";
import { BODIES, PLANETS, SUN } from "../data/planets";

interface Props {
  playing: boolean;
  speed: number;
  showOrbits: boolean;
  showLabels: boolean;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onTick: (days: number) => void;
  resetToken: number;
}

interface Star {
  x: number;
  y: number;
  r: number;
  base: number;
  amp: number;
  ph: number;
  spd: number;
  tint: string;
}

interface Meteor {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
}

interface PlanetGeom {
  pl: typeof PLANETS[0];
  theta: number;
  rx: number;
  ry: number;
  x: number;
  y: number;
  r: number;
}

interface Position {
  x: number;
  y: number;
  r: number;
}

const TAU = Math.PI * 2;
const BASE_DAYS_PER_SEC = 10;

// 预计算轨道参数，避免每帧重复计算
const PRECOMPUTED_ORBITS = PLANETS.map((pl) => ({
  orbitT: orbitT(pl.au),
  displayR: displayRadius(pl.diameterKm),
}));

/** 轨道半径归一化（非线性压缩，兼顾内行星间距与外行星可达性） */
function orbitT(au: number) {
  const lo = Math.pow(0.39, 0.45);
  const hi = Math.pow(30.07, 0.45);
  const t = (Math.pow(au, 0.45) - lo) / (hi - lo);
  return 0.19 + 0.81 * t;
}

/** 行星显示半径（对数压缩） */
function displayRadius(diameterKm: number) {
  const lo = Math.log(4879);
  const hi = Math.log(142984);
  const t = (Math.log(diameterKm) - lo) / (hi - lo);
  return 4 + 13 * t;
}

export default function SolarCanvas({
  playing,
  speed,
  showOrbits,
  showLabels,
  selectedId,
  onSelect,
  onTick,
  resetToken,
}: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const propsRef = useRef({ playing, speed, showOrbits, showLabels, selectedId, onSelect, onTick });
  propsRef.current = { playing, speed, showOrbits, showLabels, selectedId, onSelect, onTick };

  const simRef = useRef({
    days: 0,
    hover: null as string | null,
    mouse: { x: -9999, y: -9999 },
    positions: new Map<string, { x: number; y: number; r: number }>(),
    tickAcc: 0,
  });

  useEffect(() => {
    simRef.current.days = 0;
    propsRef.current.onTick(0);
  }, [resetToken]);

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let w = 0;
    let h = 0;
    let stars: Star[] = [];
    const meteors: Meteor[] = [];
    let nextMeteorAt = performance.now() + 2500;
    let raf = 0;
    let last = performance.now();
    const phases = PLANETS.map((_, i) => i * 2.399 + 0.7); // 黄金角错开初始位置

    const tints = ["255,255,255", "176,208,255", "255,224,178", "200,240,255"];

    function regenerateStars() {
      const count = Math.min(420, Math.floor((w * h) / 2400));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        r: 0.4 + Math.random() * 1.1,
        base: 0.2 + Math.random() * 0.55,
        amp: 0.1 + Math.random() * 0.3,
        ph: Math.random() * TAU,
        spd: 0.4 + Math.random() * 1.6,
        tint: tints[Math.floor(Math.random() * tints.length)],
      }));
    }

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = wrap!.clientWidth;
      h = wrap!.clientHeight;
      canvas!.width = Math.round(w * dpr);
      canvas!.height = Math.round(h * dpr);
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      regenerateStars();
    }

    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(wrap);

    /* ---------- 命中检测 ---------- */
    function pick(px: number, py: number): string | null {
      let best: string | null = null;
      let bestD = Infinity;
      simRef.current.positions.forEach((p, id) => {
        const d = Math.hypot(px - p.x, py - p.y);
        const hit = Math.max(14, p.r + 9);
        if (d < hit && d < bestD) {
          bestD = d;
          best = id;
        }
      });
      return best;
    }

    function onMove(e: MouseEvent) {
      const rect = canvas!.getBoundingClientRect();
      simRef.current.mouse.x = e.clientX - rect.left;
      simRef.current.mouse.y = e.clientY - rect.top;
      const hit = pick(simRef.current.mouse.x, simRef.current.mouse.y);
      simRef.current.hover = hit;
      canvas!.style.cursor = hit ? "pointer" : "default";
    }

    let lastTouchAt = 0;

    function onTouch(e: TouchEvent) {
      const t = e.touches[0];
      if (!t) return;
      const rect = canvas!.getBoundingClientRect();
      const x = t.clientX - rect.left;
      const y = t.clientY - rect.top;
      const hit = pick(x, y);
      if (hit) {
        lastTouchAt = performance.now();
        e.preventDefault();
        propsRef.current.onSelect(hit);
      }
    }

    function onClick() {
      /* 触屏上 touchstart 已处理选中，忽略随后的合成 click */
      if (performance.now() - lastTouchAt < 600) return;
      const hit = pick(simRef.current.mouse.x, simRef.current.mouse.y);
      propsRef.current.onSelect(hit);
    }

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("touchstart", onTouch, { passive: false });

    /* ---------- 绘制辅助 ---------- */
    function roundedRect(
      x: number,
      y: number,
      rw: number,
      rh: number,
      r: number,
    ) {
      ctx!.beginPath();
      ctx!.moveTo(x + r, y);
      ctx!.arcTo(x + rw, y, x + rw, y + rh, r);
      ctx!.arcTo(x + rw, y + rh, x, y + rh, r);
      ctx!.arcTo(x, y + rh, x, y, r);
      ctx!.arcTo(x, y, x + rw, y, r);
      ctx!.closePath();
    }

    function draw(now: number, dt: number) {
      const p = propsRef.current;
      const sim = simRef.current;
      if (p.playing) sim.days += dt * BASE_DAYS_PER_SEC * p.speed;
      const t = now / 1000;

      /* 背景 */
      const bg = ctx!.createLinearGradient(0, 0, 0, h);
      bg.addColorStop(0, "#04060d");
      bg.addColorStop(0.5, "#081020");
      bg.addColorStop(1, "#05070f");
      ctx!.fillStyle = bg;
      ctx!.fillRect(0, 0, w, h);

      /* 星际尘埃（极淡的多色辉光） */
      const nebulas: Array<[number, number, number, string]> = [
        [w * 0.18, h * 0.22, Math.max(w, h) * 0.5, "rgba(45,180,190,0.05)"],
        [w * 0.85, h * 0.78, Math.max(w, h) * 0.45, "rgba(90,120,235,0.05)"],
        [w * 0.7, h * 0.15, Math.max(w, h) * 0.35, "rgba(245,185,66,0.045)"],
      ];
      for (const [nx, ny, nr, color] of nebulas) {
        const g = ctx!.createRadialGradient(nx, ny, 0, nx, ny, nr);
        g.addColorStop(0, color);
        g.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.fillStyle = g;
        ctx!.fillRect(0, 0, w, h);
      }

      /* 星星（闪烁） */
      for (const s of stars) {
        const a = Math.max(0.04, s.base + s.amp * Math.sin(t * s.spd + s.ph));
        ctx!.beginPath();
        ctx!.fillStyle = `rgba(${s.tint},${a.toFixed(3)})`;
        ctx!.arc(s.x, s.y, s.r, 0, TAU);
        ctx!.fill();
      }

      /* 流星 */
      if (now >= nextMeteorAt) {
        nextMeteorAt = now + 4500 + Math.random() * 6500;
        const fromLeft = Math.random() > 0.5;
        meteors.push({
          x: fromLeft ? -40 : Math.random() * w * 0.7 + w * 0.3,
          y: Math.random() * h * 0.35,
          vx: (fromLeft ? 1 : -1) * (420 + Math.random() * 380),
          vy: 190 + Math.random() * 220,
          age: 0,
          life: 0.8 + Math.random() * 0.5,
        });
      }
      for (let i = meteors.length - 1; i >= 0; i--) {
        const m = meteors[i];
        m.age += dt;
        if (m.age > m.life || m.x < -80 || m.x > w + 80 || m.y > h + 80) {
          meteors.splice(i, 1);
          continue;
        }
        m.x += m.vx * dt;
        m.y += m.vy * dt;
        const prog = m.age / m.life;
        const alpha = Math.sin(Math.PI * prog) * 0.8;
        const tailX = m.x - m.vx * 0.14;
        const tailY = m.y - m.vy * 0.14;
        const mg = ctx!.createLinearGradient(m.x, m.y, tailX, tailY);
        mg.addColorStop(0, `rgba(255,255,255,${alpha.toFixed(3)})`);
        mg.addColorStop(1, "rgba(160,200,255,0)");
        ctx!.strokeStyle = mg;
        ctx!.lineWidth = 1.6;
        ctx!.beginPath();
        ctx!.moveTo(m.x, m.y);
        ctx!.lineTo(tailX, tailY);
        ctx!.stroke();
      }

      /* 几何布局 - 使用预计算值优化 */
      const cx = w / 2;
      const cy = h / 2;
      const availX = Math.max(120, w / 2 - 60);
      const availY = Math.max(110, h / 2 - 82);
      const capX = Math.min(availX, availY * 1.85);
      const sunR = Math.min(30, Math.max(15, Math.min(capX, availY) * 0.12));
      const positions = sim.positions;
      positions.clear();

      const geom: PlanetGeom[] = new Array(PLANETS.length);
      for (let i = 0; i < PLANETS.length; i++) {
        const pl = PLANETS[i];
        const pre = PRECOMPUTED_ORBITS[i];
        const theta = phases[i] + (TAU * sim.days) / pl.periodDays;
        const rx = pre.orbitT * capX;
        const ry = pre.orbitT * availY;
        geom[i] = {
          pl,
          theta,
          rx,
          ry,
          x: cx + rx * Math.cos(theta),
          y: cy + ry * Math.sin(theta),
          r: pre.displayR,
        };
      }

      /* 轨道线 */
      if (p.showOrbits) {
        geom.forEach(({ pl, rx, ry }) => {
          const isSel = p.selectedId === pl.id;
          ctx!.beginPath();
          ctx!.ellipse(cx, cy, rx, ry, 0, 0, TAU);
          if (isSel) {
            ctx!.strokeStyle = pl.color;
            ctx!.globalAlpha = 0.55;
            ctx!.lineWidth = 1.4;
            ctx!.shadowColor = pl.color;
            ctx!.shadowBlur = 10;
          } else {
            ctx!.strokeStyle = "rgba(148,170,200,0.16)";
            ctx!.globalAlpha = 1;
            ctx!.lineWidth = 1;
            ctx!.shadowBlur = 0;
          }
          ctx!.stroke();
          ctx!.shadowBlur = 0;
          ctx!.globalAlpha = 1;
        });
      }

      /* 行星尾迹（锥形渐变）- 使用预计算值优化 */
      const hasConic = typeof ctx!.createConicGradient === "function";
      if (hasConic) {
        ctx!.save();
        ctx!.globalCompositeOperation = "lighter";
        for (let i = 0; i < geom.length; i++) {
          const { pl, theta } = geom[i];
          const pre = PRECOMPUTED_ORBITS[i];
          const span = Math.min(1.8, Math.max(0.22, 13 / Math.sqrt(pl.periodDays)));
          const grad = (ctx as CanvasRenderingContext2D).createConicGradient(
            theta - span,
            cx,
            cy,
          );
          const stop = span / TAU;
          grad.addColorStop(0, "rgba(0,0,0,0)");
          grad.addColorStop(Math.max(0.001, stop * 0.55), pl.color + "26");
          grad.addColorStop(stop, pl.color + "8c");
          grad.addColorStop(Math.min(1, stop + 0.002), "rgba(0,0,0,0)");
          grad.addColorStop(1, "rgba(0,0,0,0)");
          ctx!.strokeStyle = grad;
          ctx!.lineWidth = 2;
          ctx!.beginPath();
          ctx!.ellipse(cx, cy, pre.orbitT * capX, pre.orbitT * availY, 0, 0, TAU);
          ctx!.stroke();
        }
        ctx!.restore();
      }

      /* 太阳 */
      const pulse = 1 + 0.035 * Math.sin(t * 2.1);
      ctx!.save();
      ctx!.globalCompositeOperation = "lighter";
      const halo = ctx!.createRadialGradient(cx, cy, 0, cx, cy, sunR * 3.4 * pulse);
      halo.addColorStop(0, "rgba(255,214,110,0.5)");
      halo.addColorStop(0.4, "rgba(255,170,60,0.16)");
      halo.addColorStop(1, "rgba(255,150,40,0)");
      ctx!.fillStyle = halo;
      ctx!.beginPath();
      ctx!.arc(cx, cy, sunR * 3.4 * pulse, 0, TAU);
      ctx!.fill();
      ctx!.restore();

      const core = ctx!.createRadialGradient(
        cx - sunR * 0.25,
        cy - sunR * 0.25,
        sunR * 0.1,
        cx,
        cy,
        sunR,
      );
      core.addColorStop(0, "#fffdf2");
      core.addColorStop(0.55, "#ffd76a");
      core.addColorStop(1, "#ff9d2e");
      ctx!.fillStyle = core;
      ctx!.beginPath();
      ctx!.arc(cx, cy, sunR, 0, TAU);
      ctx!.fill();
      positions.set("sun", { x: cx, y: cy, r: sunR });

      /* 行星 - 使用 for 循环优化 */
      for (let i = 0; i < geom.length; i++) {
        const { pl, x, y, r } = geom[i];
        positions.set(pl.id, { x, y, r });

        /* 土星环（后半） */
        if (pl.id === "saturn") {
          ctx!.save();
          ctx!.translate(x, y);
          ctx!.rotate(-0.42);
          ctx!.scale(1, 0.36);
          ctx!.strokeStyle = "rgba(230,201,138,0.5)";
          ctx!.lineWidth = r * 0.5;
          ctx!.beginPath();
          ctx!.arc(0, 0, r * 2.05, Math.PI, TAU);
          ctx!.stroke();
          ctx!.restore();
        }

        /* 球体 */
        const g = ctx!.createRadialGradient(
          x - r * 0.38,
          y - r * 0.38,
          r * 0.12,
          x,
          y,
          r * 1.15,
        );
        g.addColorStop(0, pl.colorLight);
        g.addColorStop(0.55, pl.color);
        g.addColorStop(1, pl.colorDark);
        ctx!.fillStyle = g;
        ctx!.beginPath();
        ctx!.arc(x, y, r, 0, TAU);
        ctx!.fill();

        /* 木星条纹 */
        if (pl.id === "jupiter") {
          ctx!.save();
          ctx!.beginPath();
          ctx!.arc(x, y, r, 0, TAU);
          ctx!.clip();
          ctx!.strokeStyle = "rgba(140,86,40,0.35)";
          ctx!.lineWidth = r * 0.16;
          for (const off of [-0.45, 0.05, 0.5]) {
            ctx!.beginPath();
            ctx!.moveTo(x - r, y + r * off);
            ctx!.quadraticCurveTo(x, y + r * off + r * 0.18, x + r, y + r * off);
            ctx!.stroke();
          }
          ctx!.restore();
        }

        /* 土星环（前半） */
        if (pl.id === "saturn") {
          ctx!.save();
          ctx!.translate(x, y);
          ctx!.rotate(-0.42);
          ctx!.scale(1, 0.36);
          ctx!.strokeStyle = "rgba(240,215,160,0.65)";
          ctx!.lineWidth = r * 0.5;
          ctx!.beginPath();
          ctx!.arc(0, 0, r * 2.05, 0, Math.PI);
          ctx!.stroke();
          ctx!.restore();
        }

        /* 地球的月球 */
        if (pl.id === "earth") {
          const mth = TAU * (sim.days / 27.3);
          const mr = r + 7;
          const mx = x + mr * Math.cos(mth);
          const my = y + mr * Math.sin(mth) * 0.9;
          ctx!.fillStyle = "#c9ccd4";
          ctx!.beginPath();
          ctx!.arc(mx, my, 1.7, 0, TAU);
          ctx!.fill();
        }

        /* 悬停 / 选中标记 */
        if (sim.hover === pl.id && p.selectedId !== pl.id) {
          ctx!.strokeStyle = "rgba(255,255,255,0.4)";
          ctx!.lineWidth = 1;
          ctx!.beginPath();
          ctx!.arc(x, y, r + 6, 0, TAU);
          ctx!.stroke();
        }
        if (p.selectedId === pl.id) {
          ctx!.save();
          ctx!.strokeStyle = pl.color;
          ctx!.lineWidth = 1.3;
          ctx!.setLineDash([4, 5]);
          ctx!.lineDashOffset = -t * 26;
          ctx!.beginPath();
          ctx!.arc(x, y, r + 8, 0, TAU);
          ctx!.stroke();
          ctx!.restore();
        }

        /* 标签 */
        if (p.showLabels || p.selectedId === pl.id || sim.hover === pl.id) {
          ctx!.font = '500 11px "Noto Sans SC", sans-serif';
          ctx!.textAlign = "center";
          ctx!.fillStyle =
            p.selectedId === pl.id
              ? "rgba(255,255,255,0.95)"
              : "rgba(196,214,238,0.72)";
          ctx!.fillText(pl.name, x, y - r - 9);
        }
      }

      /* 太阳标签与选中态 */
      if (p.showLabels || p.selectedId === "sun" || sim.hover === "sun") {
        ctx!.font = '500 11px "Noto Sans SC", sans-serif';
        ctx!.textAlign = "center";
        ctx!.fillStyle =
          p.selectedId === "sun" ? "rgba(255,255,255,0.95)" : "rgba(255,222,160,0.75)";
        ctx!.fillText(SUN.name, cx, cy + sunR + 18);
      }
      if (p.selectedId === "sun") {
        ctx!.save();
        ctx!.strokeStyle = "#f5b942";
        ctx!.lineWidth = 1.3;
        ctx!.setLineDash([4, 5]);
        ctx!.lineDashOffset = -t * 26;
        ctx!.beginPath();
        ctx!.arc(cx, cy, sunR + 9, 0, TAU);
        ctx!.stroke();
        ctx!.restore();
      } else if (sim.hover === "sun") {
        ctx!.strokeStyle = "rgba(255,255,255,0.4)";
        ctx!.lineWidth = 1;
        ctx!.beginPath();
        ctx!.arc(cx, cy, sunR + 6, 0, TAU);
        ctx!.stroke();
      }

      /* 悬停提示框 */
      if (sim.hover) {
        const body = BODIES.find((b) => b.id === sim.hover);
        const pos = positions.get(sim.hover);
        if (body && pos) {
          const l1 = body.name;
          const l2 = "点击查看详情";
          ctx!.font = '700 12px "Noto Sans SC", sans-serif';
          const w1 = ctx!.measureText(l1).width;
          ctx!.font = '400 10px "Noto Sans SC", sans-serif';
          const w2 = ctx!.measureText(l2).width;
          const bw = Math.max(w1, w2) + 22;
          const bh = 40;
          let bx = pos.x + pos.r + 14;
          let by = pos.y - bh - 8;
          if (bx + bw > w - 8) bx = pos.x - pos.r - 14 - bw;
          if (by < 8) by = pos.y + pos.r + 12;
          roundedRect(bx, by, bw, bh, 7);
          ctx!.fillStyle = "rgba(8,13,24,0.92)";
          ctx!.fill();
          ctx!.strokeStyle = body.color + "88";
          ctx!.lineWidth = 1;
          ctx!.stroke();
          ctx!.textAlign = "left";
          ctx!.fillStyle = "#f2f7ff";
          ctx!.font = '700 12px "Noto Sans SC", sans-serif';
          ctx!.fillText(l1, bx + 11, by + 16);
          ctx!.fillStyle = "rgba(154,173,199,0.9)";
          ctx!.font = '400 10px "Noto Sans SC", sans-serif';
          ctx!.fillText(l2, bx + 11, by + 31);
        }
      }

      /* 暗角 */
      const vg = ctx!.createRadialGradient(
        cx,
        cy,
        Math.min(w, h) * 0.35,
        cx,
        cy,
        Math.max(w, h) * 0.75,
      );
      vg.addColorStop(0, "rgba(0,0,0,0)");
      vg.addColorStop(1, "rgba(2,4,9,0.55)");
      ctx!.fillStyle = vg;
      ctx!.fillRect(0, 0, w, h);
    }

    function loop(now: number) {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      draw(now, dt);
      simRef.current.tickAcc += dt;
      if (simRef.current.tickAcc >= 0.2) {
        simRef.current.tickAcc = 0;
        propsRef.current.onTick(simRef.current.days);
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("touchstart", onTouch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div ref={wrapRef} className="absolute inset-0">
      <canvas ref={canvasRef} className="block" />
    </div>
  );
}
