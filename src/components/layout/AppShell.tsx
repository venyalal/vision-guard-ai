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
  { to: "/analyze",   icon: ScanLine,        label: "Analyze"   },
  { to: "/history",   icon: Clock,           label: "History"   },
  { to: "/about",     icon: Info,            label: "About"     },
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
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-[#E2E8F0] border-t-[#2563EB] rounded-full animate-spin" />
      </div>
    );
  }

  if (isMobile) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col">
        <header className="h-13 bg-white border-b border-[#E2E8F0] flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#2563EB]" />
            <span className="text-sm font-semibold text-[#0F172A]">VisionGuard AI</span>
          </div>
          <button onClick={handleLogout} className="text-[#94A3B8] hover:text-[#DC2626] transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </header>

        <main className="flex-1 overflow-auto pb-16">{children}</main>

        <nav className="fixed bottom-0 left-0 right-0 h-14 bg-white border-t border-[#E2E8F0] flex items-center">
          {MOBILE_NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] transition-colors ${
                  isActive ? "text-[#2563EB]" : "text-[#94A3B8]"
                }`
              }
            >
              <Icon className="w-4 h-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex">
      <Sidebar user={user} />
      <main className="ml-[240px] flex-1 min-h-screen overflow-auto">{children}</main>
    </div>
  );
}
