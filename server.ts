import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { initStorage, storage, type DocVisibility } from './server/storage.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function resolvePort(): number {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--port' && args[i + 1]) {
      const parsed = Number(args[i + 1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    } else if (args[i].startsWith('--port=')) {
      const parsed = Number(args[i].split('=')[1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  if (process.env.NODE_ENV === 'production') {
    return Number(process.env.PORT) || 3000;
  }
  const envPort = Number(process.env.PORT);
  if (Number.isFinite(envPort) && envPort > 0 && envPort !== 8080) {
    return envPort;
  }
  return 3000;
}

function resolveHost(): string {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--host' && args[i + 1]) {
      return args[i + 1];
    } else if (args[i].startsWith('--host=')) {
      return args[i].split('=')[1];
    }
  }
  return '0.0.0.0';
}

const app = express();
app.set('trust proxy', 1);

const PORT = resolvePort();
const HOST = resolveHost();
const JWT_SECRET = process.env.JWT_SECRET?.trim() || crypto.randomBytes(32).toString('hex');
const SESSION_COOKIE_NAME = 'ms_session';
const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

interface JwtPayload {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

function getConfiguredGoogleClientId(): string {
  return (process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '').trim();
}

function parseCookie(req: Request, name: string): string | null {
  const header = req.headers.cookie;
  if (!header) return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

function isSecureRequest(req: Request): boolean {
  const forwardedProto = req.headers['x-forwarded-proto'];
  if (typeof forwardedProto === 'string') {
    return forwardedProto.split(',')[0].trim() === 'https';
  }
  return req.secure;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${SESSION_MAX_AGE_SECONDS}`,
  ];
  if (isSecureRequest(req)) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function clearSessionCookie(req: Request, res: Response): void {
  const parts = [`${SESSION_COOKIE_NAME}=`, 'Path=/', 'HttpOnly', 'Max-Age=0'];
  if (isSecureRequest(req)) {
    parts.push('Secure', 'SameSite=None', 'Partitioned');
  } else {
    parts.push('SameSite=Lax');
  }
  res.setHeader('Set-Cookie', parts.join('; '));
}

function isSameOriginOrCustomHeader(req: Request): boolean {
  if (req.headers['x-requested-with'] === 'XMLHttpRequest') return true;
  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] as string | undefined) || req.headers.host;
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host.split(',')[0].trim();
  } catch {
    return false;
  }
}

function getAuthUser(req: Request): JwtPayload | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
      return null;
    }
  }

  const cookieToken = parseCookie(req, SESSION_COOKIE_NAME);
  if (!cookieToken) return null;

  const isMutation = !['GET', 'HEAD', 'OPTIONS'].includes(req.method.toUpperCase());
  if (isMutation && !isSameOriginOrCustomHeader(req)) {
    return null;
  }

  try {
    return jwt.verify(cookieToken, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

function generateFileId(title: string): string {
  const cleanTitle = title
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0600-\u06FF\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30);
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return cleanTitle ? `${cleanTitle}-${randomSuffix}` : `doc-${randomSuffix}`;
}

function signUserToken(user: {
  id: string;
  email: string;
  username: string;
  display_name: string;
}): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      displayName: user.display_name,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

function formatUserResponse(user: {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string;
  bio?: string;
  created_at?: string;
}) {
  return {
    id: user.id,
    email: user.email,
    username: user.username,
    displayName: user.display_name,
    avatarUrl: user.avatar_url || '',
    bio: user.bio || '',
    createdAt: user.created_at,
  };
}

// -------------------------------------------------------------
// REST API ROUTES (/api/*)
// -------------------------------------------------------------

// 1. Health check & Public Explore statistics
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const stats = await storage.getHealthStats();
    res.json({
      status: 'healthy',
      database: storage.getBackendType() === 'postgres' ? 'PostgreSQL' : 'SQLite',
      stats,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// =============================================================
// AUTHENTICATION & USER ACCOUNTS (/api/auth/*)
// =============================================================

// 1. Public Auth Configuration (returns non-secret Google OAuth Client ID for GIS)
app.get('/api/auth/config', (_req: Request, res: Response) => {
  res.json({
    googleClientId: getConfiguredGoogleClientId(),
  });
});

// 2. Google Identity Services (GIS) Sign-In (Server-verified via Google API)
app.post('/api/auth/google', async (req: Request, res: Response) => {
  try {
    const { accessToken, credential } = req.body as {
      accessToken?: unknown;
      credential?: unknown;
    };

    const expectedClientId = getConfiguredGoogleClientId();
    if (!expectedClientId) {
      return res.status(503).json({
        error: 'شناسه گوگل (VITE_GOOGLE_CLIENT_ID) روی سرور پیکربندی نشده است.',
      });
    }

    let googleId = '';
    let email = '';
    let displayName = '';
    let avatarUrl = '';

    if (typeof accessToken === 'string' && accessToken.trim()) {
      const cleanToken = accessToken.trim();

      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(cleanToken)}`
      );
      if (!tokenInfoRes.ok) {
        return res.status(401).json({ error: 'توکن گوگل نامعتبر یا منقضی شده است.' });
      }
      const tokenInfo = (await tokenInfoRes.json()) as { aud?: string; azp?: string };
      const tokenAudience = tokenInfo.aud || tokenInfo.azp || '';
      if (!tokenAudience || tokenAudience !== expectedClientId) {
        return res.status(401).json({ error: 'شناسه کلاینت گوگل مطابقت ندارد.' });
      }

      const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${cleanToken}` },
      });
      if (!userinfoRes.ok) {
        return res.status(401).json({ error: 'تأیید حساب گوگل ناموفق بود. لطفاً مجدداً تلاش کنید.' });
      }
      const profile = (await userinfoRes.json()) as {
        sub?: string;
        email?: string;
        email_verified?: boolean;
        name?: string;
        given_name?: string;
        picture?: string;
      };

      if (!profile.email || profile.email_verified === false) {
        return res.status(401).json({ error: 'ایمیل تأییدشده‌ای از حساب گوگل دریافت نشد.' });
      }

      googleId = String(profile.sub || '');
      email = profile.email.trim().toLowerCase();
      displayName = (profile.name || profile.given_name || email.split('@')[0]).trim();
      avatarUrl =
        typeof profile.picture === 'string' && profile.picture.startsWith('https://')
          ? profile.picture
          : '';
    } else if (typeof credential === 'string' && credential.trim()) {
      const tokenInfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(credential.trim())}`
      );
      if (!tokenInfoRes.ok) {
        return res.status(401).json({ error: 'اعتبارنامه گوگل نامعتبر است.' });
      }
      const payload = (await tokenInfoRes.json()) as {
        aud?: string;
        sub?: string;
        email?: string;
        email_verified?: string | boolean;
        name?: string;
        given_name?: string;
        picture?: string;
      };

      if (expectedClientId && payload.aud !== expectedClientId) {
        return res.status(401).json({ error: 'شناسه کلاینت گوگل مطابقت ندارد.' });
      }
      if (!payload.email || payload.email_verified === false || payload.email_verified === 'false') {
        return res.status(401).json({ error: 'ایمیل حساب گوگل تأیید نشده است.' });
      }

      googleId = String(payload.sub || '');
      email = payload.email.trim().toLowerCase();
      displayName = (payload.name || payload.given_name || email.split('@')[0]).trim();
      avatarUrl =
        typeof payload.picture === 'string' && payload.picture.startsWith('https://')
          ? payload.picture
          : '';
    } else {
      return res.status(400).json({ error: 'توکن احراز هویت گوگل ارسال نشده است.' });
    }

    let cleanUsername = email.split('@')[0].replace(/[^\w-]/g, '').toLowerCase().slice(0, 20) || 'user';
    if (cleanUsername.length < 3) {
      cleanUsername = `${cleanUsername}usr`;
    }
    const existingByEmail = await storage.findUserByEmail(email);
    if (!existingByEmail && (await storage.isUsernameTaken(cleanUsername))) {
      cleanUsername = `${cleanUsername}${Math.floor(10 + Math.random() * 89)}`;
    }

    const userId = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;
    const randomPasswordHash = await bcrypt.hash(crypto.randomBytes(24).toString('hex'), 10);

    const user = await storage.upsertGoogleUser({
      id: userId,
      googleId,
      email,
      username: cleanUsername,
      displayName,
      avatarUrl,
      passwordHash: randomPasswordHash,
    });

    const token = signUserToken(user);
    setSessionCookie(req, res, token);

    res.json({
      success: true,
      token,
      user: formatUserResponse(user),
      message: `ورود موفق با حساب گوگل (${email})`,
    });
  } catch (error: any) {
    console.error('Google auth error:', error);
    res.status(500).json({ error: 'خطا در ورود با حساب گوگل' });
  }
});

