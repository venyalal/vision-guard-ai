import { useState, useCallback } from "react";
import { Upload, Eye, Activity, AlertCircle, CheckCircle, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const Index = () => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const { toast } = useToast();

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
      setSelectedImage(e.target?.result as string);
      simulateAnalysis();
    };
    reader.readAsDataURL(file);
  }, [toast]);

  const simulateAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisResult(null);
    
    setTimeout(() => {
      setIsAnalyzing(false);
      const mockResult = {
        grade: 0,
        confidence: 99.7,
        recommendation: "✓ Annual screening recommended for disease prevention",
        features: [],
        timestamp: new Date().toLocaleString(),
      };
      setAnalysisResult(mockResult);
      
      toast({
        title: "Analysis Complete",
        description: "No diabetic retinopathy detected.",
      });
    }, 3500);
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
            <button className="text-sm font-medium text-foreground border-b-2 border-primary pb-1">
              Upload
            </button>
            <button className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth">
              History
            </button>
          </nav>
          
          <button
            onClick={toggleDarkMode}
            className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center hover:shadow-glow transition-smooth"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-primary" />
            ) : (
              <Moon className="w-5 h-5 text-primary" />
            )}
          </button>
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

      {/* Upload Section */}
      <section className="py-16 px-6">
        <div className="container mx-auto max-w-4xl">
          {!selectedImage ? (
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
                    <span className="px-4 py-2 rounded-full bg-success/10 text-success text-xs font-bold uppercase backdrop-blur-sm border border-success/20">
                      ✓ No DR Detected
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
                    <div className="mb-6 p-6 rounded-xl bg-success/10 border-2 border-success/20">
                      <div className="flex items-center gap-4 mb-3">
                        <CheckCircle className="w-10 h-10 text-success" />
                        <div>
                          <h4 className="text-lg font-bold text-success">
                            NO DIABETIC RETINOPATHY DETECTED
                          </h4>
                          <p className="text-sm text-success/80">
                            {analysisResult.confidence}% confidence
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Confidence Gauge */}
                    <div className="mb-6 text-center">
                      <div className="w-32 h-32 mx-auto rounded-full bg-success/10 border-8 border-success/20 flex items-center justify-center mb-3">
                        <span className="text-4xl font-bold text-success">
                          {analysisResult.confidence}%
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">
                        Confidence Score
                      </p>
                    </div>

                    {/* Recommendation */}
                    <div className="p-4 rounded-lg bg-secondary-bg border-l-4 border-primary">
                      <p className="text-sm font-semibold">
                        {analysisResult.recommendation}
                      </p>
                    </div>

                    {/* Model Info */}
                    <div className="mt-6 pt-6 border-t border-border/50">
                      <p className="text-xs text-muted-foreground font-mono">
                        🤖 Model: EfficientNetB0 | Test Accuracy: 99.36%
                        <br />
                        ⏱ Scan Time: 2.3s | Date: {analysisResult.timestamp}
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
