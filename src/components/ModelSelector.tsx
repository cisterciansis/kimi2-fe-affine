import React, { useEffect, useRef, useState } from "react";

export type ModelOption = {
  id: string; // API identifier to send to Chutes
  label: string; // Human-readable name
  provider?: string; // Optional provider name
  comingSoon?: boolean; // If true, item is shown but disabled
};

type ModelSelectorProps = {
  selected: ModelOption;
  onSelect: (model: ModelOption) => void;
  disabled?: boolean;
  options?: ModelOption[];
};

function useOnClickOutside(
  refs: Array<{ current: Element | null }>,
  handler: (e: MouseEvent | TouchEvent) => void
) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      const target = event.target as Node | null;
      const isInside = refs.some((ref) => {
        const el = ref.current;
        return el && target && (el === target || el.contains(target));
      });
      if (!isInside) handler(event);
    };
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [refs, handler]);
}

export default function ModelSelector({
  selected,
  onSelect,
  disabled,
  options = [],
}: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useOnClickOutside([buttonRef, panelRef], () => setOpen(false));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const handleSelect = (m: ModelOption) => {
    if (m.comingSoon) return;
    onSelect(m);
    setOpen(false);
  };

  const glassPanelStyle: React.CSSProperties = {
    backdropFilter: 'url("#liquid-glass")',
    boxShadow:
      `
      0 0 8px rgba(0,0,0,0.03),
      0 2px 6px rgba(0,0,0,0.08),
      inset 3px 3px 0.5px -3px rgba(255,255,255,0.2),
      inset -3px -3px 0.5px -3px rgba(255,255,255,0.15),
      inset 1px 1px 1px -0.5px rgba(255,255,255,0.3),
      inset -1px -1px 1px -0.5px rgba(255,255,255,0.25),
      inset 0 0 6px 6px rgba(255,255,255,0.08),
      inset 0 0 2px 2px rgba(255,255,255,0.04),
      0 0 12px rgba(0,0,0,0.05)
      `,
  };

  return (
    <div className="relative">
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        aria-label="Select model"
        aria-haspopup="dialog"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className={[
          "relative overflow-hidden backdrop-blur-2xl border border-white/20 rounded-full p-3 transition-all duration-300 group shadow-lg",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          "hover:shadow-[0_8px_24px_rgba(0,0,0,0.08)] hover:-translate-y-[0.5px]",
          "active:translate-y-0 active:scale-[0.99]",
        ].join(" ")}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.1) 100%)",
          boxShadow:
            "0 2px 8px rgba(0,0,0,0.05), inset 1px 1px 1px rgba(255,255,255,0.3), inset -1px -1px 1px rgba(255,255,255,0.2), inset 0 0 4px rgba(255,255,255,0.1)",
        }}
      >
        {/* Soft glow accent */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-white/10 rounded-full -z-10"></div>
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/20 to-transparent rounded-full -z-10"></div>
        <div className="absolute -inset-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
             style={{ background: "radial-gradient(60% 60% at 30% 30%, rgba(255,255,255,0.25), transparent 70%)" }} />

        {/* Icon: layered nodes to imply "model" */}
        <svg
          className="relative w-5 h-5 text-black/80 group-hover:text-black/90 transition-colors z-10"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="7" cy="7" r="2.25" />
          <circle cx="17" cy="7" r="2.25" />
          <circle cx="7" cy="17" r="2.25" />
          <circle cx="17" cy="17" r="2.25" />
          <path d="M9.2 7h5.6M7 9.2v5.6M17 9.2v5.6M9.2 17h5.6" />
        </svg>
      </button>

      {/* Popover Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-label="Model selection"
        className={[
          "absolute right-0 top-12 w-80 select-none",
          "origin-top-right transition-all duration-200",
          open ? "opacity-100 scale-100 translate-y-0" : "pointer-events-none opacity-0 scale-95 translate-y-1",
        ].join(" ")}
      >
        <div
          className="bg-white/80 backdrop-blur-[60px] border border-white/10 rounded-2xl overflow-hidden"
          style={glassPanelStyle}
        >
          {/* Header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm uppercase tracking-wide text-black/50">Model</span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-black/5 text-black/60">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Experimental
              </span>
            </div>
            <div className="text-[11px] text-black/40">selection persists</div>
          </div>

          {/* Options */}
          <div className="py-2">
            {options.map((m) => {
              const isActive = m.id === selected.id;
              const isDisabled = !!m.comingSoon;
              return (
                <button
                  key={m.id}
                  onClick={() => handleSelect(m)}
                  disabled={isDisabled}
                  className={[
                    "w-full text-left px-4 py-2.5 flex items-center gap-3",
                    "transition-colors",
                    isDisabled
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-white/50 active:bg-white/60",
                  ].join(" ")}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] text-black/90 truncate">{m.label}</span>
                      {m.provider && (
                        <span className="text-[11px] text-black/50 truncate">{m.provider}</span>
                      )}
                      {m.comingSoon && (
                        <span className="ml-1 text-[10px] text-black/50 bg-black/5 px-1.5 py-0.5 rounded-full">
                          coming soon
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-black/40 truncate">{m.id}</div>
                  </div>

                  {/* Active check */}
                  <div className={[
                    "w-5 h-5 rounded-full border flex items-center justify-center shrink-0",
                    isActive ? "border-black/40 bg-black/5" : "border-black/20 bg-white/30"
                  ].join(" ")}>
                    {isActive && (
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-black/80" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Placeholder footer for future scores/metadata */}
          <div className="px-4 pb-3 pt-2 border-t border-white/20">
            <div className="text-[11px] text-black/50 mb-2">Scores and rankings</div>
            <div className="flex items-center gap-2">
              <div className="h-2 flex-1 bg-gradient-to-r from-black/5 via-black/10 to-black/5 rounded animate-pulse" />
              <div className="h-2 w-10 bg-black/10 rounded animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
