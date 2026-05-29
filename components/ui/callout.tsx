import * as React from "react";
import { Info, AlertTriangle, ShieldCheck, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "warning" | "danger" | "success";

const palette: Record<Tone, { bg: string; border: string; text: string; icon: React.ComponentType<{ className?: string }> }> = {
  info: { bg: "bg-sherpa-50", border: "border-sherpa-200", text: "text-sherpa-900", icon: Info },
  warning: { bg: "bg-amber-50", border: "border-amber-200", text: "text-amber-900", icon: AlertTriangle },
  danger: { bg: "bg-red-50", border: "border-red-200", text: "text-red-900", icon: AlertCircle },
  success: { bg: "bg-emerald-50", border: "border-emerald-200", text: "text-emerald-900", icon: ShieldCheck },
};

export function Callout({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  className?: string;
}) {
  const p = palette[tone];
  const Icon = p.icon;
  return (
    <div className={cn("rounded-lg border p-4", p.bg, p.border, p.text, className)}>
      <div className="flex items-start gap-3">
        <Icon className="mt-0.5 h-4 w-4 shrink-0" />
        <div className="text-sm">
          {title && <div className="mb-1 font-semibold">{title}</div>}
          <div className="leading-relaxed">{children}</div>
        </div>
      </div>
    </div>
  );
}
