import { useState, useEffect } from "react";
import { IndustrySelection } from "@/components/IndustrySelection";
import { SMEContextForm } from "@/components/SMEContextForm";
import { ExternalKnowledgeToggle } from "@/components/ExternalKnowledgeToggle";
import { DocumentUpload } from "@/components/DocumentUpload";
import { QuestionAnswering } from "@/components/QuestionAnswering";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { TimeSeriesChart2 } from "@/components/time-series-chart-temp-2";
import type { SMEContext } from "@shared/schema";
// import { FileUpload } from "@/components/FileUpload";
// Update the import path below if FileUpload exists elsewhere, for example:
import { TestFileUpload } from "@/components/file-upload-1";
import { TagSelector } from "@/components/tag-selector";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  ChartLine,
  Settings,
  HelpCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Save,
  RefreshCw,
} from "lucide-react";
import type { TagInfo, AnnotationMarker } from "@shared/schema";
// Or provide the correct relative path as needed
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
  const [industry, setIndustry] = useState("water-treatment");
  const [plantName, setPlantName] = useState("");
  const [keyProcesses, setKeyProcesses] = useState("");
  const [criticalEquipment, setCriticalEquipment] = useState("");
  const [regulations, setRegulations] = useState("");
  const [notes, setNotes] = useState("");
  const [unitProcess, setUnitProcess] = useState("");
  const [knownChallenges, setKnownChallenges] = useState("");
  const queryClient = useQueryClient();
  const user_id = 7000;
  const annotations = [];
  //new variables for timeseries data
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeWindow, setTimeWindow] = useState<string>("100points");

  const [annotationCategory, setAnnotationCategory] =
    useState<string>("Normal");
  const [annotationSeverity, setAnnotationSeverity] = useState<string>("Low");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [chartZoom, setChartZoom] = useState(1);
  const [description, setDescription] = useState("");
  const handleTagSelection = (tagIds: string[]) => {
    setSelectedTags(tagIds);
  };
  const handleFileUploaded = () => {};
  const handleZoomIn = () => {
    setChartZoom((prev) => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setChartZoom((prev) => Math.max(prev / 1.2, 0.2));
  };

  const handleResetZoom = () => {
    setChartZoom(1);
  };
  const handleRefresh = () => {
    // Invalidate all chart-related queries to refresh data
    queryClient.invalidateQueries({ queryKey: ["/api/timeseries"] });
    queryClient.invalidateQueries({ queryKey: ["/api/annotations"] });
    queryClient.invalidateQueries({ queryKey: ["/api/tags"] });
  };
  const handleAnnotationCreate = (annotation: AnnotationMarker) => {
    queryClient.invalidateQueries({ queryKey: ["/api/annotations"] });
  };
  // Load existing SME context
  const { data: existingContext } = useQuery<SMEContext>({
    queryKey: ["/api/sme-context"],
    retry: false,
  });

  // Populate form with existing context
  useEffect(() => {
    if (existingContext) {
      //setIndustry(existingContext.industry);
      setPlantName(existingContext.plantName);
      setKeyProcesses(existingContext.keyProcesses);
      setCriticalEquipment(existingContext.criticalEquipment);
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
        });
      }
    }, 1000);

    return () => clearTimeout(timer);
  }, [industry, plantName, keyProcesses, criticalEquipment]);

  const changeIndustry = (newIndustry: string) => {
    setIndustry(newIndustry);
    localStorage.setItem("selectedIndustry", JSON.stringify(newIndustry));
  };
  useEffect(() => {
    if (localStorage.getItem("selectedIndustry")) {
      setIndustry(JSON.parse(localStorage.getItem("selectedIndustry") || "water-treatment"))
    } else {
      setIndustry("water-treatment");
    }
  }, []);
  return (
    <div className="space-y-8">
      <IndustrySelection value={industry} onChange={changeIndustry} />

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
      <DocumentUpload user_id={user_id} />
      {/* <div className="step-container">
        <h2 className="text-xl font-semibold mb-4">Time Series Data</h2>
        <div className="flex h-[calc(100vh-4rem)]">
          <aside className="w-80 border rounded-lg overflow-y-auto">
            <div className="p-6 space-y-6">
              
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                  <h2 className="text-lg font-semibold">Data Upload</h2>
                </div>
                <TestFileUpload
                  onFileUploaded={handleFileUploaded}
                  description={description}
                  setDescription={setDescription}
                />
                <div className="w-full max-w-md mx-auto mt-6">
                  <label
                    htmlFor="message"
                    className="block  font-semibold mb-2"
                  >
                    Your Notes:
                  </label>
                  <textarea
                    id="message"
                    rows={5}
                    className="bg-card w-full px-4 py-2  text-lg border  rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                    placeholder="Type your description before uploading..."
                    value={description}
                    onChange={(e) => {
                      setDescription(e.target.value);
                      //console.log("Description changed:", e.target.value);
                    }}
                  ></textarea>
                </div>
              </div>

              
              <div>
                <div className="flex items-center mb-4">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                  <h2 className="text-lg font-semibold">Tag Selection</h2>
                </div>
                <TagSelector
                  selectedTags={selectedTags}
                  onTagSelection={handleTagSelection}
                  maxTags={5}
                />
              </div>

             
              <div>
                <div className="flex items-center mb-4">
                  <Clock className="w-4 h-4 text-purple-500 mr-2" />
                  <h2 className="text-lg font-semibold">Time Controls</h2>
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Window Size
                    </label>
                    <Select value={timeWindow} onValueChange={setTimeWindow}>
                      <SelectTrigger className="w-full  border-slate-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="100points">100 Points</SelectItem>
                        <SelectItem value="1hour">1 Hour</SelectItem>
                        <SelectItem value="6hours">6 Hours</SelectItem>
                        <SelectItem value="24hours">24 Hours</SelectItem>
                        <SelectItem value="custom">Custom Range</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                </div>
              </div>
            </div>
          </aside>
          <main className="flex-1 overflow-auto">
            <div className="p-6 pt-0">
              
              <Card className="bg-card border mb-6">
                <CardHeader className="border-b border-slate-700">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      Time-Series Visualization
                    </CardTitle>
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleZoomOut}
                          className="text-slate-400 hover:text-slate-100"
                          title="Zoom Out"
                        >
                          <ZoomOut className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleZoomIn}
                          className="text-slate-400 hover:text-slate-100"
                          title="Zoom In"
                        >
                          <ZoomIn className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleResetZoom}
                          className="text-slate-400 hover:text-slate-100"
                          title="Reset Zoom"
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleRefresh}
                          className="text-slate-400 hover:text-slate-100"
                          title="Refresh Data"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                      
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6">
                  <TimeSeriesChart2
                    selectedTags={selectedTags}
                    timeWindow={timeWindow}
                    annotations={annotations}
                    annotationCategory={annotationCategory}
                    annotationSeverity={annotationSeverity}
                    onAnnotationCreate={handleAnnotationCreate}
                    zoom={chartZoom}
                  />
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </div> */}
    </div>
  );
}
