import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface IndustrySelectionProps {
  value: string;
  onChange: (value: string) => void;
}

export function IndustrySelection({ value, onChange }: IndustrySelectionProps) {
  const industries = [
    { value: "feed-milling", label: "Feed Milling" },
    { value: "food-beveraging", label: "Food & Beverage" },
    { value: "pharmaceuticals", label: "Pharmaceuticals" },
    { value: "water-treatment", label: "Water Treatment" },
    { value: "general-manufacturing", label: "General Manufacturing"}
  ];

  return (
    <div className="step-container">
      <div className="step-header">
        <div className="step-number">
          <span className="step-number-text">1</span>
        </div>
        <div className="ml-4">
          <h2 className="step-title">Select Industry</h2>
          <p className="step-description">Choose your primary industry sector</p>
        </div>
      </div>
      
      <div className="max-w-md">
        <Label htmlFor="industry-select" className="block text-sm font-medium mb-2">
          Industry Type <span className="text-destructive">*</span>
        </Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select an industry..." />
          </SelectTrigger>
          <SelectContent>
            {industries.map((industry) => (
              <SelectItem key={industry.value} value={industry.value}>
                {industry.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
