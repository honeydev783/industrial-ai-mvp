import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, File, X, FileText, FileSpreadsheet } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { Document } from "@shared/schema";
import CreatableSelect from "react-select/creatable";
import axios from "axios";
import { TailSpin } from "react-loader-spinner";
import S3FileTable from "./S3FileTable";
import api from "@/lib/api";
const FullScreenLoader = () => (
  <div className="fixed top-0 left-0 w-full h-full flex items-center justify-center bg-black bg-opacity-50 z-[9999]">
    <TailSpin height="60" width="60" color="#ffffff" ariaLabel="loading" />
  </div>
);
interface UploadedFile {
  id: number;
  fileName: string;
  customName: string;
  documentType: string;
  fileSize: number;
  uploadedAt: Date;
}

interface DocumentUploadProps {
  user_id: number;
}
const customStyles = {
  control: (provided) => ({
    ...provided,
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
    borderColor: "var(--border)",
    boxShadow: "none",
    "&:hover": {
      borderColor: "var(--border)",
    },
  }),
  singleValue: (provided) => ({
    ...provided,
    color: "var(--card-foreground)",
  }),
  menu: (provided) => ({
    ...provided,
    backgroundColor: "var(--card)",
    color: "var(--card-foreground)",
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isFocused
      ? "var(--card-muted)" // You can define this in Tailwind config if needed
      : "var(--card)",
    color: "var(--card-foreground)",
    cursor: "pointer",
  }),
  input: (provided) => ({
    ...provided,
    color: "var(--card-foreground)",
  }),
  placeholder: (provided) => ({
    ...provided,
    color: "var(--muted-foreground)", // Tailwind default or your own
  }),
};
// const customStyles = {
//   control: (provided) => ({
//     ...provided,
//     backgroundColor: "black",
//     color: "white",
//     borderColor: "gray",
//   }),
//   singleValue: (provided) => ({
//     ...provided,
//     color: "white",
//   }),
//   menu: (provided) => ({
//     ...provided,
//     backgroundColor: "black",
//   }),
//   option: (provided, state) => ({
//     ...provided,
//     backgroundColor: state.isFocused
//       ? "#333" // dark gray on hover
//       : "black",
//     color: "white",
//     cursor: "pointer",
//   }),
//   input: (provided) => ({
//     ...provided,
//     color: "white",
//   }),
//   placeholder: (provided) => ({
//     ...provided,
//     color: "#ccc",
//   }),
// };
export function DocumentUpload({ user_id }: DocumentUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pairs, setPairs] = useState([
    {
      label: "Standard Operating Procedure",
      description: "Step-by-step operations guide",
    },
    {
      label: "Control Narrative",
      description: "Automation logic and sequences",
    },
    {
      label: "P&ID",
      description: "Diagram of process equipment and instrumentation",
    },
    {
      label: "General Process Description",
      description: "Overview of entire process",
    },
    {
      label: "Detailed Process Description",
      description: "Unit-level technical explanation",
    },
    {
      label: "Equipment Datasheet",
      description: "Specs for equipment performance",
    },
    {
      label: "Equipment Operational Manual",
      description: "Usage and troubleshooting guide",
    },
    {
      label: "Alarm Response Manual",
      description: "Instructions for alarm handling",
    },
    {
      label: "Cause & Effect Matrix",
      description: "Logic table for fault actions",
    },
    {
      label: "Tag Dictionary",
      description: "Signal/tag definitions from SCADA",
    },
    {
      label: "Operating Logs",
      description: "Shift-based observations",
    },
    {
      label: "OEM Manual",
      description: "Manufacturer-supplied instructions",
    },
    {
      label: "Industry Regulations",
      description: "Compliance references",
    },
    {
      label: "Safety Datasheet",
      description: "Hazardous materials info",
    },
    {
      label: "Industry Reference",
      description: "Trusted external expert documents",
    },
    {
      label: "Industry Bible",
      description: "Deep technical reference manuals",
    },
    {
      label: "Process Control Philosophy",
      description: "Rationale behind automation design",
    },
    {
      label: "Design Basis",
      description: "Engineering assumptions and design limits",
    },
    {
      label: "Commissioning Report",
      description: "As-built test results",
    },
    {
      label: "SCADA/Historian Export",
      description: "Time-series signal data",
    },
    {
      label: "Training Manual",
      description: "Onboarding content for operators",
    },
    {
      label: "Maintenance Record",
      description: "Service history and issues",
    },
    {
      label: "Audit Report",
      description: "Quality or safety inspection outcome",
    },
    {
      label: "Root Cause Analysis",
      description: "Post-failure investigation",
    },
    {
      label: "Engineering Change Notice",
      description: "Change logs or design updates",
    },
    {
      label: "KPI Report",
      description: "Operational performance metrics",
    },
  ]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedDescription, setSelectedDescription] = useState(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const getTypeOptions = () => {
    const uniqueTypes = Array.from(new Set(pairs.map((pair) => pair.label)));
    return uniqueTypes.map((label) => ({ value: label, label: label }));
  };

  const handleTypeChange = (newType) => {
    setSelectedType(newType);
    setSelectedDescription(null);
  };

  const handleDescriptionChange = (newDescription) => {
    setSelectedDescription(newDescription);
  };

  const getDescriptionOptions = (type) => {
    return pairs
      .filter((pair) => pair.label === type)
      .map((pair) => ({ value: pair.description, label: pair.description }));
  };

  const handleAddPair = () => {
    if (selectedType && selectedDescription) {
      const exists = pairs.some(
        (pair) =>
          pair.label === selectedType.value &&
          pair.description === selectedDescription.value
      );

      if (!exists) {
        setPairs((prev) => [
          ...prev,
          {
            label: selectedType.value,
            description: selectedDescription.value,
          },
        ]);
        toast({
          title: "Success",
          description: "New pair added!",
        });
      } else {
        toast({
          title: "Success",
          description: "This pair already exists",
        });
      }
    }
  };

  const { data: documents = [], isLoading } = useQuery<
    Omit<Document, "fileContent">[]
  >({
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

  const handleFileUpload = async (files: FileList | null) => {
    console.log("Files to upload:", files);
    if (!files || files.length === 0) return;

    Array.from(files).forEach(async (file) => {
      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "text/csv",
        "text/plain",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload PDF, DOCX, DOC, CSV, or TXT files only",
          variant: "destructive",
        });
        return;
      }

      // Validate file size (10MB)
      if (file.size > 100 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload files smaller than 10MB",
          variant: "destructive",
        });
        return;
      }

      // if(!industry) {
      //   toast({
      //     title: "Missing Information",
      //     description: "Industry information is required before uploading documents.",
      //     variant: "destructive",
      //   });
      //   return;
      // }
      // if(!plant_name) {
      //   toast({
      //     title: "Missing Information",
      //     description: "Plant name information is required before uploading documents.",
      //     variant: "destructive",
      //   });
      //   return;
      // }
      if (!selectedType?.value) {
        toast({
          title: "Missing Information",
          description:
            "Document Type information is required before uploading documents.",
          variant: "destructive",
        });
        fileInputRef.current!.value = "";
        return;
      }

      if (!user_id) {
        toast({
          title: "Missing Information",
          description:
            "User ID information is required before uploading documents.",
          variant: "destructive",
        });
        fileInputRef.current!.value = "";
        return;
      }
      const formData = new FormData();
      formData.append("file", file);
      formData.append("document_name", file.name);
      formData.append("document_type", selectedType?.value);
      // formData.append("industry", industry);
      // formData.append("plant_name", plant_name);
      formData.append("user_id", user_id.toString());
      setIsUploading(true);
      try {
        const res = await api.post("/upload", formData, {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        });
        setRefreshTrigger((prev) => prev + 1);
        toast({
          title: "Success",
          description: "Uploading and Indexing was successfully completed",
        });
        console.log("File uploaded successfully:", res.data);
      } catch (error) {
        console.error("Error uploading file:", error);
        toast({
          title: "Upload Failed",
          description:
            "There was an error uploading your file. Please try again",
          variant: "destructive",
        });
        return;
      } finally {
        setIsUploading(false);
      }

      // alert("uploading now...");
      // formData.append("customName", file.name);
      // formData.append("documentType", "other");

      // uploadMutation.mutate(formData);
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
    const extension = fileName.split(".").pop()?.toLowerCase();
    switch (extension) {
      case "pdf":
        return <File className="text-red-500" />;
      case "docx":
        return <FileText className="text-blue-500" />;
      case "csv":
        return <FileSpreadsheet className="text-green-500" />;
      default:
        return <FileText className="text-gray-500" />;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffInMinutes = Math.floor(
      (now.getTime() - new Date(date).getTime()) / (1000 * 60)
    );

    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes} min ago`;

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24)
      return `${diffInHours} hour${diffInHours > 1 ? "s" : ""} ago`;

    const diffInDays = Math.floor(diffInHours / 24);
    return `${diffInDays} day${diffInDays > 1 ? "s" : ""} ago`;
  };

  return (
    <div className="step-container">
      <S3FileTable
        userId={user_id.toString()}
        refreshTrigger={refreshTrigger}
      />
      <div className="mt-6 step-header">
        <div className="step-number">
          <span className="step-number-text">4</span>
        </div>
        <div className="ml-4">
          <h2 className="step-title">Upload Documents</h2>
          <p className="step-description">
            Upload your reference documents with type classification
          </p>
        </div>
      </div>
      {isUploading && <FullScreenLoader />}
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
        <h3 className="text-lg font-medium mb-2">
          Drop files here or click to browse
        </h3>
        <p className="text-muted-foreground mb-4">
          Supports PDF, DOCX, CSV, TXT files up to 100MB each
        </p>
        <Button variant="outline" disabled={uploadMutation.isPending}>
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
      {
        <div className="mt-6 space-y-4">
          <h4 className="text-sm font-medium">Documents Properties</h4>

          <div className="space-y-4">
            <Card key="id" className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="flex-shrink-0">
                    {/* {getFileIcon(document.fileName)} */}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between space-x-4">
                      <div>
                        <label className="font-semibold">Document Type</label>
                        <CreatableSelect
                          styles={customStyles}
                          options={getTypeOptions()}
                          onChange={handleTypeChange}
                          value={selectedType}
                          placeholder="Select or create type"
                        />
                      </div>

                      <div>
                        <label className="font-semibold">Description</label>
                        <CreatableSelect
                          styles={customStyles}
                          key={selectedType?.value}
                          options={
                            selectedType
                              ? getDescriptionOptions(selectedType.value)
                              : []
                          }
                          onChange={handleDescriptionChange}
                          value={selectedDescription}
                          placeholder="Select or create description"
                          isDisabled={!selectedType}
                        />
                      </div>
                      <button
                        className="mt-2 px-4 py-2 bg-blue-600 text-white rounded"
                        onClick={handleAddPair}
                        disabled={!selectedType || !selectedDescription}
                      >
                        Add Pair
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {/* {document.fileName} • {formatFileSize(document.fileSize)} • Uploaded {formatTimeAgo(document.uploadedAt)} */}
                    </p>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </div>
      }
    </div>
  );
}
