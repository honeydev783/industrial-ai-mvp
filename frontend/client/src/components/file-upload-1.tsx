import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CloudUpload, CheckCircle, AlertCircle, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import api from "@/lib/api";

interface UploadResult {
  success: boolean;
  rowsProcessed: number;
  rowsInserted: number;
  errors?: string[];
}

interface FileUploadProps {
  description?: string;
  setDescription?: (desc: string) => void;
  onFileUploaded?: () => void;
}

export function TestFileUpload({
  onFileUploaded,
  description,
  setDescription,
}: FileUploadProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const uploadFile = async (file: File) => {
    console.log("description", description);
    if (!description) {
      toast({
        title: "Description Required",
        description: "Please provide a description for the upload",
        variant: "destructive",
      });
      return;
    }
    setIsUploading(true);
    setUploadProgress(0);
    setUploadResult(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("description", description);

    // Simulate progress for better UX
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => Math.min(prev + 10, 90));
    }, 200);

    try {
      const response = await api.post("/api/upload", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      const result = response.data as UploadResult;
      setUploadResult(result);

      toast({
        title: "Upload Successful",
        description: `Processed ${result.rowsInserted} data points`,
      });

      if (onFileUploaded) {
        onFileUploaded();
      }

      return result;
    } catch (error: any) {
      clearInterval(progressInterval);
      setUploadProgress(0);
      setUploadResult(null);

      toast({
        title: "Upload Failed",
        description:
          error.response?.data?.detail ||
          error.message ||
          "Failed to upload file",
        variant: "destructive",
      });

      throw error;
    } finally {
      setIsUploading(false);
    }
  };

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
    handleFileUpload(e.dataTransfer.files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(e.target.files);
    }
  };

  const handleFileUpload = async (files: FileList) => {
    for (const file of Array.from(files)) {
      if (!file.name.match(/\.(csv|xlsx)$/i)) {
        toast({
          title: "Invalid File",
          description: "Please upload a CSV or Excel file",
          variant: "destructive",
        });
        continue;
      }

      if (file.size > 10 * 1024 * 1024) {
        // 10MB limit
        toast({
          title: "File Too Large",
          description: "Please upload a file smaller than 10MB",
          variant: "destructive",
        });
        continue;
      }

      try {
        await uploadFile(file);
      } catch (error) {
        // Error already handled in uploadFile
      }
    }
  };

  const clearUploadResult = () => {
    setUploadResult(null);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <CloudUpload className="h-5 w-5" />
            <h3 className="font-medium">Upload Time Series Data</h3>
          </div>

          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragOver
                ? "border-blue-400 bg-blue-50 dark:bg-blue-950"
                : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="space-y-2">
              <CloudUpload className="mx-auto h-12 w-12 text-gray-400" />
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Drag & drop your CSV or Excel file here, or{" "}
                  <button
                    type="button"
                    className="text-blue-600 hover:text-blue-500 underline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    browse
                  </button>
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                  Supports CSV and Excel files up to 10MB
                </p>
              </div>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".csv,.xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              disabled={isUploading}
            />
          </div>

          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {uploadResult && (
            <div className="rounded-lg border p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  {uploadResult.success ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {uploadResult.success ? "Upload Complete" : "Upload Failed"}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={clearUploadResult}>
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                <p>Rows processed: {uploadResult.rowsProcessed}</p>
                <p>Rows inserted: {uploadResult.rowsInserted}</p>
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-red-600 font-medium">Errors:</p>
                    <ul className="list-disc list-inside space-y-1">
                      {uploadResult.errors.slice(0, 3).map((error, index) => (
                        <li key={index} className="text-red-600">
                          {error}
                        </li>
                      ))}
                      {uploadResult.errors.length > 3 && (
                        <li className="text-red-600">
                          ... and {uploadResult.errors.length - 3} more
                        </li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
