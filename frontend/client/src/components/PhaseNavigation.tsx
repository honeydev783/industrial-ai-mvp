import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

interface PhaseNavigationProps {
  currentPhase: number;
  onPhaseChange: (phase: number) => void;
}

export function PhaseNavigation({
  currentPhase,
  onPhaseChange,
}: PhaseNavigationProps) {
  const [_, setLocation] = useLocation();
  const phases = [
    { number: 1, label: "Data Warehouse", path: "/", enabled: true },
    { number: 2, label: "Training", path: "/train", enabled: true },
    {
      number: 3,
      label: "Industrial Intelligence",
      path: "/qa",
      enabled: true,
    },
  ];

  return (
    <nav className="flex space-x-1 bg-muted rounded-lg p-1">
      {phases.map((phase) => (
        <Button
          key={phase.number}
          variant={currentPhase === phase.number ? "default" : "ghost"}
          size="sm"
          onClick={() => {
            if (phase.enabled) {
              onPhaseChange(phase.number);
              setLocation(phase.path);
            }
          }}
          disabled={!phase.enabled}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
            currentPhase === phase.number
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted-foreground/10"
          }`}
        >
          {phase.label}
        </Button>
      ))}
    </nav>
  );
}
