"use client";

// Theme picker: six accent swatches. The chosen one gets a volt ring. Pure
// controlled component — parent owns the value.
import { THEMES } from "@/lib/constants";
import { THEME_ACCENT, type DemoTheme } from "@/lib/demo-data";

const LABELS: Record<DemoTheme, string> = {
  volt: "volt",
  "violet-hour": "violet hour",
  ember: "ember",
  rose: "rose",
  reef: "reef",
  cobalt: "cobalt",
};

export function ThemeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (theme: string) => void;
}) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-text-lo">
        theme
      </p>
      <div className="mt-3 grid grid-cols-3 gap-3">
        {THEMES.map((theme) => {
          const selected = value === theme;
          const accent = THEME_ACCENT[theme];
          return (
            <button
              key={theme}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(theme)}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition-colors duration-150 ${
                selected
                  ? "border-volt/70 bg-white/5"
                  : "border-white/10 hover:border-volt/40"
              }`}
            >
              <span
                aria-hidden
                className="h-8 w-8 rounded-full"
                style={{
                  background: accent,
                  boxShadow: selected ? `0 0 20px ${accent}55` : "none",
                }}
              />
              <span
                className={`font-mono text-[11px] lowercase tracking-wide ${
                  selected ? "text-text-hi" : "text-text-lo"
                }`}
              >
                {LABELS[theme]}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
