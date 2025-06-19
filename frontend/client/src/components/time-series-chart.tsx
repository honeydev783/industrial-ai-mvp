import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceDot, ReferenceArea } from "recharts";
import { format } from "date-fns";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import type { TimeSeriesData, TagInfo, AnnotationMarker } from "@shared/schema";
import { normalizeChartData, getTagColors } from "@/lib/chart-utils";
import { AnnotationModal } from "./annotation-modal";

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
  const chartRef = useRef<HTMLDivElement>(null);

  // Get available tags for color mapping
  const { data: availableTags = [] } = useQuery<TagInfo[]>({
    queryKey: ['/api/tags'],
  });

  // Get time-series data
  const { data: timeSeriesData = [], isLoading } = useQuery<TimeSeriesData[]>({
    queryKey: ['/api/timeseries', selectedTags.join(','), timeWindow],
    enabled: selectedTags.length > 0,
  });

  const chartData = normalizeChartData(timeSeriesData, selectedTags);
  const tagColors = getTagColors(availableTags, selectedTags);

  // Apply zoom domain if set
  const filteredChartData = zoomDomain 
    ? chartData.filter(point => {
        const timestamp = new Date(point.timestamp).getTime();
        return timestamp >= zoomDomain.left && timestamp <= zoomDomain.right;
      })
    : chartData;

  // Calculate time window for 30-second intervals
  const getTimeAxisDomain = () => {
    if (filteredChartData.length === 0) return [0, 0];
    
    const startTime = new Date(filteredChartData[0].timestamp).getTime();
    const endTime = new Date(filteredChartData[filteredChartData.length - 1].timestamp).getTime();
    
    return [startTime, endTime];
  };

  // Custom tick formatter for 30-second intervals
  const formatTimeTick = (tickItem: any) => {
    const date = new Date(tickItem);
    return format(date, 'HH:mm:ss');
  };





  const handleChartClick = (data: any, event: any) => {
    if (!data?.activePayload?.[0] || !event || !currentMousePos) return;

    // If currently dragging, don't handle click
    if (isDragging) return;

    const { activePayload } = data;
    const payload = activePayload[0].payload;
    
    // Filter valid entries
    const validEntries = activePayload.filter((entry: any) => 
      entry.value !== null && 
      entry.value !== undefined &&
      selectedTags.includes(entry.dataKey)
    );

    if (validEntries.length === 0) return;

    // Find the closest tag line to cursor position (same logic as tooltip)
    let closestEntry = validEntries[0];
    let minDistance = Infinity;
    
    if (validEntries.length > 1) {
      // Chart area dimensions (same as tooltip calculation)
      const chartMargin = { top: 20, right: 30, left: 60, bottom: 50 };
      const chartHeight = 400 - chartMargin.top - chartMargin.bottom;
      const cursorYRelative = currentMousePos.y - chartMargin.top;
      
      validEntries.forEach((entry: any) => {
        // Convert normalized value (0-100) to pixel position within chart area
        const entryYPixel = chartHeight - (entry.value / 100) * chartHeight;
        
        // Calculate distance from cursor to this line's Y position
        const distance = Math.abs(cursorYRelative - entryYPixel);
        
        if (distance < minDistance) {
          minDistance = distance;
          closestEntry = entry;
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

  const handleMouseDown = (data: any, event: any) => {
    if (!data?.activePayload?.[0] || !event || !currentMousePos) return;
    
    // Prevent default to avoid text selection during drag
    event.preventDefault();
    
    // Check if dragging in time axis area for zoom
    if (isInTimeAxisArea(currentMousePos.y)) {
      handleZoomMouseDown(event);
      return;
    }

    // Otherwise, handle region annotation dragging in chart area only
    const timestamp = data.activePayload[0].payload.timestamp;
    
    setDragStartPos({ x: event.clientX, y: event.clientY });
    setDragCurrentPos({ x: event.clientX, y: event.clientY });
    setRegionStart(timestamp);
    setIsDragging(false); // Will be set to true on mouse move
  };

  const handleMouseMove = (data: any, event: any) => {
    // Handle zoom dragging in time axis area
    if (isZoomDragging) {
      handleZoomMouseMove(event);
      return;
    }

    // Handle region annotation dragging in chart area
    if (!regionStart || !dragStartPos || !event) return;
    
    const currentX = event.clientX;
    const currentY = event.clientY;
    
    const distance = Math.sqrt(
      Math.pow(currentX - dragStartPos.x, 2) + 
      Math.pow(currentY - dragStartPos.y, 2)
    );
    
    // Start dragging if moved more than 5 pixels
    if (distance > 5 && !isDragging) {
      setIsDragging(true);
    }
    
    setDragCurrentPos({ x: currentX, y: currentY });
    
    if (isDragging && data?.activePayload?.[0]) {
      const timestamp = data.activePayload[0].payload.timestamp;
      setRegionEnd(timestamp);
    }
  };

  const handleMouseUp = (data: any) => {
    // Handle zoom dragging end
    if (isZoomDragging) {
      handleZoomMouseUp();
      return;
    }

    // Handle region annotation dragging end
    if (!isDragging || !regionStart || !regionEnd) {
      // Reset without creating annotation
      setRegionStart(null);
      setRegionEnd(null);
      setDragStartPos(null);
      setDragCurrentPos(null);
      setIsDragging(false);
      return;
    }

    const startTime = Math.min(regionStart, regionEnd);
    const endTime = Math.max(regionStart, regionEnd);
    
    // Create region annotation (zoom is handled separately in time axis area)
    createRegionAnnotation(startTime, endTime);

    // Reset drag state
    setRegionStart(null);
    setRegionEnd(null);
    setDragStartPos(null);
    setDragCurrentPos(null);
    setIsDragging(false);
  };

  const createRegionAnnotation = (startTime: number, endTime: number) => {
    // Use filtered chart data for annotations
    const pointsInRegion = filteredChartData.filter(point => {
      const timestamp = new Date(point.timestamp).getTime();
      return timestamp >= startTime && timestamp <= endTime;
    });

    if (pointsInRegion.length > 0) {
      let minValues: Record<string, number> = {};
      let maxValues: Record<string, number> = {};
      let tagsWithData: string[] = [];
      
      selectedTags.forEach(tagId => {
        const values = pointsInRegion
          .map(point => (point as any)[tagId])
          .filter(val => val !== null && val !== undefined);
        
        if (values.length > 0) {
          minValues[tagId] = Math.min(...values);
          maxValues[tagId] = Math.max(...values);
          tagsWithData.push(tagId);
        }
      });

      const durationMinutes = Math.round((endTime - startTime) / 60000);
      
      const valueRanges = tagsWithData.map(tagId => {
        const tag = availableTags.find(t => t.tagId === tagId);
        if (tag && minValues[tagId] !== undefined) {
          const minActual = ((minValues[tagId] / 100) * (tag.maxRange - tag.minRange) + tag.minRange);
          const maxActual = ((maxValues[tagId] / 100) * (tag.maxRange - tag.minRange) + tag.minRange);
          return {
            tagId,
            tagLabel: tag.tagLabel,
            unit: tag.unit,
            min: minActual,
            max: maxActual
          };
        }
        return null;
      }).filter(Boolean);

      setSelectedAnnotationData({
        type: 'region',
        regionStart: new Date(startTime),
        regionEnd: new Date(endTime),
        tagId: tagsWithData[0] || selectedTags[0],
        tag: availableTags.find(t => t.tagId === (tagsWithData[0] || selectedTags[0])),
        pointsInRegion,
        duration: durationMinutes,
        valueRanges
      });
      setShowAnnotationModal(true);
    }
  };

  const [currentMousePos, setCurrentMousePos] = useState<{ x: number; y: number } | null>(null);

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

  // Determine if mouse position is in time axis area (bottom area)
  const isInTimeAxisArea = (y: number) => {
    const chartHeight = 400;
    const timeAxisAreaHeight = 50; // Bottom 50px for time axis
    return y > (chartHeight - timeAxisAreaHeight);
  };

  // Handle zoom dragging in time axis area
  const handleZoomMouseDown = (event: any) => {
    if (!currentMousePos || !isInTimeAxisArea(currentMousePos.y)) return;
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsZoomDragging(true);
    setZoomDragStart({
      x: event.clientX - rect.left,
      timestamp: new Date() // Will be calculated based on chart data
    });
  };

  const handleZoomMouseMove = (event: any) => {
    if (!isZoomDragging || !zoomDragStart || !currentMousePos) return;
    
    const rect = chartRef.current?.getBoundingClientRect();
    if (!rect) return;

    const currentX = event.clientX - rect.left;
    const deltaX = currentX - zoomDragStart.x;
    
    // Directional zoom: right = zoom in, left = zoom out
    if (Math.abs(deltaX) > 10) { // Minimum drag distance
      const zoomFactor = deltaX > 0 ? 0.8 : 1.2; // Right = zoom in (0.8), Left = zoom out (1.2)
      
      if (filteredChartData.length > 0) {
        const currentDomain = zoomDomain || {
          left: new Date(filteredChartData[0].timestamp).getTime(),
          right: new Date(filteredChartData[filteredChartData.length - 1].timestamp).getTime()
        };
        
        const center = (currentDomain.left + currentDomain.right) / 2;
        const currentRange = currentDomain.right - currentDomain.left;
        const newRange = currentRange * zoomFactor;
        
        const newLeft = center - newRange / 2;
        const newRight = center + newRange / 2;
        
        setZoomDomain({ left: newLeft, right: newRight });
      }
      
      // Reset drag start to prevent continuous zooming
      setZoomDragStart({
        x: currentX,
        timestamp: new Date()
      });
    }
  };

  const handleZoomMouseUp = () => {
    setIsZoomDragging(false);
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

  const CustomTooltip = ({ active, payload, label }: any) => {
    // Hide tooltip when region annotation modal is open
    if (!active || !payload || !payload.length || !currentMousePos || showAnnotationModal) return null;
    
    const validEntries = payload.filter((entry: any) => 
      entry.value !== null && 
      entry.value !== undefined &&
      selectedTags.includes(entry.dataKey)
    );
    
    if (validEntries.length === 0) return null;
    
    // If only one tag, show it directly
    if (validEntries.length === 1) {
      const activeEntry = validEntries[0];
      const tag = availableTags.find(t => t.tagId === activeEntry.dataKey);
      
      return (
        <div className="bg-slate-800 border border-slate-600 rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium text-slate-200 mb-2">
            {format(new Date(label), 'PPpp')}
          </p>
          <div className="flex items-center justify-between space-x-4">
            <div className="flex items-center space-x-2">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeEntry.stroke }}
              />
              <span className="text-sm text-slate-300">{tag?.tagLabel || activeEntry.dataKey}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-slate-100">
                {activeEntry.value?.toFixed(1)}%
              </div>
              {tag && (
                <div className="text-xs text-slate-400">
                  {((activeEntry.value / 100) * (tag.maxRange - tag.minRange) + tag.minRange).toFixed(2)} {tag.unit}
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }
    
    // For multiple tags, find the closest one to cursor position
    let closestEntry = validEntries[0];
    let minDistance = Infinity;
    
    // Chart area dimensions (approximate)
    const chartMargin = { top: 20, right: 30, left: 60, bottom: 50 };
    const chartHeight = 400 - chartMargin.top - chartMargin.bottom;
    const cursorYRelative = currentMousePos.y - chartMargin.top;
    
    validEntries.forEach((entry: any) => {
      // Convert normalized value (0-100) to pixel position within chart area
      const entryYPixel = chartHeight - (entry.value / 100) * chartHeight;
      
      // Calculate distance from cursor to this line's Y position
      const distance = Math.abs(cursorYRelative - entryYPixel);
      
      if (distance < minDistance) {
        minDistance = distance;
        closestEntry = entry;
      }
    });
    
    const tag = availableTags.find(t => t.tagId === closestEntry.dataKey);
    
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
                {((closestEntry.value / 100) * (tag.maxRange - tag.minRange) + tag.minRange).toFixed(2)} {tag.unit}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (selectedTags.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6 text-center">
          <div className="text-slate-400 mb-4">
            <div className="w-16 h-16 bg-slate-800 rounded-lg mx-auto mb-4 flex items-center justify-center">
              📊
            </div>
            <p className="text-lg font-medium">No Tags Selected</p>
            <p className="text-sm">Select up to 5 tags to visualize time-series data</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6">
          <div className="h-96 bg-slate-800 rounded-lg animate-pulse flex items-center justify-center">
            <div className="text-slate-400">Loading chart data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card className="bg-slate-900 border-slate-700">
        <CardContent className="p-6 text-center">
          <div className="h-96 bg-slate-800 rounded-lg flex items-center justify-center">
            <div className="text-slate-400">
              <p className="text-lg font-medium mb-2">No Data Available</p>
              <p className="text-sm">Upload time-series data to see visualizations</p>
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
            className="relative h-96 cursor-crosshair overflow-x-auto"
            onMouseMove={handleChartMouseMove}
            onMouseUp={handleZoomMouseUp}
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={filteredChartData}
                onClick={handleChartClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
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
                  interval={0}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                  tickCount={Math.min(20, filteredChartData.length)}
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
                  trigger="hover"
                  position={{ x: 0, y: 0 }}
                />
                
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

                {/* Render annotation markers */}
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

                {/* Show region selection preview */}
                {isDragging && regionStart && (
                  <ReferenceArea
                    x1={new Date(regionStart).getTime()}
                    x2={new Date(regionEnd || regionStart).getTime()}
                    stroke="#3B82F6"
                    strokeOpacity={0.8}
                    fill="#3B82F6"
                    fillOpacity={0.1}
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
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
              Drag left/right in time axis area to zoom
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
            : 'Click on chart lines for point annotations or drag to select regions'
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
