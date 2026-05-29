import Link from "next/link";
import { AlertTriangle, Clock, ArrowRight } from "lucide-react";
import { getService, ENVIRONMENTS, type Environment } from "@/lib/services";

export interface OverdueItem {
  credentialId: string;
  projectId: string;
  projectName: string;
  service: string;
  env: Environment;
  label: string;
  daysOverdue: number;
  /** true if status is "due" (warn) rather than "overdue" (alert) */
  isDueSoon?: boolean;
}

export function NeedsAttentionCard({ items }: { items: OverdueItem[] }) {
  if (items.length === 0) return null;

  // Overdue items rendered first, due-soon items grouped after.
  const overdue = items.filter((i) => !i.isDueSoon);
  const dueSoon = items.filter((i) => i.isDueSoon);

  return (
    <div className="mb-6 rounded-2xl border-2 border-red-200 bg-red-50/40 shadow-sm">
      <div className="flex items-center justify-between border-b border-red-200 bg-red-50 px-5 py-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <h2 className="text-sm font-semibold text-red-900">
            Needs attention · {items.length}
          </h2>
        </div>
        <span className="text-xs text-red-700">
          {overdue.length} overdue
          {dueSoon.length > 0 && ` · ${dueSoon.length} due soon`}
        </span>
      </div>

      <ul className="divide-y divide-red-100">
        {[...overdue, ...dueSoon].map((item) => (
          <li key={item.credentialId}>
            <Link
              href={`/vault/${item.projectId}?credential=${item.credentialId}&playbook=rotation`}
              className="flex items-center gap-3 px-5 py-3 transition hover:bg-red-50/60"
            >
              <ServiceBadge serviceId={item.service} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-medium text-slate-900">
                    {item.label}
                  </span>
                  <EnvChip env={item.env} />
                </div>
                <div className="mt-0.5 text-xs text-slate-500">
                  in <span className="font-medium text-slate-700">{item.projectName}</span>
                </div>
              </div>
              <OverduePill item={item} />
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400" />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ServiceBadge({ serviceId }: { serviceId: string }) {
  const service = getService(serviceId);
  const name = service?.name ?? serviceId;
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
      style={{ backgroundColor: service?.color ?? "#64748B" }}
      title={name}
    >
      {name.slice(0, 1)}
    </span>
  );
}

function EnvChip({ env }: { env: Environment }) {
  const cfg = ENVIRONMENTS.find((e) => e.id === env);
  return (
    <span
      className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cfg?.color ?? "bg-slate-100 text-slate-700"}`}
    >
      {env}
    </span>
  );
}

function OverduePill({ item }: { item: OverdueItem }) {
  if (item.isDueSoon) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
        <Clock className="h-3 w-3" /> Due soon
      </span>
    );
  }
  if (item.daysOverdue > 0) {
    return (
      <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
        <AlertTriangle className="h-3 w-3" /> {item.daysOverdue}d overdue
      </span>
    );
  }
  return (
    <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-semibold text-red-800">
      <AlertTriangle className="h-3 w-3" /> Never rotated
    </span>
  );
}
