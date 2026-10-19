# راهنمای جامع پیاده‌سازی و راه‌اندازی ورود با گوگل (Google OAuth / GIS)
پروژه: **Markdown Studio Pro**

---

## ۱. نمای کلی مکانیزم ورود با گوگل (Architecture Overview)

سیستم احراز هویت با گوگل در این پلتفرم از نسخه مدرن و رسمی **Google Identity Services (GIS)** به همراه توکن‌های امن **JWT** و پایگاه داده **Neon PostgreSQL** استفاده می‌کند.

```
+--------------------+            +------------------------+            +-----------------------+
|  مرورگر کاربر       |            |    سرورهای گوگل        |            |   سرور اپلیکیشن       |
| (Client Frontend)  |            |   (Google OAuth API)   |            |   (Node / Express)    |
+--------------------+            +------------------------+            +-----------------------+
          |                                    |                                    |
          | 1. کلیک روی "ورود با گوگل"         |                                    |
          |----------------------------------->|                                    |
          | 2. نمایش دیالوگ امن حساب‌های گوگل   |                                    |
          |<-----------------------------------|                                    |
          | 3. بازگشت Token / Credential       |                                    |
          |<-----------------------------------|                                    |
          |                                                                         |
          | 4. ارسال اطلاعات کاربر (Email, Name, Avatar, GoogleId)                  |
          |------------------------------------------------------------------------>|
          |                                                                         | 5. UPSERT در دیتابیس PostgreSQL
          |                                                                         |    (اگر کاربر جدید باشد ثبت‌نام،
          |                                                                         |     اگر موجود باشد لاگین می‌شود)
          |                                                                         | 6. ساخت JWT امضاشده (انقضا: ۳۰ روز)
          | 7. دریافت JWT و مشخصات کاربر                                            |
          |<------------------------------------------------------------------------|
          |                                                                         |
          | 8. ذخیره توکن در localStorage و ورود خودکار                             |
          v                                                                         v
```

---

## ۲. مراحل ساخت Google Client ID در گوگل کلاد کنسول

برای فعال‌سازی و اتصال دامنه خود به گوگل:

