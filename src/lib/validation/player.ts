import { z } from "zod";

export const MAX_PLAYER_NAME = 60;

/** Add a player (or guest) to a group. Guests have no auth_user_id. */
export const addPlayerSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Name is required.")
    .max(
      MAX_PLAYER_NAME,
      `Name must be ${MAX_PLAYER_NAME} characters or fewer.`,
    ),
});

export type AddPlayerInput = z.infer<typeof addPlayerSchema>;
