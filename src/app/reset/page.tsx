import Image from "next/image";
import { ResetForm } from "@/components/ResetForm";

export const dynamic = "force-dynamic";

// Public page reached from the password-reset email link (/reset?token=...).
export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  const t = typeof token === "string" ? token : "";

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-sm flex-col justify-center px-6 py-12">
      <div className="rise mb-8 text-center">
        <Image src="/logo.jpg" alt="Rhythm — Church Volunteer Platform" width={1152} height={788} priority className="mx-auto h-auto w-72 rounded-2xl" />
        <h1 className="mt-8 font-display text-2xl font-bold text-text">Set a new password</h1>
        <p className="mt-2 text-sm text-mute text-balance">Choose a new password for your Rhythm account.</p>
      </div>

      <div className="rise glass rounded-[var(--radius-card)] p-6" style={{ animationDelay: "60ms" }}>
        <ResetForm token={t} />
      </div>
    </div>
  );
}
