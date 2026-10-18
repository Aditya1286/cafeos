export interface PillOption {
  value: string;
  label: string;
  /** Shown beside the label when given. */
  count?: number;
}

interface PillRowProps {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
}

/** One-tap filter: a row of pills that scrolls sideways when there are more than fit. */
export const PillRow = ({ options, value, onChange }: PillRowProps) => (
  <div className="flex gap-1.5 overflow-x-auto -mx-4 px-4 pb-0.5 [scrollbar-width:none]">
    {options.map((p) => {
      const active = value === p.value;
      return (
        <button
          key={p.value}
          type="button"
          onClick={() => onChange(p.value)}
          aria-pressed={active}
          className={`px-3 py-1.5 rounded-full text-[11px] font-black whitespace-nowrap border transition-colors ${
            active
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-500 border-slate-200'
          }`}
        >
          {p.label}
          {p.count !== undefined && <span className="ml-1 opacity-70">{p.count}</span>}
        </button>
      );
    })}
  </div>
);