### گام ۱: ایجاد پروژه در Google Cloud Console
1. به کنسول گوگل کلاد بروید: [https://console.cloud.google.com/](https://console.cloud.google.com/)
2. با حساب کاربری گوگل خود وارد شوید.
3. از منوی بالای صفحه روی **Select a Project** کلیک کرده و گزینه **New Project** را بزنید.
4. نام پروژه را مثلاً `Markdown Studio Pro` بگذارید و روی **Create** کلیک کنید.

### گام ۲: پیکربندی صفحه رضایت (OAuth Consent Screen)
1. از منوی سمت چپ (ناوبری)، به مسیر **APIs & Services > OAuth consent screen** بروید.
2. نوع کاربر (**User Type**) را روی **External** انتخاب کرده و دکمه **Create** را بزنید.
3. فیلدهای الزامی را پر کنید:
   - **App name:** `Markdown Studio Pro`
   - **User support email:** ایمیل خودتان را انتخاب کنید.
   - **Developer contact information:** ایمیل خود را بنویسید.
4. در بخش **Scopes** روی **Add or Remove Scopes** کلیک کنید و ۳ مورد زیر را تیک بزنید:
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
   - `openid`
5. دکمه **Save and Continue** را تا انتهای مراحل بزنید.

### گام ۳: ایجاد کلاینت‌آیدی (OAuth Client ID)
1. از منوی سمت چپ به بخش **Credentials** بروید.
2. روی دکمه **+ CREATE CREDENTIALS** در بالا کلیک کرده و **OAuth client ID** را انتخاب کنید.
3. فیلد **Application type** را روی **Web application** قرار دهید.
4. نام دلخواه (مانند `Markdown Studio Web Client`) را وارد کنید.
5. بخش بسیار مهم: **Authorized JavaScript origins (مبدأهای مجاز جاوااسکریپت)**:
   دکمه **+ ADD URI** را بزنید و آدرس‌های زیر را دقیق وارد کنید:
   - `http://localhost:3000` (برای تست لوکال)
   - `http://localhost:3005` (برای تست لوکال پورت ثانویه)
   - `https://markdown-studio-pro.onrender.com` (دامنه پروداکشن روی Render)
   *(در صورت اتصال دامنه اختصاصی، آن را نیز بدون اسلش پایانی اضافه کنید)*.
6. بخش **Authorized redirect URIs**:
   *(در روش Google Identity Services و Pop-up، پر کردن این بخش الزامی نیست، اما برای اطمینان می‌توانید آدرس اصلی سایت را بدون مسیر اضافه کنید)*.
7. روی دکمه **CREATE** کلیک کنید.
8. یک پنجره با عنوان **Your Client ID** باز می‌شود؛ مقدار رشته‌ای مشابه زیر را کپی کنید:
   ```text
   507287937639-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com
   ```

---

## ۳. متغیرهای محیطی مورد نیاز (Environment Variables)

مقدار کپی‌شده از مرحله قبل را در فایل‌های محیطی و پنل Render قرار دهید:

### الف) در محیط لوکال (`.env`):
در ریشه پروژه، فایل `.env` را باز کرده یا بسازید:

```env
# Client-side Google OAuth Client ID (Vite prefix makes it accessible in browser)
VITE_GOOGLE_CLIENT_ID="507287937639-xxxxxxxxxxxxxxxxxxxx.apps.googleusercontent.com"

# Server JWT Secret Key
JWT_SECRET="your_very_long_random_jwt_secret_key_here"

# Database Connection (Neon PostgreSQL)
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
```

### ب) در هاست ابری Render (Dashboard):
1. وارد داشبورد Render شوید: [https://dashboard.render.com](https://dashboard.render.com)
2. وب‌سرویس `markdown-studio-pro` را باز کنید.
3. به تب **Environment** بروید.
4. روی **Add Environment Variable** کلیک کنید:
   - **Key:** `VITE_GOOGLE_CLIENT_ID`
   - **Value:** `شناسه کلاینت گوگل شما`
5. دکمه **Save Changes** را بزنید تا برنامه خودکار با کلاینت‌آیدی جدید بیلد شود.

---

## ۴. ساختار فنی و کدهای پیاده‌سازی‌شده در پلتفرم

### ۱. بارگذاری اسکریپت رسمی گوگل در فرانت‌اند (`index.html`)
اسکریپت به صورت غیراصلی و Async در هدر بارگذاری می‌شود:
```html
<!-- index.html: خط ۱۶ -->
<script src="https://accounts.google.com/gsi/client" async defer></script>
```

### ۲. لاجیک کلیک و پاپ‌آپ گوگل در مودال لاگین (`src/components/AuthModal.tsx`)
سیستم از کلاینت توکن OAuth2 گوگل با قابلیت دسترسی پاپ‌آپ امن استفاده می‌کند:

```typescript
// فراخوانی در زمان کلیک دکمه "ورود با حساب گوگل"
const handleGoogleButtonClick = () => {
  const tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: googleClientId,
    scope: 'email profile openid',
    callback: async (tokenResponse: any) => {
      if (tokenResponse.access_token) {
        // دریافت پروفایل کاربر مستقیماً از Google API
        const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
        });
        const profile = await userinfoRes.json();
        
        // ارسال به سرور خودمان جهت ثبت یا ورود
        await handleGoogleSuccess({
          googleId: profile.sub || profile.id,
          email: profile.email,
          name: profile.name || profile.given_name,
          picture: profile.picture,
        });
      }
    },
  });
  tokenClient.requestAccessToken({ prompt: 'select_account' });
};
```

### ۳. سرویس کلاینت (`src/services/authApi.ts`)
```typescript
async loginWithGoogle(params: {
  googleId?: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
}): Promise<AuthResponse> {
  const res = await fetch('/api/auth/google', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const data = await res.json();
  if (data.token) {
    this.setToken(data.token); // ذخیره در localStorage
  }
  return data;
}
```

### ۴. اندپوینت سرور و ثبت در پایگاه داده (`server.ts`)
در فایل `server.ts` در مسیر `/api/auth/google` عملیات ثبت یا به‌روزرسانی (UPSERT) انجام می‌شود:

```sql
INSERT INTO users (id, google_id, email, username, display_name, avatar_url, is_verified, created_at, updated_at)
VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), NOW())
ON CONFLICT (email) DO UPDATE 
SET google_id = COALESCE(EXCLUDED.google_id, users.google_id),
    display_name = COALESCE(users.display_name, EXCLUDED.display_name),
    avatar_url = EXCLUDED.avatar_url,
    is_verified = true,
    updated_at = NOW()
RETURNING id, google_id, email, username, display_name, avatar_url, bio, created_at;
```

---

## ۵. چک‌لیست عیب‌یابی خطاهای متداول (Troubleshooting)

| خطا | علت رخ دادن | راه حل |
| :--- | :--- | :--- |
| `origin_mismatch` یا خطای ۴۰۰ گوگل | آدرس دامنه‌ای که در آن هستید در لیست Authorized JavaScript origins تعریف نشده است. | به کنسول گوگل کلاد بروید و دقیقاً آدرس فعلی (مثلاً `https://markdown-studio-pro.onrender.com`) را بدون اسلش پایانی به origins اضافه کنید. |
| پاپ‌آپ باز نمی‌شود و ارور می‌دهد | مسدودکننده پاپ‌آپ (Pop-up Blocker) در مرورگر روشن است یا اسکریپت هنوز لود نشده. | مطمئن شوید دسترسی پاپ‌آپ برای سایت مجاز است و تحریم‌شکن/DNS در صورت محدودیت اینترنت وصل است. |
| خطای `client_id missing` | متغیر `VITE_GOOGLE_CLIENT_ID` تنظیم نشده است. | مقدار کلاینت‌آیدی را در فایل `.env` محلی و تب Environment در Render قرار دهید. |
| خطای دیتابیس `ON CONFLICT` | فیلد `email` در جدول `users` دارای قید `UNIQUE` نیست. | در میگریشن اولیه دیتابیس Neon قید `email VARCHAR(255) UNIQUE` به صورت پیش‌فرض فعال است. |

---

## ۶. تست و اعتبارسنجی ورود

۱. روی پلتفرم در هدر بالا، دکمه **«ورود / عضویت»** را بزنید.
۲. دکمه **Continue with Google (ورود با حساب گوگل)** را انتخاب کنید.
۳. در پنجره امن گوگل، حساب خود را برگزینید.
۴. پنجره بسته شده، نام و آواتار شما در گوشه بالای صفحه ظاهر شده و کلیه اسناد شما با حساب ایمیلتان پیوند داده می‌شوند.
