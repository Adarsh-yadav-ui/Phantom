import { v } from "convex/values";
import { mutation, QueryCtx, MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

/**
 * Generate a short-lived upload URL for file uploads
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Must be authenticated to generate upload URL");
    }
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Delete a file from storage by storage ID
 */
export async function deleteFile(
  ctx: MutationCtx,
  storageId: Id<"_storage">
): Promise<void> {
  try {
    await ctx.storage.delete(storageId);
  } catch (error) {
    console.warn("Failed to delete file from storage:", error);
  }
}

/**
 * Extract storage ID from a Convex storage URL
 */
export function extractStorageIdFromUrl(url: string): string | null {
  if (!url || !url.includes("/convex/storage/")) {
    return null;
  }
  return url.split("/convex/storage/")[1] || null;
}

/**
 * Get the URL of a file from storage
 */
export async function getFileUrl(
  ctx: QueryCtx | MutationCtx,
  storageId: Id<"_storage">
): Promise<string | null> {
  return await ctx.storage.getUrl(storageId);
}

/**
 * Delete old profile image if it's a Convex storage URL
 */
export async function deleteOldImage(
  ctx: MutationCtx,
  imageUrl: string | undefined
): Promise<void> {
  if (imageUrl && imageUrl.includes("/convex/storage/")) {
    const oldStorageId = extractStorageIdFromUrl(imageUrl);
    if (oldStorageId) {
      await deleteFile(ctx, oldStorageId as Id<"_storage">);
    }
  }
}