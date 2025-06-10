import { Button } from "@/components/ui/button";

interface PhaseNavigationProps {
  currentPhase: number;
  onPhaseChange: (phase: number) => void;
}

export function PhaseNavigation({ currentPhase, onPhaseChange }: PhaseNavigationProps) {
  const phases = [
    { number: 1, label: "Phase 1", enabled: true },
    { number: 2, label: "Phase 2", enabled: false },
    { number: 3, label: "Phase 3", enabled: false },
  ];

  return (
    <nav className="flex space-x-1 bg-muted rounded-lg p-1">
      {phases.map((phase) => (
        <Button
          key={phase.number}
          variant={currentPhase === phase.number ? "default" : "ghost"}
          size="sm"
          onClick={() => phase.enabled && onPhaseChange(phase.number)}
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
