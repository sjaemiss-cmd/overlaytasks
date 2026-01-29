import { describe, expect, it } from "vitest";
import { pkceChallengeFromVerifier } from "./pkce";

describe("pkce", () => {
  it("creates the expected base64url-encoded S256 challenge", async () => {
    // RFC 7636 example vector (verifier -> challenge)
    const verifier = "dBjftJeZ4CVP-mB92K27uhbUJU1p1r_wW1gFWFOEjXk";
    const expected = "E9Melhoa2OwvFrEMTJguCHaoeK1t8URWbuGJSstw-cM";
    await expect(pkceChallengeFromVerifier(verifier)).resolves.toBe(expected);
  });
});
