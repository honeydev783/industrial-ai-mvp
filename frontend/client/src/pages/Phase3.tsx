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
  const queryClient = useQueryClient();
  const [knownChallenges, setKnownChallenges] = useState("");
  const [regulations, setRegulations] = useState("");
  const [notes, setNotes] = useState("");
  const [unitProcess, setUnitProcess] = useState("");
  const user_id = 7000;
  const [allowExternalKnowledge, setAllowExternalKnowledge] = useState(1);
  

  return (
    <div className="space-y-8">
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
      <ExternalKnowledgeToggle
        value={allowExternalKnowledge}
        onChange={setAllowExternalKnowledge}
      />
    </div>
  );
}
