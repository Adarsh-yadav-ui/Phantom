import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function isGroupAdmin(ctx: any, groupId: any, userId: any) {
  const membership = await ctx.db
    .query("groupMembers")
    .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();
  return membership?.role === "admin";
}

async function isGroupMember(ctx: any, groupId: any, userId: any) {
  const membership = await ctx.db
    .query("groupMembers")
    .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", userId))
    .unique();
  return !!membership;
}

export const getMembership = query({
  args: { groupId: v.id("group"), userId: v.id("users") },
  handler: async (ctx, { groupId, userId }) => {
    return await ctx.db
      .query("groupMembers")
      .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", userId))
      .unique();
  },
});

export const isAdmin = query({
  args: { groupId: v.id("group"), userId: v.id("users") },
  handler: async (ctx, { groupId, userId }) => {
    return await isGroupAdmin(ctx, groupId, userId);
  },
});

export const isMember = query({
  args: { groupId: v.id("group"), userId: v.id("users") },
  handler: async (ctx, { groupId, userId }) => {
    return await isGroupMember(ctx, groupId, userId);
  },
});

export const listMembers = query({
  args: { groupId: v.id("group") },
  handler: async (ctx, { groupId }) => {
    const memberships = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupId", (q: any) => q.eq("groupId", groupId))
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

export const addMember = mutation({
  args: {
    groupId: v.id("group"),
    userId: v.id("users"),
  },
  handler: async (ctx, { groupId, userId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const requester = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!requester) throw new Error("User not found");

    if (!(await isGroupAdmin(ctx, groupId, requester._id))) {
      throw new Error("Only group admins can add members.");
    }

    const existing = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", userId))
      .unique();

    if (existing) {
      throw new Error("User is already a member of this group.");
    }

    return await ctx.db.insert("groupMembers", {
      groupId,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });
  },
});

export const removeMember = mutation({
  args: {
    groupId: v.id("group"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { groupId, targetUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const requester = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!requester) throw new Error("User not found");

    const isSelf = requester._id === targetUserId;

    if (!isSelf && !(await isGroupAdmin(ctx, groupId, requester._id))) {
      throw new Error("Only group admins can remove other members.");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", targetUserId))
      .unique();

    if (!membership) {
      throw new Error("Target user is not a member of this group.");
    }

    if (membership.role === "admin") {
      const allAdmins = await ctx.db
        .query("groupMembers")
        .withIndex("byGroupId", (q: any) => q.eq("groupId", groupId))
        .collect()
        .then((ms) => ms.filter((m) => m.role === "admin"));

      if (allAdmins.length === 1) {
        throw new Error("Cannot remove the last admin from the group.");
      }
    }

    await ctx.db.delete(membership._id);
  },
});

export const leave = mutation({
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

    if (!membership) {
      throw new Error("You are not a member of this group.");
    }

    if (membership.role === "admin") {
      const allAdmins = await ctx.db
        .query("groupMembers")
        .withIndex("byGroupId", (q: any) => q.eq("groupId", groupId))
        .collect()
        .then((ms) => ms.filter((m) => m.role === "admin"));

      if (allAdmins.length === 1) {
        throw new Error("Transfer admin privileges before leaving — you are the last admin.");
      }
    }

    await ctx.db.delete(membership._id);
  },
});

export const promoteToAdmin = mutation({
  args: {
    groupId: v.id("group"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { groupId, targetUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const requester = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!requester) throw new Error("User not found");

    if (!(await isGroupAdmin(ctx, groupId, requester._id))) {
      throw new Error("Only group admins can promote members.");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", targetUserId))
      .unique();

    if (!membership) {
      throw new Error("Target user is not a member of this group.");
    }

    if (membership.role === "admin") {
      throw new Error("User is already an admin.");
    }

    await ctx.db.patch(membership._id, { role: "admin" });
  },
});

export const demoteAdmin = mutation({
  args: {
    groupId: v.id("group"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { groupId, targetUserId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const requester = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!requester) throw new Error("User not found");

    if (requester._id === targetUserId) {
      throw new Error("Use leave to remove yourself as admin.");
    }

    if (!(await isGroupAdmin(ctx, groupId, requester._id))) {
      throw new Error("Only group admins can demote other admins.");
    }

    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupAndUser", (q: any) => q.eq("groupId", groupId).eq("userId", targetUserId))
      .unique();

    if (!membership || membership.role !== "admin") {
      throw new Error("Target user is not an admin.");
    }

    const allAdmins = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupId", (q: any) => q.eq("groupId", groupId))
      .collect()
      .then((ms) => ms.filter((m) => m.role === "admin"));

    if (allAdmins.length === 1) {
      throw new Error("Cannot demote the only admin.");
    }

    await ctx.db.patch(membership._id, { role: "member" });
  },
});
