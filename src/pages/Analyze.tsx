import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { analyzeRetinalImage, type AnalysisResult } from "@/lib/analyze";
import { saveScan } from "@/lib/supabase";
import AppShell from "@/components/layout/AppShell";
import SeverityBadge from "@/components/SeverityBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, X, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

type Step = "idle" | "compress" | "classify" | "report" | "done" | "error";

const STEP_LABELS: Partial<Record<Step, string>> = {
  compress: "Preprocessing image...",
  classify: "Running DR classification...",
  report:   "Generating report...",
};

const GRADE_COLOR: Record<number, string> = {
  0: "#16A34A",
  1: "#D97706",
  2: "#B45309",
  3: "#C2410C",
  4: "#DC2626",
};

export default function Analyze() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile]       = useState<File | null>(null);
  const [step, setStep]       = useState<Step>("idle");
  const [result, setResult]   = useState<AnalysisResult | null>(null);
  const [patientId, setPatientId] = useState("");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);
  const qc = useQueryClient();

  const onDrop = useCallback(async (accepted: File[]) => {
    const f = accepted[0];
    if (!f) return;

    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target?.result as string);
    reader.readAsDataURL(f);

    setFile(f);
    setResult(null);
    setSaved(false);
    setPatientId("");
    setStep("compress");

    try {
      await new Promise((r) => setTimeout(r, 500));
      setStep("classify");
      const res = await analyzeRetinalImage(f);
      setStep("report");
      await new Promise((r) => setTimeout(r, 400));
      setResult(res);
      setStep("done");
    } catch (err: unknown) {
      setStep("error");
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/jpeg": [], "image/png": [], "image/tiff": [] },
    maxFiles: 1,
    disabled: step !== "idle" && step !== "done" && step !== "error",
  });

  const handleSave = async () => {
    if (!result || !preview) return;
    setSaving(true);
    try {
      await saveScan(patientId, preview, result);
      setSaved(true);
      qc.invalidateQueries({ queryKey: ["scans"] });
      toast.success("Scan saved to history");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const reset = () => {
    setPreview(null);
    setFile(null);
    setStep("idle");
    setResult(null);
    setPatientId("");
    setSaved(false);
  };

  const analyzing = step === "compress" || step === "classify" || step === "report";
  const accentColor = result ? GRADE_COLOR[result.grade] : "#2563EB";

  return (
    <AppShell>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-base font-semibold text-[#0F172A]">Analyze</h1>
          <p className="text-xs text-[#64748B] mt-0.5">
            Upload a fundus photograph for diabetic retinopathy screening
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: upload / preview */}
          <div className="space-y-3">
            {!preview ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                  isDragActive
                    ? "border-[#2563EB] bg-[#EFF6FF]"
                    : "border-[#E2E8F0] hover:border-[#BFDBFE] bg-white"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center py-14 px-6 text-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
                    <Upload className="w-5 h-5 text-[#2563EB]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {isDragActive ? "Drop to analyze" : "Drop fundus image here"}
                    </p>
                    <p className="text-xs text-[#64748B] mt-1">or click to browse</p>
                  </div>
                  <p className="text-[11px] text-[#CBD5E1]">JPG · PNG · TIFF · Max 20 MB</p>
                </div>
              </div>
            ) : (
              <div className="relative bg-[#0F172A] rounded-lg overflow-hidden border border-[#E2E8F0]">
                <img
                  src={preview}
                  alt="Fundus"
                  className="w-full h-auto object-contain max-h-[400px]"
                />
                {result && (
                  <div className="absolute top-3 left-3">
                    <SeverityBadge grade={result.grade} size="md" />
                  </div>
                )}
                {!analyzing && (
                  <button
                    onClick={reset}
                    className="absolute top-3 right-3 w-7 h-7 rounded bg-black/40 hover:bg-black/70 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {file && (
              <p className="text-[11px] text-[#94A3B8]">
                {file.name} · {(file.size / 1024 / 1024).toFixed(1)} MB
              </p>
            )}
          </div>

          {/* Right: processing / results */}
          <div>
            <AnimatePresence mode="wait">
              {analyzing && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.2 }}
                  className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden"
                >
                  <div className="scan-container h-40 relative">
                    <div className="scan-line" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-16 h-16 rounded-full border border-[#BFDBFE] flex items-center justify-center">
                        <div className="w-8 h-8 rounded-full border border-[#DBEAFE]" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-2.5">
                    {(["compress", "classify", "report"] as Step[]).map((s) => {
                      const stepOrder = ["compress", "classify", "report"];
                      const currentIdx = stepOrder.indexOf(step);
                      const thisIdx    = stepOrder.indexOf(s);
                      const isDone   = thisIdx < currentIdx;
                      const isActive = thisIdx === currentIdx;
                      return (
                        <div key={s} className="flex items-center gap-3">
                          <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            isDone   ? "border-[#16A34A] bg-[#F0FDF4]" :
                            isActive ? "border-[#2563EB] bg-[#EFF6FF]" :
                                       "border-[#E2E8F0] bg-white"
                          }`}>
                            {isDone   && <div className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />}
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse" />}
                          </div>
                          <span className={`text-xs ${isActive ? "text-[#0F172A]" : "text-[#94A3B8]"}`}>
                            {STEP_LABELS[s]}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {result && step === "done" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ duration: 0.25 }}
                  className="bg-white border border-[#E2E8F0] rounded-lg p-5 space-y-4"
                >
                  <div>
                    <p className="text-[11px] text-[#64748B] uppercase tracking-wider mb-2">Result</p>
                    <div className="flex items-center gap-3">
                      <SeverityBadge grade={result.grade} size="md" />
                      <span className="text-2xl font-mono font-semibold" style={{ color: accentColor }}>
                        {result.confidence}%
                      </span>
                    </div>
                  </div>

                  <ConfidenceBar value={result.confidence} grade={result.grade} />

                  {/* Raw scores */}
                  <div>
                    <p className="text-[11px] text-[#64748B] uppercase tracking-wider mb-2">Class scores</p>
                    <div className="space-y-1.5">
                      {Object.entries(result.rawScores)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, score], i) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="text-[10px] text-[#64748B] w-28 shrink-0 truncate">{label}</span>
                            <div className="flex-1 h-1 bg-[#F1F5F9] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{ width: `${Math.round(score * 100)}%`, backgroundColor: i === 0 ? accentColor : "#CBD5E1" }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-[#64748B] w-8 text-right">
                              {Math.round(score * 100)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div
                    className="p-3 rounded border-l-2 text-xs text-[#0F172A]"
                    style={{ borderColor: accentColor, backgroundColor: `${accentColor}08` }}
                  >
                    {result.recommendation}
                  </div>

                  <p className="text-[11px] text-[#CBD5E1]">
                    Processing time: {(result.processingTime / 1000).toFixed(1)}s
                  </p>

                  {!saved ? (
                    <div className="space-y-2 pt-1">
                      <Input
                        placeholder="Patient ID (optional)"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="h-8 text-sm bg-white border-[#E2E8F0] text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:ring-[#2563EB]"
                      />
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        className="w-full h-8 text-xs bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0 gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? "Saving..." : "Save to history"}
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="flex-1 text-xs text-[#16A34A]">Saved to history</span>
                      <Button
                        onClick={reset}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-[#64748B] hover:text-[#0F172A] gap-1.5"
                      >
                        <RotateCcw className="w-3 h-3" />
                        New scan
                      </Button>
                    </div>
                  )}
                </motion.div>
              )}

              {step === "error" && (
                <motion.div
                  key="error"
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white border border-[#FECACA] rounded-lg p-5"
                >
                  <p className="text-sm font-medium text-[#DC2626] mb-1">Analysis failed</p>
                  <p className="text-xs text-[#64748B] mb-4">
                    Check your HuggingFace API key or try a different image.
                  </p>
                  <Button
                    onClick={reset}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-[#E2E8F0] text-[#64748B]"
                  >
                    Try again
                  </Button>
                </motion.div>
              )}

              {step === "idle" && !preview && (
                <motion.div
                  key="hint"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white border border-[#E2E8F0] rounded-lg p-5 h-full min-h-[200px] flex flex-col justify-between"
                >
                  <div>
                    <p className="text-[11px] text-[#64748B] uppercase tracking-wider mb-3">How it works</p>
                    <ol className="space-y-2">
                      {[
                        "Drop a fundus photograph",
                        "Image is compressed client-side to ≤1 MB",
                        "DR classification model runs inference",
                        "Grade 0–4 result with confidence score",
                        "Save with patient ID to history",
                      ].map((s, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-[11px] font-mono text-[#2563EB] w-4 shrink-0 mt-0.5">{i + 1}.</span>
                          <span className="text-xs text-[#64748B]">{s}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  <p className="mt-4 pt-4 border-t border-[#E2E8F0] text-[11px] text-[#CBD5E1]">
                    Model: ViT-base · APTOS 2019 · 5-class ICDR grading
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border border-[#E2E8F0] rounded-lg p-4 bg-white">
          <p className="text-[11px] text-[#94A3B8] leading-relaxed">
            <span className="font-medium text-[#64748B]">Screening tool only.</span>{" "}
            Not a substitute for professional medical diagnosis. Always consult a qualified
            ophthalmologist. False positives and negatives can occur.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
