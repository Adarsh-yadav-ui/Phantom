"use client";

import { useCallback, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2 } from "lucide-react";
import { Id } from "../../convex/_generated/dataModel";

// Entity types that support profile photos
export type EntityType = "user" | "cult" | "group" | "channel";

interface ProfilePhotoUploadProps {
  entityType: EntityType;
  entityId?: string;
  currentPhotoUrl?: string;
  onUploadComplete?: (url: string) => void;
  onUploadError?: (error: string) => void;
  size?: "sm" | "md" | "lg";
}

export function ProfilePhotoUpload({
  entityType,
  entityId,
  currentPhotoUrl,
  onUploadComplete,
  onUploadError,
  size = "md",
}: ProfilePhotoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Convex mutations - use users.generateUploadUrl as the shared one
  const generateUploadUrl = useMutation(api.users.generateUploadUrl);

  // Entity-specific update mutations
  const updateProfilePhoto = useMutation(api.users.updateProfilePhoto);
  const updateCultProfilePhoto = useMutation(api.cult.updateCultProfilePhoto);
  const updateGroupProfilePhoto = useMutation(
    api.group.updateGroupProfilePhoto,
  );
  const updateChannelProfilePhoto = useMutation(
    api.channel.updateChannelProfilePhoto,
  );

  // Entity-specific delete mutations
  const deleteProfilePhoto = useMutation(api.users.deleteProfilePhoto);
  const deleteCultProfilePhoto = useMutation(api.cult.deleteCultProfilePhoto);
  const deleteGroupProfilePhoto = useMutation(
    api.group.deleteGroupProfilePhoto,
  );
  const deleteChannelProfilePhoto = useMutation(
    api.channel.deleteChannelProfilePhoto,
  );

  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-24 h-24",
    lg: "w-32 h-32",
  };

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith("image/")) {
        onUploadError?.("Please select an image file");
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        onUploadError?.("Image must be less than 5MB");
        return;
      }

      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    },
    [onUploadError],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    try {
      // Step 1: Generate upload URL
      const uploadUrl = await generateUploadUrl();

      // Step 2: Upload file to Convex storage
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": selectedFile.type },
        body: selectedFile,
      });

      if (!result.ok) {
        throw new Error("Failed to upload file");
      }

      const { storageId } = await result.json();

      // Step 3: Update entity profile with the new photo
      let imageUrl: string;

      if (entityType === "user") {
        const response = await updateProfilePhoto({
          storageId: storageId as Id<"_storage">,
        });
        imageUrl = response.imageUrl;
      } else if (entityType === "cult") {
        const response = await updateCultProfilePhoto({
          cultId: entityId as Id<"cult">,
          storageId: storageId as Id<"_storage">,
        });
        imageUrl = response.imageUrl;
      } else if (entityType === "group") {
        const response = await updateGroupProfilePhoto({
          groupId: entityId as Id<"group">,
          storageId: storageId as Id<"_storage">,
        });
        imageUrl = response.imageUrl;
      } else {
        const response = await updateChannelProfilePhoto({
          channelId: entityId as Id<"channel">,
          storageId: storageId as Id<"_storage">,
        });
        imageUrl = response.imageUrl;
      }

      // Clean up preview URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl(null);
      setSelectedFile(null);
      onUploadComplete?.(imageUrl);
    } catch (error) {
      console.error("Upload failed:", error);
      onUploadError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  }, [
    selectedFile,
    generateUploadUrl,
    entityType,
    entityId,
    updateProfilePhoto,
    updateCultProfilePhoto,
    updateGroupProfilePhoto,
    updateChannelProfilePhoto,
    previewUrl,
    onUploadComplete,
    onUploadError,
  ]);

  const handleCancel = useCallback(() => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setSelectedFile(null);
  }, [previewUrl]);

  const handleRemovePhoto = useCallback(async () => {
    try {
      if (entityType === "user") {
        await deleteProfilePhoto();
      } else if (entityType === "cult") {
        await deleteCultProfilePhoto({ cultId: entityId as Id<"cult"> });
      } else if (entityType === "group") {
        await deleteGroupProfilePhoto({ groupId: entityId as Id<"group"> });
      } else {
        await deleteChannelProfilePhoto({
          channelId: entityId as Id<"channel">,
        });
      }
      onUploadComplete?.("");
    } catch (error) {
      console.error("Failed to remove photo:", error);
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
    deleteChannelProfilePhoto,
    onUploadComplete,
    onUploadError,
  ]);

  const displayUrl = previewUrl || currentPhotoUrl;

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Photo Preview */}
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
            {!selectedFile && currentPhotoUrl && (
              <button
                onClick={handleRemovePhoto}
                className="absolute top-1 right-1 p-1 bg-destructive text-white rounded-full hover:bg-destructive/80"
                title="Remove photo"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        ) : (
          <div
            className={`${sizeClasses[size]} rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted`}
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
          </div>
        )}
      </div>

      {/* Upload Controls */}
      <div className="flex flex-col items-center gap-2">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
          id={`${entityType}-photo-upload`}
        />
        <label htmlFor={`${entityType}-photo-upload`}>
          <Button variant="neutral" size="sm" asChild disabled={isUploading}>
            <span>{selectedFile ? "Change Photo" : "Upload Photo"}</span>
          </Button>
        </label>

        {selectedFile && (
          <div className="flex gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={handleUpload}
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
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
      </div>

      {/* File Info */}
      {selectedFile && (
        <p className="text-sm text-muted-foreground">
          {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
        </p>
      )}
    </div>
  );
}
