import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

async function canAccessSource(
  ctx: any,
  sourceType: string,
  sourceId: string,
  userId: any,
) {
  if (sourceType === "dm") {
    const conv = await ctx.db.get(sourceId as any);
    if (!conv) return false;
    return conv.memberOne === userId || conv.memberTwo === userId;
  }

  if (sourceType === "group") {
    const membership = await ctx.db
      .query("groupMembers")
      .withIndex("byGroupAndUser", (q: any) =>
        q.eq("groupId", sourceId as any).eq("userId", userId),
      )
      .unique();
    return !!membership;
  }

  if (sourceType === "channel") {
    const channel = await ctx.db.get(sourceId as any);
    if (!channel) return false;

    const cultMembership = await ctx.db
      .query("cultMembers")
      .withIndex("byCultAndUser", (q: any) =>
        q.eq("cultId", channel.cultId).eq("userId", userId),
      )
      .unique();
    return !!cultMembership;
  }

  return false;
}

export const getMessage = query({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    return await ctx.db.get(messageId);
  },
});

export const listMessagesBySource = query({
  args: {
    sourceType: v.union(
      v.literal("channel"),
      v.literal("dm"),
      v.literal("group"),
    ),
    sourceId: v.string(),
    cursor: v.optional(v.id("messages")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { sourceType, sourceId, cursor, limit = 50 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return [];

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) return [];

    if (!(await canAccessSource(ctx, sourceType, sourceId, user._id))) {
      throw new Error("You do not have access to this source.");
    }

    const PAGE_SIZE = Math.min(limit, 100);
    let allMessages = await ctx.db
      .query("messages")
      .withIndex("bySourceTypeAndId", (q: any) =>
        q.eq("sourceType", sourceType).eq("sourceId", sourceId),
      )
      .order("desc")
      .collect();

    allMessages = allMessages.filter((m: any) => !m.deleted);

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = allMessages.findIndex((m: any) => m._id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const messages = allMessages.slice(startIndex, startIndex + PAGE_SIZE);
    const hasMore = startIndex + PAGE_SIZE < allMessages.length;
    const nextCursor = hasMore ? messages[messages.length - 1]?._id : undefined;

    const senderIds = [...new Set(messages.map((m: any) => m.senderId))];
    const senders = await Promise.all(
      senderIds.map((id: any) => ctx.db.get(id)),
    );
    const senderMap = new Map(
      senderIds.map((id: any, i: number) => [id, senders[i]]),
    );

    const replyToIds = messages
      .map((m: any) => m.replyTo)
      .filter((id: any): id is any => id !== undefined);

    const replies = await Promise.all(
      replyToIds.map((id: any) => ctx.db.get(id)),
    );
    const replyMap = new Map<any, any>(
      replyToIds
        .map((id: any, i: number) => [id, replies[i]] as [any, any])
        .filter(([, r]) => r !== null),
    );

    return {
      messages: messages.map((m: any) => ({
        ...m,
        sender: senderMap.get(m.senderId),
        replyTo: m.replyTo ? replyMap.get(m.replyTo) : undefined,
      })),
      nextCursor,
      hasMore,
    };
  },
});

export const listReplies = query({
  args: {
    messageId: v.id("messages"),
    cursor: v.optional(v.id("messages")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, { messageId, cursor, limit = 50 }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { messages: [], hasMore: false };

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) return { messages: [], hasMore: false };

    const parentMessage = await ctx.db.get(messageId);
    if (!parentMessage) throw new Error("Parent message not found.");

    if (
      !(await canAccessSource(
        ctx,
        parentMessage.sourceType,
        parentMessage.sourceId,
        user._id,
      ))
    ) {
      throw new Error("You do not have access to this message.");
    }

    const PAGE_SIZE = Math.min(limit, 100);
    let allMessages = await ctx.db
      .query("messages")
      .withIndex("bySourceId", (q: any) => q.eq("sourceId", messageId))
      .order("desc")
      .collect();

    allMessages = allMessages.filter((m: any) => !m.deleted);

    let startIndex = 0;
    if (cursor) {
      const cursorIndex = allMessages.findIndex((m: any) => m._id === cursor);
      if (cursorIndex !== -1) {
        startIndex = cursorIndex + 1;
      }
    }

    const messages = allMessages.slice(startIndex, startIndex + PAGE_SIZE);
    const hasMore = startIndex + PAGE_SIZE < allMessages.length;
    const nextCursor = hasMore ? messages[messages.length - 1]?._id : undefined;

    const senderIds = [...new Set(messages.map((m: any) => m.senderId))];
    const senders = await Promise.all(
      senderIds.map((id: any) => ctx.db.get(id)),
    );
    const senderMap = new Map(
      senderIds.map((id: any, i: number) => [id, senders[i]]),
    );

    return {
      messages: messages.map((m: any) => ({
        ...m,
        sender: senderMap.get(m.senderId),
      })),
      nextCursor,
      hasMore,
    };
  },
});

export const sendMessage = mutation({
  args: {
    sourceType: v.union(
      v.literal("channel"),
      v.literal("dm"),
      v.literal("group"),
    ),
    sourceId: v.string(),
    content: v.string(),
    images: v.optional(v.array(v.string())),
    document: v.optional(v.array(v.string())),
    replyTo: v.optional(v.id("messages")),
  },
  handler: async (
    ctx,
    { sourceType, sourceId, content, images, document, replyTo },
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

    if (!(await canAccessSource(ctx, sourceType, sourceId, user._id))) {
      throw new Error("You do not have access to this source.");
    }

    if (replyTo) {
      const parentMessage = await ctx.db.get(replyTo);
      if (!parentMessage) throw new Error("Reply target not found.");
      if (parentMessage.deleted)
        throw new Error("Cannot reply to a deleted message.");
    }

    const now = Date.now();

    const messageId = await ctx.db.insert("messages", {
      senderId: user._id,
      content,
      images,
      document,
      replyTo,
      edited: false,
      deleted: false,
      sourceType,
      sourceId,
      createdAt: now,
      updatedAt: now,
    });

    if (sourceType === "dm") {
      await ctx.db.patch(sourceId as any, { updatedAt: now });
    } else if (sourceType === "group") {
      await ctx.db.patch(sourceId as any, {
        lastMessageAt: now,
        updatedAt: now,
      });
    }

    return messageId;
  },
});

export const editMessage = mutation({
  args: {
    messageId: v.id("messages"),
    content: v.string(),
  },
  handler: async (ctx, { messageId, content }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found.");

    if (message.senderId !== user._id) {
      throw new Error("You can only edit your own messages.");
    }

    if (message.deleted) {
      throw new Error("Cannot edit a deleted message.");
    }

    await ctx.db.patch(messageId, {
      content,
      edited: true,
      updatedAt: Date.now(),
    });
  },
});

export const deleteMessage = mutation({
  args: { messageId: v.id("messages") },
  handler: async (ctx, { messageId }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("byClerkUserId", (q: any) =>
        q.eq("clerkUserId", identity.subject),
      )
      .unique();
    if (!user) throw new Error("User not found");

    const message = await ctx.db.get(messageId);
    if (!message) throw new Error("Message not found.");

    if (message.senderId !== user._id) {
      throw new Error("You can only delete your own messages.");
    }

    await ctx.db.patch(messageId, {
      deleted: true,
      updatedAt: Date.now(),
    });
  },
});
