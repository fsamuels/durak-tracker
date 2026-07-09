"use client";

import { useActionState, useState } from "react";

import type { AdminGroupOption } from "@/lib/data/admin-groups";
import { MAX_PLAYER_NAME } from "@/lib/validation/player";

import { addUserToGroupAction } from "./actions";

const FIELD_CLASS =
  "card-surface w-full rounded-xl px-3 py-2 text-sm text-black outline-none dark:text-zinc-50";

/**
 * Admin: add one account to a group. Pick a group (rows the account already
 * has a player in are disabled), then either link one of that group's guest
 * players or create a new player with a chosen name (defaulting to the
 * account's provider name).
 */
export function AddToGroupForm({
  userId,
  defaultName,
  groups,
}: {
  userId: string;
  defaultName: string;
  groups: AdminGroupOption[];
}) {
  const [state, action, pending] = useActionState(addUserToGroupAction, null);
  const [groupId, setGroupId] = useState("");
  const [playerId, setPlayerId] = useState("");

  const guests = groups.find((g) => g.id === groupId)?.guests ?? [];

  return (
    <form action={action} className="flex flex-col gap-2">
      <input type="hidden" name="userId" value={userId} />

      <select
        name="groupId"
        aria-label="Group"
        value={groupId}
        onChange={(e) => {
          setGroupId(e.target.value);
          setPlayerId("");
        }}
        className={FIELD_CLASS}
      >
        <option value="">Choose a group…</option>
        {groups.map((group) => {
          const alreadyIn = group.linkedUserIds.includes(userId);
          return (
            <option key={group.id} value={group.id} disabled={alreadyIn}>
              {group.name}
              {alreadyIn ? " — already added" : ""}
            </option>
          );
        })}
      </select>

      <select
        name="playerId"
        aria-label="Player"
        value={playerId}
        onChange={(e) => setPlayerId(e.target.value)}
        disabled={!groupId}
        className={`${FIELD_CLASS} disabled:opacity-50`}
      >
        <option value="">New player</option>
        {guests.map((guest) => (
          <option key={guest.id} value={guest.id}>
            Link guest: {guest.displayName}
          </option>
        ))}
      </select>

      {playerId === "" && (
        <input
          name="displayName"
          aria-label="Display name"
          type="text"
          defaultValue={defaultName}
          maxLength={MAX_PLAYER_NAME}
          placeholder="Name in this group"
          className={`${FIELD_CLASS} placeholder:text-zinc-400`}
        />
      )}

      <button
        type="submit"
        disabled={pending || !groupId}
        className="self-start rounded-full bg-black px-4 py-2 text-sm font-medium text-white transition-opacity disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {pending ? "Adding…" : "Add to group"}
      </button>

      {state?.error && (
        <p className="text-sm text-red-600" role="alert">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="text-sm text-green-600" role="status">
          {state.success}
        </p>
      )}
    </form>
  );
}
