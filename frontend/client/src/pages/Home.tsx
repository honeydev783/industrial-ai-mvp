import { useState, useEffect } from "react";
import { IndustrySelection } from "@/components/IndustrySelection";
import { SMEContextForm } from "@/components/SMEContextForm";
import { ExternalKnowledgeToggle } from "@/components/ExternalKnowledgeToggle";
import { DocumentUpload } from "@/components/DocumentUpload";
import { QuestionAnswering } from "@/components/QuestionAnswering";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { SMEContext } from "@shared/schema";

// interface smeContext {
//   plantName: string;
//   keyProcesses: string;
//   criticalEquipment: string;
//   knownChallenges: string;
//   regulations: string;
//   unitProcess: string;
//   notes: string;
// }
export default function Home() {
  
  const user_id = 7000;

  return (
    <div className="space-y-8">
      <DocumentUpload
        user_id={user_id}
      />
    </div>
  );
}
