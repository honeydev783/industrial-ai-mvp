import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SMEContextFormProps {
  plantName: string;
  keyProcesses: string;
  criticalEquipment: string;
  knownChallenges: string;
  regulations: string;
  notes : string;
  unitProcess: string;
  onPlantNameChange: (value: string) => void;
  onKeyProcessesChange: (value: string) => void;
  onCriticalEquipmentChange: (value: string) => void;
  onKnownChallengesChange: (value: string) => void;
  onRegulationsChange: (value: string) => void;
  onNotesChange: (value: string) => void;
  onUnitProcess: (value: string) => void;
}

export function SMEContextForm({
  plantName,
  keyProcesses,
  criticalEquipment,
  knownChallenges,
  regulations,
  notes,
  unitProcess,
  onPlantNameChange,
  onKeyProcessesChange,
  onCriticalEquipmentChange,
  onKnownChallengesChange,
  onRegulationsChange,
  onNotesChange,
  onUnitProcess
}: SMEContextFormProps) {
  return (
    <div className="step-container">
      <div className="step-header">
        <div className="step-number">
          <span className="step-number-text">2</span>
        </div>
        <div className="ml-4">
          <h2 className="step-title">SME Context Input</h2>
          <p className="step-description">Provide specific context about your facility and processes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Plant/Sub-Industry Name */}
        {/* <div>
          <Label htmlFor="plant-name" className="block text-sm font-medium mb-2">
            Plant or Sub-Industry Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="plant-name"
            type="text"
            placeholder="e.g., Dairy – Yogurt Line"
            value={plantName}
            onChange={(e) => onPlantNameChange(e.target.value)}
            className="w-full"
          />
        </div> */}

        {/* Critical Equipment */}
        {/* <div>
          <Label htmlFor="critical-equipment" className="block text-sm font-medium mb-2">
            Critical Equipment <span className="text-destructive">*</span>
          </Label>
          <Input
            id="critical-equipment"
            type="text"
            placeholder="e.g., HTST, Separator, CIP-01"
            value={criticalEquipment}
            onChange={(e) => onCriticalEquipmentChange(e.target.value)}
            className="w-full"
          />
          <p className="mt-1 text-xs text-muted-foreground">Separate multiple items with commas</p>
        </div> */}

        {/* Key Processes (Full Width) */}
        {/* <div className="lg:col-span-2">
          <Label htmlFor="key-processes" className="block text-sm font-medium mb-2">
            Key Processes / Workflows <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="key-processes"
            rows={4}
            placeholder="e.g., Pasteurization, Homogenization, Packaging..."
            value={keyProcesses}
            onChange={(e) => onKeyProcessesChange(e.target.value)}
            className="w-full resize-none"
          />
        </div> */}

        {/* Unit Processes (Full Width) */}
        {/* <div className="lg:col-span-2">
          <Label htmlFor="unit-processes" className="block text-sm font-medium mb-2">
            Unit Processes <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="unit-processes"
            rows={4}
            placeholder="e.g., Pasteurization..."
            value={unitProcess}
            onChange={(e) => onUnitProcess(e.target.value)}
            className="w-full resize-none"
          />
        </div> */}

        {/* Known Chanllenges/ Issues */}
        {/* <div className="lg:col-span-2">
          <Label htmlFor="known-challenges" className="block text-sm font-medium mb-2">
            Known Challenges / Issues <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="known-challenges"
            rows={4}
            placeholder="e.g., Foaming, pump cavitation"
            value={knownChallenges}
            onChange={(e) => onKnownChallengesChange(e.target.value)}
            className="w-full resize-none"
          />
        </div> */}

        {/* Regulations/ Standards */}
        {/* <div className="lg:col-span-2">
          <Label htmlFor="regulations" className="block text-sm font-medium mb-2">
            Regulations / Standards <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="regulations"
            rows={4}
            placeholder="e.g., FSANZ, ISO 22000"
            value={regulations}
            onChange={(e) => onRegulationsChange(e.target.value)}
            className="w-full resize-none"
          />
        </div> */}

        {/* Notes for AI Prompting/ Issues */}
        <div className="lg:col-span-2">
          <Label htmlFor="notes-for-prompting" className="block text-sm font-medium mb-2">
            Notes for AI Prompting <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="notes-for-prompting"
            rows={4}
            placeholder="(optional) e.g. Refer to cleaning skid as CIP-01"
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            className="w-full resize-none"
          />
        </div>

      </div>
    </div>
  );
}
