import { describe, expect, it } from "vitest";
import {
  buildLocalUploadPath,
  getUploadDisplayName,
  isAllowedDocumentReference,
  isAllowedImageReference,
} from "@/lib/uploads";

describe("upload reference validation", () => {
  it("accepts storage proxy URLs when the key has an allowed image extension", () => {
    expect(
      isAllowedImageReference("/api/uploads/object?bucket=farmer-documents&key=2026-07-07/ghana-card.jpg"),
    ).toBe(true);
  });

  it("accepts local uploaded image paths", () => {
    expect(isAllowedImageReference("/uploads/docs/2026-07-07/ghana-card.png")).toBe(true);
  });

  it("accepts local uploaded document paths", () => {
    expect(isAllowedDocumentReference("/uploads/certs/2026-07-07/fairtrade.pdf")).toBe(true);
  });

  it("rejects storage proxy URLs with disallowed extensions", () => {
    expect(
      isAllowedDocumentReference("/api/uploads/object?bucket=farmer-documents&key=2026-07-07/malware.exe"),
    ).toBe(false);
  });
});

describe("local upload path generation", () => {
  it("builds a predictable public upload path", () => {
    expect(
      buildLocalUploadPath({
        kind: "docs",
        datePrefix: "2026-07-07",
        fileName: "abc123",
        extension: "jpg",
      }),
    ).toBe("/uploads/docs/2026-07-07/abc123.jpg");
  });

  it("extracts a friendly file name from a stored upload path", () => {
    expect(getUploadDisplayName("/uploads/certs/2026-07-08/0b5b9b85841b6ff9.jpg")).toBe(
      "0b5b9b85841b6ff9.jpg",
    );
  });
});
