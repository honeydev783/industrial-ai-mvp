import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { AnnotationMarker } from "@shared/schema";

interface SaveGraphModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedTags: string[];
  timeWindow: string;
  annotations: AnnotationMarker[];
}

export function SaveGraphModal({ 
  open, 
  onOpenChange, 
  selectedTags, 
  timeWindow, 
  annotations 
}: SaveGraphModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    includeAnnotations: false,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const saveMutation = useMutation({
    mutationFn: async (graphData: any) => {
      const response = await apiRequest('POST', '/api/saved-graphs', graphData);
      return await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-graphs'] });
      toast({
        title: "Graph Saved",
        description: "Your graph has been saved successfully",
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Graph",
        description: error.message || "Failed to save graph",
        variant: "destructive",
      });
    }
  });

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      includeAnnotations: false,
    });
    onOpenChange(false);
  };

  const handleSave = () => {
    if (!formData.name.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please enter a graph name",
        variant: "destructive",
      });
      return;
    }

    if (selectedTags.length === 0) {
      toast({
        title: "No Tags Selected",
        description: "Please select at least one tag to save",
        variant: "destructive",
      });
      return;
    }

    const graphData = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      selectedTags,
      timeWindow,
      includeAnnotations: formData.includeAnnotations,
      chartConfig: {
        tags: selectedTags,
        timeWindow,
        annotations: formData.includeAnnotations ? annotations : [],
        savedAt: new Date().toISOString(),
        version: '1.0',
      },
    };

    saveMutation.mutate(graphData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-800 border-slate-700 text-slate-100">
        <DialogHeader>
          <DialogTitle>Save Graph</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="graph-name" className="text-sm font-medium mb-2 block">
              Graph Name <span className="text-red-400">*</span>
            </Label>
            <Input
              id="graph-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter graph name"
              className="bg-slate-700 border-slate-600 focus:ring-blue-500"
            />
          </div>
          
          <div>
            <Label htmlFor="graph-description" className="text-sm font-medium mb-2 block">
              Description (Optional)
            </Label>
            <Textarea
              id="graph-description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Add description..."
              className="bg-slate-700 border-slate-600 focus:ring-blue-500 resize-none"
              rows={3}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="include-annotations"
                checked={formData.includeAnnotations}
                onCheckedChange={(checked) => 
                  setFormData(prev => ({ ...prev, includeAnnotations: checked === true }))
                }
                className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
              />
              <Label htmlFor="include-annotations" className="text-sm">
                Include annotations ({annotations.length} total)
              </Label>
            </div>

            <div className="bg-slate-700 rounded-lg p-3 space-y-2">
              <p className="text-sm font-medium text-slate-300">Graph Summary:</p>
              <div className="grid grid-cols-2 gap-4 text-xs text-slate-400">
                <div>
                  <span className="font-medium">Tags:</span> {selectedTags.length}
                </div>
                <div>
                  <span className="font-medium">Time Window:</span> {timeWindow}
                </div>
                <div>
                  <span className="font-medium">Annotations:</span> {annotations.length}
                </div>
                <div>
                  <span className="font-medium">Created:</span> {new Date().toLocaleDateString()}
                </div>
              </div>
              {selectedTags.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-medium text-slate-400 mb-1">Selected Tags:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map(tagId => (
                      <span 
                        key={tagId}
                        className="inline-block bg-slate-600 text-slate-300 text-xs px-2 py-1 rounded"
                      >
                        {tagId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={handleClose}
            className="bg-slate-700 border-slate-600 text-slate-300 hover:bg-slate-600"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saveMutation.isPending || !formData.name.trim() || selectedTags.length === 0}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {saveMutation.isPending ? "Saving..." : "Save Graph"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
