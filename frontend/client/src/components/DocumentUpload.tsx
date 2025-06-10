import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, X, FileText, FileSpreadsheet } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Document } from "@shared/schema";

interface UploadedFile {
  id: number;
  fileName: string;
  customName: string;
  documentType: string;
  fileSize: number;
  uploadedAt: Date;
}

export function DocumentUpload() {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery<Omit<Document, 'fileContent'>[]>({
    queryKey: ["/api/documents"],
  });

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.text();
        throw new Error(error);
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document uploaded successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: `Failed to upload document: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/documents/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/documents"] });
      toast({
        title: "Success",
        description: "Document deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete document",
        variant: "destructive",
      });
    },
  });

  const documentTypes = [
    { value: "sop", label: "Standard Operating Procedure" },
    { value: "manual", label: "Equipment Manual" },
    { value: "spec", label: "Technical Specification" },
    { value: "report", label: "Process Report" },
    { value: "other", label: "Other" },
  ];

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file) => {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/csv',
        'text/plain'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, DOCX, CSV, or TXT files only",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload files smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('customName', file.name);
      formData.append('documentType', 'other');

      uploadMutation.mutate(formData);
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const getFileIcon = (fileName: string) => {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return <File className="text-red-500" />;
      case 'docx':
        return <FileText className="text-blue-500" />;
      case 'csv':
        return <FileSpreadsheet className="text-green-500" />;
      default:
        return <FileText className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - new Date(date).getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
  };

  return (
    <div className="step-container">
      <div className="step-header">
        <div className="step-number">
          <span className="step-number-text">4</span>
        </div>
        <div className="ml-4">
          <h2 className="step-title">Upload Documents</h2>
          <p className="step-description">Upload your reference documents with type classification</p>
        </div>
      </div>

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
          dragOver
            ? "border-primary bg-primary/5"
            : "border-muted-foreground/25 hover:border-primary/50"
        }`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">Drop files here or click to browse</h3>
        <p className="text-muted-foreground mb-4">Supports PDF, DOCX, CSV, TXT files up to 10MB each</p>
        <Button
          variant="outline"
          disabled={uploadMutation.isPending}
        >
          <Upload className="mr-2 h-4 w-4" />
          {uploadMutation.isPending ? "Uploading..." : "Select Files"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.csv,.txt"
          onChange={(e) => handleFileUpload(e.target.files)}
          className="hidden"
        />
      </div>

      {/* Uploaded Files List */}
      {(documents.length > 0 || isLoading) && (
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-medium">
            Uploaded Documents ({documents.length})
          </h4>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="p-4 animate-pulse">
                  <div className="flex items-center space-x-4">
                    <div className="w-6 h-6 bg-muted rounded" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {documents.map((document) => (
                <Card key={document.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        {getFileIcon(document.fileName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-4">
                          <Input
                            value={document.customName}
                            readOnly
                            className="flex-1 text-sm"
                          />
                          <Select value={document.documentType} disabled>
                            <SelectTrigger className="w-48">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {documentTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  {type.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {document.fileName} • {formatFileSize(document.fileSize)} • Uploaded {formatTimeAgo(document.uploadedAt)}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteMutation.mutate(document.id)}
                      disabled={deleteMutation.isPending}
                      className="ml-4 text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
