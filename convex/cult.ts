import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function isAdmin(ctx: any, cultId: any, userId: any) {
  const membership = await ctx.db
    .query("cultMembers")
    .withIndex("byCultAndUser", (q: any) => q.eq("cultId", cultId).eq("userId", userId))
    .unique();
  return membership?.role === "admin";
}

export const getCult = query({
  args: { cultId: v.id("cult") },
  handler: async (ctx, { cultId }) => {
    return await ctx.db.get(cultId);
  },
});

export const getCultByJoinCode = query({
  args: { joinCode: v.string() },
  handler: async (ctx, { joinCode }) => {
    return await ctx.db
      .query("cult")
      .withIndex("byJoinCode", (q: any) => q.eq("joinCode", joinCode))
      .unique();
  },
});

export const getCultsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const memberships = await ctx.db
      .query("cultMembers")
      .withIndex("byUserId", (q: any) => q.eq("userId", userId))
      .collect();
    const cultIds = memberships.map((m) => m.cultId);
    return Promise.all(cultIds.map((id) => ctx.db.get(id)));
  },
});

export const getCultMembers = query({
  args: { cultId: v.id("cult") },
  handler: async (ctx, { cultId }) => {
    const cult = await ctx.db.get(cultId);
    if (!cult) return null;

    const memberships = await ctx.db
      .query("cultMembers")
      .withIndex("byCultId", (q: any) => q.eq("cultId", cultId))
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

export const checkIsAdmin = query({
  args: { cultId: v.id("cult"), userId: v.id("users") },
  handler: async (ctx, { cultId, userId }) => {
    const membership = await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q: any) => q.eq("cultId", cultId).eq("userId", userId))
      .unique();
    return membership?.role === "admin";
  },
});

export const createCult = mutation({
  args: {
    cultName: v.string(),
    cultDesc: v.string(),
    cultProfile: v.string(),
    joinCode: v.string(),
  },
  handler: async (ctx, { cultName, cultDesc, cultProfile, joinCode }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const existing = await ctx.db
      .query("cult")
      .withIndex("byJoinCode", (q: any) => q.eq("joinCode", joinCode))
      .unique();
    if (existing) {
      throw new Error("A cult with this join code already exists.");
    }

    const now = Date.now();
    const cultId = await ctx.db.insert("cult", {
      cultName,
      cultDesc,
      cultProfile,
      joinCode,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("cultMembers", {
      cultId,
      userId: user._id,
      role: "admin",
      joinedAt: now,
    });

    return cultId;
  },
});

export const updateCult = mutation({
  args: {
    cultId: v.id("cult"),
    cultName: v.optional(v.string()),
    cultDesc: v.optional(v.string()),
    cultProfile: v.optional(v.string()),
  },
  handler: async (ctx, { cultId, cultName, cultDesc, cultProfile }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await isAdmin(ctx, cultId, user._id))) {
      throw new Error("Only admins can update cult details.");
    }

    await ctx.db.patch(cultId, {
      ...(cultName !== undefined && { cultName }),
      ...(cultDesc !== undefined && { cultDesc }),
      ...(cultProfile !== undefined && { cultProfile }),
      updatedAt: Date.now(),
    });
  },
});

export const regenerateJoinCode = mutation({
  args: {
    cultId: v.id("cult"),
    newJoinCode: v.string(),
  },
  handler: async (ctx, { cultId, newJoinCode }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await isAdmin(ctx, cultId, user._id))) {
      throw new Error("Only admins can regenerate the join code.");
    }

    const conflict = await ctx.db
      .query("cult")
      .withIndex("byJoinCode", (q: any) => q.eq("joinCode", newJoinCode))
      .unique();
    if (conflict) throw new Error("Join code already in use.");

    await ctx.db.patch(cultId, {
      joinCode: newJoinCode,
      updatedAt: Date.now(),
    });
  },
});

export const deleteCult = mutation({
  args: { cultId: v.id("cult") },
  handler: async (ctx, { cultId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await isAdmin(ctx, cultId, user._id))) {
      throw new Error("Only admins can delete a cult.");
    }

    const channels = await ctx.db
      .query("channel")
      .withIndex("byCultId", (q: any) => q.eq("cultId", cultId))
      .collect();
    await Promise.all(channels.map((ch) => ctx.db.delete(ch._id)));

    const memberships = await ctx.db
      .query("cultMembers")
      .withIndex("byCultId", (q: any) => q.eq("cultId", cultId))
      .collect();
    await Promise.all(memberships.map((m) => ctx.db.delete(m._id)));

    await ctx.db.delete(cultId);
  },
});
