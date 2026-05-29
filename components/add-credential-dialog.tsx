"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useVaultKey } from "@/lib/vault-context";
import { encrypt } from "@/lib/crypto";
import { detectMismatch } from "@/lib/keyDetect";
import { SERVICES, ENVIRONMENTS, getService, type Environment } from "@/lib/services";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Callout } from "@/components/ui/callout";
import { ArrowRight, ArrowLeft, AlertTriangle, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "service" | "type" | "details";

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
}

export function AddCredentialDialog({ projectId, open, onOpenChange, onCreated }: Props) {
  const router = useRouter();
  const vault = useVaultKey();

  const [step, setStep] = React.useState<Step>("service");
  const [serviceId, setServiceId] = React.useState<string | null>(null);
  const [keyTypeId, setKeyTypeId] = React.useState<string | null>(null);
  const [env, setEnv] = React.useState<Environment>("production");
  const [label, setLabel] = React.useState("");
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const service = serviceId ? getService(serviceId) : null;
  const mismatch = service ? detectMismatch(value, service) : null;

  function reset() {
    setStep("service");
    setServiceId(null);
    setKeyTypeId(null);
    setEnv("production");
    setLabel("");
    setValue("");
    setError(null);
  }

  function close(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!service || !keyTypeId) return;
    if (!value.trim()) {
      setError("Paste the key value.");
      return;
    }
    if (!label.trim()) {
      setError("Add a label so future-you knows what this is.");
      return;
    }
    if (!vault.key) {
      // The vault is locked. Send the user to unlock first.
      router.push(`/vault/unlock?next=/vault/${projectId}`);
      return;
    }

    setSaving(true);
    try {
      // Encrypt the value in the browser. The server only ever sees ciphertext.
      const ciphertext = await encrypt(value.trim(), vault.key);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error: insErr } = await supabase.from("credentials").insert({
        project_id: projectId,
        user_id: user.id,
        service: service.id,
        env,
        label: `${label.trim()} · ${keyTypeLabel(service.id, keyTypeId)}`,
        ciphertext,
        last_rotated_at: new Date().toISOString(),
      });
      if (insErr) throw insErr;

      // Audit
      await supabase.from("audit_log").insert({
        user_id: user.id,
        project_id: projectId,
        action: "credential_added",
        actor: "user",
        metadata: { service: service.id, key_type: keyTypeId, env },
      });

      onCreated?.();
      close(false);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the credential.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={close}
      title={titleFor(step, service?.name)}
      description={descriptionFor(step)}
      className="max-w-2xl"
    >
      {step === "service" && (
        <ServiceGrid
          onPick={(id) => {
            setServiceId(id);
            setStep("type");
          }}
        />
      )}

      {step === "type" && service && (
        <TypePicker
          service={service}
          selected={keyTypeId}
          onPick={(id) => {
            setKeyTypeId(id);
            setStep("details");
          }}
          onBack={() => setStep("service")}
        />
      )}

      {step === "details" && service && keyTypeId && (
        <form onSubmit={save} className="space-y-4">
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
            <span className="font-medium">{service.name}</span> ·{" "}
            {keyTypeLabel(service.id, keyTypeId)}
          </div>

          <div>
            <Label htmlFor="env">Environment</Label>
            <select
              id="env"
              value={env}
              onChange={(e) => setEnv(e.target.value as Environment)}
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
            >
              {ENVIRONMENTS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="label">Label</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. EcoVerse production"
            />
          </div>

          <div>
            <Label htmlFor="value">Key value</Label>
            <textarea
              id="value"
              rows={3}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Paste the key here. Whitespace is trimmed."
              className="block w-full rounded-md border border-slate-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500"
              spellCheck={false}
              autoComplete="off"
            />
            {!vault.key && (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600">
                <Lock className="h-3 w-3" /> Vault is locked — we&apos;ll ask you to unlock before saving.
              </p>
            )}
          </div>

          {mismatch && (
            <Callout tone="warning" title="That looks like a different service.">
              <p className="mb-2">{mismatch.reason}</p>
              <button
                type="button"
                onClick={() => {
                  setServiceId(mismatch.serviceId);
                  setKeyTypeId(mismatch.keyTypeId);
                }}
                className="inline-flex items-center gap-1 text-sm font-medium text-amber-900 underline"
              >
                Move to {getService(mismatch.serviceId)?.name}
              </button>
            </Callout>
          )}

          {error && <Callout tone="danger">{error}</Callout>}

          <div className="flex items-center justify-between pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep("type")}
              disabled={saving}
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <Button type="submit" disabled={saving || !value.trim() || !label.trim()}>
              {saving ? "Encrypting and saving..." : "Save credential"}
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}

// ---------- helpers ----------

function titleFor(step: Step, serviceName?: string): string {
  if (step === "service") return "Add a credential";
  if (step === "type") return `Add a ${serviceName} credential`;
  return "Details";
}

function descriptionFor(step: Step): string {
  if (step === "service") return "Pick the service this key is for.";
  if (step === "type") return "Which kind of credential?";
  return "Encrypted in your browser before it leaves.";
}

function keyTypeLabel(serviceId: string, keyTypeId: string) {
  const svc = getService(serviceId);
  return svc?.keyTypes.find((t) => t.id === keyTypeId)?.label ?? keyTypeId;
}

function ServiceGrid({ onPick }: { onPick: (id: string) => void }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {SERVICES.map((s) => (
        <button
          key={s.id}
          onClick={() => onPick(s.id)}
          className="group flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-3 py-3 text-left transition hover:border-sherpa-300 hover:bg-sherpa-50"
        >
          <span
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-bold text-white"
            style={{ backgroundColor: s.color }}
          >
            {s.name.slice(0, 1)}
          </span>
          <span className="text-sm font-medium text-slate-800 group-hover:text-sherpa-700">
            {s.name}
          </span>
        </button>
      ))}
    </div>
  );
}

function TypePicker({
  service,
  selected,
  onPick,
  onBack,
}: {
  service: ReturnType<typeof getService>;
  selected: string | null;
  onPick: (id: string) => void;
  onBack: () => void;
}) {
  if (!service) return null;
  return (
    <div className="space-y-3">
      {service.keyTypes.map((t) => (
        <button
          key={t.id}
          onClick={() => onPick(t.id)}
          className={cn(
            "flex w-full items-start gap-3 rounded-lg border bg-white px-4 py-3 text-left transition",
            selected === t.id
              ? "border-sherpa-500 ring-1 ring-sherpa-500"
              : "border-slate-200 hover:border-sherpa-300 hover:bg-sherpa-50",
          )}
        >
          {t.dangerous && (
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />
          )}
          <span className="flex-1">
            <span className="block text-sm font-semibold text-slate-900">{t.label}</span>
            {t.hint && <span className="block text-xs text-slate-500">{t.hint}</span>}
          </span>
          <ArrowRight className="mt-1 h-4 w-4 text-slate-400" />
        </button>
      ))}
      <button
        onClick={onBack}
        className="inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft className="h-4 w-4" /> Different service
      </button>
    </div>
  );
}
