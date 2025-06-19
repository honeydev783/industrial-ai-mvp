import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileUpload } from "@/components/file-upload";
import { TagSelector } from "@/components/tag-selector";
import { TimeSeriesChart } from "@/components/time-series-chart-temp";
import { AnnotationsTable } from "@/components/annotations-table";
import { RulesManagement } from "@/components/rules-management";
import { SavedGraphs } from "@/components/saved-graphs";
import { SaveGraphModal } from "@/components/save-graph-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
import type { TagInfo, AnnotationMarker } from "@shared/schema";

export default function Phase2() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeWindow, setTimeWindow] = useState<string>("100points");

  const [annotationCategory, setAnnotationCategory] =
    useState<string>("Normal");
  const [annotationSeverity, setAnnotationSeverity] = useState<string>("Low");
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [chartZoom, setChartZoom] = useState(1);
  const [isModelTrained, setIsModelTrained] = useState(false);
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch annotations from the database
  const { data: annotations = [], isLoading: annotationsLoading } = useQuery({
    queryKey: ["/api/annotations"],
    queryFn: async () => {
      const response = await api.get("/api/annotations");
      return response.data.map((annotation: any) => ({
        ...annotation,
        timestamp: new Date(annotation.timestamp),
        regionStart: annotation.regionStart
          ? new Date(annotation.regionStart)
          : undefined,
        regionEnd: annotation.regionEnd
          ? new Date(annotation.regionEnd)
          : undefined,
      }));
    },
  });

  // Delete annotation mutation
  const deleteAnnotationMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/api/annotations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/annotations"] });
      toast({
        title: "Annotation deleted",
        description: "The annotation has been removed successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete annotation",
        variant: "destructive",
      });
    },
  });

  const handleTagSelection = (tagIds: string[]) => {
    setSelectedTags(tagIds);
  };

  const handleAnnotationCreate = (annotation: AnnotationMarker) => {
    queryClient.invalidateQueries({ queryKey: ["/api/annotations"] });
  };

  const handleAnnotationDelete = (id: number) => {
    deleteAnnotationMutation.mutate(id);
  };

  const handleFileUploaded = () => {
    setIsModelTrained(false);
  };

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
    toast({
      title: "Chart refreshed",
      description: "Data has been reloaded successfully",
    });
  };

  const handleModelTrainingConfirm = async () => {
    setIsTrainingLoading(true);
    // Simulate 2 seconds loading
    setTimeout(() => {
      setIsModelTrained(true);
      setIsTrainingLoading(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-inter">
      {/* Header */}
      <header className="bg-slate-800 border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <ChartLine className="text-blue-500 text-2xl" />
              <h1 className="text-xl font-semibold text-slate-100">
                TimeSeries Analytics
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-100"
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-400 hover:text-slate-100"
              >
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex h-[calc(100vh-4rem)]">
        {/* Sidebar */}
        <aside className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* File Upload */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                <h2 className="text-lg font-semibold">Data Upload</h2>
              </div>
              <FileUpload onFileUploaded={handleFileUploaded} />
            </div>

            {/* Tag Selection */}
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

            {/* Time Controls */}
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
                    <SelectTrigger className="w-full bg-slate-700 border-slate-600">
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
                {/* <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600">
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div> */}
              </div>
            </div>

            {/* Annotation Tools */}
            {/* <div>
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <h2 className="text-lg font-semibold">Annotations</h2>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-slate-400 mb-3">
                  Click chart points for point annotations or drag to create region annotations
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Select value={annotationCategory} onValueChange={setAnnotationCategory}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Normal">Normal</SelectItem>
                      <SelectItem value="Warning">Warning</SelectItem>
                      <SelectItem value="Critical">Critical</SelectItem>
                      <SelectItem value="Anomaly">Anomaly</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={annotationSeverity} onValueChange={setAnnotationSeverity}>
                    <SelectTrigger className="bg-slate-700 border-slate-600 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div> */}

            {/* Model Training Status */}
            <div>
              <div className="flex items-center mb-4">
                {isModelTrained ? (
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                ) : (
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                )}
                <h2 className="text-lg font-semibold">Model Status</h2>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-slate-400 mb-3">
                  Confirm when your model training is complete
                </div>
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full bg-slate-700 border-slate-600 hover:bg-slate-600"
                    onClick={handleModelTrainingConfirm}
                    disabled={isTrainingLoading || isModelTrained}
                  >
                    {isTrainingLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Training...
                      </div>
                    ) : isModelTrained ? (
                      "Model Trained ✓"
                    ) : (
                      "Confirm Model Trained"
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-6">
            {/* Chart Container */}
            <Card className="bg-slate-800 border-slate-700 mb-6">
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
                    <div className="border-l border-slate-600 pl-3">
                      <Button
                        onClick={() => setShowSaveModal(true)}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        Save Graph
                      </Button>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <TimeSeriesChart
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

            {/* Data Tables and Rules Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <AnnotationsTable
                annotations={annotations}
                onDeleteAnnotation={handleAnnotationDelete}
              />
              <RulesManagement selectedTags={selectedTags} />
            </div>

            {/* Saved Graphs Section */}
            <SavedGraphs />
          </div>
        </main>
      </div>

      {/* Save Graph Modal */}
      <SaveGraphModal
        open={showSaveModal}
        onOpenChange={setShowSaveModal}
        selectedTags={selectedTags}
        timeWindow={timeWindow}
        annotations={annotations}
      />
    </div>
  );
}
