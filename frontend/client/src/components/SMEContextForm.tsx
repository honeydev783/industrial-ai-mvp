import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface SMEContextFormProps {
  plantName: string;
  keyProcesses: string;
  criticalEquipment: string;
  onPlantNameChange: (value: string) => void;
  onKeyProcessesChange: (value: string) => void;
  onCriticalEquipmentChange: (value: string) => void;
}

export function SMEContextForm({
  plantName,
  keyProcesses,
  criticalEquipment,
  onPlantNameChange,
  onKeyProcessesChange,
  onCriticalEquipmentChange,
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
        <div>
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
        </div>

        {/* Critical Equipment */}
        <div>
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
        </div>

        {/* Key Processes (Full Width) */}
        <div className="lg:col-span-2">
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
        </div>
      </div>
    </div>
  );
}
