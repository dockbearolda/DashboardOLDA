import { useState, useCallback } from "react";

interface UploadResult {
  success: boolean;
  link?: string;
  error?: string;
}

export function useDropboxUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const uploadFile = useCallback(
    async (file: File, path: string): Promise<UploadResult> => {
      setIsUploading(true);
      setUploadProgress(0);

      try {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("path", path);

        // Simulate progress
        const progressInterval = setInterval(() => {
          setUploadProgress((prev) => (prev < 90 ? prev + 10 : prev));
        }, 100);

        const response = await fetch("/api/upload/dropbox", {
          method: "POST",
          body: formData,
        });

        clearInterval(progressInterval);

        if (!response.ok) {
          const error = await response.json();
          return {
            success: false,
            error: error.error || "Upload failed",
          };
        }

        const data = await response.json();
        setUploadProgress(100);

        // Brief pause to show completion
        await new Promise((resolve) => setTimeout(resolve, 300));

        return {
          success: true,
          link: data.link,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Upload failed",
        };
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
    },
    []
  );

  return {
    isUploading,
    uploadProgress,
    uploadFile,
  };
}
