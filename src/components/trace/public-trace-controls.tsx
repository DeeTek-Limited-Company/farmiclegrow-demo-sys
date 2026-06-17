"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { ExternalLink, Loader2, RotateCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  buildBatchPublicTracePolicyOverrideFromEffective,
  PUBLIC_TRACE_POLICY_SECTION_LABELS,
  PUBLIC_TRACE_POLICY_SECTION_ORDER,
  type PublicTracePolicy,
} from "@/lib/trace/public-trace-policy";

type SectionKey = keyof PublicTracePolicy["sections"];
type SectionPolicy<K extends SectionKey> = PublicTracePolicy["sections"][K];
type FieldKey<K extends SectionKey> = keyof SectionPolicy<K>["fields"];

type Props = {
  batchId: string;
  publicTraceUrl: string;
  initialPolicy: PublicTracePolicy;
  orgDefaultPolicy: PublicTracePolicy;
  visibility: string;
};

const SECTION_FIELD_LABELS: {
  [K in SectionKey]: Record<FieldKey<K>, string>;
} = {
  farmer: {
    name: "Farmer name",
    anonymizedName: "Anonymized farmer name",
    cooperativeName: "Cooperative name",
    certifications: "Certifications",
  },
  quality: {
    passFail: "Pass/fail result",
    moisturePct: "Moisture percentage",
  },
};

const VISIBILITY_LABELS: Record<string, string> = {
  PUBLIC: "Public",
  LIMITED: "Limited",
  INHERIT: "Inherit org policy",
};

function clonePolicy(policy: PublicTracePolicy): PublicTracePolicy {
  return {
    sections: {
      farmer: {
        enabled: policy.sections.farmer.enabled,
        fields: { ...policy.sections.farmer.fields },
      },
      quality: {
        enabled: policy.sections.quality.enabled,
        fields: { ...policy.sections.quality.fields },
      },
    },
  };
}

export function PublicTraceControls({
  batchId,
  publicTraceUrl,
  initialPolicy,
  orgDefaultPolicy,
  visibility,
}: Props) {
  const router = useRouter();
  const [policy, setPolicy] = useState(() => clonePolicy(initialPolicy));
  const [savedPolicy, setSavedPolicy] = useState(() => clonePolicy(initialPolicy));
  const [isPending, startTransition] = useTransition();

  const isDirty = useMemo(
    () => JSON.stringify(policy) !== JSON.stringify(savedPolicy),
    [policy, savedPolicy],
  );

  function updateSection<K extends SectionKey>(section: K, enabled: boolean) {
    setPolicy((current) => ({
      sections: {
        ...current.sections,
        [section]: {
          ...current.sections[section],
          enabled,
        },
      },
    }));
  }

  function updateField<K extends SectionKey>(
    section: K,
    field: FieldKey<K>,
    checked: boolean,
  ) {
    setPolicy((current) => ({
      sections: {
        ...current.sections,
        [section]: {
          ...current.sections[section],
          fields: {
            ...current.sections[section].fields,
            [field]: checked,
          },
        },
      },
    }));
  }

  function handleReset() {
    setPolicy(clonePolicy(orgDefaultPolicy));
  }

  async function savePolicy() {
    try {
      const response = await fetch(
        `/api/batches/${encodeURIComponent(batchId)}/public-trace-policy`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            publicTracePolicyOverride:
              buildBatchPublicTracePolicyOverrideFromEffective(policy),
          }),
        },
      );

      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as { message?: string } | null;
        toast.error(body?.message || "Failed to save public trace settings.");
        return;
      }

      setSavedPolicy(clonePolicy(policy));
      router.refresh();
      toast.success("Public trace settings saved.");
    } catch {
      toast.error("Failed to save public trace settings.");
    }
  }

  function handleSave() {
    startTransition(() => {
      void savePolicy();
    });
  }

  return (
    <Card className="rounded-[2.25rem] border border-slate-200 bg-white shadow-sm">
      <CardHeader className="space-y-4 border-b border-slate-100 pb-5">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">
              Public Trace
            </p>
            <CardTitle className="text-2xl font-black tracking-tight text-slate-900">
              Public Trace Settings
            </CardTitle>
            <CardDescription>
              Choose which farmer and quality details appear on the public trace page.
            </CardDescription>
          </div>
          <Badge
            variant="outline"
            className="rounded-full border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-600"
          >
            {VISIBILITY_LABELS[visibility] ?? visibility}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {PUBLIC_TRACE_POLICY_SECTION_ORDER.map((section) => {
          const sectionPolicy = policy.sections[section];
          const fieldLabels = SECTION_FIELD_LABELS[section];
          const sectionEnabled = sectionPolicy.enabled;

          return (
            <section
              key={section}
              className="space-y-4 rounded-[1.75rem] border border-slate-200 bg-slate-50/70 p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-sm font-black uppercase tracking-widest text-slate-700">
                    {PUBLIC_TRACE_POLICY_SECTION_LABELS[section]}
                  </h3>
                  <p className="text-sm text-slate-500">
                    {sectionEnabled
                      ? "Section is visible on the public trace."
                      : "Turn this on to enable field-level controls."}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Label
                    htmlFor={`public-trace-section-${section}`}
                    className="text-xs font-black uppercase tracking-widest text-slate-500"
                  >
                    Enabled
                  </Label>
                  <Switch
                    id={`public-trace-section-${section}`}
                    checked={sectionEnabled}
                    onCheckedChange={(checked) => updateSection(section, checked)}
                    disabled={isPending}
                  />
                </div>
              </div>

              <div className="space-y-3">
                {Object.entries(fieldLabels).map(([field, label]) => {
                  const fieldKey = field as FieldKey<typeof section>;

                  return (
                    <div
                      key={field}
                      className="flex items-center justify-between gap-3 rounded-2xl border border-white bg-white px-4 py-3"
                    >
                      <div>
                        <Label
                          htmlFor={`public-trace-field-${section}-${field}`}
                          className="font-bold text-slate-700"
                        >
                          {label}
                        </Label>
                        <p className="text-xs text-slate-500">
                          {sectionEnabled
                            ? "Shown when this field is enabled."
                            : "Disabled until the section is enabled."}
                        </p>
                      </div>
                      <Switch
                        id={`public-trace-field-${section}-${field}`}
                        checked={sectionPolicy.fields[fieldKey]}
                        onCheckedChange={(checked) =>
                          updateField(section, fieldKey, checked)
                        }
                        disabled={!sectionEnabled || isPending}
                      />
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-2">
          <p className="text-sm text-slate-500">
            Reset loads the organization defaults into the panel before saving.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              onClick={handleReset}
              disabled={isPending}
            >
              <RotateCcw className="size-4" />
              Reset
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-2xl"
              asChild
            >
              <Link href={publicTraceUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="size-4" />
                Open Public Trace
              </Link>
            </Button>
            <Button
              type="button"
              className="rounded-2xl"
              onClick={handleSave}
              disabled={!isDirty || isPending}
            >
              {isPending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Settings
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
