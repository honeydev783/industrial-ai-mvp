// import { Card, CardContent } from "@/components/ui/card";
// import { Construction } from "lucide-react";

// export default function Phase2() {
//   return (
//     <div className="space-y-8">
//       <Card className="p-12 text-center">
//         <CardContent className="pt-6">
//           <Construction className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
//           <h2 className="text-2xl font-semibold mb-2">Phase 2 Coming Soon</h2>
//           <p className="text-muted-foreground">
//             Advanced features will be available in the next phase.
//           </p>
//         </CardContent>
//       </Card>
//     </div>
//   );
// }
import { useState } from "react";
import { FileUpload } from "@/components/file-upload";
import { TagSelector } from "@/components/tag-selector";
import { TimeSeriesChart } from "@/components/time-series-chart-fixed";
import { AnnotationsTable } from "@/components/annotations-table";
import { RulesManagement } from "@/components/rules-management";
import { SavedGraphs } from "@/components/saved-graphs";
import { SaveGraphModal } from "@/components/save-graph-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartLine, Settings, HelpCircle, Clock, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCcw, Save } from "lucide-react";
import type { TagInfo, AnnotationMarker } from "@shared/schema";

export default function Phase2() {
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [timeWindow, setTimeWindow] = useState<string>("100points");
  const [annotationMode, setAnnotationMode] = useState<'point' | 'region' | null>(null);
  const [annotationCategory, setAnnotationCategory] = useState<string>("Normal");
  const [annotationSeverity, setAnnotationSeverity] = useState<string>("Low");
  const [annotations, setAnnotations] = useState<AnnotationMarker[]>([]);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [chartZoom, setChartZoom] = useState(1);
  const [isModelTrained, setIsModelTrained] = useState(false);
  const [isTrainingLoading, setIsTrainingLoading] = useState(false);

  const handleTagSelection = (tagIds: string[]) => {
    if (tagIds.length <= 5) {
      setSelectedTags(tagIds);
    }
  };

  const handleAnnotationCreate = (annotation: AnnotationMarker) => {
    setAnnotations(prev => [...prev, annotation]);
    setAnnotationMode(null);
  };

  const handleAnnotationDelete = (id: number) => {
    setAnnotations(prev => prev.filter(ann => ann.id !== id));
  };

  const handleZoomIn = () => {
    setChartZoom(prev => Math.min(prev * 1.2, 5));
  };

  const handleZoomOut = () => {
    setChartZoom(prev => Math.max(prev / 1.2, 0.2));
  };

  const handleResetZoom = () => {
    setChartZoom(1);
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
              <h1 className="text-xl font-semibold text-slate-100">TimeSeries Analytics</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                <Settings className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" className="text-slate-400 hover:text-slate-100">
                <HelpCircle className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-screen">
        {/* Sidebar */}
        <aside className="w-80 bg-slate-800 border-r border-slate-700 flex-shrink-0 overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Data Upload Section */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <h2 className="text-lg font-semibold">Data Upload</h2>
              </div>
              <FileUpload />
            </div>

            {/* Tag Selection */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <h2 className="text-lg font-semibold">Tag Selection</h2>
              </div>
              <TagSelector 
                selectedTags={selectedTags}
                onTagSelection={handleTagSelection}
                maxTags={5}
              />
            </div>

            {/* Time Window Controls */}
            <div>
              <div className="flex items-center mb-4">
                <Clock className="w-4 h-4 text-blue-500 mr-2" />
                <h2 className="text-lg font-semibold">Time Window</h2>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Window Size</label>
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
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600">
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Previous
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 bg-slate-700 border-slate-600 hover:bg-slate-600">
                    Next
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Annotation Tools */}
            <div>
              <div className="flex items-center mb-4">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                <h2 className="text-lg font-semibold">Annotations</h2>
              </div>
              <div className="space-y-3">
                <div className="text-sm text-slate-400 mb-3">
                  Click any chart point or drag to select regions for annotation
                </div>
                <Button 
                  className={`w-full ${annotationMode === 'point' ? 'bg-blue-700' : 'bg-blue-600'} hover:bg-blue-700`}
                  onClick={() => {
                    const newMode = annotationMode === 'point' ? null : 'point';
                    setAnnotationMode(newMode);
                  }}
                >
                  Point Mode {annotationMode === 'point' ? '(Active)' : ''}
                </Button>
                <Button 
                  className={`w-full ${annotationMode === 'region' ? 'bg-emerald-700' : 'bg-emerald-600'} hover:bg-emerald-700`}
                  onClick={() => {
                    const newMode = annotationMode === 'region' ? null : 'region';
                    setAnnotationMode(newMode);
                  }}
                >
                  Region Mode {annotationMode === 'region' ? '(Active)' : ''}
                </Button>
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
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                {/* Model Training Status Section */}
                <div className="border-t border-slate-600 pt-4 mt-4">
                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-3 h-3 rounded-full ${isModelTrained ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-sm text-slate-300">Model Training Status</span>
                  </div>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50"
                    onClick={handleModelTrainingConfirm}
                    disabled={isTrainingLoading || isModelTrained}
                  >
                    {isTrainingLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Training...
                      </div>
                    ) : isModelTrained ? (
                      'Model Trained ✓'
                    ) : (
                      'Confirm Model Trained'
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
                  <CardTitle className="text-xl">Time-Series Visualization</CardTitle>
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleZoomOut}
                        className="text-slate-400 hover:text-slate-100"
                      >
                        <ZoomOut className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleZoomIn}
                        className="text-slate-400 hover:text-slate-100"
                      >
                        <ZoomIn className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={handleResetZoom}
                        className="text-slate-400 hover:text-slate-100"
                      >
                        <RotateCcw className="h-4 w-4" />
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
                  annotationMode={annotationMode}
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
