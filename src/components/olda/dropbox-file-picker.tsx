"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Paperclip, X, CheckCircle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDropboxUpload } from "@/hooks/useDropboxUpload";

interface DropboxFilePickerProps {
  onFileSelect: (link: string, fileName: string) => void;
  dropboxPath: string; // e.g., "/prt-designs/item-id"
  fileLink?: string;
  onClear?: () => void;
  variant?: "icon" | "button";
}

export function DropboxFilePicker({
  onFileSelect,
  dropboxPath,
  fileLink,
  onClear,
  variant = "icon",
}: DropboxFilePickerProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState("");
  const { isUploading, uploadProgress, uploadFile } = useDropboxUpload();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");
    setFileName(file.name);

    // Create dropbox path with filename
    const fullPath = `${dropboxPath}/${file.name}`;

    const result = await uploadFile(file, fullPath);

    if (result.success && result.link) {
      onFileSelect(result.link, file.name);
    } else {
      setError(result.error || "Upload failed");
      setFileName("");
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClear = () => {
    setFileName("");
    setError("");
    onClear?.();
  };

  if (variant === "icon") {
    return (
      <div className="flex items-center gap-1.5">
        <input
          ref={fileInputRef}
          type="file"
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,.pdf,.doc,.docx"
        />

        <AnimatePresence mode="wait">
          {isUploading ? (
            <motion.div
              key="uploading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <div className="relative w-4 h-4">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-transparent border-t-blue-500"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                />
              </div>
              <span className="text-xs text-blue-600 font-medium">
                {uploadProgress}%
              </span>
            </motion.div>
          ) : fileLink ? (
            <motion.div
              key="uploaded"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <a
                href={fileLink}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                title="Ouvrir le fichier"
              >
                <CheckCircle className="h-4 w-4" />
              </a>
              <motion.button
                onClick={handleClear}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                title="Supprimer le fichier"
              >
                <X className="h-4 w-4" />
              </motion.button>
            </motion.div>
          ) : error ? (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="flex items-center gap-1.5"
            >
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                title={error}
              >
                <AlertCircle className="h-4 w-4" />
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="idle"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => fileInputRef.current?.click()}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors opacity-0 group-hover:opacity-100"
              title="Attacher un fichier Dropbox"
            >
              <Paperclip className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    );
  }

  // Button variant
  return (
    <motion.button
      onClick={() => fileInputRef.current?.click()}
      disabled={isUploading}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-all",
        isUploading
          ? "bg-blue-100 text-blue-700 cursor-loading"
          : fileLink
          ? "bg-green-100 text-green-700 hover:bg-green-200"
          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
      )}
    >
      <input
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx"
      />

      <Paperclip className="h-4 w-4" />

      {isUploading ? (
        <>
          <span className="inline-block w-2 h-2 rounded-full bg-current animate-pulse" />
          Envoi...
        </>
      ) : fileLink ? (
        "Fichier attaché ✓"
      ) : (
        "Attacher fichier"
      )}
    </motion.button>
  );
}
