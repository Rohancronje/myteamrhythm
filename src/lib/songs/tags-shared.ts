// Client-safe song-tag types + controlled vocabulary (no DB imports).

export type TagStatus = "pending" | "tagged" | "needs_review";

export interface TaggableSong {
  title: string;
  displayTitle: string;
  timesUsed: number;
  key: string;
  status: TagStatus;
  themes: string[];
  scriptureRefs: string[];
  notes: string;
}

/** Controlled vocabulary — tagging picks from this, not free text. */
export const THEME_VOCAB = [
  "God's provision", "Surrender", "Creation", "Grace", "Praise & adoration",
  "Salvation", "Hope", "Faithfulness", "Holiness", "Worship", "Lament",
  "Thanksgiving", "The cross", "Resurrection", "Holy Spirit", "Mission",
  "God's presence", "Freedom", "Identity in Christ", "Trust",
];
