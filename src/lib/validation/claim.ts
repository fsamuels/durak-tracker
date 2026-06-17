import { z } from "zod";

// z.guid() (not z.uuid()): same rationale as the other id checks — the DB's ids
// are valid 8-4-4-4-12 GUIDs but not all RFC-9562 version-conformant, which
// Zod 4's strict z.uuid() rejects. guid validates the shape only.
export const claimTokenSchema = z.guid();
export const claimPlayerIdSchema = z.guid();
