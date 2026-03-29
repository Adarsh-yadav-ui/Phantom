import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ! ─── Users ──────────────────────────────────────────────────────────────────

  users: defineTable({
    email: v.string(),
    clerkUserId: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    username: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byClerkUserId", ["clerkUserId"])
    .index("byEmail", ["email"]),

  // ! ─── Cults ──────────────────────────────────────────────────────────────────

  cult: defineTable({
    cultProfile: v.string(),
    cultName: v.string(),
    cultDesc: v.string(),
    joinCode: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("byJoinCode", ["joinCode"]),

  cultMembers: defineTable({
    cultId: v.id("cult"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("byCultId", ["cultId"])
    .index("byUserId", ["userId"])
    .index("byCultAndUser", ["cultId", "userId"]),

  // ! ─── Channels ────────────────────────────────────────────────────────────────

  channel: defineTable({
    cultId: v.id("cult"),
    channelProfile: v.string(),
    channelName: v.string(),
    channelDesc: v.string(),
    joinCode: v.string(),
    type: v.union(
      v.literal("text"),
      v.literal("voice"),
      v.literal("announcement"),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byCultId", ["cultId"])
    .index("byJoinCode", ["joinCode"]),

  /**
   * Channel-level admins only.
   * Regular cult members don't get a row here — cult membership already
   * grants them access. Only use this table to track elevated channel roles.
   */
  channelMembers: defineTable({
    channelId: v.id("channel"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("byChannelId", ["channelId"])
    .index("byUserId", ["userId"])
    .index("byChannelAndUser", ["channelId", "userId"]),

  // ! ─── Direct Messages ─────────────────────────────────────────────────────────

  conversations: defineTable({
    memberOne: v.id("users"),
    memberTwo: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("byMemberOne", ["memberOne"])
    .index("byMemberTwo", ["memberTwo"]),

  // ─── Group DMs ───────────────────────────────────────────────────────────────

  group: defineTable({
    groupName: v.optional(v.string()),
    groupProfile: v.optional(v.string()),
    createdBy: v.id("users"),
    lastMessageAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),

  groupMembers: defineTable({
    groupId: v.id("group"),
    userId: v.id("users"),
    role: v.union(v.literal("admin"), v.literal("member")),
    joinedAt: v.number(),
  })
    .index("byGroupId", ["groupId"])
    .index("byUserId", ["userId"])
    .index("byGroupAndUser", ["groupId", "userId"]),

  // ! ─── Messages ────────────────────────────────────────────────────────────────

  messages: defineTable({
    senderId: v.id("users"),
    content: v.string(),
    images: v.optional(v.array(v.string())),
    document: v.optional(v.array(v.string())),
    replyTo: v.optional(v.id("messages")),
    edited: v.boolean(),
    deleted: v.boolean(),
    sourceType: v.union(
      v.literal("channel"),
      v.literal("dm"),
      v.literal("group"),
    ),
    sourceId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("bySourceId", ["sourceId"])
    .index("bySourceTypeAndId", ["sourceType", "sourceId"])
    .index("bySender", ["senderId"]),

  // ! ─── Reactions ───────────────────────────────────────────────────────────────

  reactions: defineTable({
    messageId: v.id("messages"),
    userId: v.id("users"),
    emoji: v.string(),
  })
    .index("byMessageId", ["messageId"])
    .index("byMessageAndUser", ["messageId", "userId"]),
});