// Logout endpoint (clears HttpOnly session cookie)
app.post('/api/auth/logout', (req: Request, res: Response) => {
  if (!isSameOriginOrCustomHeader(req)) {
    return res.status(403).json({ error: 'درخواست نامعتبر است.' });
  }
  clearSessionCookie(req, res);
  res.json({ success: true });
});

// Register new user account
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const { email, username, password, displayName } = req.body;
    if (!username || username.trim().length < 3) {
      return res.status(400).json({ error: 'نام کاربری باید حداقل ۳ کاراکتر انگلیسی باشد.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
    }

    const cleanUsername = username.trim().toLowerCase().replace(/[^\w-]/g, '');
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: 'نام کاربری باید شامل حروف یا اعداد انگلیسی باشد.' });
    }
    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : `${cleanUsername}@local.user`;
    const name = displayName?.trim() || username.trim();

    if (await storage.isUsernameTaken(cleanUsername)) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است. لطفاً نام دیگری انتخاب کنید.' });
    }
    if (email && email.trim() && (await storage.isEmailTaken(cleanEmail))) {
      return res.status(400).json({ error: 'این ایمیل قبلاً ثبت شده است.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const user = await storage.createUser({
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
      displayName: name,
      passwordHash,
    });

    const token = signUserToken(user);
    setSessionCookie(req, res, token);
    res.status(201).json({
      success: true,
      token,
      user: formatUserResponse(user),
      message: 'حساب کاربری با موفقیت ساخته شد.',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'خطا در ثبت‌نام کاربر', details: error.message });
  }
});

