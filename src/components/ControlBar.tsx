import { formatDays } from "../data/planets";

interface Props {
  playing: boolean;
  onTogglePlay: () => void;
  sliderV: number;
  onSliderV: (v: number) => void;
  speed: number;
  showOrbits: boolean;
  showLabels: boolean;
  onToggleOrbits: () => void;
  onToggleLabels: () => void;
  onReset: () => void;
  simDays: number;
}

function Toggle({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`border px-3 py-1.5 text-xs tracking-widest transition-all duration-300 ${
        active
          ? "border-[#f5b942]/70 bg-[#f5b942]/10 text-[#ffcf6b]"
          : "border-[#22304a] text-[#7f93b0] hover:border-[#31456a] hover:text-[#b9c8de]"
      }`}
    >
      {label}
    </button>
  );
}

export default function ControlBar({
  playing,
  onTogglePlay,
  sliderV,
  onSliderV,
  speed,
  showOrbits,
  showLabels,
  onToggleOrbits,
  onToggleLabels,
  onReset,
  simDays,
}: Props) {
  const speedText =
    speed < 1 ? speed.toFixed(2) : speed < 10 ? speed.toFixed(1) : Math.round(speed).toString();

  return (
    <div className="panel-card flex flex-wrap items-center justify-center gap-x-5 gap-y-3 rounded-xl px-5 py-3.5">
      {/* 播放 / 暂停 */}
      <div className="flex items-center gap-3">
        <button
          onClick={onTogglePlay}
          aria-label={playing ? "暂停" : "播放"}
          className={`group flex h-11 w-11 items-center justify-center rounded-full border transition-all duration-300 active:scale-90 ${
            playing
              ? "border-[#f5b942] bg-[#f5b942] text-[#0a1220] shadow-[0_0_22px_rgba(245,185,66,0.45)] hover:shadow-[0_0_30px_rgba(245,185,66,0.65)]"
              : "border-[#f5b942]/70 text-[#ffcf6b] hover:bg-[#f5b942]/15"
          }`}
        >
          {playing ? (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
              <rect x="1" y="1" width="4.4" height="14" rx="1" />
              <rect x="8.6" y="1" width="4.4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="16" viewBox="0 0 14 16" fill="currentColor">
              <path d="M2 1.6v12.8c0 .8.9 1.3 1.6.9l10-6.4c.6-.4.6-1.4 0-1.8l-10-6.4C2.9.3 2 .8 2 1.6z" />
            </svg>
          )}
        </button>

        {/* 速度 */}
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] tracking-widest text-[#7f93b0]">速度</span>
          <input
            type="range"
            min={0}
            max={1000}
            value={Math.round(sliderV * 1000)}
            onChange={(e) => onSliderV(Number(e.target.value) / 1000)}
            className="speed-slider w-32 sm:w-40"
            style={{ ["--fill" as string]: `${sliderV * 100}%` }}
            aria-label="模拟速度"
          />
          <span className="font-display w-12 text-sm font-bold text-[#ffcf6b]">
            {speedText}×
          </span>
        </div>
      </div>

      <span className="hidden h-7 w-px bg-[#22304a] sm:block" />

      {/* 图层开关 */}
      <div className="flex items-center gap-2">
        <Toggle active={showOrbits} label="轨道" onClick={onToggleOrbits} />
        <Toggle active={showLabels} label="标签" onClick={onToggleLabels} />
      </div>

      <span className="hidden h-7 w-px bg-[#22304a] md:block" />

      {/* 模拟时钟 + 重置 */}
      <div className="flex items-center gap-3">
        <div className="text-right">
          <div className="text-[10px] tracking-[0.25em] text-[#7f93b0]">已运行</div>
          <div className="font-display text-sm font-bold text-[#e7eef8]">
            {formatDays(simDays)}
          </div>
        </div>
        <button
          onClick={onReset}
          aria-label="重置时间"
          title="重置时间"
          className="group flex h-9 w-9 items-center justify-center rounded-full border border-[#22304a] text-[#7f93b0] transition-all duration-300 hover:border-[#6fd6e3] hover:text-[#6fd6e3]"
        >
          <svg
            width="15"
            height="15"
            viewBox="0 0 15 15"
            fill="none"
            className="transition-transform duration-500 group-hover:-rotate-180"
          >
            <path
              d="M13.2 7.5a5.7 5.7 0 1 1-1.7-4.05M13.2 1v3h-3"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
