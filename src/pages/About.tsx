import AppShell from "@/components/layout/AppShell";
import { AlertTriangle } from "lucide-react";

const STATS = [
  { label: "Sensitivity",    value: "95.8%",  sub: "APTOS 2019 benchmark" },
  { label: "Specificity",    value: "94.2%",  sub: "5-class ICDR grading" },
  { label: "Architecture",   value: "ViT-B/16", sub: "Vision Transformer" },
  { label: "Training set",   value: "3,662",  sub: "APTOS 2019 fundus images" },
];

const GRADES = [
  { grade: 0, name: "No DR",            color: "#16A34A", desc: "No lesions detected. Annual screening recommended." },
  { grade: 1, name: "Mild NPDR",        color: "#D97706", desc: "Microaneurysms only. Follow-up in 6–12 months." },
  { grade: 2, name: "Moderate NPDR",    color: "#B45309", desc: "More than microaneurysms, less than severe. Referral in 3–6 months." },
  { grade: 3, name: "Severe NPDR",      color: "#C2410C", desc: "4-2-1 rule: widespread hemorrhages, venous beading, or IRMA. Urgent referral." },
  { grade: 4, name: "Proliferative DR", color: "#DC2626", desc: "Neovascularization or vitreous hemorrhage. Immediate referral required." },
];

export default function About() {
  return (
    <AppShell>
      <div className="p-6 space-y-5 max-w-3xl">
        <div>
          <h1 className="text-base font-semibold text-[#0F172A]">About</h1>
          <p className="text-xs text-[#64748B] mt-0.5">Model details and classification system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white border border-[#E2E8F0] rounded-lg p-4 border-t-2 border-t-[#2563EB]">
              <p className="text-xl font-mono font-semibold text-[#0F172A]">{s.value}</p>
              <p className="text-xs font-medium text-[#0F172A] mt-1">{s.label}</p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Model info */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <h2 className="text-sm font-medium text-[#0F172A] mb-3">Classification model</h2>
          <div className="space-y-2.5 text-xs text-[#64748B]">
            {[
              ["Model ID",       "nickmuchi/vit-base-patch16-224-retinopathy-grade"],
              ["Dataset",        "APTOS 2019 Blindness Detection (Kaggle)"],
              ["Task",           "Image classification — 5-class DR severity grading"],
              ["API",            "HuggingFace Inference API (binary image input)"],
              ["Preprocessing",  "Client-side JPEG compression to ≤1 MB before inference"],
            ].map(([label, value]) => (
              <div key={label} className="flex gap-3">
                <span className="text-[#CBD5E1] w-28 shrink-0">{label}</span>
                <span className="text-[#0F172A]">{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Grading scale */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-5">
          <h2 className="text-sm font-medium text-[#0F172A] mb-3">ICDR grading scale</h2>
          <div className="space-y-0">
            {GRADES.map((g, i) => (
              <div
                key={g.grade}
                className={`flex items-start gap-3 py-3 ${i < GRADES.length - 1 ? "border-b border-[#F1F5F9]" : ""}`}
              >
                <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: g.color }} />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-medium" style={{ color: g.color }}>Grade {g.grade}</span>
                    <span className="text-xs font-medium text-[#0F172A]">{g.name}</span>
                  </div>
                  <p className="text-[11px] text-[#64748B]">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-white border border-[#FDE68A] rounded-lg p-5">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-medium text-[#0F172A] mb-1.5">Medical disclaimer</h2>
              <p className="text-xs text-[#64748B] leading-relaxed">
                VisionGuard AI is a screening tool only and is{" "}
                <strong className="text-[#0F172A]">not a replacement</strong> for professional
                medical diagnosis. Always consult a qualified ophthalmologist for definitive
                diagnosis and treatment planning. False negatives and false positives can occur.
                Not approved as a standalone diagnostic device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
