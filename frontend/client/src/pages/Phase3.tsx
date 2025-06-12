import { useState, useEffect } from "react";
import { IndustrySelection } from "@/components/IndustrySelection";
import { SMEContextForm } from "@/components/SMEContextForm";
import { ExternalKnowledgeToggle } from "@/components/ExternalKnowledgeToggle";
import { Card, CardContent } from "@/components/ui/card";
import { Rocket } from "lucide-react";
import { QuestionAnswering } from "@/components/QuestionAnswering";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SMEContext } from "@shared/schema";
export default function Phase3() {
  const [industry, setIndustry] = useState("feed-milling");
  const [plantName, setPlantName] = useState("");
  const [keyProcesses, setKeyProcesses] = useState("");
  const [criticalEquipment, setCriticalEquipment] = useState("");
  const [allowExternalKnowledge, setAllowExternalKnowledge] = useState(false);
  const queryClient = useQueryClient();
  const [knownChallenges, setKnownChallenges] = useState("");
  const [regulations, setRegulations] = useState("");
  const [notes, setNotes] = useState("");
  const [unitProcess, setUnitProcess] = useState("");
  const user_id = 7000;

  // Load existing SME context
  const { data: existingContext } = useQuery<SMEContext>({
    queryKey: ["/api/sme-context"],
    retry: false,
  });

  // Populate form with existing context
    useEffect(() => {
      if (existingContext) {
        setIndustry(existingContext.industry);
        setPlantName(existingContext.plantName);
        setKeyProcesses(existingContext.keyProcesses);
        setCriticalEquipment(existingContext.criticalEquipment);
        setAllowExternalKnowledge(existingContext.allowExternalKnowledge);
      }
    }, [existingContext]);

    // Auto-save SME context
  const saveContextMutation = useMutation({
    mutationFn: async (contextData: any) => {
      if (existingContext) {
        return await apiRequest(
          "PUT",
          `/api/sme-context/${existingContext.id}`,
          contextData
        );
      } else {
        return await apiRequest("POST", "/api/sme-context", contextData);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sme-context"] });
    },
  });

  // Debounced auto-save
  useEffect(() => {
    const timer = setTimeout(() => {
      if (industry && plantName && keyProcesses && criticalEquipment) {
        saveContextMutation.mutate({
          industry,
          plantName,
          keyProcesses,
          criticalEquipment,
          allowExternalKnowledge,
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    industry,
    plantName,
    keyProcesses,
    criticalEquipment,
    allowExternalKnowledge,
  ]);

  return (
    <div className="space-y-8">
      <IndustrySelection value={industry} onChange={setIndustry} />
      
            <SMEContextForm
              plantName={plantName}
              keyProcesses={keyProcesses}
              criticalEquipment={criticalEquipment}
              knownChallenges={knownChallenges}
              regulations={regulations}
              notes={notes}
              unitProcess={unitProcess}
              onPlantNameChange={setPlantName}
              onKeyProcessesChange={setKeyProcesses}
              onCriticalEquipmentChange={setCriticalEquipment}
              onKnownChallengesChange={setKnownChallenges}
              onRegulationsChange={setRegulations}
              onNotesChange={setNotes}
              onUnitProcess={setUnitProcess}
            />
      
            <ExternalKnowledgeToggle
              value={allowExternalKnowledge}
              onChange={setAllowExternalKnowledge}
            />
            <QuestionAnswering
        industry={industry}
        user_id={user_id}
        use_external={allowExternalKnowledge}
        sme_context={{
          plantName,
          keyProcesses,
          criticalEquipment,
          knownChallenges,
          regulations,
          notes,
          unitProcess,
        }}
      />
    </div>
  );
}
