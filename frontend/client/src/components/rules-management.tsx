import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Settings, Trash2, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";
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
  description?: string;
  isActive: boolean;
}

export function RulesManagement({ selectedTags }: RulesManagementProps) {
  const [stagedRules, setStagedRules] = useState<StagedRule[]>([]);
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([]);
  const [existingRules, setExistingRules] = useState<Rule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [currentRule, setCurrentRule] = useState({
    tagId: '',
    condition: 'greater_than',
    threshold: 80,
    thresholdMax: 90,
    severity: 'medium',
    description: ''
  });

  const { toast } = useToast();

  // Fetch available tags and existing rules
  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [tagsResponse, rulesResponse] = await Promise.all([
          api.get('/api/tags'),
          api.get('/api/rules')
        ]);
        setAvailableTags(tagsResponse.data);
        setExistingRules(rulesResponse.data);
      } catch (error) {
        console.error('Failed to fetch data:', error);
        toast({
          title: "Error",
          description: "Failed to load tags and rules",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [toast]);

  const createRules = async (rules: any[]) => {
    try {
      const results = [];
      for (const rule of rules) {
        const response = await api.post('/api/rules', rule);
        results.push(response.data);
      }
      
      setStagedRules([]);
      // Refresh existing rules
      const rulesResponse = await api.get('/api/rules');
      setExistingRules(rulesResponse.data);
      
      toast({
        title: "Rules Saved",
        description: "All staged rules have been saved successfully",
      });
      
      return results;
    } catch (error: any) {
      console.error('API Error:', error);
      const errorMessage = error.response?.data?.detail || error.message || "Failed to save rules";
      toast({
        title: "Failed to Save Rules",
        description: typeof errorMessage === 'string' ? errorMessage : JSON.stringify(errorMessage),
        variant: "destructive",
      });
    }
  };

  const deleteRule = async (ruleId: number) => {
    try {
      await api.delete(`/api/rules/${ruleId}`);
      
      // Refresh existing rules
      const rulesResponse = await api.get('/api/rules');
      setExistingRules(rulesResponse.data);
      
      toast({
        title: "Rule Deleted",
        description: "Rule has been deleted successfully",
      });
    } catch (error: any) {
      toast({
        title: "Failed to Delete Rule",
        description: error.response?.data?.detail || error.message || "Failed to delete rule",
        variant: "destructive",
      });
    }
  };

  const addRule = () => {
    if (!currentRule.tagId) {
      toast({
        title: "Invalid Rule",
        description: "Please select a tag for the rule",
        variant: "destructive",
      });
      return;
    }

    const newRule: StagedRule = {
      id: Math.random().toString(36).substr(2, 9),
      tagId: currentRule.tagId,
      condition: currentRule.condition,
      threshold: currentRule.threshold,
      thresholdMax: currentRule.condition === 'between' ? currentRule.thresholdMax : undefined,
      severity: currentRule.severity,
      description: currentRule.description,
      isActive: true
    };
    console.log("Adding new rule:", newRule);
    setStagedRules(prev => [...prev, newRule]);
    setCurrentRule({
      tagId: '',
      condition: 'greater_than',
      threshold: 80,
      thresholdMax: 90,
      severity: 'medium',
      description: ''
    });
  };

  const removeStagedRule = (id: string) => {
    setStagedRules(prev => prev.filter(rule => rule.id !== id));
  };

  const saveAllRules = async () => {
    if (stagedRules.length === 0) {
      toast({
        title: "No Rules to Save",
        description: "Please add some rules first",
        variant: "destructive",
      });
      return;
    }

    const conditionMap: Record<string, string> = {
      'greater_than': 'greater_than',
      'less_than': 'less_than',
      'equals': 'equals',
      'greater_equal': 'greater_equal',
      'less_equal': 'less_equal',
      'between': 'between'
    };

    const rulesToCreate = stagedRules.map(rule => ({
      tagId: rule.tagId,
      condition: conditionMap[rule.condition] || rule.condition,
      threshold: Number(rule.threshold),
      thresholdMax: rule.thresholdMax ? Number(rule.thresholdMax) : undefined,
      severity: rule.severity.toLowerCase(),
      isActive: rule.isActive,
      description: rule.description || ''
    }));

    await createRules(rulesToCreate);
  };

  const getSeverityBadgeColor = (severity: string) => {
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

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5" />
            <span>Rules Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">Loading rules...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Settings className="h-5 w-5" />
          <span>Rules Management</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Rule Form */}
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Add New Rule</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="tagId">Tag</Label>
              <Select
                value={currentRule.tagId}
                onValueChange={(value) => setCurrentRule(prev => ({ ...prev, tagId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a tag" />
                </SelectTrigger>
                <SelectContent>
                  {availableTags
                    .filter((tag: TagInfo) => selectedTags.length === 0 || selectedTags.includes(tag.tagId))
                    .map((tag: TagInfo) => (
                    <SelectItem key={tag.tagId} value={tag.tagId}>
                      {tag.tagLabel} ({tag.tagId})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="condition">Condition</Label>
              <Select
                value={currentRule.condition}
                onValueChange={(value) => setCurrentRule(prev => ({ ...prev, condition: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="greater_than">Greater Than</SelectItem>
                  <SelectItem value="less_than">Less Than</SelectItem>
                  <SelectItem value="equals">Equals</SelectItem>
                  <SelectItem value="greater_equal">Greater or Equal</SelectItem>
                  <SelectItem value="less_equal">Less or Equal</SelectItem>
                  <SelectItem value="between">Between</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="threshold">Threshold</Label>
              <Input
                type="number"
                value={currentRule.threshold}
                onChange={(e) => setCurrentRule(prev => ({ ...prev, threshold: Number(e.target.value) }))}
              />
            </div>

            {currentRule.condition === 'between' && (
              <div>
                <Label htmlFor="thresholdMax">Max Threshold</Label>
                <Input
                  type="number"
                  value={currentRule.thresholdMax}
                  onChange={(e) => setCurrentRule(prev => ({ ...prev, thresholdMax: Number(e.target.value) }))}
                />
              </div>
            )}

            <div>
              <Label htmlFor="severity">Severity</Label>
              <Select
                value={currentRule.severity}
                onValueChange={(value) => setCurrentRule(prev => ({ ...prev, severity: value }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Input
              type="text"
              placeholder="Optional rule description"
              value={currentRule.description}
              onChange={(e) => setCurrentRule(prev => ({ ...prev, description: e.target.value }))}
            />
          </div>

          <Button onClick={addRule} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Rule
          </Button>
        </div>

        {/* Staged Rules */}
        {stagedRules.length > 0 && (
          <div className="border rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Staged Rules ({stagedRules.length})</h4>
              <Button onClick={saveAllRules} size="sm">
                <Save className="h-4 w-4 mr-2" />
                Save All
              </Button>
            </div>
            <ScrollArea className="h-48">
              <div className="p-3 space-y-2">
                {stagedRules.map((rule) => {
                  const tag = availableTags.find((t: TagInfo) => t.tagId === rule.tagId);
                  return (
                    <div key={rule.id} className="flex items-center justify-between p-2 bg-slate-800 rounded">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline">{tag?.tagLabel || rule.tagId}</Badge>
                          <span className="text-sm">
                            {rule.condition} {rule.threshold}
                            {rule.thresholdMax && ` - ${rule.thresholdMax}`}
                          </span>
                          <Badge className={getSeverityBadgeColor(rule.severity)}>
                            {rule.severity}
                          </Badge>
                        </div>
                        {rule.description && (
                          <div className="text-xs text-slate-400 pl-2">
                            {rule.description}
                          </div>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeStagedRule(rule.id)}
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
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium">Existing Rules ({existingRules.length})</h4>
          <ScrollArea className="h-60">
            <div className="p-3 space-y-2">
              {existingRules.map((rule) => {
                const tag = availableTags.find((t: TagInfo) => t.tagId === rule.tagId);
                return (
                  <div key={rule.id} className="flex items-center justify-between p-2 bg-slate-800/50 rounded">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">{tag?.tagLabel || rule.tagId}</Badge>
                        <span className="text-sm">
                          {rule.condition} {rule.threshold}
                          {rule.thresholdMax && ` - ${rule.thresholdMax}`}
                        </span>
                        <Badge className={getSeverityBadgeColor(rule.severity)}>
                          {rule.severity}
                        </Badge>
                        {!rule.isActive && (
                          <Badge variant="secondary">Inactive</Badge>
                        )}
                      </div>
                      {rule.description && (
                        <div className="text-xs text-slate-400 pl-2">
                          {rule.description}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteRule(rule.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                );
              })}
              {existingRules.length === 0 && (
                <div className="text-center text-gray-500 py-4">
                  No rules configured yet
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}