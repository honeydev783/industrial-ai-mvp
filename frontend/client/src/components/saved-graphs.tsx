import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bookmark, Download, Trash2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { queryClient } from "@/lib/queryClient";
import api from "@/lib/api";
import type { SavedGraph } from "@shared/schema";

export function SavedGraphs() {
  const { toast } = useToast();

  const { data: savedGraphs = [], isLoading } = useQuery<SavedGraph[]>({
    queryKey: ['/api/saved-graphs'],
    queryFn: async () => {
      const response = await api.get('/api/saved-graphs');
      return response.data;
    }
  });

  const deleteGraphMutation = useMutation({
    mutationFn: async (graphId: number) => {
      await api.delete(`/api/saved-graphs/${graphId}`);
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
        description: error.response?.data?.detail || error.message || "Failed to delete graph",
        variant: "destructive",
      });
    }
  });

  const handleDownload = async (graph: SavedGraph) => {
    try {
      const response = await api.get(`/api/saved-graphs/${graph.id}`);
      const graphData = response.data;
      
      const dataStr = JSON.stringify(graphData, null, 2);
      const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
      
      const exportFileDefaultName = `graph-${graph.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.json`;
      
      const linkElement = document.createElement('a');
      linkElement.setAttribute('href', dataUri);
      linkElement.setAttribute('download', exportFileDefaultName);
      linkElement.click();
      
      toast({
        title: "Graph Downloaded",
        description: "Graph configuration has been downloaded successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Download Graph",
        description: error.response?.data?.detail || error.message || "Failed to download graph",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bookmark className="h-5 w-5" />
            <span>Saved Graphs</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading saved graphs...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Bookmark className="h-5 w-5" />
          <span>Saved Graphs</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          <div className="p-3 space-y-3">
            {savedGraphs.map((graph: SavedGraph) => (
              <div
                key={graph.id}
                className="border rounded-lg p-4 space-y-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <h4 className="font-medium">{graph.name}</h4>
                    {graph.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {graph.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDownload(graph)}
                      title="Download graph configuration"
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteGraphMutation.mutate(graph.id)}
                      title="Delete graph"
                      disabled={deleteGraphMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-1">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-600 dark:text-gray-400">
                        {format(new Date(graph.createdAt || new Date()), 'MMM dd, yyyy')}
                      </span>
                    </div>
                    <span className="text-gray-600 dark:text-gray-400">
                      Window: {graph.timeWindow}
                    </span>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-1">
                  {Array.isArray(graph.selectedTags) && graph.selectedTags.map((tagId: string, index: number) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {tagId}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
            
            {savedGraphs.length === 0 && (
              <div className="text-center text-gray-500 py-8">
                No saved graphs yet. Save a graph from the main dashboard to see it here.
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}