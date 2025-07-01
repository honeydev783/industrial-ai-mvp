import { useEffect, useState } from "react";
import { Trash2 } from "lucide-react";
import api from "@/lib/api";
interface S3FileTableProps {
  userId: string;
  refreshTrigger?: number;
}
export default function S3FileTable({
  userId,
  refreshTrigger,
}: S3FileTableProps) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/files?user_id=${userId}`);
      const data = await res.data;
      console.log("Fetched files:", data);
      setFiles(data || []);
    } catch (err) {
      console.error("Error fetching files:", err);
    } finally {
      setLoading(false);
    }
  };

  const deleteFile = async (s3Url) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      const res = await api.delete(
        `/delete-file?s3_url=${encodeURIComponent(s3Url)}`,
        // { method: "DELETE" }
      );
      if (res.status >= 200 && res.status < 300) {
        setFiles((prev) => prev.filter((url) => url !== s3Url));
      } else {
        alert("Delete failed: " + (res.data?.detail || "Unknown error"));
      }
    } catch (err) {
      console.error("Error deleting file:", err);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [userId, refreshTrigger]);

  return (
    <div className="w-full rounded-xl shadow-md p-12 overflow-x-auto">
      <h2 className="text-xl font-semibold mb-4">Your S3 Files</h2>

      {loading ? (
        <p className="text-gray-500">Loading...</p>
      ) : files.length === 0 ? (
        <p className="text-gray-500">No files found.</p>
      ) : (
        <table className="min-w-full table-auto text-sm text-left text-gray-700">
          <thead className="bg-gray-100 text-xs uppercase font-medium text-gray-600">
            <tr>
              <th className="px-4 py-2">#</th>
              <th className="px-4 py-2">S3 URL</th>
              <th className="px-4 py-2">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {files.map((s3Url, index) => (
              <tr key={s3Url} className="hover:bg-gray-50">
                <td className="px-4 py-2">{index + 1}</td>
                <td className="px-4 py-2 truncate max-w-xs">{s3Url}</td>
                <td className="px-4 py-2">
                  <button
                    onClick={() => deleteFile(s3Url)}
                    className="inline-flex items-center text-red-600 hover:text-red-800"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
