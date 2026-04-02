import { useEffect, useState } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import { LayoutDashboard, ScanLine, Clock, Info, LogOut, Eye } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import Sidebar from "./Sidebar";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "sonner";
import type { User } from "@supabase/supabase-js";

const MOBILE_NAV = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { to: "/analyze", icon: ScanLine, label: "Analyze" },
  { to: "/history", icon: Clock, label: "History" },
  { to: "/about", icon: Info, label: "About" },
];

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      navigate("/auth");
    } catch {
      toast.error("Logout failed");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#0EA5E9]/30 border-t-[#0EA5E9] rounded-full animate-spin" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#0A0E1A] flex flex-col">
        {/* Mobile header */}
        <header className="h-14 bg-[#111827] border-b border-[#1F2937] flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 flex items-center justify-center">
              <Eye className="w-3.5 h-3.5 text-[#0EA5E9]" />
            </div>
            <span className="text-sm font-semibold text-[#F9FAFB]">VisionGuard AI</span>
          </div>
          <button onClick={handleLogout} className="text-[#6B7280] hover:text-[#EF4444]">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto pb-16">{children}</main>

        {/* Bottom nav */}
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-[#111827] border-t border-[#1F2937] flex items-center">
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] transition-colors ${
                  isActive ? "text-[#0EA5E9]" : "text-[#6B7280]"
                }`
              }
            >
              <Icon className="w-5 h-5" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex">
      <Sidebar user={user} />
      <main className="ml-[240px] flex-1 min-h-screen overflow-auto">{children}</main>
    </div>
  );
}
