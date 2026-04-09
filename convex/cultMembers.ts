import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function assertCultAdmin(ctx: any, cultId: any, userId: any) {
  const membership = await ctx.db
    .query("cultMembers")
    .withIndex("byCultAndUser", (q: any) =>
      q.eq("cultId", cultId).eq("userId", userId),
    )
    .unique();

  if (!membership || membership.role !== "admin") {
    throw new Error("Only cult admins can perform this action.");
  }
  return membership;
}

async function getCultMemberRole(ctx: any, cultId: any, userId: any) {
  const membership = await ctx.db
    .query("cultMembers")
    .withIndex("byCultAndUser", (q: any) =>
      q.eq("cultId", cultId).eq("userId", userId),
    )
    .unique();
  return membership?.role ?? null;
}

export const getMembership = query({
  args: { cultId: v.id("cult"), userId: v.id("users") },
  handler: async (ctx, { cultId, userId }) => {
    return await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q: any) =>
        q.eq("cultId", cultId).eq("userId", userId),
      )
      .unique();
  },
});

export const isCultMember = query({
  args: { cultId: v.id("cult"), userId: v.id("users") },
  handler: async (ctx, { cultId, userId }) => {
    const role = await getCultMemberRole(ctx, cultId, userId);
    return (
     role === "admin" || role === "member"
    );
  },
});
export const isAdmin = query({
  args: { cultId: v.id("cult"), userId: v.id("users") },
  handler: async (ctx, { cultId, userId }) => {
    return (await getCultMemberRole(ctx, cultId, userId)) === "admin";
  },
});

export const isMember = query({
  args: { cultId: v.id("cult"), userId: v.id("users") },
  handler: async (ctx, { cultId, userId }) => {
    const role = await getCultMemberRole(ctx, cultId, userId);
    return role === "admin" || role === "member";
  },
});

export const listMembers = query({
  args: { cultId: v.id("cult") },
  handler: async (ctx, { cultId }) => {
    const memberships = await ctx.db
      .query("cultMembers")
      .withIndex("byCultId", (q) => q.eq("cultId", cultId))
      .collect();

    const users = await Promise.all(
      memberships.map((m) => ctx.db.get(m.userId)),
    );

    return memberships.map((m, i) => ({
      ...m,
      user: users[i],
    }));
  },
});

export const listAdmins = query({
  args: { cultId: v.id("cult") },
  handler: async (ctx, { cultId }) => {
    const memberships = await ctx.db
      .query("cultMembers")
      .withIndex("byCultId", (q) => q.eq("cultId", cultId))
      .collect();

    const admins = memberships.filter((m) => m.role === "admin");
    const users = await Promise.all(admins.map((m) => ctx.db.get(m.userId)));

    return admins.map((m, i) => ({
      ...m,
      user: users[i],
    }));
  },
});

export const listCultsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const memberships = await ctx.db
      .query("cultMembers")
      .withIndex("byUserId", (q) => q.eq("userId", userId))
      .collect();

    const cults = await Promise.all(
      memberships.map((m) => ctx.db.get(m.cultId)),
    );

    return memberships.map((m, i) => ({
      ...m,
      cult: cults[i],
    }));
  },
});

export const join = mutation({
  args: {
    cultId: v.id("cult"),
    userId: v.id("users"),
  },
  handler: async (ctx, { cultId, userId }) => {
    const existing = await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q) =>
        q.eq("cultId", cultId).eq("userId", userId),
      )
      .unique();

    if (existing) {
      throw new Error("You are already a member of this cult.");
    }

    return await ctx.db.insert("cultMembers", {
      cultId,
      userId,
      role: "member",
      joinedAt: Date.now(),
    });
  },
});
export const joinAsAdmin = mutation({
  args: {
    cultId: v.id("cult"),
    userId: v.id("users"),
  },
  handler: async (ctx, { cultId, userId }) => {
    const existing = await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q) =>
        q.eq("cultId", cultId).eq("userId", userId),
      )
      .unique();

    if (existing) {
      throw new Error("You are already a member of this cult.");
    }

    return await ctx.db.insert("cultMembers", {
      cultId,
      userId,
      role: "admin",
      joinedAt: Date.now(),
    });
  },
});

