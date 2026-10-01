import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import dns from 'dns';
dns.setDefaultResultOrder('ipv4first');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const JWT_SECRET = process.env.JWT_SECRET as string;
if (!JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set in environment variables.");
  process.exit(1);
}

interface JwtPayload {
  id: string;
  email: string;
  username: string;
  displayName: string;
}

// Extract authenticated user from Bearer token
function getAuthUser(req: Request): JwtPayload | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
    return decoded;
  } catch {
    return null;
  }
}


// Simple In-Memory Rate Limiter
interface RateLimitRecord {
  count: number;
  resetAt: number;
}
const rateLimitMap = new Map<string, RateLimitRecord>();

function checkRateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(key);
  if (!record || now > record.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (record.count >= limit) {
    return false;
  }
  record.count += 1;
  return true;
}

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Database connection
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("FATAL: DATABASE_URL is not set in environment variables.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false,
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

// Helper to generate unique friendly ID
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

// Initialize PostgreSQL schema and seed data
async function initDatabase() {
  try {
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(100) PRIMARY KEY,
          email VARCHAR(255) UNIQUE,
          username VARCHAR(100) UNIQUE NOT NULL,
          display_name VARCHAR(150) NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          avatar_url VARCHAR(500) DEFAULT '',
          bio TEXT DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE users ALTER COLUMN email DROP NOT NULL;

        CREATE TABLE IF NOT EXISTS shared_markdown_files (
          id VARCHAR(100) PRIMARY KEY,
          title VARCHAR(255) NOT NULL,
          content TEXT NOT NULL,
          description VARCHAR(500) DEFAULT '',
          author_name VARCHAR(100) DEFAULT 'کاربر ناشناس',
          user_id VARCHAR(100),
          tags TEXT[] DEFAULT '{}'::text[],
          is_public BOOLEAN DEFAULT true,
          views_count INTEGER DEFAULT 0,
          stars_count INTEGER DEFAULT 0,
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW()
        );

        ALTER TABLE shared_markdown_files ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);

        CREATE INDEX IF NOT EXISTS idx_shared_files_created ON shared_markdown_files(created_at DESC);
        CREATE INDEX IF NOT EXISTS idx_shared_files_public ON shared_markdown_files(is_public);
        CREATE INDEX IF NOT EXISTS idx_shared_files_user ON shared_markdown_files(user_id);

        CREATE TABLE IF NOT EXISTS document_access_requests (
          id VARCHAR(100) PRIMARY KEY,
          file_id VARCHAR(100) NOT NULL REFERENCES shared_markdown_files(id) ON DELETE CASCADE,
          requester_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          owner_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          status VARCHAR(20) DEFAULT 'pending',
          message VARCHAR(500) DEFAULT '',
          created_at TIMESTAMPTZ DEFAULT NOW(),
          updated_at TIMESTAMPTZ DEFAULT NOW(),
          UNIQUE(file_id, requester_id)
        );

        CREATE INDEX IF NOT EXISTS idx_doc_access_owner ON document_access_requests(owner_id, status);
        CREATE INDEX IF NOT EXISTS idx_doc_access_requester ON document_access_requests(requester_id, file_id);

        -- Ensure all documents authored by registered users display their chosen registration display_name
        UPDATE shared_markdown_files f
        SET author_name = u.display_name
        FROM users u
        WHERE f.user_id = u.id AND u.display_name IS NOT NULL AND u.display_name != '';
      `);

      // Check if we need to seed
      const countRes = await client.query('SELECT COUNT(*) FROM shared_markdown_files');
      const count = parseInt(countRes.rows[0].count, 10);

      if (count === 0) {
        console.log('Seeding initial community markdown files to Neon database...');
        await client.query(`
          INSERT INTO shared_markdown_files (id, title, content, description, author_name, tags, is_public, views_count, stars_count)
          VALUES 
          (
            'ai-llm-guide-2025',
            'راهنمای جامع هوش مصنوعی و مدل‌های زبانی بزرگ (LLMs)',
            '# راهنمای جامع معماری مدل‌های زبانی بزرگ (LLMs)\n\nاین سند حاوی مفاهیم کلیدی یادگیری عمیق، ترنسفورمرها و پرامپت‌نویسی پیشرفته است.\n\n---\n\n## ۱. ساختار توجه (Self-Attention)\n\nمکانیزم توجه در ترنسفورمرها به مدل اجازه می‌دهد ارتباط بین تمام کلمات یک جمله را به صورت موازی محاسبه کند:\n\n$$\n\\text{Attention}(Q, K, V) = \\text{softmax}\\left(\\frac{QK^T}{\\sqrt{d_k}}\\right)V\n$$\n\n---\n\n## ۲. الگوی معماری RAG\n\nبرای کاهش توهمات و دسترسی به اطلاعات سازمانی از الگوی **Retrieval-Augmented Generation** استفاده می‌شود:\n\n1. تبدیل پرسش به بردار عددی (Embedding)\n2. جستجوی نزدیک‌ترین اسناد در پایگاه برداری (Vector Database)\n3. ارسال زمینه بازیابی‌شده به همراه پرامپت به مدل\n\n> [!TIP]\n> استفاده از هایبریدریسرچ (Hybrid Search: BM25 + Vector) دقت بازیابی را تا ۳۵٪ ارتقا می‌دهد.',
            'سند آموزشی بررسی مکانیزم Self-Attention، فرمول‌های ریاضی و الگوی معماری سیستم‌های RAG',
            'دکتر فرهاد مرادی',
            ARRAY['هوش مصنوعی', 'آموزشی', 'RAG', 'مهندسی'],
            true,
            142,
            28
          ),
          (
            'react-clean-architecture',
            'اصول معماری تمیز در پروژه‌های مدرن ری‌اکت و تایپ‌اسکریپت',
            '# اصول معماری تمیز در پروژه‌های مدرن ری‌اکت\n\nبرای نگهداری آسان و مقیاس‌پذیری نرم‌افزار، ساختار پوشه‌بندی و جداسازی دغدغه‌ها (Separation of Concerns) الزامی است.\n\n---\n\n## لایه‌های معماری پیشنهادی\n\n- \`src/features\`: ماژول‌های مستقل مبتنی بر دامنه کسب‌وکار\n- \`src/components/ui\`: کامپوننت‌های اتمیک پایه بدون بیزینس‌لاجیک\n- \`src/hooks\`: هوک‌های اختصاصی و منطق محاسباتی\n- \`src/api\`: توابع ارتباط با پایگاه داده و سرویس‌ها\n\n---\n\n## کد نمونه هوک کاستوم\n\n\`\`\`typescript\nimport { useState, useEffect } from \"react\";\n\nexport function useDebounce<T>(value: T, delay: number): T {\n  const [debouncedValue, setDebouncedValue] = useState<T>(value);\n\n  useEffect(() => {\n    const timer = setTimeout(() => setDebouncedValue(value), delay);\n    return () => clearTimeout(timer);\n  }, [value, delay]);\n\n  return debouncedValue;\n}\n\`\`\`\n\n> [!NOTE]\n> مدیریت وضعیت سرور باید از وضعیت کلاینت جدا شود.',
            'راهنمای ساختار پوشه‌بندی، الگوهای طراحی و کد تمیز برای توسعه‌دهندگان فرانت‌اند',
            'تیم فنی توسعه',
            ARRAY['برنامه‌نویسی', 'ری‌اکت', 'معماری', 'تایپ‌اسکریپت'],
            true,
            98,
            19
          ),
          (
            'deep-work-summary-book',
            'خلاصه کتاب کار عمیق (Deep Work) - کال نیوپورت',
            '# خلاصه راهبردی کتاب کار عمیق (Cal Newport)\n\nتوانایی تمرکز بدون حواس‌پرتی روی یک کار پیچیده با بار فکری بالا، ارزشمندترین مهارت قرن بیست و یکم است.\n\n---\n\n## چهار قانون بنیادین\n\n1. **قانون اول:** به طور عمیق کار کنید (ایجاد ریچوال و زمان‌های مشخص)\n2. **قانون دوم:** خستگی و بی‌حوصلگی را بپذیرید (ترک اسکرول ناخودآگاه)\n3. **قانون سوم:** شبکه‌های اجتماعی را محدود کنید\n4. **قانون چهارم:** کارهای سطحی (Shallow Work) را تا ۶۰٪ کاهش دهید\n\n---\n\n## چک‌لیست روزانه تمرکز\n\n- [x] مسدودسازی نوتیفیکیشن‌ها تا ساعت ۱۲ ظهر\n- [x] بلوک ۹۰ دقیقه‌ای بدون اینترنت برای کار عمیق\n- [ ] پیاده‌روی ۲۰ دقیقه‌ای در هوای آزاد\n- [ ] مرور ایمیل‌ها فقط در یک ساعت مشخص پایانی روز',
            'خلاصه کاربردی قوانین کار عمیق، تکنیک‌های حذف حواس‌پرتی و چک‌لیست روزانه بهره‌وری',
            'سارا ناصری',
            ARRAY['بهره‌وری', 'خلاصه کتاب', 'مدیریت زمان'],
            true,
            215,
            47
          )
        `);
      }

      console.log('PostgreSQL database initialized successfully.');
    } finally {
      client.release();
    }
  } catch (err: any) {
    console.error('Failed to initialize PostgreSQL table:', err.message);
  }
}

// -------------------------------------------------------------
// REST API ROUTES (/api/*)
// -------------------------------------------------------------

// 1. Health check & DB statistics
app.get('/api/health', async (req: Request, res: Response) => {
  try {
    const statsRes = await pool.query(`
      SELECT 
        COUNT(*) as total_files,
        COALESCE(SUM(views_count), 0) as total_views,
        COALESCE(SUM(stars_count), 0) as total_stars
      FROM shared_markdown_files
      WHERE is_public = true
    `);
    const usersCountRes = await pool.query(`SELECT COUNT(*) as total_users FROM users`);
    res.json({
      status: 'healthy',
      database: 'Neon PostgreSQL (Connected)',
      stats: {
        totalFiles: Number(statsRes.rows[0].total_files),
        totalViews: Number(statsRes.rows[0].total_views),
        totalStars: Number(statsRes.rows[0].total_stars),
        totalUsers: Number(usersCountRes.rows[0].total_users),
      },
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// =============================================================
// AUTHENTICATION & USER ACCOUNTS (/api/auth/*)
// =============================================================

// In-memory store for email verification OTP codes (email -> { code, expiresAt })
const emailVerificationCodes = new Map<string, { code: string; expiresAt: number }>();

// Helper to configure SMTP Transporter for actual email dispatch
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

// 1. Send Email Verification Code for Email-First Authorization (OTP)
app.post('/api/auth/send-email-code', async (req: Request, res: Response) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit('otp_' + clientIp, 5, 10 * 60 * 1000)) {
      return res.status(429).json({ error: 'تعداد درخواست‌ها بیش از حد مجاز است. لطفاً ۱۰ دقیقه دیگر مجدداً تلاش کنید.' });
    }
  try {
    const { email } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'لطفاً یک آدرس ایمیل معتبر وارد کنید.' });
    }
    const cleanEmail = email.trim().toLowerCase();

    const transporter = getMailTransporter();
    if (!transporter) {
      return res.status(503).json({ error: 'تنظیمات سرور ایمیل (SMTP) در سرور یافت نشد.' });
    }

    // Generate cryptographically secure 6-digit code
    const cryptoMod = await import('crypto');
    const code = cryptoMod.randomInt(100000, 999999).toString();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    try {
      await transporter.sendMail({
        from: `"استودیو مارک‌دان" <${process.env.SMTP_USER || 'no-reply@markdown-studio.app'}>`,
        to: cleanEmail,
        subject: `کد ۶ رقمی تأیید و اتورایز شما: ${code}`,
        html: `
          <div dir="rtl" style="font-family: Tahoma, Arial, sans-serif; background-color: #f3f4f6; padding: 32px 16px; color: #1f2937;">
            <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 16px; padding: 28px; border: 1px solid #e5e7eb; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
              <h2 style="color: #d97706; margin-top: 0; font-size: 20px;">احراز هویت و ورود به سیستم</h2>
              <p style="font-size: 14px; line-height: 1.7; color: #374151;">
                سلام،<br/>
                کد یک‌بار مصرف زیر جهت اتورایز و احراز هویت شما صادر شده است:
              </p>
              <div style="background: #fffbeb; border: 2px dashed #f59e0b; border-radius: 12px; padding: 16px; text-align: center; margin: 24px 0;">
                <span style="font-family: monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #b45309;">${code}</span>
              </div>
              <p style="font-size: 12px; color: #6b7280; line-height: 1.6; margin-bottom: 0;">
                این کد به مدت ۱۰ دقیقه معتبر است. در صورت عدم درخواست، این پیام را نادیده بگیرید.
              </p>
            </div>
          </div>
        `,
      });

      emailVerificationCodes.set(cleanEmail, { code, expiresAt });
      console.log(`[AUTH] Real verification email dispatched successfully to ${cleanEmail}`);

      res.json({
        success: true,
        message: `کد تأیید ۶ رقمی به صندوق ورودی ایمیل ${cleanEmail} ارسال گردید.`,
      });
    } catch (mailErr: any) {
      console.error('[AUTH] SMTP dispatch failed:', mailErr);
      return res.status(500).json({ error: 'خطا در ارسال ایمیل تأیید: ' + mailErr.message });
    }
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در صدور کد تأیید', details: error.message });
  }
});

// 2. Verify Email Code & Complete Email Authorization (Auto-login or Auto-register)
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
      return res.status(400).json({ error: 'کد واردشده نادرست است. لطفاً کد را بررسی کنید.' });
    }
    if (Date.now() > stored.expiresAt) {
      emailVerificationCodes.delete(cleanEmail);
      return res.status(400).json({ error: 'کد منقضی شده است. لطفاً مجدداً درخواست کد کنید.' });
    }

    // Code is valid! Consume it
    emailVerificationCodes.delete(cleanEmail);

    // Check if user already exists with this email
    const userRes = await pool.query(
      'SELECT id, email, username, display_name, avatar_url, bio, created_at FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    let user;
    if (userRes.rows.length > 0) {
      user = userRes.rows[0];
      // Update display name if user specified one (or if it was generic 'کاربر گرامی')
      const newName = displayName && displayName.trim();
      if (newName) {
        const updateRes = await pool.query(
          `UPDATE users SET display_name = $1, updated_at = NOW() WHERE id = $2
           RETURNING id, email, username, display_name, avatar_url, bio, created_at`,
          [newName, user.id]
        );
        user = updateRes.rows[0];
        // Also update all documents created by this user
        await pool.query(
          'UPDATE shared_markdown_files SET author_name = $1 WHERE user_id = $2',
          [newName, user.id]
        );
      }
    } else {
      // Auto-create user account with clean username without random ugly suffixes
      let cleanUsername = cleanEmail.split('@')[0].replace(/[^\w]/g, '').toLowerCase() || 'user';
      const existingUserCheck = await pool.query('SELECT id FROM users WHERE LOWER(username) = $1', [cleanUsername]);
      if (existingUserCheck.rows.length > 0) {
        cleanUsername = `${cleanUsername}${Math.floor(10 + Math.random() * 89)}`;
      }
      const name = (displayName && displayName.trim()) ? displayName.trim() : cleanEmail.split('@')[0];
      const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const dummyPasswordHash = await bcrypt.hash(Math.random().toString(36), 10);

      const insertRes = await pool.query(
        `
        INSERT INTO users (id, email, username, display_name, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id, email, username, display_name, avatar_url, bio, created_at
        `,
        [userId, cleanEmail, cleanUsername, name, dummyPasswordHash]
      );
      user = insertRes.rows[0];
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
      },
      message: `اتورایز موفقیت‌آمیز با ایمیل ${cleanEmail}`,
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در اتورایز ایمیل', details: error.message });
  }
});

// Register new user account (Fast signup with username + password, optional email)
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
    const cleanEmail = email && email.trim() ? email.trim().toLowerCase() : `${cleanUsername}@local.user`;
    const name = displayName?.trim() || username.trim();

    // Check if user already exists
    const existing = await pool.query(
      'SELECT id FROM users WHERE LOWER(username) = $1' + (email && email.trim() ? ' OR LOWER(email) = $2' : ''),
      email && email.trim() ? [cleanUsername, cleanEmail] : [cleanUsername]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً ثبت شده است. لطفاً نام دیگری انتخاب کنید.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    const insertRes = await pool.query(
      `
      INSERT INTO users (id, email, username, display_name, password_hash, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
      RETURNING id, email, username, display_name, avatar_url, bio, created_at
      `,
      [userId, cleanEmail, cleanUsername, name, passwordHash]
    );

    const user = insertRes.rows[0];
    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
      },
      message: 'حساب کاربری با موفقیت ساخته شد.',
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'خطا در ثبت‌نام کاربر', details: error.message });
  }
});

// Login existing user
app.post('/api/auth/login', async (req: Request, res: Response) => {
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || 'unknown';
    if (!checkRateLimit('login_' + clientIp, 10, 5 * 60 * 1000)) {
      return res.status(429).json({ error: 'تعداد دفعات تلاش ناموفق زیاد است. لطفاً ۵ دقیقه دیگر تلاش فرمایید.' });
    }
  try {
    const { emailOrUsername, password } = req.body;
    if (!emailOrUsername || !password) {
      return res.status(400).json({ error: 'لطفاً نام کاربری/ایمیل و رمز عبور را وارد کنید.' });
    }

    const cleanInput = emailOrUsername.trim().toLowerCase();
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1',
      [cleanInput]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'کاربری با این مشخصات یافت نشد.' });
    }

    const user = result.rows[0];
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'رمز عبور وارد شده نادرست است.' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
      },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
      },
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

    const result = await pool.query(
      'SELECT id, email, username, display_name, avatar_url, bio, created_at FROM users WHERE id = $1',
      [authUser.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'کاربر یافت نشد.' });
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
      },
    });
  } catch (error: any) {
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
      const existingUser = await pool.query(
        'SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2',
        [sanitized, authUser.id]
      );
      if (existingUser.rows.length > 0) {
        return res.status(400).json({ error: 'این نام کاربری قبلاً توسط کاربر دیگری ثبت شده است.' });
      }
      cleanUsername = sanitized;
    }

    const result = await pool.query(
      `
      UPDATE users
      SET
        display_name = COALESCE($1, display_name),
        username = COALESCE($2, username),
        bio = COALESCE($3, bio),
        avatar_url = COALESCE($4, avatar_url),
        updated_at = NOW()
      WHERE id = $5
      RETURNING id, email, username, display_name, avatar_url, bio, created_at
      `,
      [
        displayName ? displayName.trim() : null,
        cleanUsername,
        bio !== undefined ? bio.trim() : null,
        avatarUrl !== undefined ? avatarUrl.trim() : null,
        authUser.id,
      ]
    );

    // Also update all documents created by this user to reflect their chosen display name
    if (displayName && displayName.trim()) {
      await pool.query(
        'UPDATE shared_markdown_files SET author_name = $1 WHERE user_id = $2',
        [displayName.trim(), authUser.id]
      );
    }

    const user = result.rows[0];
    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        username: user.username,
        displayName: user.display_name,
        avatarUrl: user.avatar_url,
        bio: user.bio,
        createdAt: user.created_at,
      },
      message: 'مشخصات حساب با موفقیت بروزرسانی شد.',
    });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در بروزرسانی پروفایل' });
  }
});

// Get user's cloud documents
app.get('/api/auth/my-documents', async (req: Request, res: Response) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: 'لطفاً وارد حساب شوید.' });
    }

    const result = await pool.query(
      `
      SELECT 
        f.id, f.title, f.content, f.description, 
        COALESCE(NULLIF(u.display_name, ''), f.author_name) as author_name,
        u.username as author_username,
        u.avatar_url as author_avatar,
        f.tags, f.is_public, f.views_count, f.stars_count, f.created_at, f.updated_at
      FROM shared_markdown_files f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.user_id = $1
      ORDER BY f.updated_at DESC
      `,
      [authUser.id]
    );

    res.json({ success: true, files: result.rows });
  } catch (error: any) {
    res.status(500).json({ error: 'خطا در دریافت اسناد کاربر' });
  }
});

// 2. Get list of files (with search, tags, sorting)
app.get('/api/files', async (req: Request, res: Response) => {
  try {
    const { search, tag, sort = 'recent', limit = 50, offset = 0 } = req.query;
    const authUser = getAuthUser(req);

    let query = `
      SELECT
        f.id, f.title, f.description,
        COALESCE(NULLIF(u.display_name, ''), f.author_name) as author_name,
        u.username as author_username,
        u.avatar_url as author_avatar,
        f.user_id,
        f.tags, f.is_public, f.views_count, f.stars_count, f.created_at, f.updated_at,
        LENGTH(f.content) as content_length,
        ar.status as my_access_status
      FROM shared_markdown_files f
      LEFT JOIN users u ON f.user_id = u.id
      LEFT JOIN document_access_requests ar ON ar.file_id = f.id AND ar.requester_id = $1
      WHERE 1=1
    `;
    const params: any[] = [authUser ? authUser.id : null];
    let paramIndex = 2;

    if (search && typeof search === 'string' && search.trim()) {
      query += ` AND (f.title ILIKE ${paramIndex} OR f.description ILIKE ${paramIndex} OR COALESCE(u.display_name, f.author_name) ILIKE ${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex++;
    }

    if (tag && typeof tag === 'string' && tag.trim()) {
      query += ` AND ${paramIndex} = ANY(f.tags)`;
      params.push(tag.trim());
      paramIndex++;
    }

    if (sort === 'popular') {
      query += ' ORDER BY f.stars_count DESC, f.created_at DESC';
    } else if (sort === 'views') {
      query += ' ORDER BY f.views_count DESC, f.created_at DESC';
    } else {
      query += ' ORDER BY f.created_at DESC';
    }

    query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(Number(limit), Number(offset));

    const result = await pool.query(query, params);

    // Get all distinct tags
    const tagsRes = await pool.query(`
      SELECT DISTINCT unnest(tags) as tag, COUNT(*) as count
      FROM shared_markdown_files
      GROUP BY tag
      ORDER BY count DESC
      LIMIT 20
    `);

    res.json({
      files: result.rows,
      tags: tagsRes.rows,
    });
  } catch (error: any) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: 'Failed to fetch files', details: error.message });
  }
});

