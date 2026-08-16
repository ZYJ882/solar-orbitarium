import { CelestialBody, PLANETS, formatKm } from "../data/planets";

interface Props {
  body: CelestialBody | null;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
}

function Metric({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="border border-[#1c2942] bg-[#0a1322]/70 px-4 py-3 transition-colors duration-300 hover:border-[#31456a]">
      <div className="text-[10px] tracking-[0.22em] text-[#7f93b0]">{label}</div>
      <div
        className="font-display mt-1.5 text-lg font-bold leading-tight"
        style={accent ? { color: accent } : undefined}
      >
        {value}
      </div>
      {sub && <div className="mt-0.5 text-[11px] text-[#7f93b0]">{sub}</div>}
    </div>
  );
}

/** 日距指示条（对数刻度，0.39–30.07 AU） */
function DistanceMeter({ body }: { body: CelestialBody }) {
  if (body.au <= 0) return null;
  const lo = Math.log(0.39);
  const hi = Math.log(30.07);
  const pct = ((Math.log(body.au) - lo) / (hi - lo)) * 100;
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between text-[10px] tracking-[0.2em] text-[#7f93b0]">
        <span>轨道位置 · 对数刻度</span>
        <span className="font-display">{body.au.toFixed(2)} AU</span>
      </div>
      <div className="relative h-[3px] rounded-full bg-[#1c2942]">
        <div
          className="absolute top-1/2 h-[9px] w-[9px] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-[#05080f] shadow-[0_0_10px_rgba(255,255,255,0.35)] transition-all duration-700"
          style={{ left: `${pct}%`, background: body.color }}
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-[#5c6f8c]">
        <span>水星轨道</span>
        <span>海王星轨道</span>
      </div>
    </div>
  );
}

export default function InfoPanel({ body, onClose, onPrev, onNext }: Props) {
  const open = body !== null;
  const idx = body ? PLANETS.findIndex((p) => p.id === body.id) : -1;

  return (
    <aside
      className={`absolute right-0 top-0 z-30 h-full w-full transform transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:w-[370px] ${
        open ? "translate-x-0" : "pointer-events-none translate-x-full"
      }`}
      aria-hidden={!open}
    >
      <div className="panel-card flex h-full flex-col overflow-y-auto border-y-0 border-r-0">
        {body && (
          <div className="flex-1 px-6 py-6 sm:px-7">
            {/* 头部 */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="h-14 w-14 shrink-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 32% 30%, ${body.colorLight}, ${body.color} 55%, ${body.colorDark})`,
                    boxShadow: `0 0 26px ${body.color}55`,
                  }}
                />
                <div>
                  <div className="text-[10px] font-medium tracking-[0.3em] text-[#7f93b0]">
                    {body.english}
                    {idx >= 0 && (
                      <span className="font-display ml-2 text-[#f5b942]">
                        0{idx + 1}
                      </span>
                    )}
                  </div>
                  <h2 className="mt-0.5 text-3xl font-black tracking-wide">
                    {body.name}
                  </h2>
                </div>
              </div>
              <button
                onClick={onClose}
                aria-label="关闭"
                className="group -mr-1 mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-[#22304a] text-[#8ea3be] transition-all duration-300 hover:rotate-90 hover:border-[#f5b942] hover:text-[#f5b942]"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M1 1L13 13M13 1L1 13"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
            </div>

            <span
              className="mt-4 inline-block border px-2.5 py-1 text-[11px] font-medium tracking-widest"
              style={{
                color: body.color,
                borderColor: body.color + "55",
                background: body.color + "14",
              }}
            >
              {body.type}
            </span>

            {/* 核心数据 */}
            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <Metric
                label="直径 SIZE"
                value={`${formatKm(body.diameterKm)} km`}
                sub={
                  body.id === "sun"
                    ? "≈ 109 个地球"
                    : `≈ ${(body.diameterKm / 12756).toFixed(2)} 倍地球`
                }
                accent={body.color}
              />
              <Metric
                label="距太阳 DISTANCE"
                value={
                  body.distanceMKm > 0 ? `${body.distanceMKm.toLocaleString()} 百万 km` : "—"
                }
                sub={body.au > 0 ? `${body.au.toFixed(2)} 天文单位` : "系统中心"}
              />
              <Metric
                label="公转周期 ORBIT"
                value={body.periodLabel}
                sub={
                  body.periodDays > 0
                    ? `约 ${formatKm(body.periodDays)} 地球日`
                    : "不发生公转"
                }
              />
              <Metric label="自转周期 SPIN" value={body.rotationLabel} />
              <Metric label="已知卫星 MOONS" value={body.moons} />
              <Metric label="温度 TEMP" value={body.tempLabel} />
            </div>

            <DistanceMeter body={body} />

            {/* 档案 */}
            <div className="mt-6">
              <div className="flex items-center gap-3">
                <span className="font-display text-[10px] tracking-[0.3em] text-[#f5b942]">
                  DOSSIER
                </span>
                <span className="h-px flex-1 bg-[#22304a]" />
              </div>
              <p className="mt-3 text-[13px] leading-7 text-[#b9c8de]">{body.fact}</p>
            </div>

            {/*  prev / next */}
            <div className="mt-7 flex items-center gap-2.5">
              <button
                onClick={onPrev}
                className="flex flex-1 items-center justify-center gap-2 border border-[#22304a] py-2.5 text-[13px] text-[#b9c8de] transition-all duration-300 hover:border-[#f5b942] hover:text-[#f5b942]"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M7.5 2L3.5 6L7.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                上一颗
              </button>
              <button
                onClick={onNext}
                className="flex flex-1 items-center justify-center gap-2 border border-[#22304a] py-2.5 text-[13px] text-[#b9c8de] transition-all duration-300 hover:border-[#f5b942] hover:text-[#f5b942]"
              >
                下一颗
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M4.5 2L8.5 6L4.5 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