export const joinByCode = mutation({
  args: {
    joinCode: v.string(),
  },
  handler: async (ctx, { joinCode }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated.");

    const user = await ctx.db
      .query("users")
      .withIndex(
        "byClerkUserId",
        (q) => q.eq("clerkUserId", identity.subject), // Clerk's subject = clerkUserId
      )
      .unique();

    if (!user) throw new Error("User not found.");

    const cult = await ctx.db
      .query("cult")
      .withIndex("byJoinCode", (q) => q.eq("joinCode", joinCode))
      .unique();

    if (!cult) throw new Error("Invalid join code.");

    const existing = await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q) =>
        q.eq("cultId", cult._id).eq("userId", user._id),
      )
      .unique();

    if (existing) throw new Error("You are already a member of this cult.");

    await ctx.db.insert("cultMembers", {
      cultId: cult._id,
      userId: user._id,
      role: "member",
      joinedAt: Date.now(),
    });

    return cult._id;
  },
});

export const leave = mutation({
  args: {
    cultId: v.id("cult"),
    requesterId: v.id("users"),
    targetUserId: v.optional(v.id("users")),
  },
  handler: async (ctx, { cultId, requesterId, targetUserId }) => {
    const target = targetUserId ?? requesterId;
    const isSelf = requesterId === target;

    const targetMembership = await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q) =>
        q.eq("cultId", cultId).eq("userId", target),
      )
      .unique();

    if (!targetMembership) {
      throw new Error("Target user is not a member of this cult.");
    }

    if (!isSelf) {
      await assertCultAdmin(ctx, cultId, requesterId);
    }

    if (targetMembership.role === "admin") {
      const allAdmins = await ctx.db
        .query("cultMembers")
        .withIndex("byCultId", (q) => q.eq("cultId", cultId))
        .collect()
        .then((ms) => ms.filter((m) => m.role === "admin"));

      if (allAdmins.length === 1) {
        throw new Error(
          "Transfer admin privileges before leaving — you are the last admin.",
        );
      }
    }

    await ctx.db.delete(targetMembership._id);
  },
});

export const promoteToAdmin = mutation({
  args: {
    cultId: v.id("cult"),
    requesterId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { cultId, requesterId, targetUserId }) => {
    await assertCultAdmin(ctx, cultId, requesterId);

    const targetMembership = await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q) =>
        q.eq("cultId", cultId).eq("userId", targetUserId),
      )
      .unique();

    if (!targetMembership) {
      throw new Error("Target user is not a member of this cult.");
    }

    if (targetMembership.role === "admin") {
      throw new Error("User is already an admin.");
    }

    await ctx.db.patch(targetMembership._id, { role: "admin" });
  },
});

export const demoteAdmin = mutation({
  args: {
    cultId: v.id("cult"),
    requesterId: v.id("users"),
    targetUserId: v.id("users"),
  },
  handler: async (ctx, { cultId, requesterId, targetUserId }) => {
    await assertCultAdmin(ctx, cultId, requesterId);

    if (requesterId === targetUserId) {
      throw new Error("Use leave to remove yourself as admin.");
    }

    const targetMembership = await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q) =>
        q.eq("cultId", cultId).eq("userId", targetUserId),
      )
      .unique();

    if (!targetMembership || targetMembership.role !== "admin") {
      throw new Error("Target user is not an admin.");
    }

    const allAdmins = await ctx.db
      .query("cultMembers")
      .withIndex("byCultId", (q) => q.eq("cultId", cultId))
      .collect()
      .then((ms) => ms.filter((m) => m.role === "admin"));

    if (allAdmins.length === 1) {
      throw new Error("Cannot demote the only admin.");
    }

    await ctx.db.patch(targetMembership._id, { role: "member" });
  },
});
