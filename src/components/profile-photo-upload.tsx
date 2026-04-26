"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, CheckCircle2 } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

export type EntityType = "user" | "cult" | "group";

interface ProfilePhotoUploadProps {
  entityType: EntityType;
  entityId?: string;
  currentPhotoUrl?: string;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
  size?: "sm" | "md" | "lg";
  uploadOnly?: boolean;
}

export function ProfilePhotoUpload({
  entityType,
  entityId,
  currentPhotoUrl,
  onUploadComplete,
  onUploadError,
  size = "md",
  uploadOnly = false,
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const generateUploadUrl = useMutation(api.users.generateUploadUrl);
  const updateProfilePhoto = useMutation(api.users.updateProfilePhoto);
  const updateCultProfilePhoto = useMutation(api.cult.updateCultProfilePhoto);
  const updateGroupProfilePhoto = useMutation(
    api.group.updateGroupProfilePhoto,
  );

  const deleteProfilePhoto = useMutation(api.users.deleteProfilePhoto);
  const deleteCultProfilePhoto = useMutation(api.cult.deleteCultProfilePhoto);
  const deleteGroupProfilePhoto = useMutation(
    api.group.deleteGroupProfilePhoto,
  );

  const sizeClasses = { sm: "w-16 h-16", md: "w-24 h-24", lg: "w-32 h-32" };

  // ── Upload to storage ─────────────────────────────────────────────
  const uploadToStorage = useCallback(
    async (file: File): Promise<string> => {
      const uploadUrl = await generateUploadUrl();

      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!result.ok) throw new Error("Failed to upload file");

      const { storageId } = await result.json();

      if (uploadOnly) {
        const response = await updateProfilePhoto({
          storageId: storageId as Id<"_storage">,
        });
        return response.imageUrl;
      }

      if (entityType === "user") {
        const r = await updateProfilePhoto({
          storageId: storageId as Id<"_storage">,
        });
        return r.imageUrl;
      } else if (entityType === "cult") {
        const r = await updateCultProfilePhoto({
          cultId: entityId as Id<"cult">,
          storageId: storageId as Id<"_storage">,
        });
        return r.imageUrl;
      } else if (entityType === "group") {
        const r = await updateGroupProfilePhoto({
          groupId: entityId as Id<"group">,
          storageId: storageId as Id<"_storage">,
        });
        return r.imageUrl;
      }

      throw new Error("Invalid entity type");
    },
    [
      generateUploadUrl,
      uploadOnly,
      entityType,
      entityId,
      updateProfilePhoto,
      updateCultProfilePhoto,
      updateGroupProfilePhoto,
    ],
  );

  // ── File select ──────────────────────────────────────────────────
  const handleFileSelect = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      event.target.value = "";
      if (!file) return;

      if (!file.type.startsWith("image/")) {
        onUploadError?.("Please select an image file");
        return;
      }

      if (file.size > 5 * 1024 * 1024) {
        onUploadError?.("Image must be less than 5MB");
        return;
      }

      const localUrl = URL.createObjectURL(file);
      setPreviewUrl(localUrl);
      setUploadedUrl(null);

      if (uploadOnly) {
        setIsUploading(true);
        try {
          const imageUrl = await uploadToStorage(file);
          URL.revokeObjectURL(localUrl);
          setPreviewUrl(imageUrl);
          setUploadedUrl(imageUrl);
          onUploadComplete?.(imageUrl);
        } catch (error) {
          setPreviewUrl(null);
          onUploadError?.(
            error instanceof Error ? error.message : "Upload failed",
          );
        } finally {
          setIsUploading(false);
        }
      } else {
        setSelectedFile(file);
      }
    },
    [uploadOnly, uploadToStorage, onUploadComplete, onUploadError],
  );

  // ── Manual upload ────────────────────────────────────────────────
  const handleManualUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      const imageUrl = await uploadToStorage(selectedFile);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setSelectedFile(null);
      onUploadComplete?.(imageUrl);
    } catch (error) {
      onUploadError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [
    selectedFile,
    uploadToStorage,
    previewUrl,
    onUploadComplete,
    onUploadError,
  ]);

  const handleCancel = useCallback(() => {
    if (previewUrl && !uploadedUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setSelectedFile(null);
    setUploadedUrl(null);
  }, [previewUrl, uploadedUrl]);

  // ── Remove photo ────────────────────────────────────────────────
  const handleRemovePhoto = useCallback(async () => {
    try {
      if (entityType === "user") {
        await deleteProfilePhoto();
      } else if (entityType === "cult") {
        await deleteCultProfilePhoto({
          cultId: entityId as Id<"cult">,
        });
      } else if (entityType === "group") {
        await deleteGroupProfilePhoto({
          groupId: entityId as Id<"group">,
        });
      }

      setPreviewUrl(null);
      setUploadedUrl(null);
      onUploadComplete?.("");
    } catch (error) {
      onUploadError?.(
        error instanceof Error ? error.message : "Failed to remove photo",
      );
    }
  }, [
    entityType,
    entityId,
    deleteProfilePhoto,
    deleteCultProfilePhoto,
    deleteGroupProfilePhoto,
    onUploadComplete,
    onUploadError,
  ]);

  const displayUrl = previewUrl || currentPhotoUrl;
  const inputId = `${entityType}-${uploadOnly ? "create" : "edit"}-photo-upload`;

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative">
        {displayUrl ? (
          <div
            className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-border`}
          >
            <img
              src={displayUrl}
              alt="Profile preview"
              className="w-full h-full object-cover"
            />

            {isUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center rounded-full">
                <Loader2 className="w-6 h-6 text-white animate-spin" />
              </div>
            )}

            {uploadOnly && uploadedUrl && !isUploading && (
              <div className="absolute bottom-0 right-0 bg-green-500 rounded-full p-0.5">
                <CheckCircle2 className="w-4 h-4 text-white" />
              </div>
            )}

            {!uploadOnly && !selectedFile && currentPhotoUrl && (
              <button
                onClick={handleRemovePhoto}
                className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full hover:bg-destructive/80"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted`}
          >
            {isUploading ? (
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            ) : (
              <Upload className="w-8 h-8 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id={inputId}
          disabled={isUploading}
        />

        {uploadOnly ? (
          <>
            <label htmlFor={inputId}>
              <Button variant="neutral" size="sm" asChild disabled={isUploading}>
                <span>
                  {isUploading
                    ? "Uploading…"
                    : uploadedUrl
                      ? "Change Photo"
                      : "Upload Photo"}
                </span>
              </Button>
            </label>

            {uploadedUrl && !isUploading && (
              <p className="text-xs text-green-600 font-medium">
                ✓ Photo ready
              </p>
            )}

            {!uploadedUrl && !isUploading && (
              <p className="text-xs text-muted-foreground">
                Optional — you can skip this step
              </p>
            )}
          </>
        ) : (
          <>
            <label htmlFor={inputId}>
              <Button variant="neutral" size="sm" asChild disabled={isUploading}>
                <span>{selectedFile ? "Change Photo" : "Upload Photo"}</span>
              </Button>
            </label>

            {selectedFile && (
              <div className="flex gap-2">
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleManualUpload}
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      Uploading…
                    </>
                  ) : (
                    "Save Photo"
                  )}
                </Button>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  disabled={isUploading}
                >
                  Cancel
                </Button>
              </div>
            )}

            {selectedFile && (
              <p className="text-sm text-muted-foreground">
                {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}