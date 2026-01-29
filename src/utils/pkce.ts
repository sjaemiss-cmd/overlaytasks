export const base64UrlEncode = (input: Uint8Array) => {
  const base64 = Buffer.from(input).toString("base64");
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
};

export const sha256 = async (input: string) => {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
};

export const pkceChallengeFromVerifier = async (verifier: string) => {
  const digest = await sha256(verifier);
  return base64UrlEncode(digest);
};
