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
        <tr key={i} className="border-b border-[#1F2937]/50">
          {Array.from({ length: 5 }).map((_, j) => (
            <td key={j} className="px-4 py-3">
              <Skeleton className="h-4 w-full bg-[#1F2937]" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

function ExpandedRow({ scan }: { scan: ScanRecord }) {
  return (
    <tr className="bg-[#0A0E1A]/40">
      <td colSpan={6} className="px-4 py-4">
        <div className="grid md:grid-cols-2 gap-4">
          {scan.image_url && (
            <div className="rounded overflow-hidden border border-[#1F2937] bg-black max-w-[240px]">
              <img
                src={scan.image_url}
                alt="Fundus"
                className="w-full h-auto object-contain max-h-40"
              />
            </div>
          )}
          <div className="space-y-3">
            <ConfidenceBar value={scan.confidence} grade={scan.grade} />
            <div>
              <p className="text-[11px] text-[#6B7280] uppercase tracking-wider mb-1">
                Recommendation
              </p>
              <p className="text-xs text-[#F9FAFB] leading-relaxed">{scan.recommendation}</p>
            </div>
            {scan.scan_time && (
              <p className="text-[11px] font-mono text-[#374151]">
                Processing time: {scan.scan_time}
              </p>
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
    headers
      .map((h) => {
        const val = (s as Record<string, unknown>)[h] ?? "";
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(","),
  );
  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `visionguard-export-${format(new Date(), "yyyyMMdd")}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function History() {
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [minConf, setMinConf] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data: scans = [], isLoading, error } = useQuery({
    queryKey: ["scans", gradeFilter, dateFrom, dateTo, minConf],
    queryFn: () =>
      getScans({
        grade: gradeFilter,
        dateFrom: dateFrom || null,
        dateTo: dateTo ? dateTo + "T23:59:59" : null,
        minConfidence: minConf ? parseInt(minConf, 10) : null,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteScan,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["scans"] });
      toast.success("Scan deleted");
    },
    onError: () => toast.error("Delete failed"),
  });

  if (error) toast.error("Failed to load history");

  const toggleRow = (id: string) => setExpanded(expanded === id ? null : id);

  return (
    <AppShell>
      <div className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold text-[#F9FAFB]">History</h1>
            <p className="text-sm text-[#6B7280] mt-0.5">
              {isLoading ? "Loading..." : `${scans.length} scans`}
            </p>
          </div>
          <Button
            onClick={() => exportCsv(scans)}
            disabled={scans.length === 0}
            size="sm"
            variant="outline"
            className="h-8 text-xs border-[#1F2937] text-[#6B7280] hover:text-[#F9FAFB] hover:border-[#374151] gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-4">
          <p className="text-[11px] text-[#6B7280] uppercase tracking-wider mb-3">Filters</p>
          <div className="flex flex-wrap gap-3 items-end">
            {/* Grade */}
            <div>
              <p className="text-[11px] text-[#6B7280] mb-1.5">Grade</p>
              <div className="flex gap-1 flex-wrap">
                {GRADE_LABELS.map((label, i) => {
                  const val = i === 0 ? null : i - 1;
                  const active = gradeFilter === val;
                  return (
                    <button
                      key={label}
                      onClick={() => setGradeFilter(val)}
                      className={`text-[11px] px-2.5 py-1 rounded border transition-colors font-mono ${
                        active
                          ? "bg-[#0EA5E9]/10 border-[#0EA5E9]/30 text-[#0EA5E9]"
                          : "border-[#1F2937] text-[#6B7280] hover:border-[#374151] hover:text-[#F9FAFB]"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Date range */}
            <div>
              <p className="text-[11px] text-[#6B7280] mb-1.5">From</p>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-8 text-xs bg-[#0A0E1A] border-[#1F2937] text-[#F9FAFB] w-36"
              />
            </div>
            <div>
              <p className="text-[11px] text-[#6B7280] mb-1.5">To</p>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-8 text-xs bg-[#0A0E1A] border-[#1F2937] text-[#F9FAFB] w-36"
              />
            </div>

            {/* Min confidence */}
            <div>
              <p className="text-[11px] text-[#6B7280] mb-1.5">Min confidence %</p>
              <Input
                type="number"
                min={0}
                max={100}
                placeholder="0"
                value={minConf}
                onChange={(e) => setMinConf(e.target.value)}
                className="h-8 text-xs bg-[#0A0E1A] border-[#1F2937] text-[#F9FAFB] w-24"
              />
            </div>

            {(gradeFilter !== null || dateFrom || dateTo || minConf) && (
              <button
                onClick={() => {
                  setGradeFilter(null);
                  setDateFrom("");
                  setDateTo("");
                  setMinConf("");
                }}
                className="text-xs text-[#6B7280] hover:text-[#EF4444] transition-colors self-end mb-0.5"
              >
                Clear filters
              </button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1F2937]">
                  <th className="w-8 px-4 py-3" />
                  {["Patient ID", "Date", "Grade", "Confidence", ""].map((h) => (
                    <th
                      key={h}
                      className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-3 font-medium"
                    >
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
                    <td colSpan={6} className="px-4 py-10 text-center text-sm text-[#6B7280]">
                      No scans match your filters
                    </td>
                  </tr>
                ) : (
                  scans.map((scan) => (
                    <>
                      <tr
                        key={scan.id}
                        className="border-b border-[#1F2937]/50 last:border-0 hover:bg-[#1F2937]/20 transition-colors cursor-pointer"
                        onClick={() => toggleRow(scan.id)}
                      >
                        <td className="px-4 py-3 text-[#6B7280]">
                          {expanded === scan.id ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#F9FAFB]">
                          {scan.patient_id ?? <span className="text-[#374151]">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">
                          {format(new Date(scan.created_at), "dd MMM yyyy, HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <SeverityBadge grade={scan.grade} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#F9FAFB]">
                          {scan.confidence}%
                        </td>
                        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => deleteMutation.mutate(scan.id)}
                            disabled={deleteMutation.isPending}
                            className="text-[#374151] hover:text-[#EF4444] transition-colors p-1"
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
