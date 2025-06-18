import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Settings, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { Rule, TagInfo } from "@shared/schema";

interface RulesManagementProps {
  selectedTags: string[];
}

interface StagedRule {
  id: string;
  tagId: string;
  condition: string;
  threshold: number;
  thresholdMax?: number;
  severity: string;
  isActive: boolean;
}

export function RulesManagement({ selectedTags }: RulesManagementProps) {
  const [stagedRules, setStagedRules] = useState<StagedRule[]>([]);
  const [currentRule, setCurrentRule] = useState({
    tagId: '',
    condition: 'greater_than',
    threshold: 80,
    thresholdMax: 90,
    severity: 'Medium'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get available tags
  const { data: availableTags = [] } = useQuery<TagInfo[]>({
    queryKey: ['/api/tags'],
  });

  // Get existing rules
  const { data: existingRules = [] } = useQuery<Rule[]>({
    queryKey: ['/api/rules'],
  });

  const createRuleMutation = useMutation({
    mutationFn: async (rules: Omit<Rule, 'id'>[]) => {
      const results = [];
      for (const rule of rules) {
        const response = await apiRequest('POST', '/api/rules', rule);
        const result = await response.json();
        results.push(result);
      }
      return results;
    },
    onSuccess: () => {
      setStagedRules([]);
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Rules Saved",
        description: "All staged rules have been saved successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Save Rules",
        description: error.message || "Failed to save rules",
        variant: "destructive",
      });
    }
  });

  const deleteRuleMutation = useMutation({
    mutationFn: async (ruleId: number) => {
      await apiRequest('DELETE', `/api/rules/${ruleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rules'] });
      toast({
        title: "Rule Deleted",
        description: "Rule has been deleted successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Rule",
        description: error.message || "Failed to delete rule",
        variant: "destructive",
      });
    }
  });

  const handleStageRule = () => {
    if (!currentRule.tagId) {
      toast({
        title: "Invalid Rule",
        description: "Please select a tag",
        variant: "destructive",
      });
      return;
    }

    const newRule: StagedRule = {
      id: `staged-${Date.now()}`,
      tagId: currentRule.tagId,
      condition: currentRule.condition,
      threshold: currentRule.threshold,
      thresholdMax: currentRule.condition === 'between' ? currentRule.thresholdMax : undefined,
      severity: currentRule.severity,
      isActive: true,
    };

    setStagedRules(prev => [...prev, newRule]);
    
    // Reset form
    setCurrentRule({
      tagId: '',
      condition: 'greater_than',
      threshold: 80,
      thresholdMax: 90,
      severity: 'Medium'
    });
  };

  const handleRemoveStagedRule = (ruleId: string) => {
    setStagedRules(prev => prev.filter(rule => rule.id !== ruleId));
  };

  const handleSaveAllRules = () => {
    if (stagedRules.length === 0) {
      toast({
        title: "No Rules to Save",
        description: "Please stage some rules first",
        variant: "destructive",
      });
      return;
    }

    const rulesToSave = stagedRules.map(rule => ({
      tagId: rule.tagId,
      condition: convertConditionToApi(rule.condition),
      threshold: rule.threshold,
      thresholdMax: rule.thresholdMax || null,
      severity: rule.severity.toLowerCase(),
      isActive: rule.isActive,
    }));

    createRuleMutation.mutate(rulesToSave);
  };

  const convertConditionToApi = (condition: string) => {
    switch (condition) {
      case 'greater_than':
        return '>';
      case 'less_than':
        return '<';
      case 'equal_to':
        return '=';
      case 'greater_equal':
        return '>=';
      case 'less_equal':
        return '<=';
      case 'between':
        return 'between';
      default:
        return condition;
    }
  };

  const getConditionDisplay = (condition: string, threshold: number, thresholdMax?: number) => {
    switch (condition) {
      case 'greater_than':
        return `> ${threshold}%`;
      case 'less_than':
        return `< ${threshold}%`;
      case 'equal_to':
        return `= ${threshold}%`;
      case 'between':
        return `${threshold}% - ${thresholdMax}%`;
      default:
        return `${condition} ${threshold}%`;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'high':
        return 'bg-red-900 text-red-300 border-red-700';
      case 'medium':
        return 'bg-amber-900 text-amber-300 border-amber-700';
      case 'low':
        return 'bg-emerald-900 text-emerald-300 border-emerald-700';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  const availableTagOptions = availableTags.filter(tag => 
    selectedTags.length === 0 || selectedTags.includes(tag.tagId)
  );

  return (
    <Card className="bg-slate-800 border-slate-700">
      <CardHeader className="border-b border-slate-700">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2 text-blue-500" />
            Rules Management
          </CardTitle>
          <Button
            onClick={handleSaveAllRules}
            disabled={stagedRules.length === 0 || createRuleMutation.isPending}
            className="bg-emerald-600 hover:bg-emerald-700"
            size="sm"
          >
            <Save className="w-4 h-4 mr-1" />
            Save All Rules
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Rule Form */}
        <Card className="bg-slate-700 border-slate-600 mb-6">
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1">Tag</Label>
                  <Select 
                    value={currentRule.tagId} 
                    onValueChange={(value) => setCurrentRule(prev => ({ ...prev, tagId: value }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue placeholder="Select tag" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableTagOptions.map(tag => (
                        <SelectItem key={tag.tagId} value={tag.tagId}>
                          {tag.tagId}: {tag.tagLabel}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm font-medium mb-1">Condition</Label>
                  <Select 
                    value={currentRule.condition} 
                    onValueChange={(value) => setCurrentRule(prev => ({ ...prev, condition: value }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="greater_than">Greater than</SelectItem>
                      <SelectItem value="less_than">Less than</SelectItem>
                      <SelectItem value="equal_to">Equal to</SelectItem>
                      <SelectItem value="between">Between</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium mb-1">Threshold (%)</Label>
                  <Input
                    type="number"
                    value={currentRule.threshold}
                    onChange={(e) => setCurrentRule(prev => ({ ...prev, threshold: Number(e.target.value) }))}
                    className="bg-slate-800 border-slate-600"
                    min="0"
                    max="100"
                  />
                </div>
                {currentRule.condition === 'between' && (
                  <div>
                    <Label className="text-sm font-medium mb-1">Max Threshold (%)</Label>
                    <Input
                      type="number"
                      value={currentRule.thresholdMax}
                      onChange={(e) => setCurrentRule(prev => ({ ...prev, thresholdMax: Number(e.target.value) }))}
                      className="bg-slate-800 border-slate-600"
                      min="0"
                      max="100"
                    />
                  </div>
                )}
                <div>
                  <Label className="text-sm font-medium mb-1">Severity</Label>
                  <Select 
                    value={currentRule.severity} 
                    onValueChange={(value) => setCurrentRule(prev => ({ ...prev, severity: value }))}
                  >
                    <SelectTrigger className="bg-slate-800 border-slate-600">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Low">Low</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="High">High</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button 
                onClick={handleStageRule}
                className="w-full bg-blue-600 hover:bg-blue-700"
                disabled={!currentRule.tagId}
              >
                <Plus className="w-4 h-4 mr-2" />
                Stage Rule
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Staged Rules */}
        {stagedRules.length > 0 && (
          <div className="mb-6">
            <Label className="text-sm font-medium mb-2 block">Staged Rules</Label>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {stagedRules.map((rule) => {
                  const tag = availableTags.find(t => t.tagId === rule.tagId);
                  return (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {tag?.tagLabel || rule.tagId} {getConditionDisplay(rule.condition, rule.threshold, rule.thresholdMax)}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`text-xs ${getSeverityColor(rule.severity)}`}>
                            {rule.severity}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveStagedRule(rule.id)}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Existing Rules */}
        {existingRules.length > 0 && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Active Rules</Label>
            <ScrollArea className="h-40">
              <div className="space-y-2">
                {existingRules.map((rule) => {
                  const tag = availableTags.find(t => t.tagId === rule.tagId);
                  return (
                    <div key={rule.id} className="flex items-center justify-between p-3 bg-slate-700 rounded-lg">
                      <div className="flex-1">
                        <div className="text-sm font-medium">
                          {tag?.tagLabel || rule.tagId} {getConditionDisplay(rule.condition, rule.threshold, rule.thresholdMax)}
                        </div>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge className={`text-xs ${getSeverityColor(rule.severity)}`}>
                            {rule.severity}
                          </Badge>
                          {!rule.isActive && (
                            <Badge variant="outline" className="text-xs border-slate-600 text-slate-400">
                              Inactive
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteRuleMutation.mutate(rule.id)}
                        disabled={deleteRuleMutation.isPending}
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}

        {existingRules.length === 0 && stagedRules.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-slate-700 rounded-lg mx-auto mb-4 flex items-center justify-center">
              ⚙️
            </div>
            <p className="text-slate-400 font-medium mb-1">No Rules Defined</p>
            <p className="text-sm text-slate-500">Create rules to monitor your data automatically</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
