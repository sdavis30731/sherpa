import { ShieldCheck } from "lucide-react";

/**
 * SHRP-102b — Identity ribbon.
 *
 * Thin persistent bar that lives just below the vault header on every
 * /vault/* page. Says, unambiguously:
 *
 *   You are managing [Agency Name] · Acting as [email] · Powered by SherpaKeys
 *
 * Why: the dashboard previously left the "who am I in this view?"
 * question implicit. The agency logo at the top wasn't enough — users
 * couldn't tell if they were looking at the client view, the agency
 * view, or some SherpaKeys-as-vendor view. The ribbon answers all
 * three at once on every screen, no exceptions.
 *
 * Currently shows the user's email as "Acting as" identity. When we
 * collect first/last name + role on agency_profiles (v1.1 polish),
 * swap email for "[Name], [Role]".
 */
export function IdentityRibbon({
  agencyName,
  userEmail,
}: {
  agencyName: string;
  userEmail: string;
}) {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-6 py-1.5 text-[11px] text-slate-500">
        <span className="inline-flex items-center gap-1">
          <ShieldCheck className="h-3 w-3 text-sherpa-500" aria-hidden="true" />
          <span>
            You are managing{" "}
            <strong className="font-semibold text-slate-800">
              {agencyName}
            </strong>
          </span>
        </span>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <span>
          Acting as{" "}
          <strong className="font-semibold text-slate-700">{userEmail}</strong>
        </span>
        <span aria-hidden="true" className="text-slate-300">
          ·
        </span>
        <span>
          Powered by{" "}
          <span className="font-semibold text-slate-700">
            Sherpa<span className="text-sherpa-500">Keys</span>
          </span>
        </span>
      </div>
    </div>
  );
}
