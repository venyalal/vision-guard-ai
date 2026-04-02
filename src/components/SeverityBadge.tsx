interface SeverityBadgeProps {
  grade: number;
  size?: "sm" | "md";
}

const CONFIG: Record<number, { label: string; classes: string }> = {
  0: { label: "No DR",           classes: "text-[#16A34A] bg-[#F0FDF4] border-[#BBF7D0]" },
  1: { label: "Mild NPDR",       classes: "text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]" },
  2: { label: "Moderate NPDR",   classes: "text-[#B45309] bg-[#FFF7ED] border-[#FED7AA]" },
  3: { label: "Severe NPDR",     classes: "text-[#C2410C] bg-[#FFF7ED] border-[#FDBA74]" },
  4: { label: "Proliferative DR",classes: "text-[#DC2626] bg-[#FEF2F2] border-[#FECACA]" },
};

export default function SeverityBadge({ grade, size = "sm" }: SeverityBadgeProps) {
  const config = CONFIG[grade] ?? CONFIG[0];
  const sizeClass = size === "md" ? "text-xs px-2.5 py-1" : "text-[11px] px-2 py-0.5";

  return (
    <span className={`inline-flex items-center font-medium rounded border ${sizeClass} ${config.classes}`}>
      {config.label}
    </span>
  );
}
