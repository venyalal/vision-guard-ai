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
    <aside className="fixed top-0 left-0 h-screen w-[240px] bg-[#0A0E1A] border-r border-[#1F2937] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-4 border-b border-[#1F2937]">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-[#0EA5E9]" />
          <div>
            <p className="text-xs font-medium text-[#D1D5DB] tracking-wide">VisionGuard AI</p>
            <p className="text-[10px] text-[#4B5563] uppercase tracking-widest">DR Screening</p>
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
              `flex items-center gap-3 px-3 py-2 text-sm transition-colors relative ${
                isActive
                  ? "text-[#F9FAFB] before:absolute before:left-0 before:top-1 before:bottom-1 before:w-[2px] before:bg-[#0EA5E9] before:rounded-r"
                  : "text-[#6B7280] hover:text-[#D1D5DB]"
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
