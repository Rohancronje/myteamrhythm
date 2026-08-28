import Image from "next/image";
import Link from "next/link";

export const metadata = {
  title: "Privacy Policy · Rhythm",
  description: "How Rhythm collects, uses, and protects personal information.",
};

// Public privacy policy — required for the Google Play listing and NZ Privacy Act
// 2020 transparency. Reachable without signing in.
export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-full w-full max-w-2xl px-6 py-12">
      <div className="mb-8 text-center">
        <Image src="/logo.jpg" alt="Rhythm" width={1152} height={788} className="mx-auto h-auto w-56 rounded-2xl" />
      </div>

      <article className="prose-invert space-y-6 text-[15px] leading-relaxed text-mute">
        <header>
          <h1 className="font-display text-3xl font-bold text-text">Privacy Policy</h1>
          <p className="mt-1 text-sm text-faint">Last updated: 27 August 2026</p>
        </header>

        <p>
          Rhythm (&ldquo;the app&rdquo;, &ldquo;we&rdquo;, &ldquo;us&rdquo;) is a volunteer connection platform used by
          NS Family Services to help ministry coaches stay connected with their volunteers. This policy explains what
          personal information we collect, how we use and protect it, and your rights under the New Zealand Privacy Act 2020.
        </p>

        <Section title="Who this applies to">
          Rhythm is an invitation-only tool used by church admins and coaches. It holds contact details for volunteers so
          coaches can keep in touch. Volunteers do not sign in themselves.
        </Section>

        <Section title="Information we collect">
          <ul className="ml-5 list-disc space-y-1">
            <li><strong className="text-text">Volunteer records</strong> — name, and (optionally) email, phone number, birthday, and a role/label, added by an admin or imported from a spreadsheet.</li>
            <li><strong className="text-text">Connection records</strong> — the date a coach reached out, and short &ldquo;FYI&rdquo; notes to prime the next conversation.</li>
            <li><strong className="text-text">Account information</strong> — for admins and coaches: name, email, phone, role, and a securely hashed password.</li>
          </ul>
        </Section>

        <Section title="How we use it">
          To show coaches who to connect with, remember birthdays, record that a check-in happened, and send an encouraging
          message. We do not use personal information for advertising, and we never sell it.
        </Section>

        <Section title="FYI notes &amp; sensitive information">
          Notes are intended as light context, not confidential records. Before a note is stored, it is automatically
          reviewed and rewritten to remove sensitive personal information (such as health, financial, legal, or relationship
          details) so it stays within the Privacy Act 2020 and ordinary confidentiality. A note is only ever visible to the
          coach who wrote it &mdash; not to other coaches, and not to admins.
        </Section>

        <Section title="Who can see the information">
          Coaches see only the volunteers on teams assigned to them. Admins can manage teams and accounts. Access is
          controlled by sign-in and role.
        </Section>

        <Section title="Service providers">
          We use trusted providers to run the app, who process data only on our behalf:
          <ul className="ml-5 mt-2 list-disc space-y-1">
            <li><strong className="text-text">Vercel</strong> — application hosting.</li>
            <li><strong className="text-text">Supabase</strong> — secure database hosting (Sydney, Australia).</li>
            <li><strong className="text-text">Brevo</strong> — sending transactional emails (invites, reminders).</li>
            <li><strong className="text-text">Anthropic (Claude)</strong> — automatically rewriting notes for privacy. Your data is not used to train their models.</li>
          </ul>
        </Section>

        <Section title="Security">
          Data is transmitted over HTTPS and stored in a managed, access-controlled database. Passwords are stored only as
          salted cryptographic hashes, never in plain text.
        </Section>

        <Section title="Retention &amp; deletion">
          We keep information for as long as the person is an active volunteer or account holder. An admin can remove a
          volunteer or account at any time, which deletes their record. To request deletion of your information, contact us
          using the details below.
        </Section>

        <Section title="Your rights">
          Under the New Zealand Privacy Act 2020 you may request access to, or correction of, the personal information we
          hold about you. Contact us and we will respond within a reasonable timeframe.
        </Section>

        <Section title="Contact">
          For any privacy question or request, email <a className="grad-text font-semibold" href="mailto:rohan87cronje@gmail.com">rohan87cronje@gmail.com</a>.
        </Section>

        <p className="pt-4 text-sm text-faint">
          <Link href="/login" className="grad-text font-semibold">← Back to Rhythm</Link>
        </p>
      </article>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-1.5 font-display text-lg font-semibold text-text">{title}</h2>
      <div>{children}</div>
    </section>
  );
}
