// Server wrapper: reads the session and renders the account menu (View my journey
// + Sign out). Drop into any page header so every user can reach their own profile.
import { AccountMenu } from "./AccountMenu";
import { getSession } from "@/lib/auth/server";

export async function AccountChip() {
  const session = await getSession();
  if (!session) return null;
  // On desktop the sidebar footer owns the account/sign-out; hide the top-right
  // chip there to avoid two controls for the same job (audit L9).
  return (
    <div className="lg:hidden">
      <AccountMenu name={session.name} role={session.role} personId={session.personId} />
    </div>
  );
}
