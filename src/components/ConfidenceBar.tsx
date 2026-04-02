interface ConfidenceBarProps {
  value: number;
  grade: number;
}

const GRADE_COLOR: Record<number, string> = {
  0: "#10B981",
  1: "#EAB308",
  2: "#F59E0B",
  3: "#F97316",
  4: "#EF4444",
};

export default function ConfidenceBar({ value, grade }: ConfidenceBarProps) {
  const color = GRADE_COLOR[grade] ?? "#6B7280";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-[#6B7280] uppercase tracking-wider">Confidence</span>
        <span className="text-sm font-mono font-medium" style={{ color }}>
          {value}%
        </span>
      </div>
      <div className="h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full confidence-fill"
          style={{ width: `${value}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}