// 3. Get single file by ID (increments views count)
app.get('/api/files/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        f.*,
        COALESCE(NULLIF(u.display_name, ''), f.author_name) as author_name,
        u.username as author_username,
        u.avatar_url as author_avatar
      FROM shared_markdown_files f
      LEFT JOIN users u ON f.user_id = u.id
      WHERE f.id = $1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'فایل یافت نشد.' });
    }

    const file = result.rows[0];

    // Check private access control
    if (!file.is_public) {
      const authUser = getAuthUser(req);
      if (!authUser) {
        return res.status(403).json({
          error: 'این سند خصوصی است. برای مشاهده، لطفاً ابتدا وارد حساب خود شوید.',
          isLocked: true,
          requiresAuth: true,
          accessStatus: 'none',
          file: {
            id: file.id,
            title: file.title,
            description: file.description,
            author_name: file.author_name,
            author_username: file.author_username,
            user_id: file.user_id,
            is_public: false,
          },
        });
      }

      // If user is author, allowed
      if (file.user_id === authUser.id) {
        pool.query('UPDATE shared_markdown_files SET views_count = views_count + 1 WHERE id = $1', [id]).catch(() => {});
        return res.json(file);
      }

      // Check if granted access in document_access_requests
      const reqRes = await pool.query(
        'SELECT status FROM document_access_requests WHERE file_id = $1 AND requester_id = $2',
        [id, authUser.id]
      );

      const status = reqRes.rows.length > 0 ? reqRes.rows[0].status : 'none';

      if (status !== 'approved') {
        return res.status(403).json({
          error: status === 'pending'
            ? 'درخواست دسترسی شما برای نویسنده سند ارسال شده و در انتظار تایید است.'
            : status === 'rejected'
            ? 'درخواست دسترسی شما به این سند توسط نویسنده رد شده است.'
            : 'این سند خصوصی است و برای مشاهده نیاز به تایید نویسنده دارد.',
          isLocked: true,
          requiresAuth: false,
          accessStatus: status,
          file: {
            id: file.id,
            title: file.title,
            description: file.description,
            author_name: file.author_name,
            author_username: file.author_username,
            user_id: file.user_id,
            is_public: false,
          },
        });
      }
    }

    // Allowed (public or approved)
    pool.query('UPDATE shared_markdown_files SET views_count = views_count + 1 WHERE id = $1', [id]).catch(() => {});
    res.json(file);
  } catch (error: any) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Failed to load file', details: error.message });
  }
});

