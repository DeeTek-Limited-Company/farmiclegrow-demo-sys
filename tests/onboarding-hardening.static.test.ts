import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function read(relativePath: string) {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}

describe("credential hardening", () => {
  it("removes temporaryPassword from the Prisma schema", () => {
    const schema = read("prisma/schema.prisma");

    expect(schema).not.toContain("temporaryPassword");
  });

  it("removes readable temporary-password language from admin and super-admin provisioning UI", () => {
    const adminModal = read("src/components/admin/add-user-modal.tsx");
    const orgManager = read("src/components/super-admin/organization-manager.tsx");

    expect(adminModal).not.toContain("Temporary Password");
    expect(adminModal).not.toContain("temporary password");
    expect(adminModal).not.toContain('type="text" // using text so admin can easily read what they typed to copy it');
    expect(orgManager).not.toContain("Temporary Password");
  });

  it("removes temporary-password storage and wording from the password reset flow", () => {
    const resetRoute = read("src/app/api/auth/reset-password/route.ts");
    const forcePasswordChange = read("src/components/auth/force-password-change.tsx");

    expect(resetRoute).not.toContain("temporaryPassword");
    expect(forcePasswordChange).not.toContain("temporary password");
  });
});

describe("seed and CI hardening", () => {
  it("does not ship predictable seeded passwords in seed.ts", () => {
    const seedFile = read("prisma/seed.ts");

    expect(seedFile).not.toContain("superpassword123");
    expect(seedFile).not.toContain('?? "password123"');
    expect(seedFile).not.toContain('?? "admin@example.com"');
    expect(seedFile).not.toContain('hashPassword("password123")');
  });

  it("does not document predictable seed passwords in .env.example", () => {
    const envExample = read(".env.example");

    expect(envExample).not.toContain("ChangeMe123!");
    expect(envExample).not.toContain("superpassword123");
  });

  it("runs tests in CI", () => {
    const ci = read(".github/workflows/ci.yml");

    expect(ci).toContain("npm test");
  });
});
