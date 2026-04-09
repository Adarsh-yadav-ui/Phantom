import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const getConversation = query({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    return await ctx.db.get(conversationId);
  },
});

export const getConversationBetweenUsers = query({
  args: {
    userId1: v.id("users"),
    userId2: v.id("users"),
  },
  handler: async (ctx, { userId1, userId2 }) => {
    const conv1 = await ctx.db
      .query("conversations")
      .withIndex("byMemberOne", (q: any) => q.eq("memberOne", userId1))
      .collect();

    const conv2 = await ctx.db
      .query("conversations")
      .withIndex("byMemberTwo", (q: any) => q.eq("memberTwo", userId1))
      .collect();

    const allConvs = [...conv1, ...conv2];

    return allConvs.find(
      (c) =>
        (c.memberOne === userId1 && c.memberTwo === userId2) ||
        (c.memberOne === userId2 && c.memberTwo === userId1),
    );
  },
});

export const listConversationsForUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    const convsAsMemberOne = await ctx.db
      .query("conversations")
      .withIndex("byMemberOne", (q: any) => q.eq("memberOne", userId))
      .collect();

    const convsAsMemberTwo = await ctx.db
      .query("conversations")
      .withIndex("byMemberTwo", (q: any) => q.eq("memberTwo", userId))
      .collect();

    const convs = [...convsAsMemberOne, ...convsAsMemberTwo];

    const otherUserIds = convs.map((c) =>
      c.memberOne === userId ? c.memberTwo : c.memberOne,
    );

    const otherUsers = await Promise.all(
      otherUserIds.map((id) => ctx.db.get(id)),
    );

    return convs.map((c, i) => ({
      ...c,
      otherUser: otherUsers[i],
    }));
  },
});

export const createConversation = mutation({
  args: {
    memberOneId: v.id("users"),
    memberTwoId: v.id("users"),
  },
  handler: async (ctx, { memberOneId, memberTwoId }) => {
    if (memberOneId === memberTwoId) {
      throw new Error("Cannot create a conversation with yourself.");
    }

    const existing = await ctx.db
      .query("conversations")
      .withIndex("byMemberOne", (q: any) => q.eq("memberOne", memberOneId))
      .collect()
      .then((convs) => convs.find((c) => c.memberTwo === memberTwoId));

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("conversations", {
      memberOne: memberOneId,
      memberTwo: memberTwoId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const getOrCreateConversation = mutation({
  args: {
    memberOneId: v.id("users"),
    memberTwoId: v.id("users"),
  },
  handler: async (ctx, { memberOneId, memberTwoId }) => {
    if (memberOneId === memberTwoId) {
      throw new Error("Cannot create a conversation with yourself.");
    }

    const conv1 = await ctx.db
      .query("conversations")
      .withIndex("byMemberOne", (q: any) => q.eq("memberOne", memberOneId))
      .collect();

    const conv2 = await ctx.db
      .query("conversations")
      .withIndex("byMemberTwo", (q: any) => q.eq("memberTwo", memberOneId))
      .collect();

    const existing = [...conv1, ...conv2].find(
      (c) =>
        (c.memberOne === memberOneId && c.memberTwo === memberTwoId) ||
        (c.memberOne === memberTwoId && c.memberTwo === memberOneId),
    );

    if (existing) {
      return existing._id;
    }

    const now = Date.now();
    return await ctx.db.insert("conversations", {
      memberOne: memberOneId,
      memberTwo: memberTwoId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const deleteConversation = mutation({
  args: { conversationId: v.id("conversations") },
  handler: async (ctx, { conversationId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const conv = await ctx.db.get(conversationId);
    if (!conv) throw new Error("Conversation not found.");

    if (conv.memberOne !== user._id && conv.memberTwo !== user._id) {
      throw new Error("You are not a participant in this conversation.");
    }

    await ctx.db.delete(conversationId);
  },
});
