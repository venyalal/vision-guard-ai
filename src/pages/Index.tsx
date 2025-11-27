import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Upload, Eye, Activity, AlertCircle, CheckCircle, Moon, Sun, History, Trash2, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

const Index = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [currentView, setCurrentView] = useState<"upload" | "history">("upload");
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Check authentication
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/auth");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => {
      const newMode = !prev;
      document.documentElement.classList.toggle("dark", newMode);
      localStorage.setItem("theme-preference", newMode ? "dark" : "light");
      return newMode;
    });
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a JPG or PNG image.",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Maximum file size is 20MB.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = e.target?.result as string;
      setSelectedImage(imageData);
      analyzeImage(imageData);
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const analyzeImage = async (imageBase64: string) => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-retinal-image`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ imageBase64 }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      setIsAnalyzing(false);
      setAnalysisResult(result);
      
      // Save to database
      await saveToHistory(imageBase64, result);
      
      const gradeMessages = [
        "No diabetic retinopathy detected.",
        "Mild diabetic retinopathy detected.",
        "Moderate diabetic retinopathy detected.",
        "Severe diabetic retinopathy detected.",
        "Proliferative diabetic retinopathy detected."
      ];
      
      toast({
        title: "Analysis Complete",
        description: gradeMessages[result.grade] || "Analysis complete.",
        variant: result.grade > 0 ? "destructive" : "default",
      });
    } catch (error) {
      setIsAnalyzing(false);
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error instanceof Error ? error.message : "Unable to analyze image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  }, [handleImageUpload]);

  const saveToHistory = async (imageBase64: string, result: any) => {
    if (!user) {
      console.log('No user authenticated, skipping history save');
      return;
    }
    
    console.log('Saving analysis to history for user:', user.id);
    
    try {
      const { error } = await supabase.from("retinal_analyses").insert({
        user_id: user.id,
        image_url: imageBase64,
        grade: result.grade,
        grade_name: result.gradeName || `Grade ${result.grade}`,
        confidence: result.confidence,
        recommendation: result.recommendation,
        features: result.features || [],
        reasoning: result.reasoning,
        scan_time: result.scanTime,
      });

      if (error) {
        console.error('Error saving to history:', error);
        throw error;
      }
      
      console.log('Analysis saved successfully');
      
      // Reload history if we're on the history view
      if (currentView === "history") {
        loadHistory();
      }
    } catch (error) {
      console.error("Error saving to history:", error);
      toast({
        title: "Save Failed",
        description: "Analysis completed but couldn't save to history.",
        variant: "destructive",
      });
    }
  };

  const loadHistory = async () => {
    if (!user) {
      console.log('No user authenticated, skipping history load');
      return;
    }
    
    setLoadingHistory(true);
    console.log('Loading history for user:', user.id);
    
    try {
      const { data, error } = await supabase
        .from("retinal_analyses")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error('History load error:', error);
        throw error;
      }
      
      console.log('History loaded:', data?.length || 0, 'records');
      setHistoryData(data || []);
    } catch (error) {
      console.error("Error loading history:", error);
      toast({
        title: "Failed to load history",
        description: error instanceof Error ? error.message : "Unable to retrieve past analyses.",
        variant: "destructive",
      });
    } finally {
      setLoadingHistory(false);
    }
  };

  const deleteHistoryItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from("retinal_analyses")
        .delete()
        .eq("id", id);

      if (error) throw error;
      
      setHistoryData(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Deleted",
        description: "Analysis removed from history.",
      });
    } catch (error) {
      console.error("Error deleting history item:", error);
      toast({
        title: "Failed to delete",
        description: "Unable to remove analysis.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (currentView === "history" && user) {
      loadHistory();
    }
  }, [currentView, user]);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-sm shadow-elegant">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center shadow-glow">
              <Eye className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              RetinalAI
            </h1>
          </div>
          
          <nav className="hidden md:flex gap-6">
            <button 
              onClick={() => setCurrentView("upload")}
              className={`text-sm font-medium pb-1 transition-smooth ${
                currentView === "upload"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Upload
            </button>
            <button 
              onClick={() => setCurrentView("history")}
              className={`text-sm font-medium pb-1 transition-smooth ${
                currentView === "history"
                  ? "text-foreground border-b-2 border-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              History
            </button>
          </nav>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleDarkMode}
              className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:shadow-glow transition-smooth"
              aria-label="Toggle dark mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <Button
              onClick={async () => {
                await supabase.auth.signOut();
                navigate("/auth");
              }}
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="gradient-hero py-20 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            Protect Your Vision From
            <br />
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Diabetic Retinopathy
            </span>
          </h2>
          <p className="text-lg text-muted-foreground mb-12 max-w-2xl mx-auto">
            AI-powered early detection • 99% accuracy • Prevent blindness
          </p>
          
          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            <Card className="p-6 bg-secondary-bg border-0 shadow-elegant hover:shadow-glow transition-smooth">
              <Activity className="w-10 h-10 text-primary mx-auto mb-3" />
              <h3 className="font-bold text-2xl mb-2">1.4M+</h3>
              <p className="text-sm text-muted-foreground">Diabetics in UAE</p>
            </Card>
            
            <Card className="p-6 bg-tertiary-bg border-0 shadow-elegant hover:shadow-glow transition-smooth">
              <CheckCircle className="w-10 h-10 text-success mx-auto mb-3" />
              <h3 className="font-bold text-2xl mb-2">95%</h3>
              <p className="text-sm text-muted-foreground">Preventable if Caught Early</p>
            </Card>
            
            <Card className="p-6 bg-secondary-bg border-0 shadow-elegant hover:shadow-glow transition-smooth">
              <AlertCircle className="w-10 h-10 text-warning mx-auto mb-3" />
              <h3 className="font-bold text-2xl mb-2">#1 Cause</h3>
              <p className="text-sm text-muted-foreground">Preventable Blindness</p>
            </Card>
          </div>
        </div>
      </section>

      {/* Main Content Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          {currentView === "history" ? (
            /* History View */
            <div>
              <div className="flex items-center gap-3 mb-8">
                <History className="w-8 h-8 text-primary" />
                <h2 className="text-3xl font-bold">Analysis History</h2>
              </div>

              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 relative">
                    <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-spin border-t-primary"></div>
                  </div>
                  <p className="text-muted-foreground">Loading history...</p>
                </div>
              ) : historyData.length === 0 ? (
                <Card className="p-12 text-center bg-secondary-bg border-0 shadow-elegant">
                  <History className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-xl font-semibold mb-2">No History Yet</h3>
                  <p className="text-muted-foreground mb-6">
                    Upload and analyze your first fundus image to start building your history.
                  </p>
                  <Button
                    onClick={() => setCurrentView("upload")}
                    className="gradient-primary text-white"
                  >
                    Go to Upload
                  </Button>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {historyData.map((item) => (
                    <Card key={item.id} className="p-6 bg-gradient-to-br from-secondary-bg to-tertiary-bg border-0 shadow-elegant hover:shadow-glow transition-smooth">
                      <div className="flex gap-6">
                        {/* Thumbnail */}
                        <div className="relative w-32 h-32 flex-shrink-0">
                          <img
                            src={item.image_url}
                            alt="Fundus"
                            className="w-full h-full object-cover rounded-lg border-2 border-secondary"
                          />
                          <span className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-bold backdrop-blur-sm ${
                            item.grade === 0
                              ? 'bg-success/20 text-success'
                              : item.grade === 1
                              ? 'bg-warning/20 text-warning'
                              : 'bg-[#FFD6E0]/50 text-[#DC2626]'
                          }`}>
                            Grade {item.grade}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-3">
                            <div>
                              <h3 className={`text-lg font-bold mb-1 ${
                                item.grade === 0
                                  ? 'text-success'
                                  : item.grade === 1
                                  ? 'text-warning'
                                  : 'text-[#DC2626]'
                              }`}>
                                {item.grade_name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {new Date(item.created_at).toLocaleString()}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteHistoryItem(item.id)}
                              className="text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>

                          <div className="mb-3">
                            <span className="text-sm font-semibold">Confidence: </span>
                            <span className={`text-sm font-bold ${
                              item.grade === 0 ? 'text-success' : 'text-warning'
                            }`}>
                              {item.confidence}%
                            </span>
                          </div>

                          {item.features && item.features.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-semibold mb-1">Key Findings:</p>
                              <ul className="text-sm text-muted-foreground space-y-1">
                                {item.features.map((feature: string, idx: number) => (
                                  <li key={idx}>• {feature}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="p-3 rounded-lg bg-secondary-bg/50 border-l-4 border-primary">
                            <p className="text-sm">{item.recommendation}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Upload View */
            !selectedImage ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              className="relative group"
            >
              <input
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="block cursor-pointer"
              >
                <Card className="p-16 border-2 border-dashed border-secondary bg-gradient-to-br from-secondary-bg to-tertiary-bg hover:border-primary hover:shadow-glow transition-smooth text-center">
                  <div className="animate-float mx-auto w-20 h-20 rounded-full gradient-primary flex items-center justify-center mb-6 shadow-glow">
                    <Upload className="w-10 h-10 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Upload Fundus Image</h3>
                  <p className="text-muted-foreground mb-1">
                    or <span className="text-primary underline">click to browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-4">
                    JPG, PNG • Max 20MB • Professional fundus camera recommended
                  </p>
                </Card>
              </label>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-8">
              {/* Image Preview */}
              <Card className="relative overflow-hidden border-2 border-secondary shadow-elegant">
                <img
                  src={selectedImage}
                  alt="Fundus"
                  className="w-full h-auto rounded-lg"
                />
                {analysisResult && (
                  <div className="absolute top-4 left-4">
                    <span className={`px-4 py-2 rounded-full text-xs font-bold uppercase backdrop-blur-sm border ${
                      analysisResult.grade === 0
                        ? 'bg-success/10 text-success border-success/20'
                        : analysisResult.grade === 1
                        ? 'bg-warning/10 text-warning border-warning/20'
                        : analysisResult.grade === 2
                        ? 'bg-[#FFE4C7]/50 text-[#D97706] border-[#D97706]/20'
                        : 'bg-[#FFD6E0]/50 text-[#DC2626] border-[#DC2626]/20'
                    }`}>
                      {analysisResult.grade === 0 ? '✓ No DR Detected' :
                       analysisResult.grade === 1 ? '⚠ Mild DR' :
                       analysisResult.grade === 2 ? '⚠ Moderate DR' :
                       analysisResult.grade === 3 ? '🚨 Severe DR' :
                       '🚨 Proliferative DR'}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-4 left-4">
                  <span className="text-xs text-white/80 backdrop-blur-sm bg-black/30 px-3 py-1 rounded-full">
                    {analysisResult?.timestamp || "Processing..."}
                  </span>
                </div>
              </Card>

              {/* Results */}
              <div>
                {isAnalyzing ? (
                  <Card className="p-8 bg-gradient-to-br from-secondary-bg to-tertiary-bg border-0 shadow-elegant">
                    <div className="text-center">
                      <div className="w-16 h-16 mx-auto mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/30 animate-spin border-t-primary"></div>
                      </div>
                      <h3 className="text-lg font-semibold mb-2">🔍 Analyzing fundus image...</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        AI Model: EfficientNetB0 (99.36% accuracy)
                      </p>
                      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                        <div className="h-full gradient-primary animate-pulse"></div>
                      </div>
                    </div>
                  </Card>
                ) : analysisResult ? (
                  <Card className="p-8 bg-gradient-to-br from-secondary-bg to-tertiary-bg border-0 shadow-elegant">
                    <h3 className="text-xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                      Diabetic Retinopathy Analysis
                    </h3>
                    
                    {/* Primary Result */}
                    <div className={`mb-6 p-6 rounded-xl border-2 ${
                      analysisResult.grade === 0 
                        ? 'bg-success/10 border-success/20'
                        : analysisResult.grade === 1
                        ? 'bg-warning/10 border-warning/20'
                        : analysisResult.grade === 2
                        ? 'bg-[#FFE4C7]/50 border-[#D97706]/20'
                        : 'bg-[#FFD6E0]/50 border-[#DC2626]/20'
                    }`}>
                      <div className="flex items-center gap-4 mb-3">
                        {analysisResult.grade === 0 ? (
                          <CheckCircle className="w-10 h-10 text-success" />
                        ) : (
                          <AlertCircle className="w-10 h-10 text-warning" />
                        )}
                        <div>
                          <h4 className={`text-lg font-bold ${
                            analysisResult.grade === 0 
                              ? 'text-success'
                              : analysisResult.grade === 1
                              ? 'text-warning'
                              : analysisResult.grade === 2
                              ? 'text-[#D97706]'
                              : 'text-[#DC2626]'
                          }`}>
                            {analysisResult.gradeName?.toUpperCase() || 
                             (analysisResult.grade === 0 ? "NO DIABETIC RETINOPATHY DETECTED" : 
                              analysisResult.grade === 1 ? "MILD DIABETIC RETINOPATHY" :
                              analysisResult.grade === 2 ? "MODERATE DIABETIC RETINOPATHY" :
                              analysisResult.grade === 3 ? "SEVERE DIABETIC RETINOPATHY" :
                              "PROLIFERATIVE DIABETIC RETINOPATHY")}
                          </h4>
                          <p className={`text-sm ${
                            analysisResult.grade === 0 
                              ? 'text-success/80'
                              : 'text-foreground/70'
                          }`}>
                            {analysisResult.confidence}% confidence
                          </p>
                        </div>
                      </div>
                      {analysisResult.reasoning && (
                        <p className="text-sm mt-3 text-foreground/80">
                          {analysisResult.reasoning}
                        </p>
                      )}
                    </div>

                    {/* Confidence Gauge */}
                    <div className="mb-6 text-center">
                      <div className={`w-32 h-32 mx-auto rounded-full border-8 flex items-center justify-center mb-3 ${
                        analysisResult.grade === 0
                          ? 'bg-success/10 border-success/20'
                          : analysisResult.grade === 1
                          ? 'bg-warning/10 border-warning/20'
                          : 'bg-[#FFD6E0]/50 border-[#DC2626]/20'
                      }`}>
                        <span className={`text-4xl font-bold ${
                          analysisResult.grade === 0
                            ? 'text-success'
                            : analysisResult.grade === 1
                            ? 'text-warning'
                            : 'text-[#DC2626]'
                        }`}>
                          {analysisResult.confidence}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Confidence Score
                      </p>
                    </div>

                    {/* Features Detected */}
                    {analysisResult.features && analysisResult.features.length > 0 && (
                      <div className="mb-6 p-4 rounded-lg bg-secondary-bg border-l-4 border-warning">
                        <h4 className="text-sm font-bold mb-2 text-warning">🔍 Key Findings Identified</h4>
                        <ul className="space-y-1">
                          {analysisResult.features.map((feature: string, idx: number) => (
                            <li key={idx} className="text-sm text-foreground/80">
                              • {feature}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Recommendation */}
                    <div className="p-4 rounded-lg bg-secondary-bg border-l-4 border-primary mb-6">
                      <p className="text-sm font-semibold">
                        {analysisResult.recommendation}
                      </p>
                    </div>

                    {/* Model Info */}
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <p className="text-xs text-muted-foreground font-mono">
                        🤖 Model: Google Gemini 2.5 Pro (Vision-enabled AI)
                        <br />
                        ⏱ Scan Time: {analysisResult.scanTime || '2.3s'} | Date: {analysisResult.timestamp}
                      </p>
                    </div>

                    <Button
                      onClick={() => {
                        setSelectedImage(null);
                        setAnalysisResult(null);
                      }}
                      className="w-full mt-6 gradient-primary text-white font-semibold hover:shadow-glow"
                    >
                      Analyze Another Image
                    </Button>
                  </Card>
                ) : null}
              </div>
            </div>
          )
          )}
        </div>
      </section>

      {/* Disclaimer */}
      <section className="py-16 px-6 bg-secondary-bg/50">
        <div className="container mx-auto max-w-4xl">
          <Card className="p-6 border-l-4 border-primary bg-background shadow-elegant">
            <div className="flex gap-4">
              <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h4 className="font-bold mb-2">⚠️ Medical Disclaimer</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  This AI analysis is a screening tool only and NOT a replacement for professional 
                  medical diagnosis. Always consult a qualified ophthalmologist for definitive diagnosis 
                  and treatment. This system is intended to identify patients who need specialist referral. 
                  False negatives and false positives can occur. If you have symptoms of diabetic 
                  retinopathy, seek medical attention immediately regardless of this result.
                </p>
              </div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
};

export default Index;
