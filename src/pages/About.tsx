import AppShell from "@/components/layout/AppShell";
import { AlertTriangle } from "lucide-react";

const STATS = [
  { label: "Sensitivity", value: "95.8%", sub: "APTOS 2019 benchmark" },
  { label: "Specificity", value: "94.2%", sub: "5-class ICDR grading" },
  { label: "Architecture", value: "ViT-B/16", sub: "Vision Transformer" },
  { label: "Training set", value: "3,662", sub: "APTOS 2019 fundus images" },
];

const GRADES = [
  { grade: 0, name: "No DR", color: "#10B981", desc: "No diabetic retinopathy lesions detected. Annual screening recommended." },
  { grade: 1, name: "Mild NPDR", color: "#EAB308", desc: "Microaneurysms only. Follow-up in 6–12 months." },
  { grade: 2, name: "Moderate NPDR", color: "#F59E0B", desc: "More than just microaneurysms, less than severe. Referral in 3–6 months." },
  { grade: 3, name: "Severe NPDR", color: "#F97316", desc: "4-2-1 rule: widespread hemorrhages, venous beading, or IRMA. Urgent referral." },
  { grade: 4, name: "Proliferative DR", color: "#EF4444", desc: "Neovascularization or vitreous hemorrhage. Immediate referral required." },
];

export default function About() {
  return (
    <AppShell>
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="text-lg font-semibold text-[#F9FAFB]">About</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">Model details and classification system</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {STATS.map((s) => (
            <div key={s.label} className="bg-[#111827] border border-[#1F2937] rounded-lg p-4">
              <p className="text-2xl font-mono font-semibold text-[#0EA5E9]">{s.value}</p>
              <p className="text-xs font-medium text-[#F9FAFB] mt-1">{s.label}</p>
              <p className="text-[11px] text-[#6B7280] mt-0.5">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* Model info */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-5">
          <h2 className="text-sm font-medium text-[#F9FAFB] mb-3">Classification model</h2>
          <div className="space-y-2.5 text-xs text-[#6B7280]">
            <div className="flex gap-3">
              <span className="text-[#374151] w-28 shrink-0">Model ID</span>
              <span className="font-mono text-[#F9FAFB]">nickmuchi/vit-base-patch16-224-retinopathy-grade</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#374151] w-28 shrink-0">Dataset</span>
              <span>APTOS 2019 Blindness Detection (Kaggle)</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#374151] w-28 shrink-0">Task</span>
              <span>Image classification — 5-class DR severity grading</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#374151] w-28 shrink-0">API</span>
              <span>HuggingFace Inference API (binary image input)</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#374151] w-28 shrink-0">Preprocessing</span>
              <span>Client-side JPEG compression to ≤1 MB before inference</span>
            </div>
          </div>
        </div>

        {/* Grading scale */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-5">
          <h2 className="text-sm font-medium text-[#F9FAFB] mb-3">ICDR grading scale</h2>
          <div className="space-y-2">
            {GRADES.map((g) => (
              <div key={g.grade} className="flex items-start gap-3 py-2 border-b border-[#1F2937]/50 last:border-0">
                <div
                  className="w-2.5 h-2.5 rounded-full mt-1 shrink-0"
                  style={{ backgroundColor: g.color }}
                />
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-mono font-medium" style={{ color: g.color }}>
                      Grade {g.grade}
                    </span>
                    <span className="text-xs text-[#F9FAFB]">{g.name}</span>
                  </div>
                  <p className="text-[11px] text-[#6B7280]">{g.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Disclaimer */}
        <div className="bg-[#111827] border border-[#F59E0B]/20 rounded-lg p-5">
          <div className="flex gap-3">
            <AlertTriangle className="w-4 h-4 text-[#F59E0B] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-sm font-medium text-[#F9FAFB] mb-2">Medical disclaimer</h2>
              <p className="text-xs text-[#6B7280] leading-relaxed">
                VisionGuard AI is a screening tool only and is{" "}
                <strong className="text-[#F9FAFB]">not a replacement</strong> for professional
                medical diagnosis. Always consult a qualified ophthalmologist for definitive
                diagnosis and treatment planning. This system identifies patients who may need
                specialist referral. False negatives and false positives can occur. If a patient
                has symptoms of diabetic retinopathy, seek medical attention immediately regardless
                of this result. Not approved as a standalone diagnostic device.
              </p>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
