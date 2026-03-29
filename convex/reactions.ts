import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getReactionsForMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const reactions = await ctx.db
      .query("reactions")
      .withIndex("byMessageId", (q: any) => q.eq("messageId", messageId))
      .collect();

    const userIds = reactions.map((r) => r.userId);
    const users = await Promise.all(userIds.map((id) => ctx.db.get(id)));
    const userMap = new Map(userIds.map((id, i) => [id, users[i]]));

    const grouped = new Map<string, { emoji: string; users: any[]; count: number }>();

    for (const reaction of reactions) {
      const existing = grouped.get(reaction.emoji);
      const user = userMap.get(reaction.userId);

      if (existing) {
        existing.users.push(user);
        existing.count++;
      } else {
        grouped.set(reaction.emoji, {
          emoji: reaction.emoji,
          users: [user],
          count: 1,
        });
      }
    }

    return Array.from(grouped.values());
  },
});

export const hasReacted = query({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, emoji }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return false;

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) return false;

    const reaction = await ctx.db
      .query("reactions")
      .withIndex("byMessageAndUser", (q: any) =>
        q.eq("messageId", messageId).eq("userId", user._id)
      )
      .unique();

    return reaction?.emoji === emoji;
  },
});

export const addReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, emoji }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found.");

    const existing = await ctx.db
      .query("reactions")
      .withIndex("byMessageAndUser", (q: any) =>
        q.eq("messageId", messageId).eq("userId", user._id)
      )
      .unique();

    if (existing) {
      if (existing.emoji === emoji) {
        return existing._id;
      }
      await ctx.db.patch(existing._id, { emoji });
      return existing._id;
    }

    return await ctx.db.insert("reactions", {
      messageId,
      userId: user._id,
      emoji,
    });
  },
});

export const removeReaction = mutation({
  args: {
    messageId: v.id("messages"),
    emoji: v.string(),
  },
  handler: async (ctx, { messageId, emoji }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user) throw new Error("User not found");

    const reaction = await ctx.db
      .query("reactions")
      .withIndex("byMessageAndUser", (q: any) =>
        q.eq("messageId", messageId).eq("userId", user._id)
      )
      .unique();

    if (!reaction) {
      throw new Error("You have not reacted to this message with this emoji.");
    }

    if (reaction.emoji !== emoji) {
      throw new Error("You have not reacted with this emoji.");
    }

    await ctx.db.delete(reaction._id);
  },
});
