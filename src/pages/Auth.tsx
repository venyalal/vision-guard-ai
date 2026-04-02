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
      const message = err instanceof Error ? err.message : "Authentication failed";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0E1A] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-8 justify-center">
          <div className="w-9 h-9 rounded bg-[#0EA5E9]/10 border border-[#0EA5E9]/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-[#0EA5E9]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 4C7.03 4 2.78 7.11 1 12c1.78 4.89 6.03 8 11 8s9.22-3.11 11-8c-1.78-4.89-6.03-8-11-8z" />
              <circle cx="12" cy="12" r="7" strokeDasharray="2 2" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#F9FAFB] tracking-tight">VisionGuard AI</p>
            <p className="text-[10px] text-[#6B7280] uppercase tracking-widest">DR Screening</p>
          </div>
        </div>

        {/* Card */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-lg p-6">
          <h2 className="text-base font-semibold text-[#F9FAFB] mb-1">
            {mode === "login" ? "Sign in" : "Create account"}
          </h2>
          <p className="text-xs text-[#6B7280] mb-5">
            {mode === "login"
              ? "Access your retinal screening dashboard"
              : "Start screening for diabetic retinopathy"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-[#6B7280]">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="clinician@hospital.org"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                className="bg-[#0A0E1A] border-[#1F2937] text-[#F9FAFB] placeholder-[#374151] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20 h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-[#6B7280]">Password</Label>
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
                  className="bg-[#0A0E1A] border-[#1F2937] text-[#F9FAFB] placeholder-[#374151] focus:border-[#0EA5E9] focus:ring-[#0EA5E9]/20 h-9 text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#F9FAFB] transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-9 text-sm bg-[#0EA5E9] hover:bg-[#0284C7] text-white border-0"
            >
              {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          <div className="mt-4 pt-4 border-t border-[#1F2937] text-center">
            <button
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              disabled={loading}
              className="text-xs text-[#6B7280] hover:text-[#0EA5E9] transition-colors"
            >
              {mode === "login" ? "No account? Sign up" : "Already have an account? Sign in"}
            </button>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-[#374151]">
          For screening use only — not a substitute for clinical diagnosis
        </p>
      </div>
    </div>
  );
}
