import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Download, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { SavedGraph } from "@shared/schema";

export function SavedGraphs() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: savedGraphs = [], isLoading } = useQuery<SavedGraph[]>({
    queryKey: ['/api/saved-graphs'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (graphId: number) => {
      await apiRequest('DELETE', `/api/saved-graphs/${graphId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/saved-graphs'] });
      toast({
        title: "Graph Deleted",
        description: "Saved graph has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Graph",
        description: error.message || "Failed to delete saved graph",
        variant: "destructive",
      });
    }
  });

  const handleDownload = async (graph: SavedGraph) => {
    try {
      const dataToExport = {
        id: graph.id,
        name: graph.name,
        description: graph.description,
        selectedTags: graph.selectedTags,
        timeWindow: graph.timeWindow,
        includeAnnotations: graph.includeAnnotations,
        chartConfig: graph.chartConfig,
        createdAt: graph.createdAt,
        exportedAt: new Date().toISOString(),
      };

      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { 
        type: 'application/json' 
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${graph.name.replace(/\s+/g, '_')}_${graph.id}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download Complete",
        description: "Graph data has been exported as JSON",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to export graph data",
        variant: "destructive",
      });
    }
  };

  const getTagColors = (tagIds: string[]) => {
    const colors = ['#3B82F6', '#F97316', '#10B981', '#EF4444', '#8B5CF6'];
    return tagIds.map((_, index) => colors[index % colors.length]);
  };

  if (isLoading) {
    return (
      <Card className="bg-slate-800 border-slate-700">
        <CardHeader className="border-b border-slate-700">
          <CardTitle className="flex items-center">
            <Bookmark className="w-5 h-5 mr-2 text-blue-500" />
            Saved Graphs
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-slate-700 rounded-lg animate-pulse h-32"></div>
            ))}
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
            <Bookmark className="w-5 h-5 mr-2 text-blue-500" />
            Saved Graphs
          </div>
          <Badge variant="secondary" className="bg-slate-700 text-slate-300">
            {savedGraphs.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {savedGraphs.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-slate-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
              📊
            </div>
            <p className="text-slate-400 font-medium mb-1">No Saved Graphs</p>
            <p className="text-sm text-slate-500">Create and save graphs to access them later</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {savedGraphs.map((graph) => {
              const tagIds = Array.isArray(graph.selectedTags) ? graph.selectedTags : [];
              const tagColors = getTagColors(tagIds);
              
              return (
                <Card key={graph.id} className="bg-slate-700 border-slate-600 hover:bg-slate-600 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm text-slate-200 truncate flex-1 mr-2">
                        {graph.name}
                      </h4>
                      <div className="flex space-x-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDownload(graph)}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-blue-400"
                        >
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteMutation.mutate(graph.id)}
                          disabled={deleteMutation.isPending}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="text-xs text-slate-400 mb-2 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      {graph.createdAt ? format(new Date(graph.createdAt), 'MMM dd, yyyy') : 'Unknown date'}
                    </div>
                    
                    <div className="text-xs text-slate-400 mb-3">
                      {tagIds.length} tag{tagIds.length !== 1 ? 's' : ''} • {graph.timeWindow}
                      {graph.includeAnnotations && ' • Annotations'}
                    </div>
                    
                    {graph.description && (
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2">
                        {graph.description}
                      </p>
                    )}
                    
                    <div className="flex flex-wrap gap-1">
                      {tagIds.slice(0, 5).map((tagId, index) => (
                        <Badge
                          key={tagId}
                          className="text-xs px-2 py-1 border"
                          style={{
                            backgroundColor: `${tagColors[index]}20`,
                            borderColor: `${tagColors[index]}40`,
                            color: tagColors[index],
                          }}
                        >
                          {typeof tagId === 'string' ? tagId : `Tag ${index + 1}`}
                        </Badge>
                      ))}
                      {tagIds.length > 5 && (
                        <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                          +{tagIds.length - 5} more
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
