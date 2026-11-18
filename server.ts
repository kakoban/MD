import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
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
const PORT = resolvePort();
const HOST = resolveHost();
const JWT_SECRET = process.env.JWT_SECRET || 'markdown-studio-secret-jwt-key-2025';

interface JwtPayload {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

function getAuthUser(req: Request): JwtPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
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
      database: 'Connected',
      stats,
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// =============================================================
// AUTHENTICATION & USER ACCOUNTS (/api/auth/*)
// =============================================================

const emailVerificationCodes = new Map<string, { code: string; expiresAt: number }>();

const getMailTransporter = () => {
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD,
      },
    });
  }
  return null;
};

// 1. Send Email Verification Code (OTP)
app.post('/api/auth/send-email-code', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'لطفاً یک آدرس ایمیل معتبر وارد کنید.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000;

    emailVerificationCodes.set(cleanEmail, { code, expiresAt });
    console.log(`[AUTH] Verification code for ${cleanEmail}: ${code}`);

    const transporter = getMailTransporter();
    let emailSentToInbox = false;

    if (transporter) {
      try {
        await transporter.sendMail({
          from: `"استودیو مارک‌دان" <${process.env.SMTP_USER || process.env.GMAIL_USER || 'no-reply@markdown-studio.app'}>`,
          to: cleanEmail,
          subject: `کد ۶ رقمی تأیید ورود: ${code}`,
          html: `
            <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; background-color: #f3f4f6; padding: 32px 16px; color: #1f2937;">
              <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e5e7eb;">
                <h2 style="color: #d97706; margin-top: 0; font-size: 20px;">احراز هویت و ورود به حساب</h2>
                <p style="font-size: 14px; line-height: 1.7; color: #374151;">
                  سلام،<br/>
                  کد یک‌بار مصرف زیر جهت ورود به حساب کاربری شما ایجاد شده است:
                </p>
                <div style="background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
                  <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #b45309;">${code}</span>
                </div>
                <p style="font-size: 12px; color: #6b7280; line-height: 1.6; margin-bottom: 0;">
                  این کد به مدت ۱۰ دقیقه معتبر است.
                </p>
              </div>
            </div>
          `,
        });
        emailSentToInbox = true;
      } catch (mailErr: any) {
        console.error('[AUTH] SMTP dispatch failed:', mailErr.message);
      }
    }

    res.json({
      success: true,
      emailSentToInbox,
      message: emailSentToInbox
        ? `کد تأیید ۶ رقمی به صندوق ورودی ایمیل ${cleanEmail} ارسال گردید.`
        : 'کد تأیید ۶ رقمی صادر شد. (به دلیل تنظیم نشدن سرور ایمیل SMTP، کد موقت در پایین نمایش داده شد)',
      devCode: !emailSentToInbox ? code : undefined,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در صدور کد تأیید', details: error.message });
  }
});

// 2. Verify Email Code
app.post('/api/auth/verify-email-code', async (req: Request, res: Response) => {
  try {
    const { email, code, displayName } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'لطفاً یک آدرس ایمیل معتبر وارد کنید.' });
    }
    if (!code || code.trim().length !== 6) {
      return res.status(400).json({ error: 'لطفاً کد ۶ رقمی را به درستی وارد کنید.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const stored = emailVerificationCodes.get(cleanEmail);

    if (!stored || stored.code !== code.trim()) {
      return res.status(400).json({ error: 'کد واردشده نادرست است.' });
    }
    if (Date.now() > stored.expiresAt) {
      emailVerificationCodes.delete(cleanEmail);
      return res.status(400).json({ error: 'کد منقضی شده است. لطفاً مجدداً درخواست کد کنید.' });
    }

    emailVerificationCodes.delete(cleanEmail);

    let user = await storage.findUserByEmail(cleanEmail);
    if (user) {
      const newName = displayName && displayName.trim();
      if (newName) {
        user = await storage.updateUser(user.id, { displayName: newName });
      }
    } else {
      let cleanUsername = cleanEmail.split('@')[0].replace(/[^\w]/g, '').toLowerCase() || 'user';
      if (await storage.isUsernameTaken(cleanUsername)) {
        cleanUsername = `${cleanUsername}${Math.floor(10 + Math.random() * 89)}`;
      }
      const name = displayName && displayName.trim() ? displayName.trim() : cleanEmail.split('@')[0];
      const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const dummyPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
      user = await storage.createUser({
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        displayName: name,
        passwordHash: dummyPasswordHash,
      });
    }

    const token = signUserToken(user);
    res.json({
      success: true,
      token,
      user: formatUserResponse(user),
      message: `ورود موفقیت‌آمیز با ایمیل ${cleanEmail}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در بررسی کد تأیید', details: error.message });
  }
});

// 3. Google Account Authorization
app.post('/api/auth/google-authorize', async (req: Request, res: Response) => {
  try {
    const { email, displayName, avatarUrl } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'آدرس ایمیل گوگل نامعتبر است.' });
    }
    const cleanEmail = email.trim().toLowerCase();
    let user = await storage.findUserByEmail(cleanEmail);

    if (!user) {
      let cleanUsername = cleanEmail.split('@')[0].replace(/[^\w-]/g, '').slice(0, 20) || 'user';
      if (await storage.isUsernameTaken(cleanUsername)) {
        cleanUsername = `${cleanUsername}${Math.floor(10 + Math.random() * 89)}`;
      }
      const name = displayName?.trim() || cleanEmail.split('@')[0];
      const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const dummyPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);
      user = await storage.createUser({
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        displayName: name,
        passwordHash: dummyPasswordHash,
        avatarUrl: avatarUrl || '',
      });
    }

    const token = signUserToken(user);
    res.json({
      success: true,
      token,
      user: formatUserResponse(user),
      message: `ورود موفق با حساب گوگل (${cleanEmail})`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در ورود با حساب گوگل', details: error.message });
  }
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
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const user = await storage.createUser({
      id: userId,
      email: cleanEmail,
      username: cleanUsername,
      displayName: name,
      passwordHash,
    });

    const token = signUserToken(user);
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