// Login existing user
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'لطفاً نام کاربری/ایمیل و رمز عبور را وارد کنید.' });
    }

    const user = await storage.findUserByEmailOrUsername(emailOrUsername);
    if (!user || !user.password_hash) {
      return res.status(401).json({ error: 'کاربری با این مشخصات یافت نشد.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'رمز عبور وارد شده نادرست است.' });
    }

    const token = signUserToken(user);
    setSessionCookie(req, res, token);
    res.json({
      success: true,
      token,
      user: formatUserResponse(user),
      message: 'ورود موفقیت‌آمیز بود.',
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'خطا در ورود به حساب', details: error.message });
  }
});

// Get current logged-in user profile
app.get('/api/auth/me', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'نشست کاربری نامعتبر است.' });
    }
    const user = await storage.findUserById(authUser.id);
    if (!user) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }
    res.json({ success: true, user: formatUserResponse(user) });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت اطلاعات کاربر' });
  }
});

// Update user profile
app.put('/api/auth/profile', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'لطفاً ابتدا وارد حساب شوید.' });
    }

    const { displayName, username, bio, avatarUrl } = req.body;
    let cleanUsername: string | null = null;
    if (typeof username === 'string' && username.trim()) {
      const sanitized = username.trim().toLowerCase().replace(/[^\w-]/g, '');
      if (sanitized.length < 3) {
        return res.status(400).json({ error: 'نام کاربری باید حداقل ۳ کاراکتر باشد.' });
      }
      if (await storage.isUsernameTaken(sanitized, authUser.id)) {
        return res.status(400).json({ error: 'این نام کاربری قبلاً توسط کاربر دیگری ثبت شده است.' });
      }
      cleanUsername = sanitized;
    }

    const user = await storage.updateUser(authUser.id, {
      displayName: displayName ? displayName.trim() : null,
      username: cleanUsername,
      bio: bio !== undefined ? bio.trim() : null,
      avatarUrl: avatarUrl !== undefined ? avatarUrl.trim() : null,
    });

    res.json({
      success: true,
      user: formatUserResponse(user),
      message: 'مشخصات حساب با موفقیت بروزرسانی شد.',
    });
  } catch {
    res.status(500).json({ error: 'خطا در بروزرسانی پروفایل' });
  }
});

