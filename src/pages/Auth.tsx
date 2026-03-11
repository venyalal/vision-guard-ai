import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Eye, EyeOff, Shield } from "lucide-react";

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) navigate("/");
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) navigate("/");
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast({ title: "ACCESS_GRANTED", description: "Session initialized." });
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (error) throw error;
        toast({ title: "ACCOUNT_CREATED", description: "Check your email to verify." });
        setIsLogin(true);
      }
    } catch (error: any) {
      toast({ variant: "destructive", title: "AUTH_FAILED", description: error.message || "Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      {/* Status bar */}
      <div className="fixed top-0 left-0 right-0 border-b border-border bg-surface px-4 py-1.5 flex items-center gap-4 font-mono-data text-xs text-muted-foreground z-50">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
          SYSTEM_READY
        </span>
        <span>v2.1.4-stable</span>
        <span className="flex items-center gap-1">
          <Shield className="w-3 h-3" />
          AES-256 Encrypted
        </span>
      </div>

      <div className="w-full max-w-sm">
        <div className="surface-card p-0 overflow-hidden">
          {/* Header bar */}
          <div className="px-4 py-2 border-b border-border flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="font-mono-data text-xs text-muted-foreground uppercase">
              {isLogin ? "Authentication" : "Registration"}
            </span>
          </div>

          <div className="p-6 space-y-6">
            <div className="text-center">
              <div className="w-10 h-10 mx-auto rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3">
                <Eye className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-mono-data text-lg font-bold text-foreground">
                RETINAL<span className="text-primary">AI</span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                {isLogin ? "Enter credentials to continue" : "Create a new account"}
              </p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email" className="font-mono-data text-xs text-muted-foreground uppercase">Email</Label>
                <Input
                  id="email" type="email" placeholder="user@domain.com"
                  value={email} onChange={(e) => setEmail(e.target.value)}
                  required disabled={loading}
                  className="font-mono-data text-sm bg-background border-border"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password" className="font-mono-data text-xs text-muted-foreground uppercase">Password</Label>
                <div className="relative">
                  <Input
                    id="password" type={showPassword ? "text" : "password"} placeholder="••••••••"
                    value={password} onChange={(e) => setPassword(e.target.value)}
                    required disabled={loading} minLength={6}
                    className="font-mono-data text-sm bg-background border-border pr-10"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full font-mono-data text-xs" disabled={loading}>
                {loading ? "PROCESSING..." : isLogin ? "AUTHENTICATE" : "CREATE_ACCOUNT"}
              </Button>
            </form>

            <div className="text-center">
              <button type="button" onClick={() => setIsLogin(!isLogin)} disabled={loading}
                className="font-mono-data text-xs text-primary hover:underline">
                {isLogin ? "Need an account? REGISTER" : "Have an account? LOGIN"}
              </button>
            </div>
          </div>
        </div>

        <p className="font-mono-data text-[10px] text-muted-foreground/40 text-center mt-4">
          HIPAA/GDPR Compliant | AES-256
        </p>
      </div>
    </div>
  );
};

export default Auth;
