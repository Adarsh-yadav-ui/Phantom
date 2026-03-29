<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

<!-- END:nextjs-agent-rules -->

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.

<!-- convex-ai-end -->

<!-- BEGIN:project-context -->

# Project: Discord Clone

## Tech Stack

- **Frontend:** Next.js (App Router)
- **Backend:** Convex (database, realtime, mutations, queries)
- **Auth:** Clerk
- **Storage:** Convex Storage (for file/image uploads in chat)
- **Video/Voice:** TBD (LiveKit or Stream)

## Project Overview

A Discord clone supporting direct messages (DMs), group DMs, and eventually server/channel based chat with voice/video.

## Convex Schema

### conversations

Represents a DM or Group DM between users.
\```ts
conversations: defineTable({
participantIds: v.array(v.string()), // Clerk user IDs
isGroup: v.boolean(), // false = DM, true = Group DM
groupName: v.optional(v.string()), // only for group DMs
groupAvatar: v.optional(v.string()), // optional group icon URL
createdBy: v.string(), // Clerk userId of creator
lastMessageAt: v.number(), // timestamp for inbox sorting
})
.index("by_participants", ["participantIds"])
\```

### directMessages

Messages inside a DM or Group DM conversation.
\```ts
directMessages: defineTable({
conversationId: v.id("conversations"),
senderId: v.string(), // Clerk userId
senderName: v.string(), // denormalized for performance
senderAvatar: v.string(), // denormalized for performance
content: v.optional(v.string()), // text content
fileUrl: v.optional(v.string()), // uploaded file/image URL
createdAt: v.number(),
})
.index("by_conversation", ["conversationId"])
\```

## Key Conventions

- `senderId` is always a Clerk `userId` — never trust client-sent IDs without verifying via `ctx.auth`
- Denormalize `senderName` and `senderAvatar` onto messages to avoid extra lookups
- Use `lastMessageAt` on conversations to sort the DM inbox by most recent
- For regular DMs (`isGroup: false`), dedup on `participantIds` before creating — use `getOrCreate` mutation
- For Group DMs (`isGroup: true`), always create a new conversation — no dedup
- All realtime updates are handled via Convex `useQuery` — no manual WebSocket setup needed

## What's Built So Far
- [x] create a next.js app
- [x] init the shadcn ui
- [x] Added convex database and clerk auth with webhooks
- [ ] DM conversations (1-on-1)
- [ ] Group DM conversations
- [ ] Realtime messages via Convex useQuery
- [ ] Clerk user sync into Convex users table
- [ ] Server/channel based chat
- [ ] Voice/video calls
- [ ] File uploads
<!-- END:project-context -->
