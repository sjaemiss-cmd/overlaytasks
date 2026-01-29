export const signInWithGoogleIdToken = async (input: {
  firebaseWebApiKey: string;
  googleIdToken: string;
}) => {
  const url = new URL("https://identitytoolkit.googleapis.com/v1/accounts:signInWithIdp");
  url.searchParams.set("key", input.firebaseWebApiKey);

  const postBody = new URLSearchParams();
  postBody.set("id_token", input.googleIdToken);
  postBody.set("providerId", "google.com");

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      postBody: postBody.toString(),
      requestUri: "http://localhost",
      returnIdpCredential: true,
      returnSecureToken: true
    })
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`firebase signInWithIdp failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    localId: string;
    idToken: string;
    refreshToken: string;
    expiresIn: string;
    email?: string;
    displayName?: string;
  };

  if (!json.localId || !json.idToken || !json.refreshToken || !json.expiresIn) {
    throw new Error("firebase signInWithIdp missing required fields");
  }

  const expiresAt = new Date(Date.now() + Number(json.expiresIn) * 1000).toISOString();

  return {
    uid: json.localId,
    idToken: json.idToken,
    refreshToken: json.refreshToken,
    expiresAt,
    email: json.email,
    displayName: json.displayName
  };
};

export const refreshFirebaseSession = async (input: {
  firebaseWebApiKey: string;
  refreshToken: string;
}) => {
  const url = new URL("https://securetoken.googleapis.com/v1/token");
  url.searchParams.set("key", input.firebaseWebApiKey);

  const body = new URLSearchParams();
  body.set("grant_type", "refresh_token");
  body.set("refresh_token", input.refreshToken);

  const response = await fetch(url.toString(), {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`firebase refresh failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    user_id: string;
    id_token: string;
    refresh_token: string;
    expires_in: string;
  };

  if (!json.user_id || !json.id_token || !json.refresh_token || !json.expires_in) {
    throw new Error("firebase refresh missing required fields");
  }

  const expiresAt = new Date(Date.now() + Number(json.expires_in) * 1000).toISOString();
  return {
    uid: json.user_id,
    idToken: json.id_token,
    refreshToken: json.refresh_token,
    expiresAt
  };
};
