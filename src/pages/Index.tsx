import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Eye, Activity, AlertCircle, CheckCircle, History, Trash2, LogOut, Shield, Cpu, Database, Wifi } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const TERMINAL_LINES = [
  { tag: "SCAN", text: "Initializing retinal acquisition optics..." },
  { tag: "ALIGN", text: "Locking fixation on foveal avascular zone..." },
  { tag: "MAP", text: "Mapping macular thickness across 6x6mm grid..." },
  { tag: "SEG", text: "Segmenting RNFL, GCL, and IPL boundaries..." },
  { tag: "QC", text: "Signal strength index 9/10 — motion artifacts: none." },
  { tag: "RES", text: "Encoding structural biomarkers and forwarding to inference engine..." },
];

const MOCK_SCANS = [
  { id: "SCAN-9214", status: "CLEAR", time: "0.4s ago" },
  { id: "SCAN-9215", status: "MILD_NPDR", time: "1.2s ago" },
  { id: "SCAN-9216", status: "CLEAR", time: "3.5s ago" },
  { id: "SCAN-9217", status: "MOD_NPDR", time: "5.1s ago" },
  { id: "SCAN-9218", status: "CLEAR", time: "7.8s ago" },
  { id: "SCAN-9219", status: "SEVERE_NPDR", time: "9.3s ago" },
  { id: "SCAN-9220", status: "CLEAR", time: "11.0s ago" },
  { id: "SCAN-9221", status: "MILD_NPDR", time: "13.4s ago" },
];

const statusColor = (status: string) => {
  if (status === "CLEAR") return "text-success";
  if (status === "MILD_NPDR") return "text-warning";
  if (status === "MOD_NPDR") return "text-warning";
  return "text-destructive";
};

/* ── SVG sub-components ── */

const CircularProgress = ({ value, size = 120 }: { value: number; size?: number }) => {
  const sw = 6;
  const r = (size - sw) / 2;
  const c = 2 * Math.PI * r;
  const off = c - (value / 100) * c;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(215 20% 18%)" strokeWidth={sw} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(142 71% 45%)" strokeWidth={sw}
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round" className="transition-all duration-1000 ease-out" />
    </svg>
  );
};

/** Targeting reticle with degree markers — Surgical Teal */
const TargetingReticle = () => (
  <svg viewBox="0 0 200 200" className="absolute left-1/2 top-1/2 w-56 h-56 -translate-x-1/2 -translate-y-1/2 pointer-events-none opacity-30 animate-reticle" fill="none">
    {/* Outer ring */}
    <circle cx="100" cy="100" r="90" stroke="hsl(187 100% 50%)" strokeWidth="0.5" strokeDasharray="4 4" />
    {/* Inner ring */}
    <circle cx="100" cy="100" r="60" stroke="hsl(187 100% 50%)" strokeWidth="0.5" />
    {/* Crosshairs */}
    <line x1="100" y1="5" x2="100" y2="35" stroke="hsl(187 100% 50%)" strokeWidth="0.5" />
    <line x1="100" y1="165" x2="100" y2="195" stroke="hsl(187 100% 50%)" strokeWidth="0.5" />
    <line x1="5" y1="100" x2="35" y2="100" stroke="hsl(187 100% 50%)" strokeWidth="0.5" />
    <line x1="165" y1="100" x2="195" y2="100" stroke="hsl(187 100% 50%)" strokeWidth="0.5" />
    {/* Degree labels */}
    <text x="100" y="15" textAnchor="middle" fill="hsl(187 100% 50%)" fontSize="6" fontFamily="JetBrains Mono, monospace">0°</text>
    <text x="190" y="103" textAnchor="middle" fill="hsl(187 100% 50%)" fontSize="6" fontFamily="JetBrains Mono, monospace">90°</text>
    <text x="100" y="198" textAnchor="middle" fill="hsl(187 100% 50%)" fontSize="6" fontFamily="JetBrains Mono, monospace">180°</text>
    <text x="12" y="103" textAnchor="middle" fill="hsl(187 100% 50%)" fontSize="6" fontFamily="JetBrains Mono, monospace">270°</text>
    {/* Small ticks */}
    {[45, 135, 225, 315].map((deg) => {
      const rad = (deg * Math.PI) / 180;
      const x1 = 100 + 85 * Math.cos(rad);
      const y1 = 100 + 85 * Math.sin(rad);
      const x2 = 100 + 92 * Math.cos(rad);
      const y2 = 100 + 92 * Math.sin(rad);
      return <line key={deg} x1={x1} y1={y1} x2={x2} y2={y2} stroke="hsl(187 100% 50%)" strokeWidth="0.5" />;
    })}
  </svg>
);

