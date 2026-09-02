import { describe, expect, it } from "vitest";

import { parseOnRampRedirectUrl } from "@/utils/on-ramp";

describe("parseOnRampRedirectUrl", () => {
  it("accepts an https URL and returns it normalized", () => {
    const url = parseOnRampRedirectUrl("https://merchant.example/return?order=1");
    expect(url?.href).toBe("https://merchant.example/return?order=1");
    expect(url?.hostname).toBe("merchant.example");
  });

  it("rejects plain http, including loopback addresses", () => {
    expect(parseOnRampRedirectUrl("http://merchant.example/return")).toBeNull();
    expect(parseOnRampRedirectUrl("http://localhost:3000/return")).toBeNull();
    expect(parseOnRampRedirectUrl("http://127.0.0.1:3000/return")).toBeNull();
  });

  it("rejects missing and non-string values", () => {
    expect(parseOnRampRedirectUrl(undefined)).toBeNull();
    expect(parseOnRampRedirectUrl(null)).toBeNull();
    expect(parseOnRampRedirectUrl("")).toBeNull();
    expect(parseOnRampRedirectUrl("   ")).toBeNull();
    // a repeated ?redirect= query is parsed by vue-router as an array
    expect(parseOnRampRedirectUrl(["https://merchant.example/return", "javascript:alert(1)"])).toBeNull();
  });

  it("rejects executable schemes, including obfuscated ones", () => {
    expect(parseOnRampRedirectUrl("javascript:alert(1)")).toBeNull();
    expect(parseOnRampRedirectUrl("JaVaScRiPt:alert(1)")).toBeNull();
    expect(parseOnRampRedirectUrl("  javascript:alert(1)  ")).toBeNull();
    expect(parseOnRampRedirectUrl("java\nscript:alert(1)")).toBeNull();
    expect(parseOnRampRedirectUrl("java\tscript:alert(1)")).toBeNull();
    expect(parseOnRampRedirectUrl("vbscript:msgbox(1)")).toBeNull();
    expect(parseOnRampRedirectUrl("data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==")).toBeNull();
    expect(parseOnRampRedirectUrl("blob:https://portal.zksync.io/1234")).toBeNull();
    expect(parseOnRampRedirectUrl("file:///etc/passwd")).toBeNull();
  });

  it("rejects relative and protocol-relative URLs", () => {
    expect(parseOnRampRedirectUrl("/on-ramp")).toBeNull();
    expect(parseOnRampRedirectUrl("//merchant.example/return")).toBeNull();
    expect(parseOnRampRedirectUrl("merchant.example/return")).toBeNull();
  });

  it("rejects URLs carrying credentials or no host", () => {
    expect(parseOnRampRedirectUrl("https://user:password@merchant.example/return")).toBeNull();
    expect(parseOnRampRedirectUrl("https://user@merchant.example/return")).toBeNull();
    expect(parseOnRampRedirectUrl("https://")).toBeNull();
  });
});
