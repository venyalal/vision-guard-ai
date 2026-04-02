import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

export default function Auth() {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/dashboard");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate("/dashboard");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${window.location.origin}/dashboard` },
        });
        if (error) throw error;
        toast.success("Account created — you can now sign in.");
        setMode("login");
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded bg-[#EFF6FF] border border-[#BFDBFE] flex items-center justify-center">
            <Eye className="w-4 h-4 text-[#2563EB]" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#0F172A]">VisionGuard AI</p>
            <p className="text-[10px] text-[#94A3B8] uppercase tracking-widest">DR Screening</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#0F172A] mb-0.5">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>
          <p className="text-xs text-[#64748B] mb-5">
            {mode === "login"
              ? "Access your retinal screening dashboard"
              : "Start screening for diabetic retinopathy"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-[#64748B]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="clinician@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-white border-[#E2E8F0] text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:ring-[#2563EB] h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-[#64748B]">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                  className="bg-white border-[#E2E8F0] text-[#0F172A] placeholder:text-[#CBD5E1] focus-visible:ring-[#2563EB] h-9 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#64748B] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-sm bg-[#2563EB] hover:bg-[#1D4ED8] text-white border-0"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#E2E8F0] text-center">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              disabled={loading}
              className="text-xs text-[#64748B] hover:text-[#2563EB] transition-colors"
            >
              {mode === "login" ? "No account? Sign up" : "Have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#CBD5E1]">
          Screening tool only — not a substitute for clinical diagnosis
        </p>
      </div>
    </div>
  );
}
