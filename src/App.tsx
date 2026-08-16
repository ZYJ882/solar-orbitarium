import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from "react";
import SolarCanvas from "./components/SolarCanvas";

const SolarCanvas3D = lazy(() => import("./components/SolarCanvas3D"));
import InfoPanel from "./components/InfoPanel";
import ControlBar from "./components/ControlBar";
import PlanetNav from "./components/PlanetNav";
import DataComparison from "./components/DataComparison";
import { BODIES, getBody, formatDays } from "./data/planets";

/** 滑杆值 (0..1) → 速度倍率 (0.1×..200×)，指数映射 */
const vToSpeed = (v: number) => 0.1 * Math.pow(2000, v);
const DEFAULT_V = Math.log(10) / Math.log(2000); // ≈ 1×

/** Chrome 安装提示事件（PWA beforeinstallprompt） */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

export default function App() {
  const [playing, setPlaying] = useState<boolean>(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    return true;
  });
  const [sliderV, setSliderV] = useState(DEFAULT_V);
  const [showOrbits, setShowOrbits] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [simDays, setSimDays] = useState(0);
  const [resetToken, setResetToken] = useState(0);
  const [viewMode, setViewMode] = useState<"2d" | "3d">("2d");
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(null);

  /* 捕获浏览器的 PWA 安装提示（安卓 Chrome 会触发） */
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const speed = useMemo(() => vToSpeed(sliderV), [sliderV]);
  const selectedBody = useMemo(() => getBody(selectedId), [selectedId]);

  const handleSelect = useCallback((id: string | null) => setSelectedId(id), []);
  const handleTick = useCallback((days: number) => setSimDays(days), []);

  const step = useCallback((dir: 1 | -1) => {
    setSelectedId((cur) => {
      const idx = BODIES.findIndex((b) => b.id === cur);
      const next = (idx + dir + BODIES.length) % BODIES.length;
      return BODIES[next].id;
    });
  }, []);

  /* 空格键：播放 / 暂停 */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space" || e.repeat) return;
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "BUTTON" || tag === "TEXTAREA") return;
      e.preventDefault();
      setPlaying((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="min-h-screen bg-[#05080f] text-[#e7eef8]">
      {/* ============ 观测台主舞台 ============ */}
      <section className="relative h-[100svh] min-h-[560px] overflow-hidden">
        {viewMode === "3d" ? (
          <Suspense
            fallback={
              <div className="flex h-full items-center justify-center text-sm tracking-[0.2em] text-[#8ea3be]">
                正在加载 3D 视图…
              </div>
            }
          >
            <SolarCanvas3D
              playing={playing}
              speed={speed}
              showOrbits={showOrbits}
              showLabels={showLabels}
              selectedId={selectedId}
              onSelect={handleSelect}
              onTick={handleTick}
              resetToken={resetToken}
            />
          </Suspense>
        ) : (
          <SolarCanvas
            playing={playing}
            speed={speed}
            showOrbits={showOrbits}
            showLabels={showLabels}
            selectedId={selectedId}
            onSelect={handleSelect}
            onTick={handleTick}
            resetToken={resetToken}
          />
        )}

        {/* HUD 顶栏 */}
        <header className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-4 sm:px-7">
          <div className="flex items-center gap-3">
            <svg
              width="34"
              height="34"
              viewBox="0 0 34 34"
              fill="none"
              className="spin-slow text-[#f5b942]"
            >
              <circle cx="17" cy="17" r="4.5" fill="currentColor" />
              <ellipse cx="17" cy="17" rx="14" ry="7.5" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" transform="rotate(-18 17 17)" />
              <circle cx="29" cy="12.5" r="2" fill="#6fd6e3" />
            </svg>
            <div>
              <h1 className="text-lg font-black leading-tight tracking-wide sm:text-xl">
                太阳系观测站
              </h1>
              <div className="font-display text-[8px] tracking-[0.4em] text-[#7f93b0] sm:text-[9px]">
                ORRERY · INTERACTIVE SOLAR SYSTEM
              </div>
            </div>
          </div>

          <div className="pointer-events-auto flex items-center gap-2">
            {installEvt && (
              <button
                onClick={async () => {
                  await installEvt.prompt();
                  const choice = await installEvt.userChoice;
                  if (choice.outcome === "accepted") setInstallEvt(null);
                }}
                className="panel-card hidden items-center gap-2 rounded-full px-4 py-2 text-xs font-bold tracking-widest text-[#ffcf6b] transition-all duration-300 hover:bg-[#f5b942]/10 hover:shadow-[0_0_18px_rgba(245,185,66,0.3)] active:scale-95 sm:flex"
                style={{ borderColor: "rgba(245,185,66,0.5)" }}
              >
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M7 1v8M3.5 5.5 7 9l3.5-3.5M1.5 12.5h11"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                安装 App
              </button>
            )}
            {/* 2D/3D 切换按钮 */}
            <button
              onClick={() => setViewMode(viewMode === "2d" ? "3d" : "2d")}
              className="panel-card flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold tracking-wider transition-all duration-300 hover:bg-[#f5b942]/10 hover:shadow-[0_0_18px_rgba(245,185,66,0.3)] active:scale-95"
              style={{ borderColor: "rgba(245,185,66,0.5)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {viewMode === "2d" ? (
                  <>
                    <path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c4.97 0 9-4.03 9-9s-4.03-9-9-9z"/>
                    <path d="M12 7v5l3 3"/>
                  </>
                ) : (
                  <>
                    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
                    <path d="M3.27 6.96L12 12.01l8.73-5.05"/>
                    <path d="M12 22.08V12"/>
                  </>
                )}
              </svg>
              {viewMode === "2d" ? "3D 视图" : "2D 视图"}
            </button>
            <div className="panel-card flex items-center gap-2.5 rounded-full px-4 py-2">
              <span
                className={`h-2 w-2 rounded-full ${
                  playing ? "blink-dot bg-[#5ee08a]" : "bg-[#7f93b0]"
                }`}
              />
            <span className="text-[10px] tracking-[0.25em] text-[#7f93b0]">
              {playing ? "运行中" : "已暂停"}
            </span>
              <span className="font-display text-xs font-bold text-[#ffcf6b]">
                T+{formatDays(simDays)}
              </span>
            </div>
          </div>
        </header>

        {/* 行星导航 */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <PlanetNav selectedId={selectedId} onSelect={(id) => setSelectedId(id)} />
        </div>

        {/* 提示 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-[100px] z-10 hidden px-6 text-center sm:block">
          <p className="float-hint inline-block text-xs tracking-wider text-[#7f93b0]">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#f5b942] align-middle" />
            点击任意天体查看档案 · 空格键播放 / 暂停 · 底部调节模拟速度
          </p>
        </div>

        {/* 控制栏 */}
        <div className="pointer-events-none absolute inset-x-0 bottom-4 z-20 flex justify-center px-3 sm:bottom-6">
          <div className="pointer-events-auto w-full max-w-[820px]">
            <ControlBar
              playing={playing}
              onTogglePlay={() => setPlaying((p) => !p)}
              sliderV={sliderV}
              onSliderV={setSliderV}
              speed={speed}
              showOrbits={showOrbits}
              showLabels={showLabels}
              onToggleOrbits={() => setShowOrbits((v) => !v)}
              onToggleLabels={() => setShowLabels((v) => !v)}
              onReset={() => setResetToken((t) => t + 1)}
              simDays={simDays}
            />
          </div>
        </div>

        {/* 天体档案面板 */}
        <InfoPanel
          body={selectedBody}
          onClose={() => setSelectedId(null)}
          onPrev={() => step(-1)}
          onNext={() => step(1)}
        />

      </section>

      {/* ============ 数据对比 ============ */}
      <DataComparison />

      {/* ============ 页脚 ============ */}
      <footer className="border-t border-[#141f33] px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5 text-[#7f93b0]">
            <svg width="18" height="18" viewBox="0 0 34 34" fill="none" className="text-[#f5b942]">
              <circle cx="17" cy="17" r="4.5" fill="currentColor" />
              <ellipse cx="17" cy="17" rx="14" ry="7.5" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.2" transform="rotate(-18 17 17)" />
            </svg>
            <span className="text-sm">太阳系观测站 · 交互式天文教学演示</span>
          </div>
          <p className="max-w-xl text-[11px] leading-6 text-[#5c6f8c]">
            行星数据参考 NASA 行星事实表（NASA Planetary Fact Sheet）。轨道半径与天体尺寸经非线性缩放处理，公转速度按真实周期比例还原，仅用于教学演示。
          </p>
        </div>
      </footer>
    </div>
  );
}
