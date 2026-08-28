import { redirect } from "next/navigation";

// The "Insights" nav points to /songs (worship insights). This older org-level
// rollup was orphaned — loading /insights directly landed on a dead-end page.
// Redirect to the canonical Insights surface so bookmarks/refreshes work.
export default function InsightsPage() {
  redirect("/songs");
}
