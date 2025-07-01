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
  annotationCategory: string;
  annotationSeverity: string;
  onAnnotationCreate: (annotation: AnnotationMarker) => void;
  zoom: number;
}

export function TimeSeriesChart2({
  selectedTags,
  timeWindow,
  annotations,
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

  // Apply zoom level to data
  const getZoomedData = (data: any[], zoomLevel: number) => {
    if (zoomLevel === 1 || data.length === 0) return data;
    
    // Calculate how many points to show based on zoom level
    // zoom > 1 means zoom in (show fewer points, more detail)
    // zoom < 1 means zoom out (show more points, less detail)
    const targetPoints = Math.max(10, Math.floor(data.length / zoomLevel));
    
    if (targetPoints >= data.length) return data;
    
    // Take the most recent points for zoomed view
    return data.slice(-targetPoints);
  };

  const zoomedData = getZoomedData(timeFilteredData, zoom);

  // Apply zoom domain if set (for manual selection zoom)
  const filteredChartData = zoomDomain 
    ? zoomedData.filter(point => {
        const timestamp = new Date(point.timestamp).getTime();
        return timestamp >= zoomDomain.left && timestamp <= zoomDomain.right;
      })
    : zoomedData;

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

  // Mouse event handlers for annotation creation
  const handleChartMouseDown = (event: MouseEvent) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    // Always start tracking potential drag for region annotation
    setIsDragging(true);
    setDragStartPos({ x, y });
    setDragCurrentPos({ x, y });
  };

  const handleChartDragMove = (event: MouseEvent) => {
    if (!isDragging || !dragStartPos) return;
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    setDragCurrentPos({ x, y });
  };

  const handleChartMouseUp = (event: MouseEvent) => {
    if (!isDragging || !dragStartPos) return;
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const endX = event.clientX - rect.left;
    const dragDistance = Math.abs(endX - dragStartPos.x);
    
    if (dragDistance > 30) {
      // Create region annotation for significant drag
      handleRegionAnnotation();
    } else {
      // Create point annotation for clicks/small movements
      handlePointAnnotation(event);
    }
    
    setIsDragging(false);
    setDragStartPos(null);
    setDragCurrentPos(null);
  };

  const handlePointAnnotation = (event: MouseEvent) => {
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect || filteredChartData.length === 0) return;
    
    const clickX = event.clientX - rect.left;
    const clickY = event.clientY - rect.top;
    
    // Use chart container dimensions with estimated margins (like Recharts default layout)
    const marginTop = 5;
    const marginBottom = 60; // X-axis space
    const marginLeft = 60; // Y-axis space
    const marginRight = 5;
    
    const chartWidth = rect.width - marginLeft - marginRight;
    const chartHeight = rect.height - marginTop - marginBottom;
    
    // Convert click to chart-relative coordinates
    const chartRelativeX = clickX - marginLeft;
    const chartRelativeY = clickY - marginTop;
    
    // Find the closest data point by X coordinate
    const dataPointWidth = chartWidth / filteredChartData.length;
    const clickIndex = Math.round(chartRelativeX / dataPointWidth);
    const dataPoint = filteredChartData[Math.max(0, Math.min(clickIndex, filteredChartData.length - 1))];
    
    if (dataPoint) {
      // Get valid entries for this data point
      const validEntries = selectedTags
        .filter(tagId => dataPoint[tagId] !== null && dataPoint[tagId] !== undefined)
        .map(tagId => ({
          dataKey: tagId,
          value: dataPoint[tagId]
        }));
      
      if (validEntries.length === 0) return;
      
      // Use same cursor-based selection logic as tooltip
      let clickedEntry = validEntries[0];
      
      if (validEntries.length > 1) {
        // Convert click Y position to percentage (same as tooltip)
        const clickPercent = Math.max(0, Math.min(100, ((chartHeight - chartRelativeY) / chartHeight) * 100));
        
        let minDistance = Infinity;
        
        validEntries.forEach(entry => {
          if (typeof entry.value === 'number') {
            // Calculate distance between click percentage and tag's normalized value
            const distance = Math.abs(entry.value - clickPercent);
            
            if (distance < minDistance) {
              minDistance = distance;
              clickedEntry = entry;
            }
          }
        });
      }
      
      const clickedTag = clickedEntry.dataKey;
      const clickedValue = clickedEntry.value;
      const tag = availableTags.find(t => t.tagId === clickedTag);
      
      if (tag) {
        setSelectedAnnotationData({
          type: 'point',
          timestamp: new Date(dataPoint.timestamp),
          tagId: clickedTag,
          tag,
          value: clickedValue,
          normalizedValue: clickedValue,
          actualValue: ((clickedValue / 100) * (tag.maxRange - tag.minRange) + tag.minRange)
        });
        setShowAnnotationModal(false);
      }
    }
  };

  const handleRegionAnnotation = () => {
    if (!dragStartPos || !dragCurrentPos || filteredChartData.length === 0) return;
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const startX = Math.min(dragStartPos.x, dragCurrentPos.x);
    const endX = Math.max(dragStartPos.x, dragCurrentPos.x);
    
    // Calculate timestamps based on chart position
    const chartWidth = rect.width - 100; // Account for margins
    const startTime = new Date(filteredChartData[0].timestamp).getTime();
    const endTime = new Date(filteredChartData[filteredChartData.length - 1].timestamp).getTime();
    const timeRange = endTime - startTime;
    
    const startRatio = Math.max(0, startX / chartWidth);
    const endRatio = Math.min(1, endX / chartWidth);
    
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
      setShowAnnotationModal(false);
    }
  };

  const handleChartClick = (data: any) => {
    // Chart clicks are now handled by mouse events for automatic annotation detection
    return;
  };

  // Main component render
  if (selectedTags.length === 0) {
    return (
      <Card className="bg-card border-slate-700">
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
      <Card className="border-slate-700">
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
      <Card className="border-slate-700">
        <CardContent className="p-6">
          {filteredChartData.length === 0 ? (
            <div className="flex items-center justify-center h-96">
              <div className="text-center">
                <p className="text-lg font-medium text-slate-300 mb-2">
                  No data available
                </p>
                <p className="text-sm text-slate-400">
                  Upload a CSV file with time-series data to get started
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Zoom controls */}
              {(zoomDomain || zoom !== 1) && (
                <div className="mb-4 flex justify-between items-center">
                  <div className="flex items-center space-x-4">
                    {zoomDomain && (
                      <span className="text-sm text-slate-400">
                        Region: {format(new Date(zoomDomain.left), 'MMM dd, HH:mm')} - {format(new Date(zoomDomain.right), 'MMM dd, HH:mm')}
                      </span>
                    )}
                    {zoom !== 1 && (
                      <span className="text-sm text-slate-400">
                        Zoom: {zoom.toFixed(1)}x ({Math.floor(filteredChartData.length / zoom)} pts)
                      </span>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    {zoomDomain && (
                      <button
                        onClick={() => setZoomDomain(null)}
                        className="px-3 py-1 text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-md transition-colors"
                      >
                        Reset Region
                      </button>
                    )}
                  </div>
                </div>
              )}
              
              <div 
                ref={chartRef}
                className="relative h-96 overflow-x-auto cursor-crosshair border border-slate-600 rounded"
                style={{ width: '100%' }}
                onMouseDown={(e) => {
                  handleChartMouseDown(e.nativeEvent);
                }}
                onMouseMove={(e) => {
                  handleChartDragMove(e.nativeEvent);
                }}
                onMouseUp={(e) => {
                  handleChartMouseUp(e.nativeEvent);
                }}
                onMouseLeave={() => {
                  setIsDragging(false);
                  setDragStartPos(null);
                  setDragCurrentPos(null);
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
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredChartData}
                      onClick={handleChartClick}
                      margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
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
                        height={60}
                        axisLine={true}
                        tickLine={true}
                      />
                      <YAxis 
                        domain={[0, 100]}
                        tickFormatter={(value) => `${value}%`}
                        stroke="#9CA3AF"
                        width={50}
                        axisLine={true}
                        tickLine={true}
                      />
                      <Tooltip 
                        content={({ active, payload, label, coordinate }) => {
                          if (!active || !payload || payload.length === 0) return null;
                          
                          // Filter payload to only show entries that have valid values
                          const validEntries = payload.filter(entry => 
                            entry.value !== null && 
                            entry.value !== undefined &&
                            selectedTags.includes(entry.dataKey as string)
                          );
                          
                          if (validEntries.length === 0) return null;
                          
                          // Determine which line is closest to the mouse cursor
                          let activeEntry = validEntries[0];
                          let cursorPercent = 0;
                          
                          if (coordinate && typeof coordinate.y === 'number') {
                            // Find the entry with value closest to cursor's Y position (normalized scale 0-100)
                            const cursorY = coordinate.y;
                            
                            // Get the actual chart plotting area dimensions (excluding axes)
                            const chartElement = document.querySelector('.recharts-cartesian-grid rect');
                            let chartHeight = 324; // fallback: 384px container - 60px X-axis
                            
                            if (chartElement) {
                              chartHeight = chartElement.getBoundingClientRect().height;
                            }
                            
                            // Convert cursor Y position to percentage (0-100% like normalized tag values)
                            // Recharts coordinate system: Y=0 is top of chart area, we need to invert
                            // Y-axis domain [0,100] maps to chart area where 0% = bottom, 100% = top
                            cursorPercent = Math.max(0, Math.min(100, ((chartHeight - cursorY) / chartHeight) * 100));
                            
                            if (validEntries.length > 1) {
                              let minDistance = Infinity;
                              
                              validEntries.forEach(entry => {
                                if (typeof entry.value === 'number') {
                                  // Calculate distance between cursor percentage and tag's normalized value
                                  const distance = Math.abs(entry.value - cursorPercent);
                                  
                                  if (distance < minDistance) {
                                    minDistance = distance;
                                    activeEntry = entry;
                                  }
                                }
                              });
                            }
                          }
                          
                          const tagId = activeEntry.dataKey as string;
                          const tag = availableTags.find(t => t.tagId === tagId);
                          if (!tag) return null;
                          
                          const timestamp = new Date(label);
                          const normalizedValue = activeEntry.value as number;
                          const actualValue = ((normalizedValue / 100) * (tag.maxRange - tag.minRange)) + tag.minRange;
                          
                          return (
                            <div 
                              className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-xl"
                              style={{ 
                                backgroundColor: 'rgb(30, 41, 59)', 
                                borderColor: 'rgb(71, 85, 105)',
                                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                              }}
                            >
                              <div className="text-sm text-slate-200 space-y-1">
                                <div className="font-semibold text-slate-100">{tag.tagLabel}</div>
                                <div className="text-slate-300 text-xs">
                                  {format(timestamp, 'MMM dd, yyyy HH:mm:ss')}
                                </div>
                                <div className="flex items-center space-x-2">
                                  <div 
                                    className="w-3 h-3 rounded-full border border-slate-400"
                                    style={{ backgroundColor: activeEntry.stroke }}
                                  />
                                  <span className="text-slate-100 font-semibold">
                                    {actualValue.toFixed(2)} {tag.unit}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-400">
                                  Normalized: {normalizedValue.toFixed(1)}%
                                </div>
                              </div>
                            </div>
                          );
                        }}
                        filterNull={true}
                        isAnimationActive={false}
                        cursor={false}
                        offset={10}
                        wrapperStyle={{ zIndex: 1000 }}
                        shared={false}
                      />
                      
                      {/* Render normal lines for all tags */}
                      {selectedTags.map((tagId) => (
                        <Line
                          key={tagId}
                          type="monotone"
                          dataKey={tagId}
                          stroke={tagColors[tagId] || '#3B82F6'}
                          strokeWidth={3}
                          dot={false}
                          activeDot={{ r: 6, stroke: tagColors[tagId], strokeWidth: 3, fill: tagColors[tagId] }}
                          connectNulls={false}
                          strokeOpacity={1}
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
            </>
          )}
        </CardContent>
      </Card>

      {/* Chart Legend */}
      <div className="flex flex-wrap gap-4 justify-center">
        {selectedTags.map((tagId) => {
          const tag = availableTags.find(t => t.tagId === tagId);
          if (!tag) return null;
          
          return (
            <div key={tagId} className="flex items-center space-x-2 text-sm">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: tagColors[tagId] || '#3B82F6' }}
              />
              <span className="text-slate-300">{tag.tagLabel}</span>
              <span className="text-slate-500">({tag.unit})</span>
            </div>
          );
        })}
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