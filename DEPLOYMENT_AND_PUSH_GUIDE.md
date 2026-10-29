# راهنمای جامع مکانیزم پوش و دیپلوی (Push & Deployment Guide)
پروژه: **Markdown Studio Pro**  
مخزن: [https://github.com/kakoban/MD.git](https://github.com/kakoban/MD.git)  
دامنه پروداکشن: [https://markdown-studio-pro.onrender.com](https://markdown-studio-pro.onrender.com)

---

## ۱. معماری کلی چرخه استقرار (CI/CD Workflow)

جریان انتشار برنامه به صورت **Git-Driven Continuous Deployment** پیاده‌سازی شده است:

```
[ کدنویسی و تست محلی ]
        │
        ▼
[ بررسی سلامت بیلد (npm run lint && npm run build) ]
        │
        ▼
[ کامیت و پوش به گیت‌هاب (git push origin main) ]
        │
        ▼
[ تریگر خودکار وب‌هوک Render ]
        │
   ┌────┴──────────────────────────────┐
   │ فرایند بیلد (Build Command)       │
   │ 1. npm install --legacy-peer-deps │
   │ 2. vite build -> dist/            │
   │ 3. esbuild server.ts -> server.js │
   └────┬──────────────────────────────┘
        │
        ▼
[ اجرای سرویس پروداکشن (node server.js) ]
        │
   ┌────┴──────────────────────────────┐
   │ سرو فرانت‌اند از dist/             │
   │ APIهای اکسپرس و سرور بومی MCP     │
   │ اتصال پایدار به Neon PostgreSQL   │
   └───────────────────────────────────┘
```

---

## ۲. دستورات استاندارد پوش به گیت‌هاب (Push Steps)

پیش از ارسال تغییرات به گیت‌هاب، همیشه این ۴ گام را طی کنید:

### گام ۱: تست کامپایل و سلامت پروژه
```bash
npm run lint && npm run build
```
> **چرا مهم است؟** اگر خطای تایپ‌اسکریپت یا ماژول ناموجود باشد، بیلد Render شکست خواهد خورد. تست محلی تضمین می‌کند پروژه در سرور بدون باگ بالا می‌آید.

### گام ۲: بررسی وضعیت فایل‌ها
```bash
git status
```
مطمئن شوید فایل‌های موقت، کلیدهای محرمانه و متغیرهای `.env` وارد لیست کامیت نشوند.

### گام ۳: استیج و ثبت کامیت با پیام معنادار
```bash
# افزودن فایل‌های مدنظر
git add <فایل‌های_تغییر_یافته>

# ثبت کامیت
git commit -m "توضیح کوتاه و دقیق تغییرات"
```

### گام ۴: ارسال به برنچ اصلی
```bash
git push origin main
```
به محض رسیدن کامیت به شاخه `main`، سرور Render رویداد Push را دریافت کرده و دیپلوی خودکار آغاز می‌شود.

---

## ۳. نحوه عملکرد بیلد و اجرا در سرور Render

تنظیمات اصلی هاست داخل فایل [render.yaml](render.yaml) تعریف شده است:

### دستور بیلد (`buildCommand`):
```bash
npm install --include=dev --legacy-peer-deps && npm run build
```
1. `--include=dev`: ابزارهای کامپایل مثل `vite`, `typescript`, `esbuild`, `@tailwindcss/vite` در پروداکشن برای تولید باندل خروجی الزامی هستند.
2. `npm run build`: دو عملیات همزمان انجام می‌دهد:
   - **بخش فرانت‌اند:** ابزار Vite کدهای React و استایل‌ها را باندل کرده و در دایرکتوری `dist/` قرار می‌دهد.
   - **بخش بک‌اند:** ابزار esbuild فایل منبع `server.ts` را کامپایل کرده و یک خروجی سبک ES-Module به نام `server.js` تولید می‌کند.

### دستور اجرا (`startCommand`):
```bash
node server.js
```
این فایل خروجی، سرور Express را روشن می‌کند:
- در محیط `production`، فایل‌های کامپایل‌شده فرانت‌اند مستقیماً از پوشه `dist/` سرو می‌شوند.
- در صورتی که کاربر مستقیماً یک روت SPA را باز کند، روت fallback درخواست را به `dist/index.html` تحویل می‌دهد.
- همزمان تمام مسیرهای `/api/*`، دیتابیس Neon و سرور پروتکل `/api/mcp` در دسترس قرار می‌گیرند.

---

## ۴. متغیرهای محیطی حیاتی در پنل Render (Environment Variables)

برای کارکرد بی‌نقص سرور در Render، متغیرهای زیر باید در بخش `Environment` پنل Render مقداردهی شده باشند:

| نام متغیر | کاربرد | مثال / وضعیت |
| :--- | :--- | :--- |
| `NODE_ENV` | فعال‌سازی حالت پروداکشن و سرو پوشه dist | `production` |
| `PORT` | پورت گوش دادن وب‌سرور | رندر خودکار مقداردهی می‌کند (معمولاً `10000`) |
| `DATABASE_URL` | رشته اتصال به دیتابیس ابری Neon | `postgresql://user:pass@host/dbname?sslmode=require` |
| `JWT_SECRET` | کلید هش و امضای توکن‌های احراز هویت | یک رشته تصادفی ۶۴ کاراکتری امن |
| `VITE_GOOGLE_CLIENT_ID` | شناسه ورود سریع با گوگل | `...apps.googleusercontent.com` |
| `SMTP_HOST` / `PORT` / `USER` / `PASS` | ارسال ایمیل‌های تأیید و بازیابی رمز | تنظیمات جیمیل یا سرویس SMTP |

---

## ۵. سرور MCP و دسترسی کلاینت‌های هوش مصنوعی بعد از دیپلوی

پس از هر دیپلوی، سرور MCP شما روی اینترنت زنده است:
- **آدرس تست سرور:**
  `https://markdown-studio-pro.onrender.com/api/mcp/info`
- **آدرس اتصال در Claude Connectors / Cursor:**
  `https://markdown-studio-pro.onrender.com/api/mcp`
- پروتکل ارتباطی هم به صورت POST مستقیم (JSON-RPC 2.0) و هم از طریق استریم SSE (`text/event-stream`) پاسخگو است.

---

## ۶. حل خطاهای متداول در هنگام دیپلوی (Troubleshooting)

### ۱. توقف سرور یا خطای اتصال پورت (Port Binding Error):
- **علت:** هاردکد کردن پورت در کد سرور.
- **راه‌حل:** در [server.ts](server.ts) پورت باید حتماً به فرمت داینامیک خوانده شود:
  ```ts
  const PORT = Number(process.env.PORT) || 3005;
  app.listen(PORT, '0.0.0.0', ...);
  ```

### ۲. خطای Failed to resolve module در بیلد Render:
- **علت:** پکیج مورد نیاز داخل `dependencies` یا `devDependencies` فایل `package.json` نیست.
- **راه‌حل:** اجرای `npm install` و سپس ثبت و پوش `package.json` و `package-lock.json`.

### ۳. عدم اجرای خودکار دیپلوی در Render:
- اگر با پوش کردن دیپلوی شروع نشد:
  1. به داشبورد [dashboard.render.com](https://dashboard.render.com) بروید.
  2. سرویس `markdown-studio-pro` را باز کنید.
  3. روی دکمه **Manual Deploy > Deploy latest commit** کلیک کنید.
  4. در تب **Logs** فرایند بیلد را دنبال کنید.