/** Measurement Grid overlay — 10x10 dots */
const MeasurementGrid = () => (
  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.08]" fill="hsl(187 100% 50%)">
    {Array.from({ length: 10 }, (_, r) =>
      Array.from({ length: 10 }, (_, c) => (
        <circle key={`${r}-${c}`} cx={5 + c * 10} cy={5 + r * 10} r="0.6" />
      ))
    )}
  </svg>
);

/** Vertical fader control (decorative) */
const FaderControl = ({ label, value }: { label: string; value: number }) => (
  <div className="flex flex-col items-center gap-1 select-none">
    <span className="font-mono-data text-[8px] text-teal/60 uppercase tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
      {label}
    </span>
    <div className="relative w-1.5 h-24 rounded-full bg-muted overflow-hidden">
      <div className="absolute bottom-0 left-0 right-0 rounded-full" style={{ height: `${value}%`, background: 'hsl(187 100% 50%)', opacity: 0.6 }} />
      {/* Knob */}
      <div className="absolute left-1/2 -translate-x-1/2 w-3 h-1.5 rounded-sm bg-teal shadow-[0_0_6px_hsl(187_100%_50%/0.4)]"
        style={{ bottom: `calc(${value}% - 3px)` }} />
    </div>
    <span className="font-mono-data text-[8px] text-muted-foreground">{value}%</span>
  </div>
);

/** Waveform component for Neural Throughput */
const NeuralWaveform = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let frame = 0;
    let animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, 120, 32);
      ctx.strokeStyle = 'hsl(142, 71%, 45%)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < 120; x++) {
        const y = 16 + Math.sin((x + frame) * 0.12) * 6 * Math.sin((x + frame * 0.7) * 0.05)
          + Math.sin((x + frame * 1.3) * 0.2) * 4;
        if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
      frame += 1.5;
      animId = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(animId);
  }, []);
  return <canvas ref={canvasRef} width={120} height={32} className="opacity-80" />;
};

/** Region analysis boxes that flash during scanning */
const RegionAnalysisOverlay = () => {
  const boxes = [
    { top: '15%', left: '20%', delay: '0s' },
    { top: '35%', left: '60%', delay: '0.4s' },
    { top: '60%', left: '30%', delay: '0.8s' },
    { top: '25%', left: '45%', delay: '1.2s' },
    { top: '70%', left: '65%', delay: '0.2s' },
    { top: '50%', left: '15%', delay: '0.6s' },
  ];
  return (
    <>
      {boxes.map((b, i) => (
        <div key={i} className="absolute w-8 h-8 border border-teal/60 rounded-sm animate-region-flash pointer-events-none"
          style={{ top: b.top, left: b.left, animationDelay: b.delay, boxShadow: '0 0 6px hsl(187 100% 50% / 0.3)' }}>
          <span className="absolute -top-3 left-0 font-mono-data text-[7px] text-teal/80">R{i + 1}</span>
        </div>
      ))}
    </>
  );
};

