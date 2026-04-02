interface SeverityBadgeProps {
  grade: number;
  size?: "sm" | "md";
}

const CONFIG: Record<number, { label: string; classes: string }> = {
  0: { label: "No DR", classes: "text-[#10B981] bg-[#10B981]/10 border-[#10B981]/25" },
  1: { label: "Mild NPDR", classes: "text-[#EAB308] bg-[#EAB308]/10 border-[#EAB308]/25" },
  2: { label: "Moderate NPDR", classes: "text-[#F59E0B] bg-[#F59E0B]/10 border-[#F59E0B]/25" },
  3: { label: "Severe NPDR", classes: "text-[#F97316] bg-[#F97316]/10 border-[#F97316]/25" },
  4: { label: "Proliferative DR", classes: "text-[#EF4444] bg-[#EF4444]/10 border-[#EF4444]/25" },
};

export default function SeverityBadge({ grade, size = "sm" }: SeverityBadgeProps) {
  const config = CONFIG[grade] ?? CONFIG[0];
  const sizeClass = size === "md" ? "text-xs px-3 py-1.5" : "text-[11px] px-2 py-1";

  return (
    <span className={`inline-flex items-center font-mono font-medium rounded border ${sizeClass} ${config.classes}`}>
      {config.label}
    </span>
  );
}
