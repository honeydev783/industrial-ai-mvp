import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface ExternalKnowledgeToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function ExternalKnowledgeToggle({ value, onChange }: ExternalKnowledgeToggleProps) {
  return (
    <div className="step-container">
      {/* <div className="step-header">
        <div className="step-number">
          <span className="step-number-text">3</span>
        </div>
        <div className="ml-4">
          <h2 className="step-title">Knowledge Source Configuration</h2>
          <p className="step-description">Configure how AI should handle external knowledge</p>
        </div>
      </div> */}

      <div className="flex items-start space-x-4">
        <div className="flex items-center h-5 mt-1">
          <Checkbox
            id="external-knowledge"
            checked={value}
            onCheckedChange={onChange}
          />
        </div>
        <div className="flex-1">
          <Label htmlFor="external-knowledge" className="font-medium cursor-pointer">
            Allow AI to use external knowledge beyond uploaded documents
          </Label>
          <p className="mt-1 text-sm text-muted-foreground">
            When checked, AI may enhance document-based answers with pretrained domain knowledge. 
            When unchecked, responses will be based solely on uploaded documents (RAG only).
          </p>
        </div>
      </div>
    </div>
  );
}
