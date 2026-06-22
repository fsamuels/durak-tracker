/**
 * Shared types for the player-selection demo. The roster is now the group's
 * **real** roster (ranked by games-played desc — see getGroupRoster), fetched in
 * page.tsx and passed to the client component. Selecting players and assigning
 * outcomes is still demo-only local state — nothing is submitted or persisted.
 */

export type DemoPlayer = {
  id: string;
  display_name: string;
  /** OAuth avatar when the player has one; null for guests / pictureless. */
  avatar_url?: string | null;
};

/** How many top-ranked players the "Regulars" variant surfaces up front. */
export const REGULARS_COUNT = 12;
