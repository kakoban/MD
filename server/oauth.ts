import crypto from 'node:crypto';
import type { Express, Request, Response } from 'express';
import { storage, type OAuthClientRow } from './storage.ts';

export interface OAuthAuthUser {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

export interface RegisterOAuthDeps {
  getSessionUser: (req: Request) => OAuthAuthUser | null;
  hashSecret: (raw: string) => string;
}

const BUILTIN_PUBLIC_CLIENT_ID = 'markdown-studio-mcp';
const BUILTIN_ALLOWED_HOSTS = new Set([
  'claude.ai',
  'claude.com',
  'chatgpt.com',
  'chat.openai.com',
  'cursor.sh',
  'vscode.dev',
  'localhost',
  '127.0.0.1',
  '[::1]',
]);

const ACCESS_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const REFRESH_TOKEN_TTL_MS = 90 * 24 * 60 * 60 * 1000; // 90 days
const AUTH_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export function getPublicBaseUrl(req: Request): string {
  const forwardedProto = req.headers['x-forwarded-proto'];
  const proto =
    typeof forwardedProto === 'string'
      ? forwardedProto.split(',')[0].trim()
      : req.secure
      ? 'https'
      : 'http';
  const forwardedHost = req.headers['x-forwarded-host'];
  const host =
    (typeof forwardedHost === 'string' ? forwardedHost.split(',')[0].trim() : '') ||
    req.headers.host ||
    'localhost:3000';
  return `${proto}://${host}`;
}

export function buildWwwAuthenticateHeader(req: Request): string {
  const baseUrl = getPublicBaseUrl(req);
  return `Bearer realm="markdown-studio-memory", resource_metadata="${baseUrl}/.well-known/oauth-protected-resource", scope="mcp:tools"`;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname === '[::1]';
}

function isValidRedirectUri(rawUri: string): boolean {
  if (typeof rawUri !== 'string' || rawUri.length > 1000) return false;
  try {
    const parsed = new URL(rawUri);
    if (parsed.hash) return false;
    if (parsed.protocol === 'https:') return true;
    if (parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname)) return true;
    // Allow native desktop custom schemes for MCP clients like cursor:// or vscode:// (never javascript:/data:/file:)
    if (
      /^[a-z][a-z0-9+.-]*:$/.test(parsed.protocol) &&
      !['javascript:', 'data:', 'vbscript:', 'file:', 'blob:', 'http:'].includes(parsed.protocol)
    ) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function isBuiltinRedirectAllowed(rawUri: string): boolean {
  if (!isValidRedirectUri(rawUri)) return false;
  try {
    const parsed = new URL(rawUri);
    if (parsed.protocol === 'https:' && BUILTIN_ALLOWED_HOSTS.has(parsed.hostname.toLowerCase())) {
      return true;
    }
    if (parsed.protocol === 'http:' && isLoopbackHost(parsed.hostname)) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

function timingSafeHexEqual(a: string, b: string): boolean {
  if (!a || !b || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'utf8'), Buffer.from(b, 'utf8'));
  } catch {
    return false;
  }
}

function computeS256Challenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier, 'ascii')
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function resolveRegisteredClient(
  clientId: string,
  redirectUri?: string
): Promise<{ client: OAuthClientRow; isBuiltin: boolean } | null> {
  const cleanId = clientId.trim();
  if (!cleanId) return null;

  if (cleanId === BUILTIN_PUBLIC_CLIENT_ID) {
    if (redirectUri && !isBuiltinRedirectAllowed(redirectUri)) {
      return null;
    }
    return {
      isBuiltin: true,
      client: {
        client_id: BUILTIN_PUBLIC_CLIENT_ID,
        client_secret_hash: null,
        client_name: 'اتصال مستقیم MCP (Markdown Studio)',
        redirect_uris: redirectUri ? [redirectUri] : [],
        token_endpoint_auth_method: 'none',
        created_at: new Date(0).toISOString(),
      },
    };
  }

  const stored = await storage.getOAuthClient(cleanId);
  if (!stored) return null;
  if (redirectUri && !stored.redirect_uris.includes(redirectUri)) {
    return null;
  }
  return { client: stored, isBuiltin: false };
}

function extractClientCredentials(req: Request): { clientId: string; clientSecret: string | null } {
  let clientId = typeof req.body?.client_id === 'string' ? req.body.client_id.trim() : '';
  let clientSecret =
    typeof req.body?.client_secret === 'string' && req.body.client_secret.trim()
      ? req.body.client_secret.trim()
      : null;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Basic ')) {
    try {
      const decoded = Buffer.from(authHeader.slice(6).trim(), 'base64').toString('utf8');
      const colonIdx = decoded.indexOf(':');
      if (colonIdx !== -1) {
        const basicId = decodeURIComponent(decoded.slice(0, colonIdx));
        const basicSecret = decodeURIComponent(decoded.slice(colonIdx + 1));
        if (!clientId && basicId) clientId = basicId;
        if (!clientSecret && basicSecret) clientSecret = basicSecret;
      }
    } catch {
      // Ignore malformed Basic header; handled during validation
    }
  }

