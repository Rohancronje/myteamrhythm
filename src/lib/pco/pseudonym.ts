// Turns a Planning Center person id into a stable pseudonymous handle using a
// server-only salt (PSEUDONYM_SALT). The same person always maps to the same
// handle, so trend lines are continuous — but without the salt, the handle can't
// be reversed to a person. Rotating the salt deliberately severs old pulse data
// from identity, which is a feature, not a bug.

import { createHmac } from "node:crypto";

export function pseudonymFor(pcoPersonId: string): string {
  const salt = process.env.PSEUDONYM_SALT;
  if (!salt) throw new Error("PSEUDONYM_SALT is not set");
  const digest = createHmac("sha256", salt).update(pcoPersonId).digest("hex");
  // Short, human-readable-ish handle. Collision space is ample for one church.
  return `NS-${digest.slice(0, 10)}`;
}
