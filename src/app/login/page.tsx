import { redirect } from "next/navigation";
import { Wordmark } from "@/components/Wordmark";
import { LoginForm } from "@/components/LoginForm";
import { getSession } from "@/lib/auth/server";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getSession()) redirect("/");

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="rise mb-8 text-center">
        <Wordmark className="justify-center" />
        <h1 className="mt-8 font-display text-2xl font-bold text-text">Welcome back</h1>
        <p className="mt-2 text-sm text-mute text-balance">
          Pastoral care and worship insight for NS Family Services.
        </p>
      </div>

      <div className="rise glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "60ms" }}>
        <LoginForm />
      </div>

      <p className="mt-6 text-center text-xs text-faint text-balance">
        Access is by invitation. Ask an admin to set up your account.
      </p>
    </div>
  );
}
