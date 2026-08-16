import { PLANETS, formatKm } from "../data/planets";
import { useReveal } from "../hooks/useReveal";
import { useMemo } from "react";

interface BarProps {
  pct: number;
  color: string;
  visible: boolean;
  delay: number;
}

// 使用 useMemo 缓存计算结果
const BAR_STYLES = new Map<string, { width: string; background: string; boxShadow: string }>();

function getBarStyle(pct: number, color: string, visible: boolean): { width: string; background: string; boxShadow: string } {
  const key = `${pct}-${color}-${visible}`;
  if (BAR_STYLES.has(key)) {
    return BAR_STYLES.get(key)!;
  }
  const style = {
    width: visible ? `${pct}%` : "0%",
    background: `linear-gradient(90deg, ${color}88, ${color})`,
    boxShadow: `0 0 12px ${color}44`,
  };
  BAR_STYLES.set(key, style);
  return style;
}

function Bar({ pct, color, visible, delay }: BarProps) {
  const style = useMemo(() => getBarStyle(pct, color, visible), [pct, color, visible]);
  
  return (
    <div className="h-[6px] w-full overflow-hidden rounded-full bg-[#141f33]">
      <div
        className="h-full rounded-full transition-[width] duration-[1200ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
        style={{
          ...style,
          transitionDelay: `${delay}ms`,
        }}
      />
    </div>
  );
}

function Row({ index, delayBase }: { index: number; delayBase: number }) {
  const pl = PLANETS[index];
  const { ref, visible } = useReveal<HTMLDivElement>(0.25);
  // 使用 useMemo 缓存计算结果
  const { dPct, aPct } = useMemo(() => ({
    dPct: Math.sqrt(pl.diameterKm / 142984) * 100,
    aPct: Math.sqrt(pl.au / 30.07) * 100,
  }), [pl.diameterKm, pl.au]);

  return (
    <div
      ref={ref}
      className={`reveal grid grid-cols-1 items-center gap-x-8 gap-y-3 border-b border-[#141f33] py-5 transition-opacity md:grid-cols-[170px_1fr_1fr_130px] ${
        visible ? "is-visible" : ""
      }`}
    >
      {/* 名称 */}
      <div className="flex items-center gap-3">
        <span
          className="h-3.5 w-3.5 shrink-0 rounded-full"
          style={{
            background: `radial-gradient(circle at 32% 30%, ${pl.colorLight}, ${pl.color} 60%, ${pl.colorDark})`,
            boxShadow: `0 0 10px ${pl.color}55`,
          }}
        />
        <div>
          <div className="text-[15px] font-bold">{pl.name}</div>
          <div className="font-display text-[9px] tracking-[0.25em] text-[#5c6f8c]">
            {pl.english} · 0{index + 1}
          </div>
        </div>
      </div>

      {/* 直径 */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
          <span className="tracking-widest text-[#7f93b0]">直径</span>
          <span className="font-display text-xs text-[#d5e1f2]">
            {formatKm(pl.diameterKm)} km
          </span>
        </div>
        <Bar pct={dPct} color={pl.color} visible={visible} delay={delayBase} />
      </div>

      {/* 距太阳 */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between text-[11px]">
          <span className="tracking-widest text-[#7f93b0]">距太阳</span>
          <span className="font-display text-xs text-[#d5e1f2]">
            {pl.distanceMKm.toLocaleString()} 百万 km
          </span>
        </div>
        <Bar pct={aPct} color={pl.color} visible={visible} delay={delayBase + 150} />
      </div>

      {/* 周期 */}
      <div className="md:text-right">
        <div className="text-[10px] tracking-widest text-[#5c6f8c]">公转周期</div>
        <div className="font-display mt-0.5 text-lg font-bold" style={{ color: pl.color }}>
          {pl.periodLabel}
        </div>
      </div>
    </div>
  );
}

const FUN_STATS: Array<{ num: string; unit: string; text: string; color: string }> = [
  { num: "99.86", unit: "%", text: "太阳占据的太阳系总质量", color: "#f5b942" },
  { num: "1,300", unit: "个", text: "木星体积约等于多少个地球", color: "#d9a066" },
  { num: "2,100", unit: "km/h", text: "海王星上的最高风速", color: "#5b7fe8" },
  { num: "98", unit: "°", text: "天王星「躺着打滚」的轴倾角", color: "#8fd5d8" },
];

function StatBlock({ index }: { index: number }) {
  const s = FUN_STATS[index];
  const { ref, visible } = useReveal<HTMLDivElement>(0.3);
  return (
    <div
      ref={ref}
      className={`reveal relative flex-1 basis-52 px-6 py-8 transition-opacity md:basis-0 ${
        visible ? "is-visible" : ""
      }`}
      style={{ transitionDelay: `${index * 120}ms` }}
    >
      <div className="font-display text-[42px] font-black leading-none tracking-tight sm:text-5xl" style={{ color: s.color }}>
        {s.num}
        <span className="ml-1 text-xl font-bold text-[#8ea3be]">{s.unit}</span>
      </div>
      <div className="mt-3 max-w-[220px] text-[13px] leading-6 text-[#b9c8de]">{s.text}</div>
    </div>
  );
}

export default function DataComparison() {
  const head = useReveal<HTMLDivElement>(0.3);

  return (
    <section className="relative mx-auto max-w-6xl px-5 pb-10 pt-20 sm:px-8">
      <div ref={head.ref} className={`reveal ${head.visible ? "is-visible" : ""}`}>
        <div className="flex items-center gap-4">
          <span className="font-display text-[10px] tracking-[0.4em] text-[#f5b942]">
            DATA ARCHIVE
          </span>
          <span className="h-px w-16 bg-[#f5b942]/40" />
        </div>
        <h2 className="mt-3 text-3xl font-black tracking-wide sm:text-4xl">
          行星档案<span className="mx-3 text-[#31456a]">·</span>数据对比
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-[#8ea3be]">
          真实数据，直观呈现。条形长度按
          <span className="mx-1 text-[#d5e1f2]">平方根比例</span>
          压缩——否则水星的条只有木星的 1/29，几乎看不见了。
        </p>
      </div>

      <div className="mt-10 border-t border-[#141f33]">
        {PLANETS.map((_, i) => (
          <Row key={PLANETS[i].id} index={i} delayBase={i * 60} />
        ))}
      </div>

      {/* 趣味数据带 */}
      <div className="mt-16 border border-[#141f33] bg-[#080f1c]/70">
        <div className="flex flex-col divide-y divide-[#141f33] md:flex-row md:divide-x md:divide-y-0">
          {FUN_STATS.map((_, i) => (
            <StatBlock key={i} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
