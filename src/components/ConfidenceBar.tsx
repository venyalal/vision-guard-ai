interface ConfidenceBarProps {
  value: number;
  grade: number;
}

const GRADE_COLOR: Record<number, string> = {
  0: "#16A34A",
  1: "#D97706",
  2: "#B45309",
  3: "#C2410C",
  4: "#DC2626",
};

export default function ConfidenceBar({ value, grade }: ConfidenceBarProps) {
  const color = GRADE_COLOR[grade] ?? "#64748B";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#64748B] uppercase tracking-wider">Confidence</span>
        <span className="text-sm font-mono font-semibold" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full confidence-fill"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
