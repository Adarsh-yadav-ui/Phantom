import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deleteOldImage, extractStorageIdFromUrl } from "./storage";
import { Id } from "./_generated/dataModel";

async function isCultMember(ctx: any, cultId: any, userId: any) {
  const membership = await ctx.db
    .query("cultMembers")
    .withIndex("byCultAndUser", (q: any) =>
      q.eq("cultId", cultId).eq("userId", userId),
    )
    .unique();
  return !!membership;
}

async function isCultAdmin(ctx: any, cultId: any, userId: any) {
  const membership = await ctx.db
    .query("cultMembers")
    .withIndex("byCultAndUser", (q: any) =>
      q.eq("cultId", cultId).eq("userId", userId),
    )
    .unique();
  return membership?.role === "admin";
}

async function checkChannelAdmin(ctx: any, channelId: any, userId: any) {
  const channel = await ctx.db.get(channelId);
  if (!channel) return false;

  if (await isCultAdmin(ctx, channel.cultId, userId)) return true;

  const membership = await ctx.db
    .query("channelMembers")
    .withIndex("byChannelAndUser", (q: any) =>
      q.eq("channelId", channelId).eq("userId", userId),
    )
    .unique();
  return membership?.role === "admin";
}

export const getChannelsForCult = query({
  args: {
    cultId: v.id("cult"),
    userId: v.id("users"),
  },
  handler: async (ctx, { cultId, userId }) => {
    if (!(await isCultMember(ctx, cultId, userId))) {
      throw new Error(
        "You must be a member of the cult to access its channels.",
      );
    }

    return await ctx.db
      .query("channel")
      .withIndex("byCultId", (q: any) => q.eq("cultId", cultId))
      .collect();
  },
});

export const getChannel = query({
  args: {
    channelId: v.id("channel"),
    userId: v.id("users"),
  },
  handler: async (ctx, { channelId, userId }) => {
    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    if (!(await isCultMember(ctx, channel.cultId, userId))) {
      throw new Error(
        "You must be a member of the cult to access this channel.",
      );
    }

    return channel;
  },
});

export const getChannelsByType = query({
  args: {
    cultId: v.id("cult"),
    userId: v.id("users"),
    type: v.union(
      v.literal("text"),
      v.literal("voice"),
      v.literal("announcement"),
    ),
  },
  handler: async (ctx, { cultId, userId, type }) => {
    if (!(await isCultMember(ctx, cultId, userId))) {
      throw new Error(
        "You must be a member of the cult to access its channels.",
      );
    }

    const channels = await ctx.db
      .query("channel")
      .withIndex("byCultId", (q: any) => q.eq("cultId", cultId))
      .collect();

    return channels.filter((ch) => ch.type === type);
  },
});

export const getChannelByJoinCode = query({
  args: {
    joinCode: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { joinCode, userId }) => {
    const channel = await ctx.db
      .query("channel")
      .withIndex("byJoinCode", (q: any) => q.eq("joinCode", joinCode))
      .unique();

    if (!channel) return null;

    if (!(await isCultMember(ctx, channel.cultId, userId))) {
      throw new Error(
        "You must be a member of the cult to access this channel.",
      );
    }

    return channel;
  },
});

export const isChannelAdmin = query({
  args: {
    channelId: v.id("channel"),
    userId: v.id("users"),
  },
  handler: async (ctx, { channelId, userId }) => {
    return await checkChannelAdmin(ctx, channelId, userId);
  },
});

