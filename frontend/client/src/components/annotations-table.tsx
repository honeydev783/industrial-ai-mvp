import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, List } from "lucide-react";
import { format } from "date-fns";
import type { AnnotationMarker } from "@shared/schema";

interface AnnotationsTableProps {
  annotations: AnnotationMarker[];
  onDeleteAnnotation: (id: number) => void;
}

const getSeverityColor = (severity: string) => {
  switch (severity.toLowerCase()) {
    case 'high':
      return 'bg-red-900 text-red-300';
    case 'medium':
      return 'bg-amber-900 text-amber-300';
    case 'low':
      return 'bg-emerald-900 text-emerald-300';
    default:
      return 'bg-slate-700 text-slate-300';
  }
};

const getCategoryColor = (category: string) => {
  switch (category.toLowerCase()) {
    case 'critical':
      return 'bg-red-900 text-red-300';
    case 'warning':
      return 'bg-amber-900 text-amber-300';
    case 'anomaly':
      return 'bg-purple-900 text-purple-300';
    case 'normal':
      return 'bg-slate-700 text-slate-300';
    default:
      return 'bg-slate-700 text-slate-300';
  }
};

const getTagColor = (tagId: string) => {
  const colors = ['#3B82F6', '#F97316', '#10B981', '#EF4444', '#8B5CF6'];
  const index = tagId.charCodeAt(0) % colors.length;
  return colors[index];
};

export function AnnotationsTable({ annotations, onDeleteAnnotation }: AnnotationsTableProps) {
  if (annotations.length === 0) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="flex items-center">
            <List className="w-5 h-5 mr-2 text-blue-500" />
            Annotations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
              📝
            </div>
            <p className="text-slate-400 font-medium mb-1">No Annotations Yet</p>
            <p className="text-sm text-slate-500">Click on chart points to add annotations</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="border-b border-slate-700">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <List className="w-5 h-5 mr-2 text-blue-500" />
            Annotations
          </div>
          <Badge variant="secondary" className="bg-slate-700 text-slate-300">
            {annotations.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700 hover:bg-slate-750">
                <TableHead className="text-slate-400">Time</TableHead>
                <TableHead className="text-slate-400">Tag</TableHead>
                <TableHead className="text-slate-400">Type</TableHead>
                <TableHead className="text-slate-400">Value</TableHead>
                <TableHead className="text-slate-400 w-16">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {annotations.map((annotation) => (
                <TableRow key={annotation.id} className="border-slate-700 hover:bg-slate-750">
                  <TableCell className="text-slate-300 font-mono text-xs">
                    {format(annotation.timestamp, 'HH:mm:ss')}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div 
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getTagColor(annotation.tagId) }}
                      />
                      <span className="text-sm text-slate-300">{annotation.tagId}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <Badge 
                        className={`text-xs px-2 py-1 ${getCategoryColor(annotation.category)}`}
                      >
                        {annotation.category}
                      </Badge>
                      <Badge 
                        className={`text-xs px-2 py-1 ${getSeverityColor(annotation.severity)}`}
                      >
                        {annotation.severity}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell className="text-slate-300">
                    <div className="text-sm">
                      <div className="font-medium">{annotation.normalizedValue.toFixed(1)}%</div>
                      {annotation.type === 'region' && annotation.regionStart && annotation.regionEnd && (
                        <div className="text-xs text-slate-400">
                          {format(annotation.regionStart, 'HH:mm')} - {format(annotation.regionEnd, 'HH:mm')}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteAnnotation(annotation.id)}
                      className="h-8 w-8 p-0 text-slate-400 hover:text-red-400 hover:bg-red-400/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