// Get user's personal documents (strictly scoped to authUser.id)
app.get('/api/auth/my-documents', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'لطفاً وارد حساب شوید.' });
    }
    const files = await storage.getMyDocuments(authUser.id);
    res.json({ success: true, files });
  } catch {
    res.status(500).json({ error: 'خطا در دریافت اسناد کاربر' });
  }
});

// 2. Public Explore files (strictly visibility = 'public')
app.get('/api/files', async (req: Request, res: Response) => {
  try {
    const { search, tag, sort = 'recent', limit = 50, offset = 0 } = req.query;
    const result = await storage.getPublicFiles({
      search: typeof search === 'string' ? search : undefined,
      tag: typeof tag === 'string' ? tag : undefined,
      sort: typeof sort === 'string' ? sort : 'recent',
      limit: Number(limit) || 50,
      offset: Number(offset) || 0,
    });
    res.json(result);
  } catch (error: any) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'خطا در دریافت فهرست اسناد عمومی', details: error.message });
  }
});

// 3. Get single file by ID (enforces privacy: private files only accessible to owner)
app.get('/api/files/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const authUser = getAuthUser(req);
    const file = await storage.getFileById(id);

    if (!file) {
      return res.status(404).json({ error: 'سند مورد نظر یافت نشد.' });
    }

    const visibility: DocVisibility =
      file.visibility === 'public' || file.visibility === 'unlisted' || file.visibility === 'private'
        ? file.visibility
        : file.is_public
        ? 'public'
        : 'private';

    const isOwner = Boolean(authUser && file.user_id && file.user_id === authUser.id);
    if (visibility === 'private' && !isOwner) {
      return res.status(403).json({
        error: 'این سند خصوصی است و دسترسی به آن تنها برای مالک سند امکان‌پذیر است.',
      });
    }

    if (!isOwner) {
      await storage.incrementFileViews(id);
      file.views_count = (file.views_count || 0) + 1;
    }

    res.json({
      ...file,
      visibility,
      is_owner: isOwner,
    });
  } catch (error: any) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'خطا در بارگذاری سند', details: error.message });
  }
});

// 4. Create a new markdown file (strictly authenticated, defaults to 'private')
app.post('/api/files', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'برای ایجاد یا ذخیره سند در حساب کاربری، ابتدا وارد شوید.' });
    }

    const {
      title,
      content,
      description = '',
      author_name,
      tags = [],
      visibility,
      is_public,
      is_favorite = false,
      customId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'عنوان سند الزامی است.' });
    }
    if (content === undefined || content === null) {
      return res.status(400).json({ error: 'محتوای سند نامعتبر است.' });
    }

    let resolvedVisibility: DocVisibility = 'private';
    if (visibility === 'private' || visibility === 'unlisted' || visibility === 'public') {
      resolvedVisibility = visibility;
    } else if (typeof is_public === 'boolean') {
      resolvedVisibility = is_public ? 'public' : 'private';
    }

    const userRecord = await storage.findUserById(authUser.id);
    const resolvedAuthorName =
      (userRecord?.display_name && userRecord.display_name.trim()) ||
      authUser.displayName ||
      (author_name && author_name.trim()) ||
      userRecord?.username ||
      'کاربر';

    const id = customId && customId.trim() ? customId.trim() : generateFileId(title);
    if (await storage.getFileById(id)) {
      return res.status(409).json({ error: 'این شناسه قبلاً ثبت شده است. لطفاً شناسه دیگری انتخاب کنید.' });
    }

    const cleanTags = Array.isArray(tags) ? tags.map((t: string) => t.trim()).filter(Boolean) : [];
    const file = await storage.createFile({
      id,
      title: title.trim(),
      content: String(content),
      description: (description || '').trim(),
      authorName: resolvedAuthorName,
      userId: authUser.id,
      tags: cleanTags,
      visibility: resolvedVisibility,
      isPublic: resolvedVisibility === 'public',
      isFavorite: Boolean(is_favorite),
    });

    res.status(201).json({
      success: true,
      file: { ...file, is_owner: true },
      shareUrl: `/?share=${id}`,
    });
  } catch (error: any) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: 'خطا در ذخیره سند', details: error.message });
  }
});

