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

const STEP_LABELS: Record<Step, string> = {
  idle: "",
  compress: "Preprocessing image...",
  classify: "Running DR classification...",
  report: "Generating report...",
  done: "",
  error: "",
};

const GRADE_COLOR: Record<number, string> = {
  0: "#10B981",
  1: "#EAB308",
  2: "#F59E0B",
  3: "#F97316",
  4: "#EF4444",
};

export default function Analyze() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<Step>("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [patientId, setPatientId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const qc = useQueryClient();

  const onDrop = useCallback(
    async (accepted: File[]) => {
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
        // Step 1: compress (happens inside analyzeRetinalImage)
        await new Promise((r) => setTimeout(r, 600));
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
    },
    [],
  );

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
  const accentColor = result ? GRADE_COLOR[result.grade] : "#0EA5E9";

  return (
    <AppShell>
      <div className="p-6 space-y-4">
        <div>
          <h1 className="text-lg font-semibold text-[#F9FAFB]">Analyze</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            Upload a fundus photograph for diabetic retinopathy screening
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-4">
          {/* Left: upload / preview */}
          <div className="space-y-4">
            {!preview ? (
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg transition-colors cursor-pointer ${
                  isDragActive
                    ? "border-[#0EA5E9] bg-[#0EA5E9]/5"
                    : "border-[#1F2937] hover:border-[#0EA5E9]/50 bg-[#111827]"
                }`}
              >
                <input {...getInputProps()} />
                <div className="flex flex-col items-center justify-center py-16 px-6 text-center gap-4">
                  <div className="w-14 h-14 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 flex items-center justify-center">
                    <Upload className="w-6 h-6 text-[#0EA5E9]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-[#F9FAFB]">
                      {isDragActive ? "Drop to analyze" : "Drop fundus image here"}
                    </p>
                    <p className="text-xs text-[#6B7280] mt-1">or click to browse</p>
                  </div>
                  <p className="text-[11px] text-[#374151]">
                    JPG · PNG · TIFF · Max 20 MB · Compressed to ≤1 MB before upload
                  </p>
                </div>
              </div>
            ) : (
              <div className="relative bg-[#060910] rounded-lg overflow-hidden border border-[#1F2937]">
                <img
                  src={preview}
                  alt="Fundus"
                  className="w-full h-auto object-contain max-h-[420px]"
                />
                {result && (
                  <div className="absolute top-3 left-3">
                    <SeverityBadge grade={result.grade} size="md" />
                  </div>
                )}
                {!analyzing && (
                  <button
                    onClick={reset}
                    className="absolute top-3 right-3 w-7 h-7 rounded bg-black/50 hover:bg-black/80 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {file && (
              <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                <span className="font-mono">{file.name}</span>
                <span>·</span>
                <span>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
              </div>
            )}
          </div>

          {/* Right: processing / results */}
          <div>
            <AnimatePresence mode="wait">
              {analyzing && (
                <motion.div
                  key="processing"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                  className="bg-[#111827] border border-[#1F2937] rounded-lg overflow-hidden"
                >
                  {/* Retinal scan animation */}
                  <div className="scan-container h-48 relative">
                    <div className="scan-line" />
                    <div className="scan-crosshair" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-20 h-20 rounded-full border border-[#0EA5E9]/20 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full border border-[#0EA5E9]/30" />
                        <div className="absolute w-3 h-3 rounded-full bg-[#0EA5E9]/40" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    {(["compress", "classify", "report"] as Step[]).map((s) => (
                      <div key={s} className="flex items-center gap-3">
                        <div
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
                            step === s
                              ? "border-[#0EA5E9] bg-[#0EA5E9]/20"
                              : ["done"].includes(step) ||
                                (step === "report" && s === "compress") ||
                                (step === "report" && s === "classify") ||
                                (step === "classify" && s === "compress")
                              ? "border-[#10B981] bg-[#10B981]/10"
                              : "border-[#1F2937]"
                          }`}
                        >
                          {((step === "classify" && s === "compress") ||
                            (step === "report" && (s === "compress" || s === "classify"))) && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                          )}
                          {step === s && (
                            <div className="w-1.5 h-1.5 rounded-full bg-[#0EA5E9] animate-pulse" />
                          )}
                        </div>
                        <span
                          className={`text-xs ${
                            step === s ? "text-[#F9FAFB]" : "text-[#6B7280]"
                          }`}
                        >
                          {STEP_LABELS[s]}
                        </span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}

              {result && step === "done" && (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3 }}
                  className="bg-[#111827] border border-[#1F2937] rounded-lg p-5 space-y-5"
                >
                  <div>
                    <p className="text-[11px] text-[#6B7280] uppercase tracking-wider mb-2">
                      Classification result
                    </p>
                    <div className="flex items-center gap-3">
                      <SeverityBadge grade={result.grade} size="md" />
                      <span
                        className="text-2xl font-mono font-semibold"
                        style={{ color: accentColor }}
                      >
                        {result.confidence}%
                      </span>
                    </div>
                  </div>

                  <ConfidenceBar value={result.confidence} grade={result.grade} />

                  {/* Raw scores */}
                  <div>
                    <p className="text-[11px] text-[#6B7280] uppercase tracking-wider mb-2">
                      Class scores
                    </p>
                    <div className="space-y-1.5">
                      {Object.entries(result.rawScores)
                        .sort((a, b) => b[1] - a[1])
                        .map(([label, score], i) => (
                          <div key={label} className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-[#6B7280] w-28 shrink-0 truncate">
                              {label}
                            </span>
                            <div className="flex-1 h-1 bg-[#1F2937] rounded-full overflow-hidden">
                              <div
                                className="h-full rounded-full"
                                style={{
                                  width: `${Math.round(score * 100)}%`,
                                  backgroundColor: i === 0 ? accentColor : "#374151",
                                }}
                              />
                            </div>
                            <span className="text-[10px] font-mono text-[#6B7280] w-8 text-right">
                              {Math.round(score * 100)}%
                            </span>
                          </div>
                        ))}
                    </div>
                  </div>

                  {/* Recommendation */}
                  <div
                    className="p-3 rounded border-l-2 text-xs"
                    style={{
                      borderColor: accentColor,
                      backgroundColor: `${accentColor}08`,
                      color: "#F9FAFB",
                    }}
                  >
                    {result.recommendation}
                  </div>

                  <div className="text-[11px] text-[#374151] font-mono">
                    Processing time: {(result.processingTime / 1000).toFixed(1)}s
                  </div>

                  {/* Save */}
                  {!saved ? (
                    <div className="pt-1 space-y-2">
                      <Input
                        placeholder="Patient ID (optional)"
                        value={patientId}
                        onChange={(e) => setPatientId(e.target.value)}
                        className="h-8 text-sm bg-[#0A0E1A] border-[#1F2937] text-[#F9FAFB] placeholder-[#374151] focus:border-[#0EA5E9]"
                      />
                      <Button
                        onClick={handleSave}
                        disabled={saving}
                        size="sm"
                        className="w-full h-8 text-xs bg-[#0EA5E9] hover:bg-[#0284C7] text-white border-0 gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        {saving ? "Saving..." : "Save to history"}
                      </Button>
                    </div>
                  ) : (
                    <div className="pt-1 flex items-center gap-2">
                      <div className="flex-1 text-xs text-[#10B981]">Saved to history</div>
                      <Button
                        onClick={reset}
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs text-[#6B7280] hover:text-[#F9FAFB] gap-1.5"
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
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-[#111827] border border-[#EF4444]/20 rounded-lg p-5"
                >
                  <p className="text-sm font-medium text-[#EF4444] mb-1">Analysis failed</p>
                  <p className="text-xs text-[#6B7280] mb-4">
                    Check your HuggingFace API key or try a different image.
                  </p>
                  <Button
                    onClick={reset}
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs border-[#1F2937] text-[#6B7280] hover:text-[#F9FAFB]"
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
                  className="bg-[#111827] border border-[#1F2937] rounded-lg p-5 h-full min-h-[200px] flex flex-col justify-between"
                >
                  <div>
                    <p className="text-xs text-[#6B7280] uppercase tracking-wider mb-3">
                      How it works
                    </p>
                    <ol className="space-y-2.5">
                      {[
                        "Drop a fundus photograph",
                        "Image is compressed client-side to ≤1 MB",
                        "DR classification model runs inference",
                        "Grade 0–4 result with confidence score",
                        "Save with patient ID to history",
                      ].map((step, i) => (
                        <li key={i} className="flex items-start gap-2.5">
                          <span className="text-[11px] font-mono text-[#0EA5E9] w-4 shrink-0 mt-0.5">
                            {i + 1}.
                          </span>
                          <span className="text-xs text-[#6B7280]">{step}</span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="mt-4 pt-4 border-t border-[#1F2937]">
                    <p className="text-[11px] text-[#374151]">
                      Model: ViT-base trained on APTOS 2019 · 5-class ICDR grading
                    </p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border border-[#1F2937] rounded-lg p-4 bg-[#111827]/50">
          <p className="text-[11px] text-[#374151] leading-relaxed">
            <span className="text-[#6B7280]">Screening tool only.</span> This AI analysis is not a
            substitute for professional medical diagnosis. Always consult a qualified ophthalmologist.
            False positives and negatives can occur.
          </p>
        </div>
      </div>
    </AppShell>
  );
}
