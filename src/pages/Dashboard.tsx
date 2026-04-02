import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { getScans } from "@/lib/supabase";
import AppShell from "@/components/layout/AppShell";
import SeverityBadge from "@/components/SeverityBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScanLine, TrendingUp, Activity, Upload } from "lucide-react";
import { format, isToday } from "date-fns";
import { toast } from "sonner";

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  loading: boolean;
}) {
  return (
    <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-[#6B7280] uppercase tracking-wider">{label}</p>
        <Icon className="w-4 h-4 text-[#6B7280]" />
      </div>
      {loading ? (
        <Skeleton className="h-7 w-16 bg-[#1F2937]" />
      ) : (
        <p className="text-2xl font-semibold font-mono text-[#F9FAFB]">{value}</p>
      )}
      {sub && <p className="text-[11px] text-[#6B7280] mt-1">{sub}</p>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: scans = [], isLoading, error } = useQuery({
    queryKey: ["scans"],
    queryFn: () => getScans({ limit: 100 }),
  });

  if (error) {
    toast.error("Failed to load dashboard data");
  }

  const today = scans.filter((s) => isToday(new Date(s.created_at)));
  const referrals = scans.filter((s) => s.grade > 0);
  const referralRate =
    scans.length > 0 ? Math.round((referrals.length / scans.length) * 100) : 0;
  const avgConfidence =
    scans.length > 0
      ? Math.round(scans.reduce((acc, s) => acc + s.confidence, 0) / scans.length)
      : 0;

  const recent = scans.slice(0, 10);

  return (
    <AppShell>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-lg font-semibold text-[#F9FAFB]">Dashboard</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">
            {format(new Date(), "EEEE, d MMMM yyyy")}
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Scans today"
            value={today.length}
            icon={ScanLine}
            loading={isLoading}
          />
          <StatCard
            label="Total scans"
            value={scans.length}
            icon={Activity}
            loading={isLoading}
          />
          <StatCard
            label="Referral rate"
            value={`${referralRate}%`}
            sub="Grade ≥ 1"
            icon={TrendingUp}
            loading={isLoading}
          />
          <StatCard
            label="Avg confidence"
            value={`${avgConfidence}%`}
            icon={Activity}
            loading={isLoading}
          />
        </div>

        {/* Main bento grid */}
        <div className="grid lg:grid-cols-3 gap-4">
          {/* Recent scans table */}
          <div className="lg:col-span-2 bg-[#111827] border border-[#1F2937] rounded-lg">
            <div className="px-4 py-3 border-b border-[#1F2937] flex items-center justify-between">
              <h2 className="text-sm font-medium text-[#F9FAFB]">Recent scans</h2>
              <button
                onClick={() => navigate("/history")}
                className="text-xs text-[#6B7280] hover:text-[#0EA5E9] transition-colors"
              >
                View all →
              </button>
            </div>

            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full bg-[#1F2937]" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#6B7280]">No scans yet</p>
                <button
                  onClick={() => navigate("/analyze")}
                  className="mt-3 text-xs text-[#0EA5E9] hover:underline"
                >
                  Run first analysis →
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1F2937]">
                      {["Patient ID", "Date", "Grade", "Confidence", ""].map((h) => (
                        <th
                          key={h}
                          className="text-left text-[11px] text-[#6B7280] uppercase tracking-wider px-4 py-2.5 font-medium"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((scan) => (
                      <tr
                        key={scan.id}
                        className="border-b border-[#1F2937]/50 last:border-0 hover:bg-[#1F2937]/30 transition-colors"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-[#F9FAFB]">
                          {scan.patient_id ?? (
                            <span className="text-[#374151]">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">
                          {format(new Date(scan.created_at), "dd MMM, HH:mm")}
                        </td>
                        <td className="px-4 py-3">
                          <SeverityBadge grade={scan.grade} />
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-[#F9FAFB]">
                          {scan.confidence}%
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => navigate("/history")}
                            className="text-xs text-[#6B7280] hover:text-[#0EA5E9] transition-colors"
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

          {/* Quick upload */}
          <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-4 flex flex-col">
            <h2 className="text-sm font-medium text-[#F9FAFB] mb-3">Quick analyze</h2>
            <div className="flex-1 flex flex-col items-center justify-center">
              <button
                onClick={() => navigate("/analyze")}
                className="w-full group border-2 border-dashed border-[#1F2937] hover:border-[#0EA5E9]/50 rounded-lg p-8 flex flex-col items-center gap-3 transition-colors"
              >
                <div className="w-12 h-12 rounded-lg bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 flex items-center justify-center group-hover:bg-[#0EA5E9]/20 transition-colors">
                  <Upload className="w-5 h-5 text-[#0EA5E9]" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-[#F9FAFB]">Upload fundus image</p>
                  <p className="text-xs text-[#6B7280] mt-1">JPG, PNG, TIFF</p>
                </div>
              </button>
            </div>

            {/* Grade distribution mini chart */}
            {!isLoading && scans.length > 0 && (
              <div className="mt-4 pt-4 border-t border-[#1F2937]">
                <p className="text-[11px] text-[#6B7280] uppercase tracking-wider mb-2">
                  Grade distribution
                </p>
                {[0, 1, 2, 3, 4].map((g) => {
                  const count = scans.filter((s) => s.grade === g).length;
                  const pct = scans.length > 0 ? (count / scans.length) * 100 : 0;
                  const colors = ["#10B981", "#EAB308", "#F59E0B", "#F97316", "#EF4444"];
                  const labels = ["No DR", "Mild", "Moderate", "Severe", "Prolif."];
                  return (
                    <div key={g} className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-mono text-[#6B7280] w-14 shrink-0">
                        {labels[g]}
                      </span>
                      <div className="flex-1 h-1.5 bg-[#1F2937] rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: colors[g] }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[#6B7280] w-6 text-right">
                        {count}
                      </span>
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
