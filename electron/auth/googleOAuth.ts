import crypto from "node:crypto";
import http from "node:http";
import type { AddressInfo } from "node:net";

export interface PkcePair {
  verifier: string;
  challenge: string;
}

export interface PendingOAuthRequest {
  createdAt: string;
  state: string;
  nonce: string;
  verifier: string;
  redirectUri: string;
}

const base64Url = (input: Buffer) =>
  input.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");

export const generatePkcePair = (): PkcePair => {
  const verifier = base64Url(crypto.randomBytes(32));
  const challenge = base64Url(crypto.createHash("sha256").update(verifier).digest());
  return { verifier, challenge };
};

export const generateState = () => base64Url(crypto.randomBytes(16));

export const generateNonce = () => base64Url(crypto.randomBytes(16));

export const buildGoogleAuthorizeUrl = (input: {
  clientId: string;
  redirectUri: string;
  state: string;
  nonce: string;
  codeChallenge: string;
}) => {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", input.clientId);
  url.searchParams.set("redirect_uri", input.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("code_challenge", input.codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  url.searchParams.set("state", input.state);
  url.searchParams.set("nonce", input.nonce);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  return url.toString();
};

export const parseOAuthCallbackUrl = (urlString: string) => {
  const url = new URL(urlString);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  return { code, state, error };
};

export const exchangeCodeForGoogleTokens = async (input: {
  code: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  codeVerifier: string;
}) => {
  const body = new URLSearchParams();
  body.set("code", input.code);
  body.set("client_id", input.clientId);
  if (input.clientSecret) {
    body.set("client_secret", input.clientSecret);
  }
  body.set("redirect_uri", input.redirectUri);
  body.set("grant_type", "authorization_code");
  body.set("code_verifier", input.codeVerifier);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`google token exchange failed: ${response.status} ${text}`);
  }

  const json = (await response.json()) as {
    id_token?: string;
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    token_type?: string;
    scope?: string;
  };

  if (!json.id_token) {
    throw new Error("google token exchange missing id_token");
  }

  return {
    idToken: json.id_token,
    accessToken: json.access_token,
    refreshToken: json.refresh_token,
    expiresIn: json.expires_in
  };
};

export const startLoopbackServer = (
  onCodeReceived: (url: string) => void
): Promise<{ port: number; close: () => void }> => {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        if (!req.url) return;
        const url = `http://127.0.0.1:${(server.address() as AddressInfo).port}${req.url}`;
        const { code, error } = parseOAuthCallbackUrl(url);

        if (code || error) {
          onCodeReceived(url);
          res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
          res.end(`
            <html>
              <body style="font-family: sans-serif; text-align: center; padding-top: 50px; background: #1e293b; color: #e2e8f0;">
                <h2>Todos Overlay</h2>
                <p>Login successful! You can close this window now.</p>
                <script>window.close();</script>
              </body>
            </html>
          `);
          server.close();
        } else {
          res.writeHead(404);
          res.end();
        }
      } catch {
        res.writeHead(500);
        res.end();
      }
    });

    server.listen(0, "127.0.0.1", () => {
      const address = server.address() as AddressInfo;
      resolve({
        port: address.port,
        close: () => server.close()
      });
    });

    server.on("error", (err) => reject(err));
  });
};
