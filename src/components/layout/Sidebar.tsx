import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ScanLine, Clock, Info, LogOut, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analyze", icon: ScanLine, label: "Analyze" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/about", icon: Info, label: "About" },
];

interface SidebarProps {
  user: User | null;
}

export default function Sidebar({ user }: SidebarProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch {
      toast.error("Logout failed");
    }
  };

  return (
    <aside className="fixed top-0 left-0 h-screen w-[240px] bg-[#111827] border-r border-[#1F2937] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-[#1F2937]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 flex items-center justify-center">
            <Eye className="w-4 h-4 text-[#0EA5E9]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#F9FAFB] tracking-tight">VisionGuard</p>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-widest">AI</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded text-sm transition-colors ${
                isActive
                  ? "bg-[#0EA5E9]/10 text-[#0EA5E9] border border-[#0EA5E9]/20"
                  : "text-[#6B7280] hover:text-[#F9FAFB] hover:bg-[#1F2937]"
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User info */}
      <div className="px-3 py-4 border-t border-[#1F2937]">
        {user && (
          <div className="px-3 py-2 mb-2">
            <p className="text-xs text-[#6B7280] truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded text-sm text-[#6B7280] hover:text-[#EF4444] hover:bg-[#EF4444]/5 transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
