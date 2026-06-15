"use client";

/**
 * SHRP-105-rev — Generate Custody Record CTA on the Edit page.
 *
 * Replaces the watermarked draft-preview path. The agency fills out the
 * form, clicks Generate, pays, and the rendered Custody Record appears
 * at /view permanently. Until then there's no document to capture.
 *
 * Includes a link to the sample Custody Record (Brushfire Coffee) so the
 * agency can see the format before committing. The sample is plain
 * sample data — no confusion with their actual engagement content.
 */

import * as React from "react";
import { Card, CardBody } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { IssueCustodyDialog } from "../../view/_components/issue-dialog";
import {
  FileCheck,
  ExternalLink,
  Sparkles,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";

interface Props {
  projectId: string;
  clientName: string;
  hasSavedDraft: boolean;
}

export function GenerateCard({
  projectId,
  clientName,
  hasSavedDraft,
}: Props) {
  const [open, setOpen] = React.useState(false);

  return (
    <Card className="border-sherpa-200 bg-sherpa-50/50">
      <CardBody className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-sherpa-500 text-white">
            <FileCheck className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-base font-semibold text-slate-900">
              Generate Custody Record
              {clientName ? <> for {clientName}</> : ""}
            </div>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              The rendered document — signed, dated, sealed with the
              SherpaKeys attestation badge and a public verify URL — is
              produced the moment you generate it. Until then,
              there&apos;s nothing to share.
            </p>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <div className="flex items-start gap-2 text-xs text-slate-700">
            <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-sherpa-500" />
            <div>
              <strong>Want to see the format first?</strong>{" "}
              <a
                href="/sample-custody-record.html"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sherpa-600 underline-offset-2 hover:text-sherpa-700 hover:underline"
              >
                Open the sample Custody Record
                <ExternalLink className="h-3 w-3" />
              </a>{" "}
              — a fully-rendered example for a sample agency &amp;
              client. Your record will look like that, populated with
              your engagement&apos;s details.
            </div>
          </div>
        </div>

        {!hasSavedDraft && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <span>
              Save the form at least once before you can generate. We
              don&apos;t generate from an empty record.
            </span>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3">
          <div className="flex items-start gap-2 text-xs text-slate-600">
            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
            <span>
              Once generated, the record is permanent. Edits stay free —
              you can refine the document anytime. Re-issuing creates a
              new attestation entry; old verify URLs still verify the
              original.
            </span>
          </div>
          <Button
            type="button"
            onClick={() => setOpen(true)}
            disabled={!hasSavedDraft}
          >
            <FileCheck className="h-4 w-4" />
            Generate Custody Record
          </Button>
        </div>
      </CardBody>

      <IssueCustodyDialog
        projectId={projectId}
        clientName={clientName}
        open={open}
        onOpenChange={setOpen}
      />
    </Card>
  );
}
