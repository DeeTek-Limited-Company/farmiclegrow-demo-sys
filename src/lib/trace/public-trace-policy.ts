type PublicTraceSection<TFields extends Record<string, boolean>> = {
  enabled: boolean;
  fields: TFields;
};

type PublicTracePolicySections = {
  farmer: PublicTraceSection<{
    name: boolean;
    anonymizedName: boolean;
    cooperativeName: boolean;
    certifications: boolean;
  }>;
  quality: PublicTraceSection<{
    passFail: boolean;
    moisturePct: boolean;
  }>;
};

export type PublicTracePolicy = {
  sections: PublicTracePolicySections;
};

export type PublicTracePolicyOverride = {
  sections?: {
    farmer?: {
      enabled?: boolean;
      fields?: Partial<PublicTracePolicySections["farmer"]["fields"]>;
    };
    quality?: {
      enabled?: boolean;
      fields?: Partial<PublicTracePolicySections["quality"]["fields"]>;
    };
  };
};

const LIMITED_PUBLIC_TRACE_POLICY: PublicTracePolicy = {
  sections: {
    farmer: {
      enabled: false,
      fields: {
        name: false,
        anonymizedName: true,
        cooperativeName: false,
        certifications: false,
      },
    },
    quality: {
      enabled: false,
      fields: {
        passFail: false,
        moisturePct: false,
      },
    },
  },
};

export const DEFAULT_PUBLIC_TRACE_POLICY: PublicTracePolicy = {
  sections: {
    farmer: {
      enabled: false,
      fields: {
        name: false,
        anonymizedName: true,
        cooperativeName: false,
        certifications: false,
      },
    },
    quality: {
      enabled: false,
      fields: {
        passFail: true,
        moisturePct: false,
      },
    },
  },
};

export const PUBLIC_TRACE_POLICY_SECTION_ORDER = ["farmer", "quality"] as const;

export const PUBLIC_TRACE_POLICY_SECTION_LABELS = {
  farmer: "Farmer identity",
  quality: "Quality summary",
} as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function asOptionalBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function normalizeFarmerSection(
  section: PublicTracePolicyOverride["sections"] extends infer T
    ? T extends { farmer?: infer U }
      ? U | undefined
      : never
    : never,
): PublicTracePolicySections["farmer"] {
  return {
    enabled:
      typeof section?.enabled === "boolean"
        ? section.enabled
        : DEFAULT_PUBLIC_TRACE_POLICY.sections.farmer.enabled,
    fields: {
      name:
        typeof section?.fields?.name === "boolean"
          ? section.fields.name
          : DEFAULT_PUBLIC_TRACE_POLICY.sections.farmer.fields.name,
      anonymizedName:
        typeof section?.fields?.anonymizedName === "boolean"
          ? section.fields.anonymizedName
          : DEFAULT_PUBLIC_TRACE_POLICY.sections.farmer.fields.anonymizedName,
      cooperativeName:
        typeof section?.fields?.cooperativeName === "boolean"
          ? section.fields.cooperativeName
          : DEFAULT_PUBLIC_TRACE_POLICY.sections.farmer.fields.cooperativeName,
      certifications:
        typeof section?.fields?.certifications === "boolean"
          ? section.fields.certifications
          : DEFAULT_PUBLIC_TRACE_POLICY.sections.farmer.fields.certifications,
    },
  };
}

function normalizeQualitySection(
  section: PublicTracePolicyOverride["sections"] extends infer T
    ? T extends { quality?: infer U }
      ? U | undefined
      : never
    : never,
): PublicTracePolicySections["quality"] {
  return {
    enabled:
      typeof section?.enabled === "boolean"
        ? section.enabled
        : DEFAULT_PUBLIC_TRACE_POLICY.sections.quality.enabled,
    fields: {
      passFail:
        typeof section?.fields?.passFail === "boolean"
          ? section.fields.passFail
          : DEFAULT_PUBLIC_TRACE_POLICY.sections.quality.fields.passFail,
      moisturePct:
        typeof section?.fields?.moisturePct === "boolean"
          ? section.fields.moisturePct
          : DEFAULT_PUBLIC_TRACE_POLICY.sections.quality.fields.moisturePct,
    },
  };
}

