/**
 * Supabase playbook — SHRP-018
 *
 * Lead with the loudest warning in the entire playbook library: do not put
 * the service_role key in frontend code. The most common catastrophic
 * vibe-coding mistake is pasting service_role into a Next.js component
 * where it gets bundled into the browser JS — which means anyone visiting
 * the site can read it, bypass RLS, and delete the database.
 */

import {
  PlaybookSection,
  PlaybookSteps,
  PlaybookList,
  DashboardLink,
  Pitfall,
  Danger,
  KeyChip,
} from "@/components/playbook-parts";
import type { PlaybookMeta } from "@/lib/playbooks";

export const meta: PlaybookMeta = {
  service: "supabase",
  name: "Supabase",
  lastReviewed: "2026-05-28",
  defaultSection: "overview",
};

export default function SupabasePlaybook() {
  return (
    <>
      <PlaybookSection id="overview" title="Overview">
        <Danger title="Read this first: service_role bypasses Row-Level Security.">
          Your Supabase project has FIVE different credentials, but the most
          important thing to know is the difference between the{" "}
          <strong>anon</strong> key and the <strong>service_role</strong> key.
          The anon key is safe to put in frontend code. The service_role
          key is NOT — it bypasses every Row-Level Security policy you have,
          which means anyone who reads it can delete your database, read
          every user&apos;s data, and bill you for as much compute as they
          want. Pasting service_role into a Next.js component bundles it
          into the browser JS, where every visitor can read it. Don&apos;t.
        </Danger>

        <p className="font-semibold text-slate-900">The five Supabase credentials:</p>
        <PlaybookList>
          <li>
            <strong>Project URL.</strong> Format:{" "}
            <KeyChip>https://YOUR_REF.supabase.co</KeyChip>. Public. Safe
            everywhere. Goes in <KeyChip>NEXT_PUBLIC_SUPABASE_URL</KeyChip>.
          </li>
          <li>
            <strong>anon (public) key.</strong> JWT, starts with <KeyChip>eyJ…</KeyChip>.
            Safe in frontend code <em>if and only if</em> you have RLS
            enabled on every table. Goes in{" "}
            <KeyChip>NEXT_PUBLIC_SUPABASE_ANON_KEY</KeyChip>.
          </li>
          <li>
            <strong>service_role (secret) key.</strong> Also a JWT starting with{" "}
            <KeyChip>eyJ…</KeyChip>, so it LOOKS identical to anon at first
            glance. This one bypasses RLS. SERVER-SIDE ONLY. Goes in{" "}
            <KeyChip>SUPABASE_SERVICE_ROLE_KEY</KeyChip> (note: NO
            NEXT_PUBLIC_ prefix — that prefix would expose it to the
            browser).
          </li>
          <li>
            <strong>JWT secret.</strong> The HMAC secret Supabase uses to
            sign auth tokens. You rarely need this directly; if you ever
            verify Supabase JWTs in your own code, you&apos;d use this.
            Rotating it logs every user out instantly.
          </li>
          <li>
            <strong>Database connection string.</strong> A regular Postgres
            connection URL with a password. Used by ORMs (Drizzle, Prisma)
            and direct Postgres clients. Two flavors: <em>direct</em> (port
            5432) and <em>pooler</em> (port 6543). Use the pooler from
            serverless / edge functions; the direct one only when you need
            features the pooler doesn&apos;t support.
          </li>
        </PlaybookList>

        <Pitfall title="anon and service_role both start with eyJ.">
          They&apos;re both JWTs. Visually almost identical. The only way to
          tell them apart is reading the payload (which decodes to{" "}
          <KeyChip>&quot;role&quot;: &quot;anon&quot;</KeyChip> vs{" "}
          <KeyChip>&quot;role&quot;: &quot;service_role&quot;</KeyChip>) or
          looking at which field they came from in the Supabase dashboard.
          Sherpa labels them clearly when you add them.
        </Pitfall>
      </PlaybookSection>

      <PlaybookSection id="find" title="Where to find each key">
        <p>
          All of these live in your Supabase dashboard, but on different
          pages. Substitute your project ref for{" "}
          <KeyChip>YOUR_REF</KeyChip> in URLs below — you can find it in the
          dashboard URL when you&apos;re viewing your project.
        </p>

        <PlaybookList>
          <li>
            <strong>Project URL, anon key, service_role key:</strong>{" "}
            <DashboardLink href="https://supabase.com/dashboard/project/_/settings/api">
              dashboard → Settings → API
            </DashboardLink>
            . The URL is right at the top. anon is in the &quot;Project API
            keys&quot; section, labeled &quot;anon public&quot;. service_role
            is right below it, labeled &quot;service_role secret&quot; with a{" "}
            <em>Reveal</em> button.
          </li>
          <li>
            <strong>JWT secret:</strong> Same page,{" "}
            <DashboardLink href="https://supabase.com/dashboard/project/_/settings/api">
              Settings → API
            </DashboardLink>
            , scroll down to the &quot;JWT Settings&quot; section. Click{" "}
            <em>Reveal</em>.
          </li>
          <li>
            <strong>Database connection strings:</strong>{" "}
            <DashboardLink href="https://supabase.com/dashboard/project/_/settings/database">
              dashboard → Settings → Database
            </DashboardLink>
            . Pick the &quot;Connection string&quot; tab. The dropdown lets
            you switch between Direct (port 5432), Transaction pooler (6543),
            and Session pooler (5432 via the pooler host).
          </li>
        </PlaybookList>

        <p>
          The service_role key requires you to click <em>Reveal</em> before
          it shows. Copy it into Sherpa immediately and close the Supabase
          tab — that way it&apos;s not sitting on your screen if someone
          glances at your monitor.
        </p>
      </PlaybookSection>

      <PlaybookSection id="scopes" title="Recommended usage patterns">
        <p>
          Supabase keys don&apos;t have scopes the way GitHub PATs do. The
          security model is &quot;the right key in the right place&quot;:
        </p>

        <p className="font-semibold text-slate-900">In your frontend code:</p>
        <PlaybookList>
          <li>
            ONLY the Project URL and the anon key. Both must be prefixed{" "}
            <KeyChip>NEXT_PUBLIC_</KeyChip> in Next.js so they&apos;re
            available in the browser.
          </li>
          <li>
            Every table must have Row-Level Security enabled. Without RLS,
            anyone with the anon key (which is everyone, because it&apos;s in
            your JS) can read and write everything. With RLS, the anon key
            can only do what your policies allow.
          </li>
        </PlaybookList>

        <p className="font-semibold text-slate-900">In your backend (API routes, edge functions):</p>
        <PlaybookList>
          <li>
            Use the anon key from a server context if you want to honor RLS
            for the current user (Supabase&apos;s SSR client does this
            automatically by reading the user&apos;s cookies).
          </li>
          <li>
            Use the service_role key ONLY when you need to bypass RLS — for
            admin operations, scheduled jobs, or operations that need to
            cross user boundaries. Store it as{" "}
            <KeyChip>SUPABASE_SERVICE_ROLE_KEY</KeyChip> (NO{" "}
            <KeyChip>NEXT_PUBLIC_</KeyChip> prefix). In Vercel, when you
            add the env var, do NOT check &quot;Expose to browser&quot;.
          </li>
        </PlaybookList>

        <Pitfall title="RLS is not on by default.">
          When you create a new table via the Supabase dashboard, RLS is
          DISABLED. You have to enable it explicitly per table. The Sherpa
          migrations enable it on every table. If you create new tables
          later, remember to{" "}
          <KeyChip>alter table … enable row level security;</KeyChip> AND
          add at least one policy. A table with RLS enabled but no policies
          is locked down completely — even your service_role can read it
          via the API (though it CAN read via direct SQL).
        </Pitfall>
      </PlaybookSection>

      <PlaybookSection id="rotation" title="How to rotate">
        <p>
          Supabase recently introduced key rotation for anon and service_role
          via a single button. The rotation invalidates the old key
          immediately, so deploy the new one first or accept a few seconds
          of downtime.
        </p>

        <p className="font-semibold text-slate-900">anon &amp; service_role key rotation:</p>
        <PlaybookSteps>
          <li>
            Go to{" "}
            <DashboardLink href="https://supabase.com/dashboard/project/_/settings/api">
              Settings → API
            </DashboardLink>
            . Find the key. Click the three-dot menu next to it →{" "}
            <em>Rotate key</em>.
          </li>
          <li>
            Supabase generates and shows the new key immediately. Paste it
            into Sherpa via <em>Edit</em> on this credential.
          </li>
          <li>
            Update Vercel env vars (
            <DashboardLink href="https://vercel.com/dashboard">
              vercel.com/dashboard
            </DashboardLink>{" "}
            → Project → Settings → Environment Variables) and trigger a
            redeploy. Critically: env var changes do NOT auto-redeploy on
            Vercel; you have to trigger one manually from the Deployments
            tab.
          </li>
          <li>
            Verify by signing in / doing a real action on your deployed app.
          </li>
        </PlaybookSteps>

        <p className="font-semibold text-slate-900">JWT secret rotation:</p>
        <Pitfall title="Rotating the JWT secret logs every user out.">
          Existing JWTs are signed with the old secret; after rotation, they
          fail verification and Supabase Auth treats users as logged out.
          You usually only rotate the JWT secret if you have to — e.g.,
          because it was leaked. If you do, prepare to communicate the
          forced sign-out to users.
        </Pitfall>

        <p className="font-semibold text-slate-900">Database connection string rotation:</p>
        <p>
          The password in your connection string is your{" "}
          <em>database password</em>. Rotate it at{" "}
          <DashboardLink href="https://supabase.com/dashboard/project/_/settings/database">
            Settings → Database → Database password
          </DashboardLink>{" "}
          → <em>Reset database password</em>. The new password takes effect
          immediately; deploy the new connection string before the old one
          stops working.
        </p>
      </PlaybookSection>

      <PlaybookSection id="revoke" title="How to revoke if leaked">
        <p>
          If a Supabase credential leaked, the order of operations depends on
          which one:
        </p>

        <p className="font-semibold text-slate-900">If service_role leaked:</p>
        <PlaybookSteps>
          <li>
            <strong>Rotate immediately.</strong>{" "}
            <DashboardLink href="https://supabase.com/dashboard/project/_/settings/api">
              Settings → API
            </DashboardLink>{" "}
            → three-dot menu next to service_role → <em>Rotate key</em>. The
            old key stops working instantly.
          </li>
          <li>
            <strong>Audit your database for damage.</strong> Open SQL Editor
            and check:{" "}
            <KeyChip>
              select * from auth.users order by created_at desc limit 50
            </KeyChip>{" "}
            (any user accounts you don&apos;t recognize?). Check your main
            tables for unexpected inserts or deletes. Check Supabase usage
            for unexpected spikes.
          </li>
          <li>
            <strong>Update Sherpa, Vercel, and any other place that used
            the key.</strong> Redeploy.
          </li>
          <li>
            <strong>Contact Supabase support</strong> if you suspect actual
            damage. They can review database snapshots.
          </li>
        </PlaybookSteps>

        <p className="font-semibold text-slate-900">If anon key leaked:</p>
        <p>
          Much less urgent because RLS limits what it can do. Rotate it
          anyway (same button) to be tidy. If you discover you had a table
          without RLS, fix that <em>now</em>.
        </p>

        <p className="font-semibold text-slate-900">If database password leaked:</p>
        <p>
          Rotate at{" "}
          <DashboardLink href="https://supabase.com/dashboard/project/_/settings/database">
            Settings → Database
          </DashboardLink>
          . Update the connection string wherever you used it.
        </p>
      </PlaybookSection>

      <PlaybookSection id="pitfalls" title="Common pitfalls">
        <Pitfall title="Putting service_role in a Next.js Server Component without thinking.">
          Server Components run on the server, so service_role is technically
          safe there. BUT if you import the same Supabase client module from
          both a Server Component and a Client Component, the bundler may
          include the service_role key in the client bundle, exposing it.
          The safe pattern: have <em>two</em> Supabase client files — one for
          server (uses service_role), one for browser (uses anon only). Sherpa
          does this with <KeyChip>lib/supabase/server.ts</KeyChip> and{" "}
          <KeyChip>lib/supabase/client.ts</KeyChip>.
        </Pitfall>

        <Pitfall title="Forgetting to enable RLS on new tables.">
          You create a table via the dashboard, your code works in dev with
          the anon key, you ship to prod. RLS was never enabled. Anyone with
          your anon key (which is everyone) can now read and write everything
          in that table. Always enable RLS as the first thing after creating
          a table.
        </Pitfall>

        <Pitfall title="Using the pooler URL for migrations.">
          Schema migrations don&apos;t work through the transaction pooler —
          they need a direct connection. Use the direct connection string for{" "}
          <KeyChip>psql</KeyChip>, schema changes, or anything that uses
          prepared statements heavily. Use the pooler for production app
          traffic.
        </Pitfall>

        <Pitfall title="Free-tier projects pause after inactivity.">
          Supabase free-tier projects pause after 7 days of no activity. The
          first request after pause wakes them up but takes a few seconds.
          If you&apos;re building something users will visit irregularly, set
          up a small uptime ping (a cron that hits a health endpoint every
          24 hours) to keep the project warm.
        </Pitfall>
      </PlaybookSection>
    </>
  );
}