export const createChannel = mutation({
  args: {
    cultId: v.id("cult"),
    channelName: v.string(),
    channelDesc: v.string(),
    channelProfile: v.string(),
    joinCode: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("voice"),
      v.literal("announcement"),
    ),
  },
  handler: async (
    ctx,
    { cultId, channelName, channelDesc, channelProfile, joinCode, type },
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await isCultAdmin(ctx, cultId, user._id))) {
      throw new Error("Only cult admins can create channels.");
    }

    const conflict = await ctx.db
      .query("channel")
      .withIndex("byJoinCode", (q: any) => q.eq("joinCode", joinCode))
      .unique();

    if (conflict) {
      throw new Error("A channel with this join code already exists.");
    }

    const now = Date.now();

    return await ctx.db.insert("channel", {
      cultId,
      channelName,
      channelDesc,
      channelProfile,
      joinCode,
      type,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const updateChannel = mutation({
  args: {
    channelId: v.id("channel"),
    channelName: v.optional(v.string()),
    channelDesc: v.optional(v.string()),
    channelProfile: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { channelId, channelName, channelDesc, channelProfile },
  ) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    if (!(await checkChannelAdmin(ctx, channelId, user._id))) {
      throw new Error(
        "Only channel or cult admins can update channel details.",
      );
    }

    await ctx.db.patch(channelId, {
      ...(channelName !== undefined && { channelName }),
      ...(channelDesc !== undefined && { channelDesc }),
      ...(channelProfile !== undefined && { channelProfile }),
      updatedAt: Date.now(),
    });
  },
});

export const promoteToChannelAdmin = mutation({
  args: {
    channelId: v.id("channel"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { channelId, targetUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await checkChannelAdmin(ctx, channelId, user._id))) {
      throw new Error("Only channel or cult admins can promote members.");
    }

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) =>
        q.eq("channelId", channelId).eq("userId", targetUserId),
      )
      .unique();

    if (!membership) {
      throw new Error("Target user is not a member of this channel.");
    }

    if (membership.role === "admin") {
      throw new Error("User is already a channel admin.");
    }

    await ctx.db.patch(membership._id, { role: "admin" });
  },
});

export const demoteChannelAdmin = mutation({
  args: {
    channelId: v.id("channel"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { channelId, targetUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    if (!(await isCultAdmin(ctx, channel.cultId, user._id))) {
      throw new Error("Only cult admins can demote channel admins.");
    }

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) =>
        q.eq("channelId", channelId).eq("userId", targetUserId),
      )
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Target user is not a channel admin.");
    }

    await ctx.db.patch(membership._id, { role: "member" });
  },
});

export const regenerateChannelJoinCode = mutation({
  args: {
    channelId: v.id("channel"),
    newJoinCode: v.string(),
  },
  handler: async (ctx, { channelId, newJoinCode }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await checkChannelAdmin(ctx, channelId, user._id))) {
      throw new Error(
        "Only channel or cult admins can regenerate the join code.",
      );
    }

    const conflict = await ctx.db
      .query("channel")
      .withIndex("byJoinCode", (q: any) => q.eq("joinCode", newJoinCode))
      .unique();

    if (conflict) throw new Error("Join code already in use.");

    await ctx.db.patch(channelId, {
      joinCode: newJoinCode,
      updatedAt: Date.now(),
    });
  },
});

export const deleteChannel = mutation({
  args: {
    channelId: v.id("channel"),
  },
  handler: async (ctx, { channelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    if (!(await isCultAdmin(ctx, channel.cultId, user._id))) {
      throw new Error("Only cult admins can delete a channel.");
    }

    // Delete channel profile photo from storage
    if (channel.channelProfile) {
      await deleteOldImage(ctx, channel.channelProfile);
    }

    await ctx.db.delete(channelId);
  },
});

// ! ─── Storage / Channel Profile Photo Upload ─────────────────────────────────

/**
 * Update channel's profile photo after successful upload
 */
export const updateChannelProfilePhoto = mutation({
  args: {
    channelId: v.id("channel"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { channelId, storageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    if (!(await checkChannelAdmin(ctx, channelId, user._id))) {
      throw new Error("Only channel or cult admins can update channel profile photo.");
    }

    // Get the URL of the uploaded file
    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) throw new Error("Failed to get uploaded file URL");

    // Delete old profile photo
    await deleteOldImage(ctx, channel.channelProfile);

    // Update the channel's profile with the new photo URL
    await ctx.db.patch(channelId, {
      channelProfile: imageUrl,
      updatedAt: Date.now(),
    });

    return { imageUrl };
  },
});

/**
 * Delete channel's profile photo
 */
export const deleteChannelProfilePhoto = mutation({
  args: {
    channelId: v.id("channel"),
  },
  handler: async (ctx, { channelId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const channel = await ctx.db.get(channelId);
    if (!channel) throw new Error("Channel not found.");

    if (!(await checkChannelAdmin(ctx, channelId, user._id))) {
      throw new Error("Only channel or cult admins can delete channel profile photo.");
    }

    // Delete the file from storage
    await deleteOldImage(ctx, channel.channelProfile);

    // Reset to empty string
    await ctx.db.patch(channelId, {
      channelProfile: "",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
