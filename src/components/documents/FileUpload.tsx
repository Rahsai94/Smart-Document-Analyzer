'use client';

import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { AlertCircle, File, X, UploadCloud, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type FileStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

interface FileUploadState {
  file: File;
  id: string;
  status: FileStatus;
  progress: number;
  error?: string;
  documentId?: string;
  requiresOcr?: boolean;
}

export function FileUpload() {
  const [uploads, setUploads] = useState<FileUploadState[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const abortControllers = useRef<{ [id: string]: AbortController }>({});

  const uploadFile = async (uploadState: FileUploadState) => {
    const formData = new FormData();
    formData.append('file', uploadState.file);

    const controller = new AbortController();
    abortControllers.current[uploadState.id] = controller;

    try {
      setUploads(prev => prev.map(u => u.id === uploadState.id ? { ...u, status: 'uploading', progress: 50 } : u));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploads(prev => prev.map(u => u.id === uploadState.id ? {
        ...u,
        status: 'success',
        progress: 100,
        documentId: data.documentId,
        requiresOcr: data.requiresOcr
      } : u));

    } catch (error: unknown) {
      if (error instanceof Error && error.name === 'AbortError') {
          // Ignore abort errors in state
          return;
      }
      setUploads(prev => prev.map(u => u.id === uploadState.id ? {
        ...u,
        status: 'error',
        progress: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      } : u));
    } finally {
        delete abortControllers.current[uploadState.id];
    }
  };

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files) return;

    const newUploads: FileUploadState[] = Array.from(files).map(file => ({
      file,
      id: Math.random().toString(36).substring(7),
      status: 'idle',
      progress: 0
    }));

    setUploads(prev => [...prev, ...newUploads]);

    // Start uploads
    newUploads.forEach(uploadFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files.length > 0) {
      handleFiles(e.target.files);
    }
  };

  const removeUpload = (id: string) => {
    if (abortControllers.current[id]) {
        abortControllers.current[id].abort();
    }
    setUploads(prev => prev.filter(u => u.id !== id));
  };

  return (
    <div className="w-full max-w-2xl mx-auto space-y-6">
      <div
        className={cn(
          "relative border-2 border-dashed rounded-lg p-12 text-center hover:bg-gray-50 transition-colors cursor-pointer",
          dragActive ? "border-blue-500 bg-blue-50" : "border-gray-300"
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={handleChange}
        />
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">Click or drag files to upload</h3>
        <p className="text-sm text-gray-500">Supports PDF, DOCX, and TXT (Max 10MB)</p>
      </div>

      {uploads.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-gray-700">Uploaded Files</h4>
          <div className="space-y-3">
            {uploads.map(upload => (
              <Card key={upload.id} className="overflow-hidden">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded">
                    <File className="h-6 w-6 text-gray-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {upload.file.name}
                      </p>
                      <button
                        onClick={() => removeUpload(upload.id)}
                        className="text-gray-400 hover:text-gray-600 p-1"
                        aria-label="Remove file"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>

                    {upload.status === 'error' ? (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {upload.error}
                      </p>
                    ) : upload.status === 'success' ? (
                      <div className="space-y-1">
                        <p className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Processed successfully
                        </p>
                        {upload.requiresOcr && (
                           <p className="text-xs text-yellow-600 flex items-center gap-1 bg-yellow-50 px-2 py-0.5 rounded w-fit border border-yellow-200">
                             Scanned document detected. OCR is required for full text extraction.
                           </p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Progress value={upload.progress} className="h-1.5" />
                        <p className="text-xs text-gray-500 capitalize">{upload.status}...</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}