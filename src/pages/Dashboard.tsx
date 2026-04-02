import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getScans } from "@/lib/supabase";
import AppShell from "@/components/layout/AppShell";
import SeverityBadge from "@/components/SeverityBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScanLine, TrendingUp, Activity, Upload } from "lucide-react";
import { format, isToday } from "date-fns";
import { toast } from "sonner";

const GRADE_COLORS = ["#16A34A", "#D97706", "#B45309", "#C2410C", "#DC2626"];
const GRADE_LABELS = ["No DR", "Mild", "Moderate", "Severe", "Prolif."];

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
  accentColor = "#64748B",
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  loading: boolean;
  accentColor?: string;
}) {
  return (
    <div className="bg-white border border-[#E2E8F0] rounded-lg px-4 pt-3 pb-3 border-l-2" style={{ borderLeftColor: accentColor }}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-[11px] text-[#64748B] uppercase tracking-wider">{label}</p>
        <Icon className="w-3.5 h-3.5 text-[#CBD5E1]" />
      </div>
      {loading ? (
        <Skeleton className="h-6 w-14 bg-[#F1F5F9]" />
      ) : (
        <p className="text-xl font-mono font-semibold text-[#0F172A]">{value}</p>
      )}
      {sub && <p className="text-[11px] text-[#94A3B8] mt-0.5">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: scans = [], isLoading, error } = useQuery({
    queryKey: ["scans"],
    queryFn: () => getScans({ limit: 100 }),
  });

  if (error) toast.error("Failed to load dashboard data");

  const today = scans.filter((s) => isToday(new Date(s.created_at)));
  const referrals = scans.filter((s) => s.grade > 0);
  const referralRate = scans.length > 0 ? Math.round((referrals.length / scans.length) * 100) : 0;
  const avgConfidence = scans.length > 0
    ? Math.round(scans.reduce((acc, s) => acc + s.confidence, 0) / scans.length)
    : 0;

  const recent = scans.slice(0, 10);

  return (
    <AppShell>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-base font-semibold text-[#0F172A]">Dashboard</h1>
          <p className="text-xs text-[#64748B] mt-0.5">{format(new Date(), "EEEE, d MMMM yyyy")}</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard label="Scans today"    value={today.length}       icon={ScanLine}    loading={isLoading} accentColor="#2563EB" />
          <StatCard label="Total scans"    value={scans.length}       icon={Activity}    loading={isLoading} accentColor="#94A3B8" />
          <StatCard label="Referral rate"  value={`${referralRate}%`} sub="grade ≥ 1"   icon={TrendingUp}   loading={isLoading} accentColor="#D97706" />
          <StatCard label="Avg confidence" value={`${avgConfidence}%`}                   icon={Activity}    loading={isLoading} accentColor="#16A34A" />
        </div>

        {/* Bento grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Recent scans */}
          <div className="lg:col-span-2 bg-white border border-[#E2E8F0] rounded-lg">
            <div className="px-4 py-3 border-b border-[#E2E8F0] flex items-center justify-between">
              <h2 className="text-sm font-medium text-[#0F172A]">Recent scans</h2>
              <button
                onClick={() => navigate("/history")}
                className="text-xs text-[#64748B] hover:text-[#2563EB] transition-colors"
              >
                View all →
              </button>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-2.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-8 w-full bg-[#F8FAFC]" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <p className="text-xs text-[#94A3B8]">No scans yet</p>
                <button
                  onClick={() => navigate("/analyze")}
                  className="mt-1.5 text-[11px] text-[#64748B] hover:text-[#2563EB] transition-colors"
                >
                  Run first analysis →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#E2E8F0]">
                      {["Patient ID", "Date", "Grade", "Confidence", ""].map((h) => (
                        <th key={h} className="text-left text-[11px] text-[#64748B] uppercase tracking-wider px-4 py-2.5 font-medium">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((scan) => (
                      <tr key={scan.id} className="border-b border-[#F1F5F9] last:border-0 hover:bg-[#F8FAFC] transition-colors">
                        <td className="px-4 py-2.5 font-mono text-xs text-[#0F172A]">
                          {scan.patient_id ?? <span className="text-[#CBD5E1]">—</span>}
                        </td>
                        <td className="px-4 py-2.5 text-xs text-[#64748B]">
                          {format(new Date(scan.created_at), "dd MMM, HH:mm")}
                        </td>
                        <td className="px-4 py-2.5">
                          <SeverityBadge grade={scan.grade} />
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[#0F172A]">
                          {scan.confidence}%
                        </td>
                        <td className="px-4 py-2.5">
                          <button
                            onClick={() => navigate("/history")}
                            className="text-xs text-[#94A3B8] hover:text-[#2563EB] transition-colors"
                          >
                            Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Right panel */}
          <div className="space-y-4">
            {/* Quick upload */}
            <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
              <h2 className="text-sm font-medium text-[#0F172A] mb-3">Quick analyze</h2>
              <button
                onClick={() => navigate("/analyze")}
                className="w-full group border border-dashed border-[#E2E8F0] hover:border-[#BFDBFE] rounded transition-colors"
              >
                <div className="flex items-center gap-3 px-4 py-3">
                  <Upload className="w-4 h-4 text-[#CBD5E1] group-hover:text-[#2563EB] transition-colors flex-shrink-0" />
                  <div className="text-left">
                    <p className="text-sm text-[#64748B] group-hover:text-[#0F172A] transition-colors">
                      Drop fundus image or click
                    </p>
                    <p className="text-[11px] text-[#CBD5E1] mt-0.5">JPG · PNG · TIFF</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Grade distribution */}
            {!isLoading && scans.length > 0 && (
              <div className="bg-white border border-[#E2E8F0] rounded-lg p-4">
                <p className="text-[11px] text-[#64748B] uppercase tracking-wider mb-3">Grade distribution</p>
                {[0, 1, 2, 3, 4].map((g) => {
                  const count = scans.filter((s) => s.grade === g).length;
                  const pct = scans.length > 0 ? (count / scans.length) * 100 : 0;
                  return (
                    <div key={g} className="flex items-center gap-2 mb-2 last:mb-0">
                      <span className="text-[10px] text-[#64748B] w-14 shrink-0">{GRADE_LABELS[g]}</span>
                      <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: GRADE_COLORS[g] }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#94A3B8] w-5 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
