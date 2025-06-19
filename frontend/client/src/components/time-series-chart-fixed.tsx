import { useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot, ReferenceArea } from "recharts";
import { format } from "date-fns";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { TimeSeriesData, TagInfo, AnnotationMarker } from "@shared/schema";
import { normalizeChartData, getTagColors } from "@/lib/chart-utils";
import { AnnotationModal } from "./annotation-modal";
import api from "@/lib/api";

interface TimeSeriesChartProps {
  selectedTags: string[];
  timeWindow: string;
  annotations: AnnotationMarker[];
  annotationMode: 'point' | 'region' | null;
  annotationCategory: string;
  annotationSeverity: string;
  onAnnotationCreate: (annotation: AnnotationMarker) => void;
  zoom: number;
}

export function TimeSeriesChart({
  selectedTags,
  timeWindow,
  annotations,
  annotationMode,
  annotationCategory,
  annotationSeverity,
  onAnnotationCreate,
  zoom
}: TimeSeriesChartProps) {

  const [regionStart, setRegionStart] = useState<number | null>(null);
  const [regionEnd, setRegionEnd] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showAnnotationModal, setShowAnnotationModal] = useState(false);
  const [selectedAnnotationData, setSelectedAnnotationData] = useState<any>(null);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [dragCurrentPos, setDragCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [zoomDomain, setZoomDomain] = useState<{ left: number; right: number } | null>(null);
  const [isZooming, setIsZooming] = useState(false);
  const [isZoomDragging, setIsZoomDragging] = useState(false);
  const [zoomDragStart, setZoomDragStart] = useState<{ x: number; timestamp: Date } | null>(null);
  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);
  const [isTimeAxisDrag, setIsTimeAxisDrag] = useState(false);
  const chartRef = useRef<HTMLDivElement>(null);
  const timeAxisRef = useRef<HTMLDivElement>(null);

  // State for data fetching
  const [availableTags, setAvailableTags] = useState<TagInfo[]>([]);
  const [timeSeriesData, setTimeSeriesData] = useState<TimeSeriesData[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch available tags
  useEffect(() => {
    const fetchTags = async () => {
      try {
        const response = await api.get('/api/tags');
        setAvailableTags(response.data);
      } catch (error) {
        console.error('Failed to fetch tags:', error);
      }
    };

    fetchTags();
  }, []);

  // Fetch time-series data
  useEffect(() => {
    if (selectedTags.length === 0) {
      setTimeSeriesData([]);
      return;
    }

    const fetchTimeSeriesData = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        params.append('tagIds', selectedTags.join(','));
        
        // Set appropriate limit based on window selection
        let limit = null;
        
        switch (timeWindow) {
          case '100points':
            limit = 100;
            break;
          case '1hour':
          case '6hours':
          case '24hours':
            limit = 1000;
            break;
          default:
            limit = 1000;
        }
        
        if (limit) {
          params.append('limit', limit.toString());
        }

        const response = await api.get(`/api/timeseries?${params.toString()}`);
        setTimeSeriesData(response.data);
      } catch (error) {
        console.error('Failed to fetch time series data:', error);
        setTimeSeriesData([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTimeSeriesData();
  }, [selectedTags, timeWindow]);

  const chartData = normalizeChartData(timeSeriesData, selectedTags);
  const tagColors = getTagColors(availableTags, selectedTags);

  // Apply time window filtering based on actual data timestamps
  const getTimeFilteredData = (data: any[]) => {
    if (timeWindow === '100points' || data.length === 0) {
      return data;
    }

    // Get the latest timestamp in the dataset
    const timestamps = data.map(point => new Date(point.timestamp).getTime());
    const latestTime = Math.max(...timestamps);
    
    let timeRangeMs = 0;
    switch (timeWindow) {
      case '1hour':
        timeRangeMs = 60 * 60 * 1000;
        break;
      case '6hours':
        timeRangeMs = 6 * 60 * 60 * 1000;
        break;
      case '24hours':
        timeRangeMs = 24 * 60 * 60 * 1000;
        break;
      default:
        return data;
    }

    const cutoffTime = latestTime - timeRangeMs;
    return data.filter(point => {
      const pointTime = new Date(point.timestamp).getTime();
      return pointTime >= cutoffTime;
    });
  };

  const timeFilteredData = getTimeFilteredData(chartData);

  // Apply zoom domain if set
  const filteredChartData = zoomDomain 
    ? timeFilteredData.filter(point => {
        const timestamp = new Date(point.timestamp).getTime();
        return timestamp >= zoomDomain.left && timestamp <= zoomDomain.right;
      })
    : timeFilteredData;

  // Calculate tick interval based on time window and data length
  const getTickInterval = () => {
    const dataLength = filteredChartData.length;
    if (dataLength === 0) return 0;
    
    switch (timeWindow) {
      case '100points':
        return Math.ceil(dataLength / 10); // Show ~10 ticks
      case '1hour':
        return Math.ceil(dataLength / 12); // Show ~12 ticks (5-minute intervals)
      case '6hours':
        return Math.ceil(dataLength / 24); // Show ~24 ticks (15-minute intervals)
      case '24hours':
        return Math.ceil(dataLength / 24); // Show ~24 ticks (hourly intervals)
      default:
        return Math.ceil(dataLength / 15); // Default to ~15 ticks
    }
  };

  const tickInterval = getTickInterval();

  // Custom tick formatter based on time window
  const formatTimeTick = (tickItem: any) => {
    const date = new Date(tickItem);
    
    switch (timeWindow) {
      case '100points':
        return format(date, 'HH:mm:ss');
      case '1hour':
        return format(date, 'HH:mm');
      case '6hours':
        return format(date, 'MMM dd HH:mm');
      case '24hours':
        return format(date, 'MMM dd HH:mm');
      default:
        return format(date, 'HH:mm:ss');
    }
  };

  // Add mouse tracking to the chart container
  const handleChartMouseMove = (event: any) => {
    if (chartRef.current) {
      const rect = chartRef.current.getBoundingClientRect();
      setCurrentMousePos({
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
      });
    }
  };

  // Time axis zoom handlers
  const handleTimeAxisMouseDown = (event: React.MouseEvent) => {
    if (!timeAxisRef.current || filteredChartData.length === 0) return;
    
    const rect = timeAxisRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const width = rect.width;
    
    // Calculate timestamp at click position
    const dataRange = zoomDomain || {
      left: new Date(filteredChartData[0].timestamp).getTime(),
      right: new Date(filteredChartData[filteredChartData.length - 1].timestamp).getTime()
    };
    
    const clickTimestamp = new Date(dataRange.left + (x / width) * (dataRange.right - dataRange.left));
    
    setIsTimeAxisDrag(true);
    setZoomDragStart({ x, timestamp: clickTimestamp });
    
    // Prevent text selection
    event.preventDefault();
  };

  const handleTimeAxisMouseMove = (event: React.MouseEvent) => {
    if (!isTimeAxisDrag || !zoomDragStart || !timeAxisRef.current) return;
    
    const rect = timeAxisRef.current.getBoundingClientRect();
    const currentX = event.clientX - rect.left;
    const dragDistance = currentX - zoomDragStart.x;
    
    // Update visual feedback here if needed
  };

  const handleTimeAxisMouseUp = (event: React.MouseEvent) => {
    if (!isTimeAxisDrag || !zoomDragStart || !timeAxisRef.current) return;
    
    const rect = timeAxisRef.current.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const dragDistance = endX - zoomDragStart.x;
    const minDragDistance = 20; // Minimum pixels to trigger zoom
    
    if (Math.abs(dragDistance) > minDragDistance) {
      const currentDomain = zoomDomain || {
        left: new Date(filteredChartData[0].timestamp).getTime(),
        right: new Date(filteredChartData[filteredChartData.length - 1].timestamp).getTime()
      };
      
      const center = zoomDragStart.timestamp.getTime();
      const currentRange = currentDomain.right - currentDomain.left;
      
      if (dragDistance > 0) {
        // Drag right = zoom in
        const newRange = currentRange * 0.5;
        const newLeft = center - newRange / 2;
        const newRight = center + newRange / 2;
        setZoomDomain({ left: newLeft, right: newRight });
      } else {
        // Drag left = zoom out
        const newRange = currentRange * 2;
        const originalLeft = new Date(chartData[0]?.timestamp || filteredChartData[0].timestamp).getTime();
        const originalRight = new Date(chartData[chartData.length - 1]?.timestamp || filteredChartData[filteredChartData.length - 1].timestamp).getTime();
        
        const newLeft = Math.max(originalLeft, center - newRange / 2);
        const newRight = Math.min(originalRight, center + newRange / 2);
        
        if (newLeft <= originalLeft && newRight >= originalRight) {
          setZoomDomain(null);
        } else {
          setZoomDomain({ left: newLeft, right: newRight });
        }
      }
    }
    
    setIsTimeAxisDrag(false);
    setZoomDragStart(null);
  };

  // Zoom button functions
  const handleZoomIn = () => {
    if (filteredChartData.length === 0) return;
    
    const currentDomain = zoomDomain || {
      left: new Date(filteredChartData[0].timestamp).getTime(),
      right: new Date(filteredChartData[filteredChartData.length - 1].timestamp).getTime()
    };
    
    const center = (currentDomain.left + currentDomain.right) / 2;
    const currentRange = currentDomain.right - currentDomain.left;
    const newRange = currentRange * 0.5; // Zoom in by 50%
    
    const newLeft = center - newRange / 2;
    const newRight = center + newRange / 2;
    
    setZoomDomain({ left: newLeft, right: newRight });
  };

  const handleZoomOut = () => {
    if (filteredChartData.length === 0) return;
    
    const currentDomain = zoomDomain || {
      left: new Date(filteredChartData[0].timestamp).getTime(),
      right: new Date(filteredChartData[filteredChartData.length - 1].timestamp).getTime()
    };
    
    const center = (currentDomain.left + currentDomain.right) / 2;
    const currentRange = currentDomain.right - currentDomain.left;
    const newRange = currentRange * 2; // Zoom out by 100%
    
    // Don't zoom out beyond the original data range
    const originalLeft = new Date(chartData[0]?.timestamp || filteredChartData[0].timestamp).getTime();
    const originalRight = new Date(chartData[chartData.length - 1]?.timestamp || filteredChartData[filteredChartData.length - 1].timestamp).getTime();
    
    const newLeft = Math.max(originalLeft, center - newRange / 2);
    const newRight = Math.min(originalRight, center + newRange / 2);
    
    // If we've reached the original range, reset zoom
    if (newLeft <= originalLeft && newRight >= originalRight) {
      setZoomDomain(null);
    } else {
      setZoomDomain({ left: newLeft, right: newRight });
    }
  };

  const handleZoomReset = () => {
    setZoomDomain(null);
  };

  const CustomTooltip = ({ active, payload, label, coordinate }: any) => {
    // Hide tooltip when region annotation modal is open or during time axis dragging
    if (!active || !payload || !payload.length || showAnnotationModal || isTimeAxisDrag) return null;
    
    const validEntries = payload.filter((entry: any) => 
      entry.value !== null && 
      entry.value !== undefined &&
      selectedTags.includes(entry.dataKey) &&
      typeof entry.value === 'number'
    );
    
    if (validEntries.length === 0) return null;
    
    // Find the closest entry to cursor Y position
    let closestEntry = validEntries[0];
    if (validEntries.length > 1 && coordinate && chartRef.current) {
      let minDistance = Infinity;
      
      // Get actual chart dimensions from the rendered chart
      const rechartsSurface = chartRef.current.querySelector('.recharts-surface');
      if (rechartsSurface) {
        const svgElement = rechartsSurface as SVGElement;
        const svgRect = svgElement.getBoundingClientRect();
        
        // Find the actual plot area by looking at the chart structure
        // Recharts typically uses margins: top: 5, right: 5, bottom: 5, left: 5 by default
        // but our chart has custom margins due to axis labels
        const actualChartHeight = svgRect.height;
        const plotAreaHeight = actualChartHeight - 100; // Account for axis labels and margins
        const plotAreaTop = 20; // Top margin for chart area
        
        validEntries.forEach((entry: any) => {
          // Map the value (0-100) to the actual chart Y coordinate
          // Y-axis is inverted: 100% at top, 0% at bottom
          const valueRatio = entry.value / 100;
          const lineY = plotAreaTop + (plotAreaHeight * (1 - valueRatio));
          
          // Calculate distance from mouse to this line
          const distance = Math.abs(coordinate.y - lineY);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestEntry = entry;
          }
        });
      }
    }
    
    const tag = availableTags.find(t => t.tagId === closestEntry.dataKey);
    const actualValue = tag ? ((closestEntry.value / 100) * (tag.maxRange - tag.minRange) + tag.minRange) : closestEntry.value;
    
    return (
      <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
        <p className="text-sm font-medium text-slate-200 mb-2">
          {format(new Date(label), 'PPpp')}
        </p>
        <div className="flex items-center justify-between space-x-4">
          <div className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: closestEntry.stroke }}
            />
            <span className="text-sm text-slate-300">{tag?.tagLabel || closestEntry.dataKey}</span>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium text-slate-100">
              {closestEntry.value?.toFixed(1)}%
            </div>
            {tag && (
              <div className="text-xs text-slate-400">
                {actualValue.toFixed(2)} {tag.unit}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Region annotation handlers - auto-enable on drag
  const handleChartMouseDown = (event: any) => {
    // Skip if time axis dragging
    if (!event || isTimeAxisDrag) return;
    
    // Prevent default behavior and stop propagation
    event.preventDefault();
    event.stopPropagation();
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setDragStartPos({ x, y });
    setIsDragging(true);
    setRegionStart(null);
    setRegionEnd(null);
  };

  const handleChartDragMove = (event: any) => {
    if (!isDragging || !dragStartPos || isTimeAxisDrag) return;
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setDragCurrentPos({ x, y });
  };

  const handleChartMouseUp = (event: any) => {
    if (!isDragging || !dragStartPos || isTimeAxisDrag) return;
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const endX = event.clientX - rect.left;
    const dragDistance = Math.abs(endX - dragStartPos.x);
    
    // Only create region annotation if drag distance is significant
    if (dragDistance > 30) {
      // Get chart dimensions more accurately
      const chartContainer = chartRef.current?.querySelector('.recharts-wrapper');
      const chartRect = chartContainer?.getBoundingClientRect();
      
      if (chartRect && filteredChartData.length > 0) {
        const startTime = new Date(filteredChartData[0].timestamp).getTime();
        const endTime = new Date(filteredChartData[filteredChartData.length - 1].timestamp).getTime();
        const timeRange = endTime - startTime;
        
        // Account for chart margins more precisely
        const margin = 50;
        const chartWidth = chartRect.width - margin * 2;
        const startX = Math.min(dragStartPos.x, endX) - margin;
        const endXPos = Math.max(dragStartPos.x, endX) - margin;
        
        // Calculate timestamps based on chart area position
        const startRatio = Math.max(0, startX / chartWidth);
        const endRatio = Math.min(1, endXPos / chartWidth);
        
        const startTimestamp = new Date(startTime + startRatio * timeRange);
        const endTimestamp = new Date(startTime + endRatio * timeRange);
        
        // Find data points in the region
        const pointsInRegion = filteredChartData.filter(point => {
          const pointTime = new Date(point.timestamp).getTime();
          return pointTime >= startTimestamp.getTime() && pointTime <= endTimestamp.getTime();
        });
        
        if (pointsInRegion.length > 0) {
          // Get value ranges for all selected tags in the region
          const valueRanges = selectedTags.map(tagId => {
            const tagPoints = pointsInRegion.filter(p => (p as any)[tagId] !== null && (p as any)[tagId] !== undefined);
            const tag = availableTags.find(t => t.tagId === tagId);
            
            if (tagPoints.length > 0 && tag) {
              const values = tagPoints.map(p => (p as any)[tagId]);
              return {
                tagId,
                tagLabel: tag.tagLabel,
                unit: tag.unit,
                min: Math.min(...values),
                max: Math.max(...values)
              };
            }
            return null;
          }).filter(Boolean);
          
          setSelectedAnnotationData({
            type: 'region',
            regionStart: startTimestamp,
            regionEnd: endTimestamp,
            tagId: selectedTags[0],
            tag: availableTags.find(t => t.tagId === selectedTags[0]),
            pointsInRegion,
            valueRanges,
            duration: Math.round((endTimestamp.getTime() - startTimestamp.getTime()) / 60000) // Duration in minutes
          });
          setShowAnnotationModal(true);
        }
      }
    }
    
    setIsDragging(false);
    setDragStartPos(null);
    setDragCurrentPos(null);
  };

  const handleChartClick = (data: any, event: any) => {
    if (!data?.activePayload?.[0] || !event) return;

    // If currently dragging or time axis dragging, don't handle click
    if (isDragging || isTimeAxisDrag) return;

    // Auto-enable point annotation on chart click (no need for button first)

    const { activePayload, activeCoordinate } = data;
    const payload = activePayload[0].payload;
    
    // Filter valid entries
    const validEntries = activePayload.filter((entry: any) => 
      entry.value !== null && 
      entry.value !== undefined &&
      selectedTags.includes(entry.dataKey)
    );

    if (validEntries.length === 0) return;

    // Find the closest tag line to cursor position using the same logic as tooltip
    let closestEntry = validEntries[0];
    if (validEntries.length > 1 && activeCoordinate) {
      let minDistance = Infinity;
      
      validEntries.forEach((entry: any) => {
        // Get the actual pixel position of this data point from the chart
        const chartContainer = chartRef.current?.querySelector('.recharts-wrapper');
        if (chartContainer) {
          const chartRect = chartContainer.getBoundingClientRect();
          const chartHeight = chartRect.height - 100; // Account for margins
          const chartTop = 20;
          
          // Calculate Y position for this entry's normalized value (0-100%)
          const normalizedY = chartTop + chartHeight * (1 - entry.value / 100);
          
          // Calculate distance from click position to this line point
          const distance = Math.abs(activeCoordinate.y - normalizedY);
          
          if (distance < minDistance) {
            minDistance = distance;
            closestEntry = entry;
          }
        }
      });
    }

    const clickedTag = closestEntry.dataKey;
    const clickedValue = closestEntry.value;
    
    const tag = availableTags.find(t => t.tagId === clickedTag);
    if (!tag) return;

    // Create point annotation for the closest tag
    setSelectedAnnotationData({
      type: 'point',
      timestamp: new Date(payload.timestamp),
      tagId: clickedTag,
      tag,
      value: clickedValue,
      normalizedValue: clickedValue,
      actualValue: ((clickedValue / 100) * (tag.maxRange - tag.minRange) + tag.minRange)
    });
    setShowAnnotationModal(true);
  };

  if (selectedTags.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-lg font-medium text-slate-300 mb-2">
                No tags selected
              </p>
              <p className="text-sm text-slate-400">
                Select tags from the sidebar to view time-series data
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <p className="text-lg font-medium text-slate-300 mb-2">
                Loading chart data...
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6">
          {/* Zoom controls */}
          {zoomDomain && (
            <div className="mb-4 flex justify-between items-center">
              <span className="text-sm text-slate-400">
                Zoomed: {format(new Date(zoomDomain.left), 'MMM dd, HH:mm')} - {format(new Date(zoomDomain.right), 'MMM dd, HH:mm')}
              </span>
              <button
                onClick={() => setZoomDomain(null)}
                className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
              >
                Reset Zoom
              </button>
            </div>
          )}
          
          <div 
            ref={chartRef}
            className="relative h-96 overflow-x-auto cursor-crosshair border border-slate-600 rounded"
            style={{ 
              width: '100%'
            }}
            onMouseDown={(e) => {
              handleChartMouseDown(e.nativeEvent);
            }}
            onMouseMove={(e) => {
              // Update mouse position for tooltip calculation
              if (chartRef.current) {
                const rect = chartRef.current.getBoundingClientRect();
                setCurrentMousePos({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top
                });
              }
              handleChartDragMove(e.nativeEvent);
            }}
            onMouseLeave={() => {
              setCurrentMousePos(null);
              setIsDragging(false);
              setDragStartPos(null);
              setDragCurrentPos(null);
              setRegionStart(null);
              setRegionEnd(null);
            }}
            onMouseUp={(e) => {
              handleChartMouseUp(e.nativeEvent);
            }}
          >
            {/* Region selection overlay */}
            {isDragging && dragStartPos && dragCurrentPos && (
              <div
                className="absolute bg-blue-500 bg-opacity-20 border border-blue-400 pointer-events-none z-10"
                style={{
                  left: Math.min(dragStartPos.x, dragCurrentPos.x),
                  top: Math.min(dragStartPos.y, dragCurrentPos.y),
                  width: Math.abs(dragCurrentPos.x - dragStartPos.x),
                  height: Math.abs(dragCurrentPos.y - dragStartPos.y),
                }}
              />
            )}
            
            <div style={{
              width: timeWindow === '24hours' ? '1200px' : 
                     timeWindow === '6hours' ? '900px' : 
                     timeWindow === '1hour' ? '600px' : '100%',
              height: '100%'
            }}>
            <ResponsiveContainer 
              width="100%" 
              height="100%"
            >
              <LineChart
                data={filteredChartData}
                onClick={handleChartClick}
                margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="timestamp"
                  type="number"
                  scale="time"
                  domain={['dataMin', 'dataMax']}
                  tickFormatter={formatTimeTick}
                  stroke="#9CA3AF"
                  interval={tickInterval}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                  stroke="#9CA3AF"
                />
                <Tooltip 
                  content={<CustomTooltip />}
                  filterNull={true}
                  isAnimationActive={false}
                  cursor={false}
                  allowEscapeViewBox={{ x: false, y: false }}
                  wrapperStyle={{ zIndex: 1000 }}
                  position={{ x: 0, y: 0 }}
                />
                
                {/* Render normal lines for all tags */}
                {selectedTags.map((tagId) => (
                  <Line
                    key={tagId}
                    type="monotone"
                    dataKey={tagId}
                    stroke={tagColors[tagId] || '#3B82F6'}
                    strokeWidth={2}
                    dot={false}
                    activeDot={{ r: 4, stroke: tagColors[tagId], strokeWidth: 2 }}
                    connectNulls={false}
                  />
                ))}

                {/* Render red reference areas for annotated regions */}
                {annotations.map((annotation) => {
                  if (annotation.type === 'region' && annotation.regionStart && annotation.regionEnd) {
                    return (
                      <ReferenceArea
                        key={`region-${annotation.id}`}
                        x1={annotation.regionStart.getTime()}
                        x2={annotation.regionEnd.getTime()}
                        fill="#EF4444"
                        fillOpacity={0.3}
                        stroke="#EF4444"
                        strokeWidth={1}
                        strokeDasharray="3 3"
                      />
                    );
                  }
                  return null;
                })}

                {/* Render point annotation markers only */}
                {annotations.map((annotation) => {
                  if (annotation.type === 'point') {
                    return (
                      <ReferenceDot
                        key={annotation.id}
                        x={annotation.timestamp.getTime()}
                        y={annotation.normalizedValue}
                        r={4}
                        fill={annotation.severity === 'High' ? '#EF4444' : annotation.severity === 'Medium' ? '#F59E0B' : '#10B981'}
                        stroke="#1F2937"
                        strokeWidth={2}
                      />
                    );
                  }
                  return null;
                })}
              </LineChart>
            </ResponsiveContainer>
            </div>
            
            {/* Scroll indicator for larger time windows */}
            {(timeWindow === '1hour' || timeWindow === '6hours' || timeWindow === '24hours') && (
              <div className="text-xs text-slate-400 text-center mt-2 py-1 bg-slate-700 rounded">
                ← Scroll horizontally to view full timeline →
              </div>
            )}
          </div>
          
          {/* Time axis drag area for zoom */}
          <div 
            ref={timeAxisRef}
            className="h-8 bg-slate-800 border border-slate-600 rounded mt-2 cursor-ew-resize flex items-center justify-center relative"
            onMouseDown={handleTimeAxisMouseDown}
            onMouseMove={handleTimeAxisMouseMove}
            onMouseUp={handleTimeAxisMouseUp}
            onMouseLeave={() => {
              setIsTimeAxisDrag(false);
              setZoomDragStart(null);
            }}
          >
            <span className="text-xs text-slate-400 pointer-events-none">
              {isTimeAxisDrag ? 'Drag right to zoom in, left to zoom out' : 'Drag here to zoom'}
            </span>
            
            {/* Visual feedback during drag */}
            {isTimeAxisDrag && zoomDragStart && (
              <div 
                className="absolute top-0 bottom-0 bg-blue-500/20 border-l-2 border-r-2 border-blue-500"
                style={{
                  left: `${Math.min(zoomDragStart.x, currentMousePos?.x || zoomDragStart.x)}px`,
                  width: `${Math.abs((currentMousePos?.x || zoomDragStart.x) - zoomDragStart.x)}px`
                }}
              />
            )}
          </div>
          
          {/* Zoom controls under time axis */}
          <div className="mt-2 flex justify-center items-center space-x-2">
            <button
              onClick={handleZoomOut}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
              title="Zoom Out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomIn}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
              title="Zoom In"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              onClick={handleZoomReset}
              className="p-2 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-400 ml-2">
              Drag in time axis area to zoom, drag in chart area for region annotations
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Chart Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {selectedTags.map((tagId) => {
          const tag = availableTags.find(t => t.tagId === tagId);
          return (
            <div key={tagId} className="flex items-center space-x-2">
              <div 
                className="w-4 h-0.5 rounded"
                style={{ backgroundColor: tagColors[tagId] || '#3B82F6' }}
              />
              <span className="text-sm text-slate-300">
                {tag ? `${tag.tagId}: ${tag.tagLabel}` : tagId}
              </span>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3">
        <p className="text-sm text-blue-400 font-medium">
          {isDragging 
            ? 'Release mouse to create region annotation'
            : isTimeAxisDrag
            ? 'Drag right to zoom in, left to zoom out'
            : 'Click chart lines for point annotations, drag in chart area for regions, drag time axis for zoom'
          }
        </p>
      </div>

      {/* Annotation Modal */}
      <AnnotationModal 
        open={showAnnotationModal}
        onOpenChange={setShowAnnotationModal}
        annotationData={selectedAnnotationData}
        onCreateAnnotation={onAnnotationCreate}
      />
    </div>
  );
}