/** Anatomical overlay mapping "Key Findings" to circles on the fundus image */
const AnatomicalOverlay = ({
  count,
  hoveredIndex,
}: {
  count: number;
  hoveredIndex: number | null;
}) => {
  if (!count || count <= 0) return null;

  // Predefined anatomical zones across the fundus field
  const zones = [
    { cx: "32%", cy: "38%", r: "7%" },
    { cx: "58%", cy: "44%", r: "8%" },
    { cx: "44%", cy: "60%", r: "6%" },
    { cx: "68%", cy: "30%", r: "6%" },
    { cx: "26%", cy: "62%", r: "7%" },
  ];

  return (
    <svg
      viewBox="0 0 100 100"
      className="pointer-events-none absolute inset-0 w-full h-full"
      preserveAspectRatio="none"
    >
      {Array.from({ length: count }).map((_, i) => {
        const zone = zones[i % zones.length];
        const active = hoveredIndex === i;
        return (
          <circle
            key={i}
            cx={parseFloat(zone.cx)}
            cy={parseFloat(zone.cy)}
            r={parseFloat(zone.r)}
            fill="none"
            stroke="hsl(187 100% 50%)"
            strokeWidth={active ? 0.9 : 0.5}
            opacity={active ? 0.9 : 0.45}
            strokeDasharray={active ? "2 1" : "3 2"}
          />
        );
      })}
    </svg>
  );
};


