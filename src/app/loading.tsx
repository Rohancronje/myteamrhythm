// Shown instantly on every navigation while the next page's server render runs —
// so tapping a tab gives immediate feedback instead of a frozen screen.
export default function Loading() {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-xl items-center justify-center px-5 py-24">
      <div className="flex flex-col items-center gap-4">
        <span className="h-9 w-9 animate-spin rounded-full border-2 border-border" style={{ borderTopColor: "var(--color-purple)" }} />
        <p className="text-sm text-mute">Loading…</p>
      </div>
    </div>
  );
}
