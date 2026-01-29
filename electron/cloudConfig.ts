import type { CloudConfig, CloudConfigStatus } from "./types.js";

export const DEFAULT_OAUTH_REDIRECT_SCHEME = "todosoverlay";

export const clampCloudConfig = (input: CloudConfig): CloudConfig => {
  const safeString = (value: unknown) => (typeof value === "string" ? value.trim() : "");
  const oauthRedirectScheme = safeString(input.oauthRedirectScheme) || DEFAULT_OAUTH_REDIRECT_SCHEME;
  return {
    firebaseWebApiKey: safeString(input.firebaseWebApiKey),
    firebaseProjectId: safeString(input.firebaseProjectId),
    googleOAuthClientId: safeString(input.googleOAuthClientId),
    googleOAuthClientSecret: safeString(input.googleOAuthClientSecret),
    oauthRedirectScheme
  };
};

export const getCloudConfigStatus = (config: CloudConfig): CloudConfigStatus => {
  const hasFirebaseWebApiKey = config.firebaseWebApiKey.length > 0;
  const hasFirebaseProjectId = config.firebaseProjectId.length > 0;
  const hasGoogleOAuthClientId = config.googleOAuthClientId.length > 0;
  const hasOauthRedirectScheme = config.oauthRedirectScheme.length > 0;
  return {
    hasFirebaseWebApiKey,
    hasFirebaseProjectId,
    hasGoogleOAuthClientId,
    hasOauthRedirectScheme,
    isReady: hasFirebaseWebApiKey && hasFirebaseProjectId && hasGoogleOAuthClientId && hasOauthRedirectScheme
  };
};
