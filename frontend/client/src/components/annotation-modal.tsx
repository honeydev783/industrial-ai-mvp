import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import type { TagInfo, AnnotationMarker } from '@shared/schema';

interface AnnotationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  annotationData: {
    type: 'point' | 'region';
    timestamp?: Date;
    regionStart?: Date;
    regionEnd?: Date;
    tagId: string;
    tag: TagInfo;
    value?: number;
    normalizedValue?: number;
    actualValue?: number;
    pointsInRegion?: any[];
    predefinedDescription?: string;
    duration?: number;
    valueRanges?: Array<{
      tagId: string;
      tagLabel: string;
      unit: string;
      min: number;
      max: number;
    }>;
  } | null;
  onCreateAnnotation: (annotation: AnnotationMarker) => void;
}

export function AnnotationModal({ 
  open, 
  onOpenChange, 
  annotationData, 
  onCreateAnnotation 
}: AnnotationModalProps) {
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Good');
  const [severity, setSeverity] = useState('Low');

  // Set predefined description for region annotations
  useEffect(() => {
    if (annotationData?.predefinedDescription) {
      setDescription(annotationData.predefinedDescription);
    } else {
      setDescription('');
    }
  }, [annotationData]);

  if (!annotationData) return null;

  const handleSubmit = () => {
    if (!description.trim()) return;

    const baseAnnotation = {
      id: Date.now(), // Temporary ID, will be replaced by backend
      tagId: annotationData.tagId,
      type: annotationData.type,
      category,
      severity,
      description: description.trim(),
    };

    if (annotationData.type === 'point') {
      const annotation: AnnotationMarker = {
        ...baseAnnotation,
        timestamp: annotationData.timestamp!,
        value: annotationData.actualValue || 0,
        normalizedValue: annotationData.normalizedValue || 0,
      } as AnnotationMarker;

      onCreateAnnotation(annotation);
    } else if (annotationData.type === 'region') {
      const annotation: AnnotationMarker = {
        ...baseAnnotation,
        timestamp: annotationData.regionStart!,
        regionStart: annotationData.regionStart!,
        regionEnd: annotationData.regionEnd!,
        value: 0, // Region doesn't have a specific value
        normalizedValue: 0,
      } as AnnotationMarker;

      onCreateAnnotation(annotation);
    }

    // Reset form
    setDescription('');
    setCategory('Good');
    setSeverity('Low');
    onOpenChange(false);
  };

  const handleCancel = () => {
    setDescription('');
    setCategory('Good');
    setSeverity('Low');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-slate-100">
            Add {annotationData.type === 'point' ? 'Point' : 'Region'} Annotation
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          {/* Display selected data info */}
          <div className="bg-slate-800 p-3 rounded-lg border border-slate-700">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-400">Tag:</span>
                <span className="text-slate-200">{annotationData.tag.tagLabel} ({annotationData.tagId})</span>
              </div>
              
              {annotationData.type === 'point' ? (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Time:</span>
                    <span className="text-slate-200">
                      {format(annotationData.timestamp!, 'PPpp')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Value:</span>
                    <span className="text-slate-200">
                      {annotationData.actualValue?.toFixed(2)} {annotationData.tag.unit} 
                      ({annotationData.normalizedValue?.toFixed(1)}%)
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Start:</span>
                    <span className="text-slate-200">
                      {format(annotationData.regionStart!, 'PPpp')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">End:</span>
                    <span className="text-slate-200">
                      {format(annotationData.regionEnd!, 'PPpp')}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-slate-200">
                      {annotationData.duration || Math.round((annotationData.regionEnd!.getTime() - annotationData.regionStart!.getTime()) / 60000)} minutes
                    </span>
                  </div>
                  
                  {/* Value Ranges in the same section */}
                  {annotationData.valueRanges && (
                    <>
                      <div className="border-t border-slate-600 mt-2 pt-2">
                        <h4 className="text-sm font-medium text-slate-200 mb-2">Value Ranges</h4>
                        {annotationData.valueRanges.map((range) => (
                          <div key={range.tagId} className="flex justify-between text-sm mb-1">
                            <span className="text-slate-400">{range.tagLabel}:</span>
                            <span className="text-slate-200">
                              {range.min.toFixed(2)} - {range.max.toFixed(2)} {range.unit}
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Description */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="description" className="text-right text-slate-300">
              Description
            </Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter annotation description..."
              className="col-span-3 bg-slate-800 border-slate-600 text-slate-100"
              rows={3}
            />
          </div>

          {/* Category */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="category" className="text-right text-slate-300">
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="col-span-3 bg-slate-800 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="Good">Good</SelectItem>
                <SelectItem value="Bad">Bad</SelectItem>
                <SelectItem value="Fault">Fault</SelectItem>
                <SelectItem value="Anomaly">Anomaly</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severity */}
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="severity" className="text-right text-slate-300">
              Severity
            </Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger className="col-span-3 bg-slate-800 border-slate-600 text-slate-100">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-600">
                <SelectItem value="Low">Low</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="High">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button 
            variant="outline" 
            onClick={handleCancel}
            className="bg-slate-800 border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={!description.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Create Annotation
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}