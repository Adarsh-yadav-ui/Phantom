import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function isCultAdmin(ctx: any, cultId: any, userId: any) {
  const membership = await ctx.db
    .query("cultMembers")
    .withIndex("byCultAndUser", (q: any) => q.eq("cultId", cultId).eq("userId", userId))
    .unique();
  return membership?.role === "admin";
}

async function isChannelAdmin(ctx: any, channelId: any, userId: any) {
  const channel = await ctx.db.get(channelId);
  if (!channel) return false;

  if (await isCultAdmin(ctx, channel.cultId, userId)) return true;

  const membership = await ctx.db
    .query("channelMembers")
    .withIndex("byChannelAndUser", (q: any) => q.eq("channelId", channelId).eq("userId", userId))
    .unique();
  return membership?.role === "admin";
}

export const getMembership = query({
  args: { channelId: v.id("channel"), userId: v.id("users") },
  handler: async (ctx, { channelId, userId }) => {
    return await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) => q.eq("channelId", channelId).eq("userId", userId))
      .unique();
  },
});

export const isAdmin = query({
  args: { channelId: v.id("channel"), userId: v.id("users") },
  handler: async (ctx, { channelId, userId }) => {
    return await isChannelAdmin(ctx, channelId, userId);
  },
});

export const isMember = query({
  args: { channelId: v.id("channel"), userId: v.id("users") },
  handler: async (ctx, { channelId, userId }) => {
    const channel = await ctx.db.get(channelId);
    if (!channel) return false;

    if (await isChannelAdmin(ctx, channelId, userId)) return true;

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) => q.eq("channelId", channelId).eq("userId", userId))
      .unique();
    return !!membership;
  },
});

export const listMembers = query({
  args: { channelId: v.id("channel") },
  handler: async (ctx, { channelId }) => {
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelId", (q: any) => q.eq("channelId", channelId))
      .collect();

    const users = await Promise.all(
      memberships.map((m) => ctx.db.get(m.userId))
    );

    return memberships.map((m, i) => ({
      ...m,
      user: users[i],
    }));
  },
});

export const listChannelsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const memberships = await ctx.db
      .query("channelMembers")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .collect();

    const channels = await Promise.all(
      memberships.map((m) => ctx.db.get(m.channelId))
    );

    return memberships.map((m, i) => ({
      ...m,
      channel: channels[i],
    }));
  },
});

export const join = mutation({
  args: {
    channelId: v.id("channel"),
    userId: v.id("users"),
  },
  handler: async (ctx, { channelId, userId }) => {
    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) => q.eq("channelId", channelId).eq("userId", userId))
      .unique();

    if (existing) {
      throw new Error("You are already a member of this channel.");
    }

    return await ctx.db.insert("channelMembers", {
      channelId,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });
  },
});

export const joinByCode = mutation({
  args: {
    joinCode: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, { joinCode, userId }) => {
    const channel = await ctx.db
      .query("channel")
      .withIndex("byJoinCode", (q: any) => q.eq("joinCode", joinCode))
      .unique();

    if (!channel) throw new Error("Invalid join code.");

    const existing = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) => q.eq("channelId", channel._id).eq("userId", userId))
      .unique();

    if (existing) {
      throw new Error("You are already a member of this channel.");
    }

    await ctx.db.insert("channelMembers", {
      channelId: channel._id,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });

    return channel._id;
  },
});

export const leave = mutation({
  args: {
    channelId: v.id("channel"),
    requesterId: v.id("users"),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { channelId, requesterId, targetUserId }) => {
    const target = targetUserId ?? requesterId;
    const isSelf = requesterId === target;

    if (!isSelf) {
      if (!(await isChannelAdmin(ctx, channelId, requesterId))) {
        throw new Error("Only channel or cult admins can remove members.");
      }
    }

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) => q.eq("channelId", channelId).eq("userId", target))
      .unique();

    if (!membership) {
      throw new Error("Target user is not a member of this channel.");
    }

    await ctx.db.delete(membership._id);
  },
});

export const promoteToAdmin = mutation({
  args: {
    channelId: v.id("channel"),
    requesterId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { channelId, requesterId, targetUserId }) => {
    if (!(await isChannelAdmin(ctx, channelId, requesterId))) {
      throw new Error("Only channel or cult admins can promote members.");
    }

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) => q.eq("channelId", channelId).eq("userId", targetUserId))
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

export const demoteAdmin = mutation({
  args: {
    channelId: v.id("channel"),
    requesterId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { channelId, requesterId, targetUserId }) => {
    if (requesterId === targetUserId) {
      throw new Error("Use leave to remove yourself as channel admin.");
    }

    if (!(await isCultAdmin(ctx, requesterId, requesterId))) {
      throw new Error("Only cult admins can demote channel admins.");
    }

    const membership = await ctx.db
      .query("channelMembers")
      .withIndex("byChannelAndUser", (q: any) => q.eq("channelId", channelId).eq("userId", targetUserId))
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Target user is not a channel admin.");
    }

    await ctx.db.patch(membership._id, { role: "member" });
  },
});
