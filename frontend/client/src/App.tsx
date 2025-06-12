import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { PhaseNavigation } from "@/components/PhaseNavigation";
import { useState } from "react";
import { Factory } from "lucide-react";
import { AuthProvider } from "@/contexts/AuthContext";
import Home from "@/pages/Home";
import Phase2 from "@/pages/Phase2";
import Phase3 from "@/pages/Phase3";
import NotFound from "@/pages/not-found";
import AuthForm from "@/pages/auth/Auth";
import { useAuth } from "@/contexts/AuthContext";

function Router() {
  const [currentPhase, setCurrentPhase] = useState(1);
  const { user } = useAuth();
  const handlePhaseChange = (phase: number) => {
    if (phase === 1) {
      setCurrentPhase(1);
    } else if (phase === 3) {
      setCurrentPhase(3);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      { user ? (
      <>
      <header className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0">
                <Factory className="text-primary h-8 w-8" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Industrial AI</h1>
                <p className="text-sm text-muted-foreground">
                  Industrial Knowledge Assistant
                </p>
              </div>
            </div>

            {/* Phase Navigation and Controls */}
            <div className="flex items-center space-x-6">
              <PhaseNavigation
                currentPhase={currentPhase}
                onPhaseChange={handlePhaseChange}
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/train" component={Phase2} />
          <Route path="/qa" component={Phase3} />
          <Route component={NotFound} />
        </Switch>
      </main>
      </> )
      : (
        <AuthForm/>
      )
      }
    </div>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="doc-qa-theme">
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
