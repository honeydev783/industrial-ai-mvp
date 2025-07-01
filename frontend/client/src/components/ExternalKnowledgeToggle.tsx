import { useState, useEffect } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { set } from "date-fns";
import e from "express";

interface ExternalKnowledgeToggleProps {
  value: number;
  onChange: (value: number) => void;
}

export function ExternalKnowledgeToggle({
  value,
  onChange,
}: ExternalKnowledgeToggleProps) {
  const [externalChecked, setExternalChecked] = useState(false);
  const [timeSeriesChecked, setTimeSeriesChecked] = useState(false);
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
            checked={externalChecked}
            onCheckedChange={(checked) => {
              if(checked === true) {
                setExternalChecked(true);
                setTimeSeriesChecked(false);
                onChange(2); // Uncheck time series when external knowledge is enabled
              } else {
                setExternalChecked(false);
                if (!timeSeriesChecked) {
                  onChange(1);
                }
              }
              // setExternalChecked(checked === true);
              // if (timeSeriesChecked) {
              //   setTimeSeriesChecked(false); // Uncheck time series when external knowledge is enabled
              // }
              // onChange(2);
            }}
          />
        </div>
        <div className="flex-1">
          <Label
            htmlFor="external-knowledge"
            className="font-medium cursor-pointer"
          >
            Answer based on external knowledge beyond uploaded documents
          </Label>
          {/* <p className="mt-1 text-sm text-muted-foreground">
            When checked, AI may enhance document-based answers with pretrained domain knowledge. 
            When unchecked, responses will be based solely on uploaded documents (RAG only).
          </p> */}
        </div>

        <div className="flex items-center h-5 mt-1">
          <Checkbox
            id="time-series"
            checked={timeSeriesChecked}
            onCheckedChange={(checked) => {
              if(checked === true) {
                setTimeSeriesChecked(true);
                setExternalChecked(false);
                onChange(3); // Uncheck time series when external knowledge is enabled
              } else {
                setTimeSeriesChecked(false);
                if (!externalChecked) {
                  onChange(1);
                }
              }
            }}
          />
        </div>
        <div className="flex-1">
          <Label
            htmlFor="external-knowledge"
            className="font-medium cursor-pointer"
          >
            Answer based on uploaded time series data
          </Label>
          {/* <p className="mt-1 text-sm text-muted-foreground">
            When checked, AI may enhance document-based answers with pretrained domain knowledge. 
            When unchecked, responses will be based solely on uploaded documents (RAG only).
          </p> */}
        </div>
      </div>
    </div>
  );
}
