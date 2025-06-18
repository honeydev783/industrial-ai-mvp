import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, CheckCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface UploadResult {
  success: boolean;
  rowsProcessed: number;
  rowsInserted: number;
  errors?: string[];
}

export function FileUpload() {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      try {
        const response = await apiRequest('POST', '/api/upload', formData);
        clearInterval(progressInterval);
        setUploadProgress(100);
        
        if (response.headers.get('content-type')?.includes('application/json')) {
          return await response.json();
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        clearInterval(progressInterval);
        setUploadProgress(0);
        throw error;
      }
    },
    onSuccess: (result: UploadResult) => {
      setUploadResult(result);
      queryClient.invalidateQueries({ queryKey: ['/api/tags'] });
      queryClient.invalidateQueries({ queryKey: ['/api/timeseries'] });
      
      toast({
        title: "Upload Successful",
        description: `Processed ${result.rowsInserted} data points`,
      });
    },
    onError: (error: any) => {
      setUploadProgress(0);
      toast({
        title: "Upload Failed",
        description: error.message || "Failed to upload file",
        variant: "destructive",
      });
    }
  });

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const file = files[0];
    
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleFileUpload = (file: File) => {
    const allowedTypes = ['.csv', '.xlsx', '.xls'];
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedTypes.includes(fileExtension)) {
      toast({
        title: "Invalid File Format",
        description: "Please upload CSV or Excel files only",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      toast({
        title: "File Too Large",
        description: "Please upload files smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    setUploadProgress(0);
    setUploadResult(null);
    uploadMutation.mutate(file);
  };

  const clearUploadResult = () => {
    setUploadResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          isDragOver 
            ? 'border-blue-500 bg-blue-500/10' 
            : uploadResult?.success
            ? 'border-emerald-500 bg-emerald-500/10'
            : 'border-slate-600 hover:border-blue-500'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <CardContent className="p-6 text-center">
          {uploadMutation.isPending ? (
            <div className="space-y-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-slate-300">Uploading and processing...</p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          ) : uploadResult ? (
            <div className="space-y-2">
              <CheckCircle className="h-8 w-8 text-emerald-400 mx-auto" />
              <p className="text-sm text-slate-300">File processed successfully</p>
              <p className="text-xs text-slate-400">
                {uploadResult.rowsInserted} rows • {new Date().toLocaleTimeString()}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <CloudUpload className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm text-slate-300">Drag & drop CSV/Excel files here</p>
              <p className="text-xs text-slate-400">or click to browse</p>
            </div>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={handleFileSelect}
            className="hidden"
          />
        </CardContent>
      </Card>

      {uploadResult && (
        <Card className="bg-slate-700 border-slate-600">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {uploadResult.success ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-red-400" />
                )}
                <span className="text-sm text-slate-300">
                  {uploadResult.success ? 'Upload Complete' : 'Upload Failed'}
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearUploadResult}
                className="h-6 w-6 p-0 text-slate-400 hover:text-slate-100"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
            <div className="text-xs text-slate-400 mt-1">
              {uploadResult.rowsInserted} rows processed
              {uploadResult.errors && uploadResult.errors.length > 0 && (
                <span className="text-amber-400"> • {uploadResult.errors.length} warnings</span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
