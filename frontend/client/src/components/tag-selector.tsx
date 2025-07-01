import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tags, X, AlertTriangle } from "lucide-react";
import type { TagInfo } from "@shared/schema";
import api from "@/lib/api";

interface TagSelectorProps {
  selectedTags: string[];
  onTagSelection: (tagIds: string[]) => void;
  maxTags: number;
}

export function TagSelector({ selectedTags, onTagSelection, maxTags }: TagSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTags = async () => {
      try {
        setIsLoading(true);
        console.log(import.meta.env.VITE_API_BASE_URL);

        const response = await api.get('/api/tags');
        console.log("Fetched tags:", response.data);
        setAvailableTags(response.data);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
        setAvailableTags([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTags();
  }, []);

  const filteredTags = availableTags.filter(tag =>
    tag.tagLabel.toLowerCase().includes(searchQuery.toLowerCase()) ||
    tag.tagId.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleTagToggle = (tagId: string) => {
    if (selectedTags.includes(tagId)) {
      onTagSelection(selectedTags.filter(id => id !== tagId));
    } else if (selectedTags.length < maxTags) {
      onTagSelection([...selectedTags, tagId]);
    }
  };

  const removeTag = (tagId: string) => {
    onTagSelection(selectedTags.filter(id => id !== tagId));
  };

  const selectedTagsData = availableTags.filter(tag => selectedTags.includes(tag.tagId));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-slate-700 rounded animate-pulse"></div>
        <div className="h-24 bg-slate-700 rounded animate-pulse"></div>
      </div>
    );
  }

  // if (availableTags.length === 0) {
  //   return (
  //     <Card className="bg-slate-700 border-slate-600">
  //       <CardContent className="p-4 text-center">
  //         <Tags className="h-8 w-8 text-slate-400 mx-auto mb-2" />
  //         <p className="text-sm text-slate-400">No data uploaded yet</p>
  //         <p className="text-xs text-slate-500">Upload a CSV/Excel file first</p>
  //       </CardContent>
  //     </Card>
  //   );
  // }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          placeholder="Search tags..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-card border border-slate-600 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Tag Selection Count */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-slate-400">
          Selected: {selectedTags.length}/{maxTags} tags
        </span>
        {selectedTags.length >= maxTags && (
          <div className="flex items-center text-amber-400">
            <AlertTriangle className="h-3 w-3 mr-1" />
            <span>Limit reached</span>
          </div>
        )}
      </div>

      {/* Available Tags List */}
      <Card className="bg-card border-slate-600">
        <CardContent className="p-0">
          <ScrollArea className="h-48">
            <div className="p-3 space-y-2">
              {filteredTags.map((tag) => {
                const isSelected = selectedTags.includes(tag.tagId);
                const isDisabled = !isSelected && selectedTags.length >= maxTags;

                return (
                  <div
                    key={tag.tagId}
                    className={`flex items-center space-x-3 p-2 rounded-md cursor-pointer transition-colors ${
                      isSelected 
                        ? 'bg-blue-500/20 border border-blue-500/30' 
                        : isDisabled
                        ? 'opacity-50 cursor-not-allowed'
                        : 'hover:bg-slate-600'
                    }`}
                    onClick={() => !isDisabled && handleTagToggle(tag.tagId)}
                  >
                    <Checkbox
                      checked={isSelected}
                      disabled={isDisabled}
                      className="data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full flex-shrink-0"
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <span className="text-sm font-medium truncate">
                          {tag.tagId}: {tag.tagLabel}
                        </span>
                      </div>
                      <div className="text-xs text-slate-400">
                        {tag.unit} • Range: {tag.minRange}-{tag.maxRange}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Selected Tags Display */}
      {selectedTagsData.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-300">Selected Tags:</p>
          <div className="space-y-2">
            {selectedTagsData.map((tag) => (
              <div key={tag.tagId} className="flex items-center justify-between p-2  rounded-md">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: tag.color }}
                  ></div>
                  <span className="text-sm font-medium">{tag.tagId}: {tag.tagLabel}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeTag(tag.tagId)}
                  className="h-6 w-6 p-0 text-slate-400 hover:text-red-400"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
