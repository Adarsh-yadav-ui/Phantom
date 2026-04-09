import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { deleteOldImage } from "./storage";

async function isAdmin(ctx: any, cultId: any, userId: any) {
  const membership = await ctx.db
    .query("cultMembers")
    .withIndex("byCultAndUser", (q: any) =>
      q.eq("cultId", cultId).eq("userId", userId),
    )
    .unique();
  return membership?.role === "admin";
}

export const getAllCult = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("cult").collect();
  },
});

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
      memberships.map((m) => ctx.db.get(m.userId)),
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
      .withIndex("byCultAndUser", (q: any) =>
        q.eq("cultId", cultId).eq("userId", userId),
      )
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
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
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

  handler: async (ctx, args) => {
    // ─── 1. Auth Check ─────────────────────────────────────────────
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Not authenticated");
    }

    // ─── 2. Fetch User ─────────────────────────────────────────────
    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q) =>
        q.eq("clerkUserId", identity.subject)
      )
      .unique();

    if (!user) {
      throw new Error("User not found");
    }

    // ─── 3. Admin Check ────────────────────────────────────────────
    const isUserAdmin = await isAdmin(ctx, args.cultId, user._id);
    if (!isUserAdmin) {
      throw new Error("Only admins can update cult details.");
    }

    // ─── 4. Validation ─────────────────────────────────────────────
    if (args.cultName !== undefined) {
      const wordCount = args.cultName.trim().split(/\s+/).length;
      if (wordCount < 3) {
        throw new Error("Cult name must contain at least 3 words.");
      }
      if (args.cultName.length > 60) {
        throw new Error("Cult name is too long.");
      }
    }

    if (args.cultDesc !== undefined) {
      if (args.cultDesc.length === 0) {
        throw new Error("Description cannot be empty.");
      }
      if (args.cultDesc.length > 180) {
        throw new Error("Description must be 180 characters or fewer.");
      }
    }

    if (args.cultProfile !== undefined) {
      if (typeof args.cultProfile !== "string") {
        throw new Error("Invalid profile image.");
      }
    }

    // ─── 5. Build Update Object ────────────────────────────────────
    const updates: Partial<{
      cultName: string;
      cultDesc: string;
      cultProfile: string;
      updatedAt: number;
    }> = {
      updatedAt: Date.now(),
    };

    if (args.cultName !== undefined) {
      updates.cultName = args.cultName.trim();
    }

    if (args.cultDesc !== undefined) {
      updates.cultDesc = args.cultDesc.trim();
    }

    if (args.cultProfile !== undefined) {
      updates.cultProfile = args.cultProfile;
    }

    // ─── 6. Prevent Empty Updates ──────────────────────────────────
    if (Object.keys(updates).length === 1) {
      throw new Error("No fields provided to update.");
    }

    // ─── 7. Patch Database ─────────────────────────────────────────
    await ctx.db.patch(args.cultId, updates);

    // ─── 8. Return Success (Optional but Useful) ───────────────────
    return { success: true };
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
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
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
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await isAdmin(ctx, cultId, user._id))) {
      throw new Error("Only admins can delete a cult.");
    }

    // Delete cult profile photo from storage
    const cult = await ctx.db.get(cultId);
    if (cult?.cultProfile) {
      await deleteOldImage(ctx, cult.cultProfile);
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

// ! ─── Storage / Cult Profile Photo Upload ─────────────────────────────────────

/**
 * Update cult's profile photo after successful upload
 */
export const updateCultProfilePhoto = mutation({
  args: {
    cultId: v.id("cult"),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, { cultId, storageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await isAdmin(ctx, cultId, user._id))) {
      throw new Error("Only admins can update cult profile photo.");
    }

    const cult = await ctx.db.get(cultId);
    if (!cult) throw new Error("Cult not found");

    // Get the URL of the uploaded file
    const imageUrl = await ctx.storage.getUrl(storageId);
    if (!imageUrl) throw new Error("Failed to get uploaded file URL");

    // Delete old profile photo
    await deleteOldImage(ctx, cult.cultProfile);

    // Update the cult's profile with the new photo URL
    await ctx.db.patch(cultId, {
      cultProfile: imageUrl,
      updatedAt: Date.now(),
    });

    return { imageUrl };
  },
});

/**
 * Delete cult's profile photo
 */
export const deleteCultProfilePhoto = mutation({
  args: { cultId: v.id("cult") },
  handler: async (ctx, { cultId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    if (!(await isAdmin(ctx, cultId, user._id))) {
      throw new Error("Only admins can delete cult profile photo.");
    }

    const cult = await ctx.db.get(cultId);
    if (!cult) throw new Error("Cult not found");

    // Delete the file from storage
    await deleteOldImage(ctx, cult.cultProfile);

    // Reset to empty string
    await ctx.db.patch(cultId, {
      cultProfile: "",
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
