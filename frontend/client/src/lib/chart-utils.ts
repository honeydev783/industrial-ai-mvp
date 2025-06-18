import type { TimeSeriesData, TagInfo, ChartDataPoint } from "@shared/schema";

export function normalizeChartData(
  timeSeriesData: TimeSeriesData[],
  selectedTags: string[]
): ChartDataPoint[] {
  if (!timeSeriesData || timeSeriesData.length === 0) {
    return [];
  }

  // Group data by timestamp
  const groupedData = new Map<string, Record<string, any>>();

  timeSeriesData.forEach(item => {
    if (!selectedTags.includes(item.tagId)) return;

    // Ensure timestamp is a Date object
    const timestamp = item.timestamp instanceof Date ? item.timestamp : new Date(item.timestamp);
    const timestampKey = timestamp.toISOString();
    
    if (!groupedData.has(timestampKey)) {
      groupedData.set(timestampKey, {
        timestamp: timestamp.getTime(),
        originalTimestamp: timestamp,
      });
    }

    const group = groupedData.get(timestampKey)!;
    group[item.tagId] = item.normalizedValue;
    group[`${item.tagId}_raw`] = (item as any).value;
    group[`${item.tagId}_unit`] = item.unit;
  });

  // Convert to array and sort by timestamp
  return Array.from(groupedData.values())
    .sort((a, b) => a.timestamp - b.timestamp)
    .map(item => ({
      timestamp: item.timestamp, // Use numeric timestamp for Recharts
      originalTimestamp: item.originalTimestamp,
      ...Object.fromEntries(
        selectedTags.map(tagId => [tagId, item[tagId] || null])
      )
    } as any));
}

export function getTagColors(availableTags: TagInfo[], selectedTags: string[]): Record<string, string> {
  const colors = ['#3B82F6', '#F97316', '#10B981', '#EF4444', '#8B5CF6'];
  const tagColors: Record<string, string> = {};

  selectedTags.forEach((tagId, index) => {
    const tag = availableTags.find(t => t.tagId === tagId);
    tagColors[tagId] = tag?.color || colors[index % colors.length];
  });

  return tagColors;
}

export function calculateNormalizedValue(
  value: number,
  minRange: number,
  maxRange: number
): number {
  if (maxRange === minRange) return 0;
  return Math.max(0, Math.min(100, ((value - minRange) / (maxRange - minRange)) * 100));
}

export function calculateActualValue(
  normalizedValue: number,
  minRange: number,
  maxRange: number
): number {
  return (normalizedValue / 100) * (maxRange - minRange) + minRange;
}

export function formatTimestamp(timestamp: Date | string | number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
}

export function formatValue(value: number, precision: number = 1): string {
  return value.toFixed(precision);
}

export function getTimeWindowPoints(timeWindow: string): number {
  switch (timeWindow) {
    case '100points':
      return 100;
    case '1hour':
      return 60; // 1 point per minute
    case '6hours':
      return 360; // 1 point per minute
    case '24hours':
      return 1440; // 1 point per minute
    default:
      return 100;
  }
}

export function filterDataByTimeWindow(
  data: ChartDataPoint[],
  timeWindow: string
): ChartDataPoint[] {
  const maxPoints = getTimeWindowPoints(timeWindow);
  
  if (data.length <= maxPoints) {
    return data;
  }

  // Return the most recent points
  return data.slice(-maxPoints);
}

export function detectRuleViolations(
  data: ChartDataPoint[],
  rules: any[],
  tagId: string
): any[] {
  const violations = [];

  data.forEach(point => {
    const value = point[tagId as keyof ChartDataPoint];
    if (typeof value !== 'number') return;

    rules.forEach(rule => {
      if (rule.tagId !== tagId || !rule.isActive) return;

      let isViolation = false;

      switch (rule.condition) {
        case 'greater_than':
          isViolation = value > rule.threshold;
          break;
        case 'less_than':
          isViolation = value < rule.threshold;
          break;
        case 'equal_to':
          isViolation = Math.abs(value - rule.threshold) < 0.1;
          break;
        case 'between':
          isViolation = value >= rule.threshold && value <= (rule.thresholdMax || rule.threshold);
          break;
      }

      if (isViolation) {
        violations.push({
          ruleId: rule.id,
          timestamp: point.timestamp,
          tagId,
          value,
          severity: rule.severity,
          condition: rule.condition,
          threshold: rule.threshold,
        });
      }
    });
  });

  return violations;
}

export function exportChartData(
  data: ChartDataPoint[],
  selectedTags: string[],
  availableTags: TagInfo[]
): string {
  if (data.length === 0) return '';

  // Create CSV header
  const headers = ['Timestamp', ...selectedTags.map(tagId => {
    const tag = availableTags.find(t => t.tagId === tagId);
    return tag ? `${tag.tagId}: ${tag.tagLabel} (${tag.unit})` : tagId;
  })];

  // Create CSV rows
  const rows = data.map(point => {
    const row = [point.timestamp.toISOString()];
    selectedTags.forEach(tagId => {
      const value = point[tagId as keyof ChartDataPoint];
      row.push(typeof value === 'number' ? value.toString() : '');
    });
    return row.join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
