/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as channel from "../channel.js";
import type * as channelMembers from "../channelMembers.js";
import type * as conversations from "../conversations.js";
import type * as cult from "../cult.js";
import type * as cultMembers from "../cultMembers.js";
import type * as group from "../group.js";
import type * as groupMembers from "../groupMembers.js";
import type * as http from "../http.js";
import type * as messages from "../messages.js";
import type * as reactions from "../reactions.js";
import type * as storage from "../storage.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  channel: typeof channel;
  channelMembers: typeof channelMembers;
  conversations: typeof conversations;
  cult: typeof cult;
  cultMembers: typeof cultMembers;
  group: typeof group;
  groupMembers: typeof groupMembers;
  http: typeof http;
  messages: typeof messages;
  reactions: typeof reactions;
  storage: typeof storage;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
