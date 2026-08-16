import { BODIES } from "../data/planets";

interface Props {
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export default function PlanetNav({ selectedId, onSelect }: Props) {
  return (
    <>
      {/* 桌面端：左侧纵向导航 */}
      <nav className="pointer-events-auto absolute left-4 top-1/2 z-20 hidden -translate-y-1/2 flex-col gap-0.5 md:flex xl:left-7">
        <div className="font-display mb-2 text-[9px] tracking-[0.35em] text-[#5c6f8c]">
          BODIES
        </div>
        {BODIES.map((b, i) => {
          const active = selectedId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`group flex items-center gap-3 border-l-2 py-2 pl-3 pr-4 text-left transition-all duration-300 ${
                active
                  ? "border-[#f5b942] bg-gradient-to-r from-[#f5b942]/10 to-transparent"
                  : "border-transparent hover:translate-x-1 hover:border-[#31456a]"
              }`}
            >
              <span
                className="h-2.5 w-2.5 rounded-full transition-shadow duration-300"
                style={{
                  background: b.color,
                  boxShadow: active ? `0 0 10px ${b.color}` : "none",
                }}
              />
              <span className="font-display text-[9px] tracking-widest text-[#5c6f8c]">
                {i === 0 ? "☉" : `0${i}`}
              </span>
              <span
                className={`text-sm transition-colors duration-300 ${
                  active ? "font-bold text-[#fff6e0]" : "text-[#8ea3be] group-hover:text-[#d5e1f2]"
                }`}
              >
                {b.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* 移动端：顶部横向导航 */}
      <nav className="pointer-events-auto absolute inset-x-0 top-[62px] z-20 flex gap-2 overflow-x-auto px-4 pb-2 [scrollbar-width:none] md:hidden">
        {BODIES.map((b, i) => {
          const active = selectedId === b.id;
          return (
            <button
              key={b.id}
              onClick={() => onSelect(b.id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all duration-300 ${
                active
                  ? "border-[#f5b942]/80 bg-[#f5b942]/10 text-[#fff6e0]"
                  : "border-[#22304a] bg-[#0a1220]/80 text-[#8ea3be]"
              }`}
            >
              <span
                className="h-2 w-2 rounded-full"
                style={{ background: b.color }}
              />
              {b.name}
              <span className="font-display text-[8px] text-[#5c6f8c]">
                {i === 0 ? "☉" : `0${i}`}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