function mergePolicy(
  base: PublicTracePolicy,
  override: PublicTracePolicy,
): PublicTracePolicy {
  return {
    sections: {
      farmer: {
        enabled: override.sections.farmer.enabled,
        fields: {
          ...base.sections.farmer.fields,
          ...override.sections.farmer.fields,
        },
      },
      quality: {
        enabled: override.sections.quality.enabled,
        fields: {
          ...base.sections.quality.fields,
          ...override.sections.quality.fields,
        },
      },
    },
  };
}

function applyOverride(
  base: PublicTracePolicy,
  override: PublicTracePolicyOverride | PublicTracePolicy | null | undefined,
): PublicTracePolicy {
  return {
    sections: {
      farmer: {
        enabled:
          typeof override?.sections?.farmer?.enabled === "boolean"
            ? override.sections.farmer.enabled
            : base.sections.farmer.enabled,
        fields: {
          name:
            typeof override?.sections?.farmer?.fields?.name === "boolean"
              ? override.sections.farmer.fields.name
              : base.sections.farmer.fields.name,
          anonymizedName:
            typeof override?.sections?.farmer?.fields?.anonymizedName === "boolean"
              ? override.sections.farmer.fields.anonymizedName
              : base.sections.farmer.fields.anonymizedName,
          cooperativeName:
            typeof override?.sections?.farmer?.fields?.cooperativeName === "boolean"
              ? override.sections.farmer.fields.cooperativeName
              : base.sections.farmer.fields.cooperativeName,
          certifications:
            typeof override?.sections?.farmer?.fields?.certifications === "boolean"
              ? override.sections.farmer.fields.certifications
              : base.sections.farmer.fields.certifications,
        },
      },
      quality: {
        enabled:
          typeof override?.sections?.quality?.enabled === "boolean"
            ? override.sections.quality.enabled
            : base.sections.quality.enabled,
        fields: {
          passFail:
            typeof override?.sections?.quality?.fields?.passFail === "boolean"
              ? override.sections.quality.fields.passFail
              : base.sections.quality.fields.passFail,
          moisturePct:
            typeof override?.sections?.quality?.fields?.moisturePct === "boolean"
              ? override.sections.quality.fields.moisturePct
              : base.sections.quality.fields.moisturePct,
        },
      },
    },
  };
}

export function normalizeBatchPublicTracePolicyOverride(
  override: PublicTracePolicyOverride | null | undefined,
): PublicTracePolicy {
  return {
    sections: {
      farmer: normalizeFarmerSection(override?.sections?.farmer),
      quality: normalizeQualitySection(override?.sections?.quality),
    },
  };
}

export function sanitizeBatchPublicTracePolicyInput(
  input: unknown,
): PublicTracePolicy {
  const root = asRecord(input);
  const sections = asRecord(root?.sections);

  const farmerSection = asRecord(sections?.farmer);
  const farmerFields = asRecord(farmerSection?.fields);

  const qualitySection = asRecord(sections?.quality);
  const qualityFields = asRecord(qualitySection?.fields);

  return normalizeBatchPublicTracePolicyOverride({
    sections: {
      farmer: {
        enabled: asOptionalBoolean(farmerSection?.enabled),
        fields: {
          name: asOptionalBoolean(farmerFields?.name),
          anonymizedName: asOptionalBoolean(farmerFields?.anonymizedName),
          cooperativeName: asOptionalBoolean(farmerFields?.cooperativeName),
          certifications: asOptionalBoolean(farmerFields?.certifications),
        },
      },
      quality: {
        enabled: asOptionalBoolean(qualitySection?.enabled),
        fields: {
          passFail: asOptionalBoolean(qualityFields?.passFail),
          moisturePct: asOptionalBoolean(qualityFields?.moisturePct),
        },
      },
    },
  });
}

export function buildBatchPublicTracePolicyOverrideFromEffective(
  policy: PublicTracePolicy,
): PublicTracePolicyOverride {
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

export function resolveEffectivePublicTracePolicy({
  visibility,
  orgPolicy,
  batchOverride,
}: {
  visibility: string | null | undefined;
  orgPolicy?: PublicTracePolicyOverride | PublicTracePolicy | null;
  batchOverride?: PublicTracePolicyOverride | null;
}): PublicTracePolicy {
  if (visibility === "LIMITED") {
    return LIMITED_PUBLIC_TRACE_POLICY;
  }

  return applyOverride(
    applyOverride(DEFAULT_PUBLIC_TRACE_POLICY, orgPolicy),
    batchOverride,
  );
}
