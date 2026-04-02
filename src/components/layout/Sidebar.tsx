import { NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, ScanLine, Clock, Info, LogOut, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analyze",   icon: ScanLine,        label: "Analyze"   },
  { to: "/history",   icon: Clock,           label: "History"   },
  { to: "/about",     icon: Info,            label: "About"     },
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
    <aside className="fixed top-0 left-0 h-screen w-[240px] bg-[#F8FAFC] border-r border-[#E2E8F0] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#E2E8F0]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#2563EB]" />
          <div>
            <p className="text-xs font-semibold text-[#0F172A] tracking-tight">VisionGuard AI</p>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest">DR Screening</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-px">
        {NAV.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm rounded transition-colors relative ${
                isActive
                  ? "bg-[#EFF6FF] text-[#2563EB] border-l-2 border-[#2563EB] pl-[10px]"
                  : "text-[#64748B] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
              }`
            }
          >
            <Icon className="w-4 h-4 flex-shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* User + logout */}
      <div className="px-3 py-4 border-t border-[#E2E8F0]">
        {user && (
          <div className="px-3 py-1.5 mb-1">
            <p className="text-xs text-[#94A3B8] truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2 rounded text-sm text-[#64748B] hover:bg-[#FEF2F2] hover:text-[#DC2626] transition-colors"
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
