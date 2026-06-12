import { describe, expect, it } from "vitest";

import {
  buildBatchPublicTracePolicyOverrideFromEffective,
  DEFAULT_PUBLIC_TRACE_POLICY,
  normalizeBatchPublicTracePolicyOverride,
  resolveEffectivePublicTracePolicy,
  sanitizeBatchPublicTracePolicyInput,
} from "@/lib/trace/public-trace-policy";

describe("public trace policy", () => {
  it("normalizes a batch override with section and field controls", () => {
    const policy = normalizeBatchPublicTracePolicyOverride({
      sections: {
        farmer: {
          enabled: true,
          fields: {
            name: false,
            anonymizedName: true,
            cooperativeName: true,
            certifications: true,
          },
        },
      },
    });

    expect(policy.sections.farmer.enabled).toBe(true);
    expect(policy.sections.farmer.fields.anonymizedName).toBe(true);
    expect(policy.sections.farmer.fields.cooperativeName).toBe(true);
  });

  it("merges org policy and batch overrides deeply by section and field", () => {
    const effective = resolveEffectivePublicTracePolicy({
      visibility: "PUBLIC",
      orgPolicy: {
        sections: {
          farmer: {
            enabled: true,
            fields: {
              name: true,
              anonymizedName: false,
              cooperativeName: false,
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
      },
      batchOverride: {
        sections: {
          farmer: {
            fields: {
              name: false,
              cooperativeName: true,
            },
          },
          quality: {
            enabled: true,
            fields: {
              moisturePct: true,
            },
          },
        },
      },
    });

    expect(effective.sections.farmer.enabled).toBe(true);
    expect(effective.sections.farmer.fields.name).toBe(false);
    expect(effective.sections.farmer.fields.anonymizedName).toBe(false);
    expect(effective.sections.farmer.fields.cooperativeName).toBe(true);
    expect(effective.sections.quality.enabled).toBe(true);
    expect(effective.sections.quality.fields.passFail).toBe(true);
    expect(effective.sections.quality.fields.moisturePct).toBe(true);
  });

  it("forces limited batches to a limited-safe policy", () => {
    const effective = resolveEffectivePublicTracePolicy({
      visibility: "LIMITED",
      orgPolicy: DEFAULT_PUBLIC_TRACE_POLICY,
      batchOverride: {
        sections: {
          quality: {
            enabled: true,
            fields: { passFail: true, moisturePct: true },
          },
        },
      },
    });

    expect(effective.sections.quality.enabled).toBe(false);
    expect(effective.sections.farmer.fields.name).toBe(false);
  });

  it("sanitizes raw batch policy input to known boolean controls", () => {
    const policy = sanitizeBatchPublicTracePolicyInput({
      sections: {
        farmer: {
          enabled: true,
          fields: {
            name: "yes",
            anonymizedName: false,
            cooperativeName: true,
            certifications: 1,
            ignored: true,
          },
          extra: "ignored",
        },
        quality: {
          enabled: "true",
          fields: {
            passFail: false,
            moisturePct: true,
          },
        },
        logistics: {
          enabled: true,
        },
      },
    });

    expect(policy).toEqual({
      sections: {
        farmer: {
          enabled: true,
          fields: {
            name: false,
            anonymizedName: false,
            cooperativeName: true,
            certifications: false,
          },
        },
        quality: {
          enabled: false,
          fields: {
            passFail: false,
            moisturePct: true,
          },
        },
      },
    });
  });

  it("builds a batch override payload from edited effective settings", () => {
    const override = buildBatchPublicTracePolicyOverrideFromEffective({
      sections: {
        farmer: {
          enabled: true,
          fields: {
            name: false,
            anonymizedName: true,
            cooperativeName: true,
            certifications: false,
          },
        },
        quality: {
          enabled: true,
          fields: {
            passFail: true,
            moisturePct: false,
          },
        },
      },
    });

    expect(override).toEqual({
      sections: {
        farmer: {
          enabled: true,
          fields: {
            name: false,
            anonymizedName: true,
            cooperativeName: true,
            certifications: false,
          },
        },
        quality: {
          enabled: true,
          fields: {
            passFail: true,
            moisturePct: false,
          },
        },
      },
    });
  });

  it("disables field controls when a section is turned off", () => {
    const policy = DEFAULT_PUBLIC_TRACE_POLICY;

    expect(policy.sections.farmer.enabled).toBe(false);
    expect(policy.sections.farmer.fields.name).toBe(false);
  });

  it("resolves an effective batch policy from org defaults plus batch override", () => {
    const effective = resolveEffectivePublicTracePolicy({
      visibility: "INHERIT",
      orgPolicy: {
        sections: {
          farmer: {
            enabled: true,
            fields: {
              name: false,
              anonymizedName: true,
              cooperativeName: false,
              certifications: false,
            },
          },
          quality: {
            enabled: true,
            fields: {
              passFail: true,
              moisturePct: false,
            },
          },
        },
      },
      batchOverride: {
        sections: {
          quality: {
            enabled: true,
            fields: {
              moisturePct: true,
            },
          },
        },
      },
    });

    expect(effective.sections.quality.fields.moisturePct).toBe(true);
  });
});
