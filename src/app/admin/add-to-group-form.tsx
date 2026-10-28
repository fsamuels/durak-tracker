"use client";

import { useActionState, useState } from "react";

import { FormMessage } from "@/components/ui";
import type { AdminGroupOption } from "@/lib/data/admin-groups";
import { buttonClass, cx, inputClass } from "@/lib/ui";
import { MAX_PLAYER_NAME } from "@/lib/validation/player";

import { addUserToGroupAction } from "./actions";

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
        className={inputClass}
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
        className={inputClass}
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
          className={inputClass}
        />
      )}

      <button
        type="submit"
        disabled={pending || !groupId}
        className={cx(buttonClass("solid", "sm"), "self-start")}
      >
        {pending ? "Adding…" : "Add to group"}
      </button>

      {state?.error && <FormMessage>{state.error}</FormMessage>}
      {state?.success && (
        <FormMessage tone="success">{state.success}</FormMessage>
      )}
    </form>
  );
}