// 4. Create / Publish a new markdown file
app.post('/api/files', async (req: Request, res: Response) => {
  try {
    const {
      title,
      content,
      description = '',
      author_name = 'کاربر ناشناس',
      tags = [],
      is_public = true,
      customId,
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'عنوان فایل الزامی است.' });
    }
    if (!content || !content.trim()) {
      return res.status(400).json({ error: 'محتوای فایل مارک‌دان نمی‌تواند خالی باشد.' });
    }

    const authUser = getAuthUser(req);
    const resolvedUserId = authUser ? authUser.id : null;
    let resolvedAuthorName = (author_name && author_name !== 'کاربر ناشناس') ? author_name.trim() : '';

    if (authUser) {
      // Fetch the user's exact chosen name from registration
      const uRes = await pool.query('SELECT display_name, username FROM users WHERE id = $1', [authUser.id]);
      if (uRes.rows.length > 0 && uRes.rows[0].display_name) {
        resolvedAuthorName = uRes.rows[0].display_name;
      } else if (authUser.displayName) {
        resolvedAuthorName = authUser.displayName;
      }
    }
    if (!resolvedAuthorName) {
      resolvedAuthorName = 'کاربر ناشناس';
    }

    const id = (customId && customId.trim()) ? customId.trim() : generateFileId(title);
    const cleanTags = Array.isArray(tags)
      ? tags.map((t: string) => t.trim()).filter(Boolean)
      : [];

    const result = await pool.query(
      `
      INSERT INTO shared_markdown_files (id, title, content, description, author_name, user_id, tags, is_public, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
      `,
      [id, title.trim(), content, description.trim(), resolvedAuthorName, resolvedUserId, cleanTags, Boolean(is_public)]
    );

    res.status(201).json({
      success: true,
      file: result.rows[0],
      shareUrl: `/?share=${id}`,
    });
  } catch (error: any) {
    console.error('Error publishing file:', error);
    res.status(500).json({ error: 'Failed to publish file', details: error.message });
  }
});