// 5. Update existing file (strictly authenticated + owner only)
app.put('/api/files/:id', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'برای ویرایش سند باید وارد حساب کاربری خود شوید.' });
    }

    const { id } = req.params;
    const existing = await storage.getFileById(id);
    if (!existing) {
      return res.status(404).json({ error: 'سند مورد نظر یافت نشد.' });
    }
    if (!existing.user_id || existing.user_id !== authUser.id) {
      return res.status(403).json({ error: 'شما تنها مجاز به ویرایش اسناد شخصی خود هستید.' });
    }

    const { title, content, description, tags, visibility, is_public, is_favorite } = req.body;
    let nextVisibility: DocVisibility | null = null;
    let nextIsPublic: boolean | null = null;
    if (visibility === 'private' || visibility === 'unlisted' || visibility === 'public') {
      nextVisibility = visibility;
      nextIsPublic = visibility === 'public';
    } else if (typeof is_public === 'boolean') {
      nextVisibility = is_public ? 'public' : 'private';
      nextIsPublic = is_public;
    }

    const cleanTags = Array.isArray(tags) ? tags.map((t: string) => t.trim()).filter(Boolean) : null;
    const updated = await storage.updateFile(id, {
      title: title ? title.trim() : null,
      content: content !== undefined ? content : null,
      description: description !== undefined ? description.trim() : null,
      tags: cleanTags,
      visibility: nextVisibility,
      isPublic: nextIsPublic,
      isFavorite: typeof is_favorite === 'boolean' ? is_favorite : null,
    });

    res.json({ success: true, file: { ...updated, is_owner: true } });
  } catch (error: any) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'خطا در بروزرسانی سند', details: error.message });
  }
});

// 6. Delete file (strictly authenticated + owner only)
app.delete('/api/files/:id', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'برای حذف سند باید وارد حساب کاربری خود شوید.' });
    }

    const { id } = req.params;
    const existing = await storage.getFileById(id);
    if (!existing) {
      return res.status(404).json({ error: 'سند مورد نظر یافت نشد.' });
    }
    if (!existing.user_id || existing.user_id !== authUser.id) {
      return res.status(403).json({ error: 'شما مجاز به حذف سند کاربر دیگری نیستید.' });
    }

    await storage.deleteFile(id);
    res.json({ success: true, message: 'سند با موفقیت حذف شد.' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'خطا در حذف سند', details: error.message });
  }
});

// 7. Star a public file
app.post('/api/files/:id/star', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const stars = await storage.starPublicFile(id);
    if (stars === null) {
      return res.status(404).json({ error: 'سند عمومی مورد نظر یافت نشد.' });
    }
    res.json({ success: true, stars });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در ثبت امتیاز', details: error.message });
  }
});

// -------------------------------------------------------------
// VITE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    await initStorage();
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const [, viteModule] = await Promise.all([initStorage(), import('vite')]);
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const httpServer = app.listen(PORT, HOST, () => {
    console.log(`Markdown Studio server running on http://${HOST}:${PORT}`);
  });

  httpServer.on('error', (err: NodeJS.ErrnoException) => {
    console.error(`Server failed to listen on ${HOST}:${PORT}:`, err.message);
    process.exit(1);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
  process.exit(1);
});
