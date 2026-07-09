import { z } from "zod";

import { MAX_PLAYER_NAME } from "./player";

/**
 * Admin: add an existing account to a group (see docs/admin.md). Exactly one
 * of two modes, decided by `playerId`:
 *   - link an existing guest player (`playerId` set, name kept as-is), or
 *   - create a fresh player row (`playerId` empty, `displayName` required).
 *
 * The form sends `playerId=""` for "create new"; the preprocess folds that to
 * undefined so the guid check only runs on a real selection. Ids use z.guid()
 * (not z.uuid()) — same rationale as the other id checks.
 */
export const addUserToGroupSchema = z
  .object({
    userId: z.guid(),
    groupId: z.guid("Choose a group."),
    playerId: z.preprocess(
      (v) => (v === "" || v == null ? undefined : v),
      z.guid().optional(),
    ),
    displayName: z
      .string()
      .trim()
      .max(
        MAX_PLAYER_NAME,
        `Name must be ${MAX_PLAYER_NAME} characters or fewer.`,
      ),
  })
  .superRefine((d, ctx) => {
    if (!d.playerId && d.displayName.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["displayName"],
        message: "Name is required when creating a new player.",
      });
    }
  });

export type AddUserToGroupInput = z.infer<typeof addUserToGroupSchema>;
