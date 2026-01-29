import { describe, expect, it } from "vitest";
import type { CloudConfig } from "../../shared/types";
import { clampCloudConfig, getCloudConfigStatus } from "../../shared/cloudConfig";

describe("cloudConfig", () => {
  it("clamps strings and applies default scheme", () => {
    const input: CloudConfig = {
      firebaseWebApiKey: "  key  ",
      firebaseProjectId: "  proj  ",
      googleOAuthClientId: "  client  ",
      oauthRedirectScheme: ""
    };

    const out = clampCloudConfig(input);
    expect(out.firebaseWebApiKey).toBe("key");
    expect(out.firebaseProjectId).toBe("proj");
    expect(out.googleOAuthClientId).toBe("client");
    expect(out.oauthRedirectScheme.length).toBeGreaterThan(0);
  });

  it("computes readiness correctly", () => {
    const base: CloudConfig = {
      firebaseWebApiKey: "",
      firebaseProjectId: "",
      googleOAuthClientId: "",
      oauthRedirectScheme: "todosoverlay"
    };
    expect(getCloudConfigStatus(base).isReady).toBe(false);

    const ready: CloudConfig = {
      firebaseWebApiKey: "k",
      firebaseProjectId: "p",
      googleOAuthClientId: "c",
      oauthRedirectScheme: "todosoverlay"
    };
    expect(getCloudConfigStatus(ready).isReady).toBe(true);
  });
});
