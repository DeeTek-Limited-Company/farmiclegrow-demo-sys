import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("app logo branding", () => {
  it("uses the original public logo asset in metadata and leaves login branding unaltered", () => {
    const layout = readFileSync(resolve(process.cwd(), "src/app/layout.tsx"), "utf8");
    const login = readFileSync(resolve(process.cwd(), "src/components/ui/login-1.tsx"), "utf8");

    expect(layout).toContain("icons");
    expect(layout).toContain('icon: "/logo.png"');
    expect(layout).toContain('shortcut: "/logo.png"');
    expect(layout).toContain('apple: "/logo.png"');
    expect(login).toContain('src="/logo.png"');
    expect(login).not.toContain("brightness-0 invert");
  });
});