  return { clientId, clientSecret };
}

function setPublicOAuthCors(res: Response, methods = 'GET, POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, MCP-Protocol-Version');
  res.setHeader('Cache-Control', 'no-store');
}

export function registerOAuthRoutes(app: Express, deps: RegisterOAuthDeps): void {
  // -------------------------------------------------------------
  // 1. RFC 9728: OAuth 2.0 Protected Resource Metadata
  // -------------------------------------------------------------
  const handleProtectedResourceMetadata = (req: Request, res: Response) => {
    setPublicOAuthCors(res, 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();

    const baseUrl = getPublicBaseUrl(req);
    res.json({
      resource: `${baseUrl}/api/mcp`,
      authorization_servers: [baseUrl],
      bearer_methods_supported: ['header'],
      scopes_supported: ['mcp:tools'],
      resource_name: 'Markdown Studio AI Memory',
      resource_documentation: baseUrl,
    });
  };

  app.options('/.well-known/oauth-protected-resource', handleProtectedResourceMetadata);
  app.get('/.well-known/oauth-protected-resource', handleProtectedResourceMetadata);
  app.options('/.well-known/oauth-protected-resource/*', handleProtectedResourceMetadata);
  app.get('/.well-known/oauth-protected-resource/*', handleProtectedResourceMetadata);

  // -------------------------------------------------------------
  // 2. RFC 8414: OAuth 2.0 Authorization Server Metadata (+ OIDC fallback)
  // -------------------------------------------------------------
  const handleAuthServerMetadata = (req: Request, res: Response) => {
    setPublicOAuthCors(res, 'GET, OPTIONS');
    if (req.method === 'OPTIONS') return res.status(204).end();

    const baseUrl = getPublicBaseUrl(req);
    res.json({
      issuer: baseUrl,
      authorization_endpoint: `${baseUrl}/oauth/authorize`,
      token_endpoint: `${baseUrl}/api/oauth/token`,
      registration_endpoint: `${baseUrl}/api/oauth/register`,
      scopes_supported: ['mcp:tools'],
      response_types_supported: ['code'],
      response_modes_supported: ['query'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_post', 'client_secret_basic'],
      code_challenge_methods_supported: ['S256'],
      service_documentation: baseUrl,
    });
  };

  app.options('/.well-known/oauth-authorization-server', handleAuthServerMetadata);
  app.get('/.well-known/oauth-authorization-server', handleAuthServerMetadata);
  app.options('/.well-known/oauth-authorization-server/*', handleAuthServerMetadata);
  app.get('/.well-known/oauth-authorization-server/*', handleAuthServerMetadata);
  app.options('/.well-known/openid-configuration', handleAuthServerMetadata);
  app.get('/.well-known/openid-configuration', handleAuthServerMetadata);

  // -------------------------------------------------------------
  // 3. RFC 7591: Dynamic Client Registration (DCR)
  // -------------------------------------------------------------
  app.options('/api/oauth/register', (_req: Request, res: Response) => {
    setPublicOAuthCors(res, 'POST, OPTIONS');
    res.status(204).end();
  });

  app.post('/api/oauth/register', async (req: Request, res: Response) => {
    setPublicOAuthCors(res, 'POST, OPTIONS');
    try {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const rawRedirectUris = Array.isArray(body.redirect_uris) ? body.redirect_uris : [];
      if (rawRedirectUris.length === 0 || rawRedirectUris.length > 10) {
        return res.status(400).json({
          error: 'invalid_client_metadata',
          error_description: 'redirect_uris must be a non-empty array (max 10 URIs).',
        });
      }

      const validatedUris: string[] = [];
      for (const uri of rawRedirectUris) {
        if (typeof uri !== 'string' || !isValidRedirectUri(uri.trim())) {
          return res.status(400).json({
            error: 'invalid_redirect_uri',
            error_description: `Invalid or insecure redirect_uri: ${String(uri)}`,
          });
        }
        validatedUris.push(uri.trim());
      }

      const clientName =
        typeof body.client_name === 'string' && body.client_name.trim()
          ? body.client_name.trim().slice(0, 150)
          : 'MCP AI Client';

      const requestedAuthMethod =
        typeof body.token_endpoint_auth_method === 'string'
          ? body.token_endpoint_auth_method.trim()
          : 'none';
      const authMethod = ['none', 'client_secret_post', 'client_secret_basic'].includes(requestedAuthMethod)
        ? requestedAuthMethod
        : 'none';

      const clientId = `mcpc_${crypto.randomBytes(16).toString('hex')}`;
      let rawClientSecret: string | undefined;
      let clientSecretHash: string | null = null;
      if (authMethod !== 'none') {
        rawClientSecret = `mcps_${crypto.randomBytes(24).toString('hex')}`;
        clientSecretHash = deps.hashSecret(rawClientSecret);
      }

      const created = await storage.createOAuthClient({
        clientId,
        clientSecretHash,
        clientName,
        redirectUris: validatedUris,
        tokenEndpointAuthMethod: authMethod,
      });

      const issuedAt = Math.floor(Date.now() / 1000);
      res.status(201).json({
        client_id: created.client_id,
        ...(rawClientSecret ? { client_secret: rawClientSecret, client_secret_expires_at: 0 } : {}),
        client_id_issued_at: issuedAt,
        client_name: created.client_name,
        redirect_uris: created.redirect_uris,
        grant_types: ['authorization_code', 'refresh_token'],
        response_types: ['code'],
        token_endpoint_auth_method: created.token_endpoint_auth_method,
      });
    } catch (error: any) {
      console.error('OAuth DCR error:', error);
      res.status(500).json({
        error: 'server_error',
        error_description: 'Failed to register OAuth client.',
      });
    }
  });

  // -------------------------------------------------------------
  // 4. OAuth Authorize Alias (/api/oauth/authorize -> /oauth/authorize SPA)
  // -------------------------------------------------------------
  app.get('/api/oauth/authorize', (req: Request, res: Response) => {
    const queryIndex = req.originalUrl.indexOf('?');
    const qs = queryIndex !== -1 ? req.originalUrl.slice(queryIndex) : '';
    res.redirect(302, `/oauth/authorize${qs}`);
  });

  // -------------------------------------------------------------
  // 5. Client Info lookup for the React OAuth Consent UI
  // -------------------------------------------------------------
  app.get('/api/oauth/client-info', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const clientId = typeof req.query.client_id === 'string' ? req.query.client_id.trim() : '';
      const redirectUri = typeof req.query.redirect_uri === 'string' ? req.query.redirect_uri.trim() : '';
      const responseType = typeof req.query.response_type === 'string' ? req.query.response_type.trim() : 'code';
      const codeChallenge = typeof req.query.code_challenge === 'string' ? req.query.code_challenge.trim() : '';
      const codeChallengeMethod =
        typeof req.query.code_challenge_method === 'string' ? req.query.code_challenge_method.trim() : 'S256';
      const scope = typeof req.query.scope === 'string' && req.query.scope.trim() ? req.query.scope.trim() : 'mcp:tools';

      if (responseType !== 'code') {
        return res.status(400).json({ error: 'فقط حالت response_type=code پشتیبانی می‌شود.' });
      }
      if (!clientId || !redirectUri) {
        return res.status(400).json({ error: 'پارامترهای client_id و redirect_uri الزامی هستند.' });
      }
      if (codeChallenge && codeChallengeMethod !== 'S256') {
        return res.status(400).json({ error: 'روش PKCE باید S256 باشد.' });
      }

      const resolved = await resolveRegisteredClient(clientId, redirectUri);
      if (!resolved) {
        return res.status(400).json({
          error: 'کلاینت OAuth یا آدرس بازگشت (redirect_uri) معتبر و ثبت‌شده نیست.',
        });
      }

      let redirectHost = redirectUri;
      try {
        redirectHost = new URL(redirectUri).host;
      } catch {}

      res.json({
        success: true,
        clientId: resolved.client.client_id,
        clientName: resolved.client.client_name,
        redirectUri,
        redirectHost,
        scope,
        pkceProtected: Boolean(codeChallenge),
      });
    } catch (error: any) {
      res.status(500).json({ error: error?.message || 'خطا در بررسی اطلاعات کلاینت OAuth' });
    }
  });

  // -------------------------------------------------------------
  // 6. Approve OAuth Authorization (Session-Authenticated)
  // -------------------------------------------------------------
  app.post('/api/oauth/approve', async (req: Request, res: Response) => {
    res.setHeader('Cache-Control', 'no-store');
    try {
      const authUser = deps.getSessionUser(req);
      if (!authUser) {
        return res.status(401).json({ error: 'لطفاً ابتدا وارد حساب کاربری خود شوید.' });
      }

      const {
        client_id,
        redirect_uri,
        state = '',
        code_challenge = '',
        code_challenge_method = 'S256',
        scope = 'mcp:tools',
        decision = 'approve',
      } = req.body as Record<string, unknown>;

      const clientId = typeof client_id === 'string' ? client_id.trim() : '';
      const redirectUri = typeof redirect_uri === 'string' ? redirect_uri.trim() : '';
      const stateStr = typeof state === 'string' ? state : '';
      const challengeStr = typeof code_challenge === 'string' ? code_challenge.trim() : '';
      const challengeMethodStr =
        typeof code_challenge_method === 'string' && code_challenge_method.trim()
          ? code_challenge_method.trim()
          : 'S256';
      const scopeStr = typeof scope === 'string' && scope.trim() ? scope.trim().slice(0, 200) : 'mcp:tools';

      const resolved = await resolveRegisteredClient(clientId, redirectUri);
      if (!resolved) {
        return res.status(400).json({ error: 'کلاینت OAuth یا آدرس بازگشت معتبر نیست.' });
      }
      if (challengeStr && challengeMethodStr !== 'S256') {
        return res.status(400).json({ error: 'فقط روش PKCE S256 پشتیبانی می‌شود.' });
      }

      const callbackUrl = new URL(redirectUri);

      if (decision !== 'approve') {
        callbackUrl.searchParams.set('error', 'access_denied');
        callbackUrl.searchParams.set('error_description', 'User denied access.');
        if (stateStr) callbackUrl.searchParams.set('state', stateStr);
        return res.json({ success: true, redirectUrl: callbackUrl.toString() });
      }

      const rawCode = `msc_${crypto.randomBytes(32).toString('hex')}`;
      const codeHash = deps.hashSecret(rawCode);
      const expiresAt = new Date(Date.now() + AUTH_CODE_TTL_MS).toISOString();

      await storage.createOAuthCode({
        codeHash,
        clientId: resolved.client.client_id,
        userId: authUser.id,
        redirectUri,
        codeChallenge: challengeStr,
        codeChallengeMethod: challengeMethodStr,
        scope: scopeStr,
        expiresAt,
      });

      callbackUrl.searchParams.set('code', rawCode);
      if (stateStr) callbackUrl.searchParams.set('state', stateStr);

      res.json({ success: true, redirectUrl: callbackUrl.toString() });
    } catch (error: any) {
      console.error('OAuth approve error:', error);
      res.status(500).json({ error: 'خطا در صدور مجوز اتصال' });
    }
  });

  // -------------------------------------------------------------
  // 7. OAuth 2.1 Token Endpoint (authorization_code + refresh_token)
  // -------------------------------------------------------------
  app.options('/api/oauth/token', (_req: Request, res: Response) => {
    setPublicOAuthCors(res, 'POST, OPTIONS');
    res.status(204).end();
  });

  app.post('/api/oauth/token', async (req: Request, res: Response) => {
    setPublicOAuthCors(res, 'POST, OPTIONS');
    res.setHeader('Pragma', 'no-cache');

    try {
      const grantType = typeof req.body?.grant_type === 'string' ? req.body.grant_type.trim() : '';
      const { clientId, clientSecret } = extractClientCredentials(req);

      if (grantType === 'authorization_code') {
        const rawCode = typeof req.body?.code === 'string' ? req.body.code.trim() : '';
        const redirectUri = typeof req.body?.redirect_uri === 'string' ? req.body.redirect_uri.trim() : '';
        const codeVerifier = typeof req.body?.code_verifier === 'string' ? req.body.code_verifier.trim() : '';

        if (!rawCode) {
          return res.status(400).json({ error: 'invalid_request', error_description: 'Missing authorization code.' });
        }

        const codeHash = deps.hashSecret(rawCode);
        const codeRow = await storage.getOAuthCode(codeHash);
        if (!codeRow) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid authorization code.' });
        }
        if (codeRow.used_at) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code already used.' });
        }
        if (new Date(codeRow.expires_at).getTime() <= Date.now()) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code expired.' });
        }

        const effectiveClientId = clientId || codeRow.client_id;
        if (effectiveClientId !== codeRow.client_id) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'client_id mismatch.' });
        }
        if (redirectUri && redirectUri !== codeRow.redirect_uri) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'redirect_uri mismatch.' });
        }

        const resolvedClient = await resolveRegisteredClient(effectiveClientId);
        if (!resolvedClient) {
          return res.status(401).json({ error: 'invalid_client', error_description: 'Unknown OAuth client.' });
        }

        // Verify confidential client secret if one was issued during DCR
        if (resolvedClient.client.client_secret_hash) {
          if (!clientSecret || !timingSafeHexEqual(deps.hashSecret(clientSecret), resolvedClient.client.client_secret_hash)) {
            return res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials.' });
          }
        }

        // Verify PKCE S256
        if (codeRow.code_challenge) {
          if (!codeVerifier) {
            return res.status(400).json({ error: 'invalid_grant', error_description: 'Missing PKCE code_verifier.' });
          }
          const computed = computeS256Challenge(codeVerifier);
          if (!timingSafeHexEqual(computed, codeRow.code_challenge)) {
            return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed.' });
          }
        }

        // Atomically consume the authorization code
        const marked = await storage.markOAuthCodeUsed(codeHash);
        if (!marked) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'Authorization code already consumed.' });
        }

        // Mint a real msp_... MCP access token stored in mcp_tokens (visible & revocable by user!)
        const rawAccessToken = `msp_${crypto.randomBytes(24).toString('hex')}`;
        const tokenPrefix = `${rawAccessToken.slice(0, 12)}...${rawAccessToken.slice(-4)}`;
        const tokenId = `tok-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
        const tokenName = `${resolvedClient.client.client_name} (OAuth)`.slice(0, 120);

        await storage.createMcpToken({
          id: tokenId,
          userId: codeRow.user_id,
          name: tokenName,
          tokenPrefix,
          tokenHash: deps.hashSecret(rawAccessToken),
        });

        // Mint refresh token
        const rawRefreshToken = `msr_${crypto.randomBytes(32).toString('hex')}`;
        await storage.createOAuthRefreshToken({
          tokenHash: deps.hashSecret(rawRefreshToken),
          clientId: codeRow.client_id,
          userId: codeRow.user_id,
          scope: codeRow.scope || 'mcp:tools',
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
        });

        return res.json({
          access_token: rawAccessToken,
          token_type: 'Bearer',
          expires_in: ACCESS_TOKEN_TTL_SECONDS,
          refresh_token: rawRefreshToken,
          scope: codeRow.scope || 'mcp:tools',
        });
      }

      if (grantType === 'refresh_token') {
        const rawRefresh = typeof req.body?.refresh_token === 'string' ? req.body.refresh_token.trim() : '';
        if (!rawRefresh) {
          return res.status(400).json({ error: 'invalid_request', error_description: 'Missing refresh_token.' });
        }

        const refreshHash = deps.hashSecret(rawRefresh);
        const refreshRow = await storage.getOAuthRefreshToken(refreshHash);
        if (!refreshRow || refreshRow.revoked_at || new Date(refreshRow.expires_at).getTime() <= Date.now()) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid or expired refresh_token.' });
        }

        const effectiveClientId = clientId || refreshRow.client_id;
        if (effectiveClientId !== refreshRow.client_id) {
          return res.status(400).json({ error: 'invalid_grant', error_description: 'client_id mismatch.' });
        }

        const resolvedClient = await resolveRegisteredClient(effectiveClientId);
        if (!resolvedClient) {
          return res.status(401).json({ error: 'invalid_client', error_description: 'Unknown OAuth client.' });
        }
        if (resolvedClient.client.client_secret_hash) {
          if (!clientSecret || !timingSafeHexEqual(deps.hashSecret(clientSecret), resolvedClient.client.client_secret_hash)) {
            return res.status(401).json({ error: 'invalid_client', error_description: 'Invalid client credentials.' });
          }
        }

        // Rotate refresh token
        await storage.revokeOAuthRefreshToken(refreshHash);
        const nextRefreshToken = `msr_${crypto.randomBytes(32).toString('hex')}`;
        await storage.createOAuthRefreshToken({
          tokenHash: deps.hashSecret(nextRefreshToken),
          clientId: refreshRow.client_id,
          userId: refreshRow.user_id,
          scope: refreshRow.scope || 'mcp:tools',
          expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
        });

        const rawAccessToken = `msp_${crypto.randomBytes(24).toString('hex')}`;
        const tokenPrefix = `${rawAccessToken.slice(0, 12)}...${rawAccessToken.slice(-4)}`;
        const tokenId = `tok-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

        await storage.createMcpToken({
          id: tokenId,
          userId: refreshRow.user_id,
          name: `${resolvedClient.client.client_name} (OAuth)`.slice(0, 120),
          tokenPrefix,
          tokenHash: deps.hashSecret(rawAccessToken),
        });

        return res.json({
          access_token: rawAccessToken,
          token_type: 'Bearer',
          expires_in: ACCESS_TOKEN_TTL_SECONDS,
          refresh_token: nextRefreshToken,
          scope: refreshRow.scope || 'mcp:tools',
        });
      }

      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: 'Supported grant types: authorization_code, refresh_token.',
      });
    } catch (error: any) {
      console.error('OAuth token error:', error);
      res.status(500).json({ error: 'server_error', error_description: 'Token exchange failed.' });
    }
  });
}