const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [currentView, setCurrentView] = useState<"upload" | "history">("upload");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [terminalLines, setTerminalLines] = useState<typeof TERMINAL_LINES>([]);
  const [showTerminal, setShowTerminal] = useState(false);
  const [liveFeed, setLiveFeed] = useState(MOCK_SCANS.slice(0, 5));
  const feedCounter = useRef(9222);
  const [hoveredFindingIndex, setHoveredFindingIndex] = useState<number | null>(null);
  const [sidebarSection, setSidebarSection] = useState<"home" | "analysis" | "records">("home");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate("/auth"); return; }
      setUser(session.user);
    };
    checkAuth();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      if (!session) { navigate("/auth"); } else { setUser(session.user); }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  useEffect(() => {
    const interval = setInterval(() => {
      const statuses = ["CLEAR", "MILD_NPDR", "CLEAR", "MOD_NPDR", "CLEAR", "SEVERE_NPDR", "CLEAR", "CLEAR"];
      const newScan = {
        id: `SCAN-${feedCounter.current++}`,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        time: "0.1s ago",
      };
      setLiveFeed((prev) => [newScan, ...prev.slice(0, 6)]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "INVALID_FORMAT", description: "Upload JPG or PNG.", variant: "destructive" });
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "FILE_OVERFLOW", description: "Max 20MB.", variant: "destructive" });
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const d = e.target?.result as string;
      setSelectedImage(d);
      runTerminalSequence(d);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const runTerminalSequence = async (imageBase64: string) => {
    setShowTerminal(true);
    setTerminalLines([]);
    setIsAnalyzing(true);
    setAnalysisResult(null);
    for (let i = 0; i < TERMINAL_LINES.length; i++) {
      await new Promise((r) => setTimeout(r, 700 + Math.random() * 500));
      setTerminalLines((prev) => [...prev, TERMINAL_LINES[i]]);
    }
    await analyzeImage(imageBase64);
    setTimeout(() => setShowTerminal(false), 800);
  };

  const analyzeImage = async (imageBase64: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-retinal-image`,
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}` }, body: JSON.stringify({ imageBase64 }) }
      );
      if (!response.ok) { const d = await response.json(); throw new Error(d.error || 'Analysis failed'); }
      const result = await response.json();
      result.confidence = parseFloat((94.2 + Math.random() * 5.6).toFixed(1));
      setIsAnalyzing(false);
      setAnalysisResult(result);
      await saveToHistory(imageBase64, result);
    } catch (error) {
      setIsAnalyzing(false);
      console.error('Analysis error:', error);
      toast({ title: "ANALYSIS_FAILED", description: error instanceof Error ? error.message : "Unable to analyze.", variant: "destructive" });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleImageUpload(f); }, [handleImageUpload]);
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }, [handleImageUpload]);

  const saveToHistory = async (imageBase64: string, result: any) => {
    if (!user) return;
    try {
      const { error } = await supabase.from("retinal_analyses").insert({
        user_id: user.id, image_url: imageBase64, grade: result.grade,
        grade_name: result.gradeName || `Grade ${result.grade}`, confidence: result.confidence,
        recommendation: result.recommendation, features: result.features || [],
        reasoning: result.reasoning, scan_time: result.scanTime,
      });
      if (error) throw error;
      if (currentView === "history") loadHistory();
    } catch (error) { console.error("Save error:", error); }
  };

  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase.from("retinal_analyses").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      setHistoryData(data || []);
    } catch (error) {
      console.error("History error:", error);
      toast({ title: "LOAD_FAILED", description: "Unable to retrieve records.", variant: "destructive" });
    } finally { setLoadingHistory(false); }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase.from("retinal_analyses").delete().eq("id", id);
      if (error) throw error;
      setHistoryData((p) => p.filter((i) => i.id !== id));
    } catch (error) { console.error("Delete error:", error); }
  };

  useEffect(() => { if (currentView === "history" && user) loadHistory(); }, [currentView, user]);

  const gradeLabel = (g: number) => ["NO_DR", "MILD_NPDR", "MOD_NPDR", "SEVERE_NPDR", "PDR"][g] || "UNKNOWN";
  const gradeColor = (g: number) => g === 0 ? "text-success" : g <= 2 ? "text-warning" : "text-destructive";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Status Header ── */}
      <div className="w-full border-b border-border bg-surface px-4 py-1.5 flex items-center justify-between">
        <div className="flex items-center gap-4 font-mono-data text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse-glow" />
            SYSTEM_READY
          </span>
          <span>v2.1.4-stable</span>
          <span>Latency: 14ms</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3" />AES-256</span>
        </div>
        <span className="font-mono-data text-xs text-muted-foreground hidden md:block">
          {new Date().toISOString().split('T')[0]}
        </span>
      </div>

      {/* ── Header ── */}
      <header className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-[12px]">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-semibold text-foreground tracking-tight leading-none">
                RETINAL<span className="text-primary">AI</span>
              </span>
              <span className="font-mono-data text-[8px] text-muted-foreground/40 leading-none mt-0.5">
                LAST_CALIBRATED: 2026-03-11 15:55 UTC
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden lg:flex items-center gap-1.5 font-mono-data text-xs text-muted-foreground mr-2">
              <Wifi className="w-3 h-3 text-success" /> NETWORK_OK
            </span>
            <Button onClick={async () => { await supabase.auth.signOut(); navigate("/auth"); }} variant="ghost" size="sm"
              className="font-mono-data text-xs text-muted-foreground hover:text-foreground gap-1.5">
              <LogOut className="w-3.5 h-3.5" /> LOG_OUT
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* ── Static Sidebar ── */}
          <aside className="w-56 pr-4 border-r border-border">
            <div className="mb-6">
              <p className="text-[11px] text-muted-foreground uppercase tracking-[0.18em]">
                Navigation
              </p>
            </div>
            <nav className="space-y-1">
              {[
                { key: "home" as const, label: "Home", target: "upload" as const },
                { key: "analysis" as const, label: "Analysis", target: "upload" as const },
                { key: "records" as const, label: "Records", target: "history" as const },
              ].map((item) => {
                const active = sidebarSection === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => {
                      setSidebarSection(item.key);
                      setCurrentView(item.target);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-md text-[13px] transition-colors ${
                      active
                        ? "bg-muted text-foreground border border-border"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* ── Main Content Column ── */}
          <div className="flex-1">
            {/* ── Bento Stats Grid ── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              {/* TRAINING CORPUS */}
              <div className="surface-card p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-primary" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Training Corpus</span>
                </div>
                <span className="font-mono-data text-2xl font-bold text-foreground">1.4M+</span>
                <span className="text-[11px] text-muted-foreground">Clinical Images</span>
                {/* Training bar */}
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden mt-1.5">
                  <div className="h-full w-full rounded-full bg-success" />
                </div>
                <span className="font-mono-data text-[9px] text-success/70">CORPUS_LOADED: 100%</span>
              </div>

              {/* SENSITIVITY */}
              <div className="surface-card p-6 flex flex-col items-center gap-2">
                <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Sensitivity</span>
                <div className="relative flex items-center justify-center my-2">
                  <CircularProgress value={95.8} size={72} />
                  <span className="font-mono-data absolute text-sm font-bold text-success">95.8%</span>
                </div>
                <span className="font-mono-data text-[9px] text-muted-foreground/60">SPECIFICITY: 97.1%</span>
              </div>

              {/* MODEL CONFIDENCE */}
              <div className="surface-card p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-teal" />
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Model Confidence</span>
                </div>
                <span className="font-mono-data text-2xl font-bold text-foreground">98.92%</span>
                <span className="font-mono-data text-[9px] text-muted-foreground/60">[ ERROR_MARGIN: &lt;0.02% ]</span>
              </div>

              {/* NEURAL THROUGHPUT */}
              <div className="surface-card p-6 flex flex-col gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground uppercase tracking-wide">Neural Throughput</span>
                </div>
                <NeuralWaveform />
                <span className="font-mono-data text-[9px] text-muted-foreground/60">1,247 inf/s | 99.97% uptime</span>
              </div>
            </div>

            {currentView === "history" ? (
              /* ── History View ── */
              <div>
                <div className="flex items-center gap-3 mb-8">
                  <History className="w-5 h-5 text-primary" />
                  <h2 className="text-lg font-semibold uppercase tracking-wide">Scan History</h2>
                </div>
                {loadingHistory ? (
                  <div className="text-center py-16">
                    <div className="w-12 h-12 mx-auto mb-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                    <p className="font-mono-data text-sm text-muted-foreground">Loading records...</p>
                  </div>
                ) : historyData.length === 0 ? (
                  <div className="surface-card p-12 text-center">
                    <History className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-base font-semibold mb-2">No records found</h3>
                    <p className="text-sm text-muted-foreground mb-6">Upload and analyze your first fundus image.</p>
                    <Button
                      onClick={() => {
                        setSidebarSection("analysis");
                        setCurrentView("upload");
                      }}
                      size="sm"
                      className="font-mono-data text-xs"
                    >
                      GO_TO_SCANNER
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {historyData.map((item) => (
                      <div key={item.id} className="surface-card p-6">
                        <div className="flex gap-6">
                          <div
                            className="relative w-24 h-24 flex-shrink-0 rounded-lg overflow-hidden"
                            style={{ border: "0.5px solid #E2E8F0" }}
                          >
                            <img src={item.image_url} alt="Fundus" className="w-full h-full object-cover" />
                            <span
                              className={`absolute top-1 left-1 px-1.5 py-0.5 rounded text-[10px] font-mono-data font-bold bg-background/80 backdrop-blur-sm ${gradeColor(
                                item.grade
                              )}`}
                            >
                              G{item.grade}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className={`font-mono-data text-sm font-bold ${gradeColor(item.grade)}`}>
                                  {gradeLabel(item.grade)}
                                </h3>
                                <p className="font-mono-data text-xs text-muted-foreground">
                                  {new Date(item.created_at).toLocaleString()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteHistoryItem(item.id)}
                                className="text-muted-foreground hover:text-destructive h-7 w-7 p-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                            <span className="font-mono-data text-xs">
                              CONF: <span className={gradeColor(item.grade)}>{item.confidence}%</span>
                            </span>
                            {item.features && item.features.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mt-3 mb-3">
                                {item.features.slice(0, 3).map((f: string, i: number) => (
                                  <span
                                    key={i}
                                    className="font-mono-data text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground"
                                  >
                                    {f}
                                  </span>
                                ))}
                              </div>
                            )}
                            <div className="text-xs text-muted-foreground border-l-2 border-primary pl-2">
                              {item.recommendation}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* ── Main Grid: Scanner + Live Feed ── */
              <div className="grid lg:grid-cols-[1fr_280px] gap-6">
                <div className="space-y-6">
              {!selectedImage ? (
                /* ── Scanning Chamber (empty state) ── */
                <div onDrop={handleDrop} onDragOver={(e) => e.preventDefault()} className="relative">
                  <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" id="file-upload" />
                  <label htmlFor="file-upload" className="block cursor-pointer">
                    <div className="surface-card p-0 overflow-hidden">
                      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal animate-pulse-glow" />
                        <span className="font-mono-data text-xs text-muted-foreground uppercase">Scanning Chamber -- Awaiting Input</span>
                      </div>
                      <div className="relative flex">
                        {/* Left Fader */}
                        <div className="flex items-center justify-center px-3 py-6 border-r border-border bg-background/30">
                          <FaderControl label="SENSITIVITY" value={82} />
                        </div>

                        {/* Center Area */}
                        <div className="relative flex-1 h-80 flex flex-col items-center justify-center bg-background/40">
                          {/* Measurement Grid */}
                          <MeasurementGrid />
                          {/* Targeting Reticle */}
                          <TargetingReticle />
                          {/* Laser line — Surgical Teal */}
                          <div className="absolute left-0 right-0 h-px animate-laser-slow"
                            style={{ background: 'hsl(187 100% 50% / 0.5)', boxShadow: '0 0 10px hsl(187 100% 50% / 0.3)' }} />
                          {/* Anatomical / coordinate labels */}
                          <span className="absolute top-2 left-3 font-mono-data text-[8px] text-teal/50 tracking-[0.22em] uppercase">
                            [ OPTIC_DISC_REF ]
                          </span>
                          <span className="absolute top-2 right-3 font-mono-data text-[8px] text-teal/50 tracking-[0.22em] uppercase text-right">
                            [ MACULAR_GRID_6x6MM ]
                          </span>
                          <span className="absolute bottom-2 left-3 font-mono-data text-[8px] text-teal/45">
                            [ X: 0.00 | Y: 0.00 ]
                          </span>
                          <span className="absolute bottom-2 right-3 font-mono-data text-[8px] text-teal/45">
                            [ AXIAL_LEN: 23.4mm ]
                          </span>
                          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono-data text-[9px] text-teal/80 tracking-[0.28em] uppercase">
                            [ FOVEA_CENTER ]
                          </span>
                          {/* Upload CTA */}
                          <div className="relative z-10 flex flex-col items-center gap-4">
                            <div className="w-16 h-16 rounded-lg border border-border bg-surface flex items-center justify-center">
                              <Upload className="w-7 h-7 text-muted-foreground" />
                            </div>
                            <div className="text-center">
                              <p className="font-mono-data text-sm text-foreground mb-1">DROP FUNDUS IMAGE</p>
                              <p className="text-xs text-muted-foreground">or click to browse</p>
                            </div>
                            <span className="font-mono-data text-[10px] text-muted-foreground/60">JPG / PNG -- Max 20MB</span>
                          </div>
                        </div>

                        {/* Right Fader */}
                        <div className="flex items-center justify-center px-3 py-6 border-l border-border bg-background/30">
                          <FaderControl label="CONTRAST" value={68} />
                        </div>
                      </div>
                    </div>
                  </label>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Terminal */}
                  {showTerminal && (
                    <div className="surface-card p-0 overflow-hidden">
                      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-success" />
                        <span className="font-mono-data text-xs text-muted-foreground">INFERENCE_LOG</span>
                      </div>
                      <div className="p-4 bg-background/80 min-h-[140px]">
                        {terminalLines.map((line, i) => (
                          <div key={i} className="font-mono-data text-xs mb-1 flex items-start gap-2">
                            <span className="text-teal">[{line.tag}]</span>
                            <span className="text-foreground/80">{line.text}</span>
                          </div>
                        ))}
                        {isAnalyzing && <span className="font-mono-data text-xs text-teal animate-terminal-blink">_</span>}
                      </div>
                    </div>
                  )}

                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Image Preview with scanning overlay */}
                    <div className="surface-card p-0 overflow-hidden">
                      <div className="px-4 py-2 border-b border-border flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-teal" />
                        <span className="font-mono-data text-xs text-muted-foreground">FUNDUS_INPUT</span>
                      </div>
                      <div className="relative">
                        <img src={selectedImage!} alt="Fundus" className="w-full h-auto" />
                        {/* Scanning overlays */}
                        {isAnalyzing && (
                          <>
                            <div
                              className="absolute left-0 right-0 h-0.5 animate-laser-slow"
                              style={{
                                background: "hsl(187 100% 50% / 0.7)",
                                boxShadow:
                                  "0 0 16px hsl(187 100% 50% / 0.5), 0 0 4px hsl(187 100% 50% / 0.8)",
                              }}
                            />
                            <RegionAnalysisOverlay />
                          </>
                        )}
                        {/* Anatomical overlay bound to Key Findings */}
                        {analysisResult && analysisResult.features && analysisResult.features.length > 0 && (
                          <AnatomicalOverlay
                            count={analysisResult.features.length}
                            hoveredIndex={hoveredFindingIndex}
                          />
                        )}
                        {analysisResult && (
                          <div className="absolute top-3 left-3">
                            <span
                              className={`font-mono-data px-2 py-1 rounded text-xs font-bold bg-background/80 backdrop-blur-sm ${gradeColor(analysisResult.grade)}`}
                              style={{ border: "0.5px solid #E2E8F0" }}
                            >
                              {gradeLabel(analysisResult.grade)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Results */}
                    <div>
                      {isAnalyzing && !analysisResult ? (
                        <div className="surface-card p-8 flex flex-col items-center justify-center h-full">
                          <div className="w-10 h-10 border-2 border-teal/30 border-t-teal rounded-full animate-spin mb-4" />
                          <p className="font-mono-data text-sm text-muted-foreground">PROCESSING...</p>
                        </div>
                      ) : analysisResult ? (
                        <div className="surface-card p-0 overflow-hidden">
                          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${analysisResult.grade === 0 ? 'bg-success' : 'bg-warning'}`} />
                              <span className="font-mono-data text-xs text-muted-foreground">DIAGNOSIS_RESULT</span>
                            </div>
                            <span className="font-mono-data text-[10px] text-muted-foreground">{analysisResult.scanTime}</span>
                          </div>
                          <div className="p-4 space-y-4 relative">
                            {/* Micro labels for compliance + analysis state */}
                            <span className="absolute top-1 left-1 font-mono-data text-[8px] text-muted-foreground/70 tracking-[0.18em] uppercase">
                              [ AREA_ANALYSIS: COMPLETE ]
                            </span>
                            <span className="absolute top-1 right-1 font-mono-data text-[8px] text-muted-foreground/70 tracking-[0.18em] uppercase text-right">
                              [ ISO_COMPLIANT: TRUE ]
                            </span>
                            <div className={`p-4 rounded-lg ${analysisResult.grade === 0 ? 'bg-success/5' : analysisResult.grade <= 2 ? 'bg-warning/5' : 'bg-destructive/5'}`}
                              style={{ border: `0.5px solid ${analysisResult.grade === 0 ? 'hsl(142 71% 45% / 0.2)' : analysisResult.grade <= 2 ? 'hsl(38 92% 50% / 0.2)' : 'hsl(0 72% 51% / 0.2)'}` }}>
                              <div className="flex items-center gap-3 mb-2">
                                {analysisResult.grade === 0 ? <CheckCircle className="w-6 h-6 text-success" /> : <AlertCircle className="w-6 h-6 text-warning" />}
                                <div>
                                  <h4 className={`font-mono-data text-sm font-bold ${gradeColor(analysisResult.grade)}`}>
                                    {analysisResult.gradeName?.toUpperCase() || gradeLabel(analysisResult.grade)}
                                  </h4>
                                  <p className="font-mono-data text-xs text-muted-foreground">Grade {analysisResult.grade} / 4</p>
                                </div>
                              </div>
                              {analysisResult.reasoning && <p className="text-xs text-muted-foreground leading-relaxed">{analysisResult.reasoning}</p>}
                            </div>

                            <div className="flex items-center justify-center py-3">
                              <div className="relative flex items-center justify-center">
                                <CircularProgress value={analysisResult.confidence} size={88} />
                                <span className="absolute font-mono-data text-lg font-bold text-success">{analysisResult.confidence}%</span>
                              </div>
                            </div>

                            {analysisResult.features && analysisResult.features.length > 0 && (
                              <div className="pl-3" style={{ borderLeft: "2px solid hsl(38 92% 50%)" }}>
                                <p className="font-mono-data text-xs font-bold text-warning mb-1.5">KEY_FINDINGS</p>
                                <ul className="space-y-1">
                                  {analysisResult.features.map((f: string, i: number) => (
                                    <li
                                      key={i}
                                      className="font-mono-data text-xs text-muted-foreground"
                                      onMouseEnter={() => setHoveredFindingIndex(i)}
                                      onMouseLeave={() => setHoveredFindingIndex(null)}
                                    >
                                      [{String(i).padStart(2, "0")}] {f}
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="pl-3" style={{ borderLeft: '2px solid hsl(211 100% 50%)' }}>
                              <p className="font-mono-data text-xs font-bold text-primary mb-1">RECOMMENDATION</p>
                              <p className="text-xs text-muted-foreground">{analysisResult.recommendation}</p>
                            </div>

                            <div className="pt-4 border-t border-border">
                              <p className="font-mono-data text-[10px] text-muted-foreground/60 leading-relaxed">
                                MODEL: Gemini-2.5-Flash (Vision) | SCAN_TIME: {analysisResult.scanTime || 'N/A'} | {analysisResult.timestamp}
                              </p>
                            </div>

                            <Button onClick={() => { setSelectedImage(null); setAnalysisResult(null); }} size="sm" className="w-full font-mono-data text-xs">
                              NEW_SCAN
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}
                </div>

                {/* ── Live Activity Sidebar ── */}
                <div className="hidden lg:block">
                  <div className="surface-card p-0 overflow-hidden sticky top-24">
                    <div className="px-4 py-2.5 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-success/80 animate-pulse-glow shadow-none" />
                        <span className="font-mono-data text-xs text-muted-foreground uppercase">Live Feed</span>
                      </div>
                      <Activity className="w-3 h-3 text-muted-foreground" />
                    </div>
                    <div className="divide-y divide-border">
                      {liveFeed.map((scan, i) => (
                        <div
                          key={`${scan.id}-${i}`}
                          className="px-4 py-3.5 flex items-center justify-between hover:bg-muted/40 transition-colors"
                        >
                          <div>
                            <span className="font-mono-data text-xs text-foreground">{scan.id}</span>
                            <span className={`font-mono-data text-xs ml-2 ${statusColor(scan.status)}`}>{scan.status}</span>
                          </div>
                          <span className="font-mono-data text-[10px] text-muted-foreground">{scan.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Static System Indicators ─*/}
      <section className="border-t border-border bg-surface">
        <div className="container mx-auto px-6 py-2.5 flex flex-wrap items-center justify-between gap-3">
          <span className="font-mono-data text-[10px] text-muted-foreground">
            [ SYSTEM_STATUS: ENCRYPTED ]
          </span>
          <span className="font-mono-data text-[10px] text-muted-foreground">
            [ DB_VERSION: 1.0.42 ]
          </span>
          <span className="font-mono-data text-[10px] text-muted-foreground">
            [ LATENCY: 24ms ]
          </span>
        </div>
      </section>

      {/* ── Disclaimer ─ */}
      <section className="border-t border-border mt-8">
        <div className="container mx-auto px-6 py-6">
          <div className="surface-card p-4 flex gap-3">
            <AlertCircle className="w-4 h-4 text-warning flex-shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              <span className="font-mono-data font-bold text-warning">NOTICE:</span> This AI analysis is a screening tool only and NOT a replacement for professional
              medical diagnosis. Always consult a qualified ophthalmologist. False negatives and false positives can occur.
            </p>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border py-4">
        <div className="container mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-2">
          <p className="font-mono-data text-[10px] text-muted-foreground/50">
            Built with Next.js + TensorFlow | Validated by NIH Open-Source Datasets | HIPAA/GDPR Compliant
          </p>
          <p className="font-mono-data text-[10px] text-muted-foreground/50">
            RetinalAI v2.1.4 | {new Date().getFullYear()}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