// 5. Update existing file
app.put('/api/files/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { title, content, description, author_name, tags, is_public } = req.body;

    const existing = await pool.query('SELECT * FROM shared_markdown_files WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'فایل یافت نشد.' });
    }

    const cleanTags = Array.isArray(tags)
      ? tags.map((t: string) => t.trim()).filter(Boolean)
      : existing.rows[0].tags;

    const result = await pool.query(
      `
      UPDATE shared_markdown_files 
      SET 
        title = COALESCE($1, title),
        content = COALESCE($2, content),
        description = COALESCE($3, description),
        author_name = COALESCE($4, author_name),
        tags = COALESCE($5, tags),
        is_public = COALESCE($6, is_public),
        updated_at = NOW()
      WHERE id = $7
      RETURNING *
      `,
      [
        title ? title.trim() : null,
        content !== undefined ? content : null,
        description !== undefined ? description.trim() : null,
        author_name ? author_name.trim() : null,
        cleanTags,
        is_public !== undefined ? Boolean(is_public) : null,
        id,
      ]
    );

    res.json({ success: true, file: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Failed to update file', details: error.message });
  }
});

// 6. Delete file
app.delete('/api/files/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM shared_markdown_files WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'فایل مورد نظر یافت نشد.' });
    }
    res.json({ success: true, message: 'فایل با موفقیت حذف شد.' });
  } catch (error: any) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

// 7. Star a file
app.post('/api/files/:id/star', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE shared_markdown_files SET stars_count = stars_count + 1 WHERE id = $1 RETURNING id, stars_count',
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    res.json({ success: true, stars: result.rows[0].stars_count });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to star file', details: error.message });
  }
});

// -------------------------------------------------------------
// VITE INTEGRATION
// -------------------------------------------------------------
async function startServer() {
  await initDatabase();

  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Markdown File Sharing server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal error starting server:', err);
});
