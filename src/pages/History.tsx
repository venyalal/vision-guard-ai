import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getScans, deleteScan, type ScanRecord } from "@/lib/supabase";
import AppShell from "@/components/layout/AppShell";
import SeverityBadge from "@/components/SeverityBadge";
import ConfidenceBar from "@/components/ConfidenceBar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronRight, Trash2, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const GRADE_LABELS = ["All", "No DR", "Mild", "Moderate", "Severe", "Proliferative"];

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: 8 }).map((_, i) => (
        <tr key={i} className="border-b border-[#F1F5F9]">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full bg-[#F8FAFC]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ExpandedRow({ scan }: { scan: ScanRecord }) {
  return (
    <tr className="bg-[#F8FAFC]">
      <td colSpan={6} className="px-4 py-4">
        <div className="grid md:grid-cols-2 gap-4">
          {scan.image_url && (
            <div className="rounded overflow-hidden border border-[#E2E8F0] bg-[#0F172A] max-w-[240px]">
              <img src={scan.image_url} alt="Fundus" className="w-full h-auto object-contain max-h-40" />
            </div>
          )}
          <div className="space-y-3">
            <ConfidenceBar value={scan.confidence} grade={scan.grade} />
            <div>
              <p className="text-[11px] text-[#64748B] uppercase tracking-wider mb-1">Recommendation</p>
              <p className="text-xs text-[#0F172A] leading-relaxed">{scan.recommendation}</p>
            </div>
            {scan.scan_time && (
              <p className="text-[11px] font-mono text-[#CBD5E1]">Processing: {scan.scan_time}</p>
            )}
          </div>
        </div>
      </td>
    </tr>
  );
}

function exportCsv(scans: ScanRecord[]) {
  const headers = ["id", "patient_id", "created_at", "grade", "grade_name", "confidence", "recommendation", "scan_time"];
  const rows = scans.map((s) =>
    headers.map((h) => `"${String((s as Record<string, unknown>)[h] ?? "").replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([[headers.join(","), ...rows].join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `visionguard-${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History() {
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo]     = useState("");
  const [minConf, setMinConf]   = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: scans = [], isLoading, error } = useQuery({
    queryKey: ["scans", gradeFilter, dateFrom, dateTo, minConf],
    queryFn: () => getScans({
      grade: gradeFilter,
      dateFrom: dateFrom || null,
      dateTo: dateTo ? dateTo + "T23:59:59" : null,
      minConfidence: minConf ? parseInt(minConf, 10) : null,
    }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScan,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["scans"] }); toast.success("Scan deleted"); },
    onError: () => toast.error("Delete failed"),
  });

  if (error) toast.error("Failed to load history");

  return (
    <AppShell>
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-base font-semibold text-[#0F172A]">History</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              {isLoading ? "Loading..." : `${scans.length} scans`}
            </p>
          </div>
          <Button
            onClick={() => exportCsv(scans)}
            disabled={scans.length === 0}
            size="sm"
            variant="outline"
            className="h-8 text-xs border-[#E2E8F0] text-[#64748B] hover:text-[#0F172A] gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
          <p className="text-[11px] text-[#64748B] uppercase tracking-wider mb-3">Filters</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <p className="text-[11px] text-[#64748B] mb-1.5">Grade</p>
              <div className="flex gap-1 flex-wrap">
                {GRADE_LABELS.map((label, i) => {
                  const val = i === 0 ? null : i - 1;
                  const active = gradeFilter === val;
                  return (
                    <button
                      key={label}
                      onClick={() => setGradeFilter(val)}
                      className={`text-[11px] px-2.5 py-1 rounded border transition-colors ${
                        active
                          ? "bg-[#EFF6FF] border-[#BFDBFE] text-[#2563EB]"
                          : "border-[#E2E8F0] text-[#64748B] hover:border-[#CBD5E1] hover:text-[#0F172A]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <p className="text-[11px] text-[#64748B] mb-1.5">From</p>
              <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs bg-white border-[#E2E8F0] text-[#0F172A] w-36" />
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] mb-1.5">To</p>
              <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-xs bg-white border-[#E2E8F0] text-[#0F172A] w-36" />
            </div>
            <div>
              <p className="text-[11px] text-[#64748B] mb-1.5">Min confidence %</p>
              <Input type="number" min={0} max={100} placeholder="0" value={minConf}
                onChange={(e) => setMinConf(e.target.value)}
                className="h-8 text-xs bg-white border-[#E2E8F0] text-[#0F172A] w-24" />
            </div>

            {(gradeFilter !== null || dateFrom || dateTo || minConf) && (
              <button
                onClick={() => { setGradeFilter(null); setDateFrom(""); setDateTo(""); setMinConf(""); }}
                className="text-xs text-[#94A3B8] hover:text-[#DC2626] transition-colors self-end mb-0.5"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E2E8F0]">
                  <th className="w-8 px-4 py-3" />
                  {["Patient ID", "Date", "Grade", "Confidence", ""].map((h) => (
                    <th key={h} className="text-left text-[11px] text-[#64748B] uppercase tracking-wider px-4 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <SkeletonRows />
                ) : scans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-xs text-[#94A3B8]">
                      No scans match your filters
                    </td>
                  </tr>
                ) : (
                  scans.map((scan) => (
                    <>
                      <tr
                        key={scan.id}
                        className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors cursor-pointer"
                        onClick={() => setExpanded(expanded === scan.id ? null : scan.id)}
                      >
                        <td className="px-4 py-3 text-[#CBD5E1]">
                          {expanded === scan.id
                            ? <ChevronDown className="w-3.5 h-3.5" />
                            : <ChevronRight className="w-3.5 h-3.5" />}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#0F172A]">
                          {scan.patient_id ?? <span className="text-[#CBD5E1]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-xs text-[#64748B]">
                          {format(new Date(scan.created_at), "dd MMM yyyy, HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <SeverityBadge grade={scan.grade} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#0F172A]">
                          {scan.confidence}%
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => deleteMutation.mutate(scan.id)}
                            disabled={deleteMutation.isPending}
                            className="text-[#E2E8F0] hover:text-[#DC2626] transition-colors p-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                      {expanded === scan.id && <ExpandedRow key={`${scan.id}-exp`} scan={scan} />}
                    </>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
