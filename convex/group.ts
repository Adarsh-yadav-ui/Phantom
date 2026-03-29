import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getGroup = query({
  args: { groupId: v.id("group") },
  handler: async (ctx, { groupId }) => {
    return await ctx.db.get(groupId);
  },
});

export const getGroupWithMembers = query({
  args: { groupId: v.id("group") },
  handler: async (ctx, { groupId }) => {
    const group = await ctx.db.get(groupId);
    if (!group) return null;

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupId", (q: any) => q.eq("groupId", groupId))
      .collect();

    const users = await Promise.all(
      memberships.map((m) => ctx.db.get(m.userId))
    );

    return {
      ...group,
      members: memberships.map((m, i) => ({
        ...m,
        user: users[i],
      })),
    };
  },
});

export const listGroupsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .collect();

    const groups = await Promise.all(
      memberships.map((m) => ctx.db.get(m.groupId))
    );

    return memberships.map((m, i) => ({
      ...m,
      group: groups[i],
    }));
  },
});

export const createGroup = mutation({
  args: {
    groupName: v.optional(v.string()),
    groupProfile: v.optional(v.string()),
    memberIds: v.array(v.id("users")),
  },
  handler: async (ctx, { groupName, groupProfile, memberIds }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const creator = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!creator) throw new Error("User not found");

    if (memberIds.length < 2) {
      throw new Error("A group must have at least 2 other members.");
    }

    if (memberIds.includes(creator._id)) {
      throw new Error("Do not include yourself in memberIds.");
    }

    const now = Date.now();

    const groupId = await ctx.db.insert("group", {
      groupName: groupName ?? `${creator.username ?? "User"}'s Group`,
      groupProfile,
      createdBy: creator._id,
      lastMessageAt: now,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("groupMembers", {
      groupId,
      userId: creator._id,
      role: "admin",
      joinedAt: now,
    });

    for (const memberId of memberIds) {
      await ctx.db.insert("groupMembers", {
        groupId,
        userId: memberId,
        role: "member",
        joinedAt: now,
      });
    }

    return groupId;
  },
});

export const updateGroup = mutation({
  args: {
    groupId: v.id("group"),
    groupName: v.optional(v.string()),
    groupProfile: v.optional(v.string()),
  },
  handler: async (ctx, { groupId, groupName, groupProfile }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", user._id))
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only group admins can update group details.");
    }

    await ctx.db.patch(groupId, {
      ...(groupName !== undefined && { groupName }),
      ...(groupProfile !== undefined && { groupProfile }),
      updatedAt: Date.now(),
    });
  },
});

export const updateLastMessage = mutation({
  args: { groupId: v.id("group") },
  handler: async (ctx, { groupId }) => {
    await ctx.db.patch(groupId, {
      lastMessageAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteGroup = mutation({
  args: { groupId: v.id("group") },
  handler: async (ctx, { groupId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", user._id))
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Only group admins can delete the group.");
    }

    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupId", (q: any) => q.eq("groupId", groupId))
      .collect();
    await Promise.all(memberships.map((m) => ctx.db.delete(m._id)));

    await ctx.db.delete(groupId);
  },
});
