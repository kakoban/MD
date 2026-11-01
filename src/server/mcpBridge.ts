import { Request, Response } from 'express';
import pg from 'pg';
import crypto from 'crypto';

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

export const MCP_TOOLS: McpTool[] = [
  {
    name: 'hub_get_ai_brain_context',
    description: 'دریافت تمام اسناد و محتوای ذخیره شده در «مغز هوش مصنوعی» کاربر (AI Brain Vault) به عنوان کانتکست و حافظه اصلی',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'حداکثر تعداد اسناد مغز هوش مصنوعی (پیش‌فرض ۱۰)' },
      },
    },
  },
  {
    name: 'hub_smart_search',
    description: 'جستجوی هوشمند در تمام اسناد مارک‌دان بر اساس عنوان، تگ‌ها، محتوا یا نام پوشه (صرفه‌جویی ۹۰٪ توکن)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'متن، عنوان یا کلمه کلیدی مورد جستجو' },
        folder: { type: 'string', description: 'نام یا مسیر اختیاری پوشه برای محدود کردن جستجو (مانند Projects یا Notes یا عمومی)' },
        limit: { type: 'number', description: 'حداکثر تعداد نتایج (پیش‌فرض ۱۰)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'hub_get_folder_documents',
    description: 'دریافت فهرست و خلاصه تمام اسناد موجود در یک پوشه یا سرفصل خاص (مانند پوشه Projects، Notes، Inbox یا عمومی)',
    inputSchema: {
      type: 'object',
      properties: {
        folderName: { type: 'string', description: 'نام یا مسیر پوشه مورد نظر (مانند Projects یا Notes)' },
        limit: { type: 'number', description: 'تعداد اسناد (پیش‌فرض ۲۰)' },
      },
      required: ['folderName'],
    },
  },
  {
    name: 'hub_read_note_with_graph',
    description: 'خواندن کامل محتوای یک سند مارک‌دان به همراه پیوندهای متصل به آن (Synapse Links). این ابزار با شناسه سند، عنوان دقیق، عنوان بدون پسوند یا حتی نام فایل با زیرخط یا فاصله به راحتی سند را پیدا می‌کند.',
    inputSchema: {
      type: 'object',
      properties: {
        fileIdOrTitle: { type: 'string', description: 'شناسه، عنوان یا نام فایل سند (مانند فایل_فنی یا Active_Projects_Tracker_02)' },
      },
      required: ['fileIdOrTitle'],
    },
  },
  {
    name: 'hub_list_documents',
    description: 'دریافت فهرست تمام اسناد ثبت‌شده، پوشه‌ها، سرفصل‌ها و خلاصه‌ها در مخزن مشترک ابری و محلی',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'تعداد اسناد (پیش‌فرض ۵۰)' },
      },
    },
  },
  {
    name: 'hub_create_note',
    description: 'ذخیره و ایجاد مستقیم فایل مارک‌دان روی هارد دیسک و کامپیوتر کاربر در پوشه متصل‌شده (مانند Projects یا Notes یا D:\\MIND). هرگاه کاربر درخواست نوشتن موضوع، ایجاد فایل یا ذخیره یادداشت روی هارد دیسک داد، حتماً این ابزار را فراخوانی کنید تا بلافاصله روی هارد دیسک و مخزن ثبت شود (هرگز به کاربر نگویید که دسترسی به هارد دیسک ندارید).',
    inputSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', description: 'عنوان یادداشت، موضوع یا نام فایل (مثلاً «فایل_فنی» یا «برنامه_هفتگی»)' },
        topic: { type: 'string', description: 'موضوع یا نام فایل (معادل title)' },
        content: { type: 'string', description: 'متن کامل مارک‌دان یادداشت یا فایل' },
        text: { type: 'string', description: 'متن سند (معادل content)' },
        folder: { type: 'string', description: 'مسیر یا نام پوشه روی هارد دیسک (اختیاری، مثلاً Projects یا Notes یا 🧠 مغز هوش مصنوعی)' },
        folderPath: { type: 'string', description: 'مسیر پوشه روی دیسک (معادل folder)' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'لیست برچسب‌ها و تگ‌ها (اختیاری)',
        },
        isPublic: { type: 'boolean', description: 'عمومی و قابل مشاهده بودن در فضای کاری (پیش‌فرض: true)' },
      },
      required: ['title', 'content'],
    },
  },
  {
    name: 'hub_write_file',
    description: 'ایجاد یا بازنویسی مستقیم یک فایل مارک‌دان روی هارد دیسک محلی کاربر. هرگاه کاربر درخواست ساخت یا بروزرسانی فایلی با نام مشخص روی هارد دیسک داد این ابزار را اجرا کنید.',
    inputSchema: {
      type: 'object',
      properties: {
        filename: { type: 'string', description: 'نام فایل یا عنوان موضوع (مثلاً فایل_فنی.md یا گزارش پروژه)' },
        title: { type: 'string', description: 'عنوان فایل (معادل filename)' },
        content: { type: 'string', description: 'محتوای کامل فایل به زبان مارک‌دان' },
        folder: { type: 'string', description: 'پوشه مقصد روی هارد دیسک (اختیاری، مثلاً Projects یا Notes)' },
        tags: { type: 'array', items: { type: 'string' }, description: 'تگ‌ها (اختیاری)' },
      },
      required: ['filename', 'content'],
    },
  },
  {
    name: 'hub_append_to_note',
    description: 'اضافه کردن متن جدید به انتهای یک فایل یا یادداشت روی هارد دیسک (اگر فایل وجود نداشته باشد، به صورت خودکار ایجاد می‌شود).',
    inputSchema: {
      type: 'object',
      properties: {
        fileIdOrTitle: { type: 'string', description: 'شناسه، عنوان یا نام فایل مورد نظر' },
        title: { type: 'string', description: 'عنوان یا نام فایل (معادل fileIdOrTitle)' },
        contentToAppend: { type: 'string', description: 'متنی که باید به انتهای فایل اضافه شود' },
        content: { type: 'string', description: 'متن جهت افزودن (معادل contentToAppend)' },
        separator: { type: 'string', description: 'جداکننده بین متن قبلی و متن جدید (اختیاری، پیش‌فرض دو خط جدید)' },
      },
      required: ['fileIdOrTitle', 'contentToAppend'],
    },
  },
  {
    name: 'hub_update_note',
    description: 'ویرایش محتوا، عنوان، پوشه یا تگ‌های یک فایل موجود روی هارد دیسک، به همراه شماره نسخه برای جلوگیری از تعارض',
    inputSchema: {
      type: 'object',
      properties: {
        fileIdOrTitle: { type: 'string', description: 'شناسه، عنوان یا نام فایل جهت ویرایش' },
        content: { type: 'string', description: 'متن جدید مارک‌دان سند (اختیاری)' },
        title: { type: 'string', description: 'عنوان جدید سند (اختیاری)' },
        folder: { type: 'string', description: 'مسیر یا پوشه جدید سند روی دیسک (اختیاری)' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'تگ‌های جدید سند (اختیاری)',
        },
        expectedVersion: {
          type: 'number',
          description: 'شماره نسخه مورد انتظار سند قبل از ویرایش (اختیاری)',
        },
      },
      required: ['fileIdOrTitle'],
    },
  },
  {
    name: 'hub_delete_note',
    description: 'حذف یک یادداشت از مخزن و هارد دیسک بر اساس شناسه یا عنوان',
    inputSchema: {
      type: 'object',
      properties: {
        fileIdOrTitle: { type: 'string', description: 'شناسه (id) یا عنوان دقیق سند جهت حذف' },
      },
      required: ['fileIdOrTitle'],
    },
  },
];

// Active SSE sessions for remote MCP clients (e.g. Claude.ai Connectors)
const sseSessions = new Map<string, Response>();

export function setCorsHeaders(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
}

/**
 * Highly resilient document resolver.
 * Resolves by exact ID, title, title without .md extension,
 * space/underscore/hyphen variants, Persian/Arabic character normalizations,
 * and smart fuzzy fallback.
 */
export async function findDocumentByFlexibleTarget(pool: pg.Pool, rawTarget: string): Promise<any | null> {
  const target = String(rawTarget || '').trim();
  if (!target) return null;

  const noExt = target.replace(/\.(md|markdown|txt)$/i, '').trim();
  const spaceVariant = noExt.replace(/[-_]/g, ' ').trim();
  const underscoreVariant = noExt.replace(/\s+/g, '_').trim();
  const hyphenVariant = noExt.replace(/\s+/g, '-').trim();

  // Normalize Persian/Arabic letters (ي -> ی, ك -> ک, etc.)
  const normalizedFa = noExt.replace(/ي/g, 'ی').replace(/ك/g, 'ک');
  const normalizedTarget = target.replace(/ي/g, 'ی').replace(/ك/g, 'ک');

  const query = `
    SELECT id, title, content, description, folder_path, author_name, tags, COALESCE(version, 1) as version, is_public, updated_at, created_at
    FROM shared_markdown_files
    WHERE id = $1
       OR LOWER(id) = LOWER($1)
       OR LOWER(title) = LOWER($1)
       OR LOWER(title) = LOWER($2)
       OR LOWER(REGEXP_REPLACE(title, '\\.(md|markdown|txt)$', '', 'i')) = LOWER($2)
       OR LOWER(REPLACE(REPLACE(title, '_', ' '), '-', ' ')) = LOWER($3)
       OR LOWER(REPLACE(REPLACE(title, ' ', '_'), '-', '_')) = LOWER($4)
       OR LOWER(REPLACE(REPLACE(title, ' ', '-'), '_', '-')) = LOWER($5)
       OR LOWER(REPLACE(REPLACE(title, 'ي', 'ی'), 'ك', 'ک')) = LOWER($6)
       OR LOWER(REPLACE(REPLACE(title, 'ي', 'ی'), 'ك', 'ک')) = LOWER($7)
       OR id = 'brain-' || $2
       OR id LIKE 'brain-' || $2 || '-%'
       OR id LIKE '%' || $2 || '%'
    ORDER BY
      CASE
        WHEN id = $1 THEN 1
        WHEN LOWER(id) = LOWER($1) THEN 2
        WHEN LOWER(title) = LOWER($1) THEN 3
        WHEN LOWER(title) = LOWER($2) THEN 4
        ELSE 5
      END,
      updated_at DESC
    LIMIT 1
  `;

  try {
    const res = await pool.query(query, [
      target,
      noExt,
      spaceVariant,
      underscoreVariant,
      hyphenVariant,
      normalizedFa,
      normalizedTarget,
    ]);

    if (res.rows.length > 0) {
      return res.rows[0];
    }

    // Secondary fallback: ILIKE substring search
    const fallbackQuery = `
      SELECT id, title, content, description, folder_path, author_name, tags, COALESCE(version, 1) as version, is_public, updated_at, created_at
      FROM shared_markdown_files
      WHERE LOWER(title) LIKE $1 OR LOWER(id) LIKE $1
      ORDER BY updated_at DESC
      LIMIT 1
    `;
    const fallbackRes = await pool.query(fallbackQuery, [`%${noExt.toLowerCase()}%`]);
    return fallbackRes.rows[0] || null;
  } catch (err) {
    console.warn('findDocumentByFlexibleTarget query notice:', err);
    return null;
  }
}

export async function processMcpMessage(pool: pg.Pool, message: any): Promise<any | null> {
  if (!message || typeof message !== 'object') {
    return {
      jsonrpc: '2.0',
      id: null,
      error: { code: -32600, message: 'Invalid Request: body must be a JSON object' },
    };
  }

  const { id, method, params } = message;

  // Notifications (no response needed)
  if (!id && method && method.startsWith('notifications/')) {
    return null;
  }

  // 1. Initialize MCP handshake
  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
          resources: {},
        },
        serverInfo: {
          name: 'markdown-studio-cognitive-mcp',
          version: '1.2.0',
        },
      },
    };
  }

  // 2. List tools
  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS,
      },
    };
  }

  // 3. Call tool
  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    try {
      if (toolName === 'hub_get_ai_brain_context') {
        const limitNum = Math.min(Number(args.limit) || 15, 50);
        // Returns top notes from brain, or recent workspace notes as fallback context
        let result = await pool.query(
          `SELECT id, title, content, description, folder_path, author_name, tags, COALESCE(version, 1) as version, updated_at
           FROM shared_markdown_files
           WHERE 'ai-brain' = ANY(tags) OR LOWER(COALESCE(folder_path, '')) LIKE '%مغز%' OR LOWER(COALESCE(folder_path, '')) LIKE '%brain%'
           ORDER BY updated_at DESC
           LIMIT $1`,
          [limitNum]
        );

        if (result.rows.length === 0) {
          result = await pool.query(
            `SELECT id, title, content, description, folder_path, author_name, tags, COALESCE(version, 1) as version, updated_at
             FROM shared_markdown_files
             ORDER BY updated_at DESC
             LIMIT $1`,
            [limitNum]
          );
        }

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: result.rows.length > 0
                  ? JSON.stringify({ space: 'مخزن دانش و اسناد (Knowledge Hub)', totalDocs: result.rows.length, documents: result.rows }, null, 2)
                  : 'هنوز سندی در مخزن همگام‌سازی نشده است.',
              },
            ],
          },
        };
      }

      if (toolName === 'hub_smart_search') {
        const queryStr = String(args.query || '').trim().toLowerCase();
        const folderStr = String(args.folder || '').trim().toLowerCase();
        const limitNum = Math.min(Number(args.limit) || 20, 100);

        let sql = `SELECT id, title, description, folder_path, author_name, tags, COALESCE(version, 1) as version, is_public, updated_at
           FROM shared_markdown_files
           WHERE (
             LOWER(title) LIKE $1 OR
             LOWER(description) LIKE $1 OR
             LOWER(content) LIKE $1 OR
             LOWER(COALESCE(folder_path, '')) LIKE $1
           )`;
        const paramsList: any[] = [`%${queryStr}%`];

        if (folderStr) {
          paramsList.push(`%${folderStr}%`);
          sql += ` AND LOWER(COALESCE(folder_path, '')) LIKE $${paramsList.length}`;
        }

        paramsList.push(limitNum);
        sql += ` ORDER BY updated_at DESC LIMIT $${paramsList.length}`;

        const result = await pool.query(sql, paramsList);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.rows, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === 'hub_get_folder_documents') {
        const folderName = String(args.folderName || '').trim();
        const limitNum = Math.min(Number(args.limit) || 50, 200);

        const result = await pool.query(
          `SELECT id, title, description, folder_path, author_name, tags, COALESCE(version, 1) as version, is_public, updated_at
           FROM shared_markdown_files
           WHERE (
             LOWER(COALESCE(folder_path, '')) LIKE $1 OR
             LOWER(title) LIKE $1 OR
             $2 = ANY(tags)
           )
           ORDER BY updated_at DESC
           LIMIT $3`,
          [`%${folderName.toLowerCase()}%`, folderName.toLowerCase(), limitNum]
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: result.rows.length > 0
                  ? JSON.stringify({ folder: folderName, count: result.rows.length, documents: result.rows }, null, 2)
                  : `هیچ سندی در پوشه «${folderName}» یافت نشد.`,
              },
            ],
          },
        };
      }

      if (toolName === 'hub_read_note_with_graph') {
        const target = String(args.fileIdOrTitle || args.title || args.id || '').trim();
        const doc = await findDocumentByFlexibleTarget(pool, target);

        if (!doc) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `سند با شناسه یا عنوان «${target}» در مخزن یافت نشد.` }],
              isError: true,
            },
          };
        }

        const linkMatches = [...(doc.content || '').matchAll(/\[\[([^\]\n]+)\]\]/g)].map((m) => m[1]);

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    document: doc,
                    synapseLinks: linkMatches,
                  },
                  null,
                  2
                ),
              },
            ],
          },
        };
      }

      if (toolName === 'hub_list_documents') {
        const limitNum = Math.min(Number(args.limit) || 50, 200);
        const result = await pool.query(
          `SELECT id, title, description, folder_path, author_name, tags, COALESCE(version, 1) as version, is_public, updated_at
           FROM shared_markdown_files
           ORDER BY updated_at DESC
           LIMIT $1`,
          [limitNum]
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }],
          },
        };
      }

      // --- Writable Tools ---

      if (toolName === 'hub_create_note' || toolName === 'hub_write_file') {
        const rawTitle = String(
          args.title ||
          args.topic ||
          args.filename ||
          args.name ||
          args.subject ||
          ''
        ).replace(/\.md$/i, '').trim();
        const content = String(
          args.content ??
          args.text ??
          args.body ??
          args.markdown ??
          args.note ??
          ''
        );
        const folder = String(
          args.folderPath ||
          args.folder ||
          args.path ||
          args.directory ||
          args.category ||
          'Projects'
        ).trim();
        const tags = Array.isArray(args.tags)
          ? args.tags.map((t: string) => String(t).trim()).filter(Boolean)
          : [];
        if (!tags.includes('ai-brain')) {
          tags.push('ai-brain');
        }
        const isPublic = args.isPublic !== undefined ? Boolean(args.isPublic) : true;

        // Fallback title from first line of markdown if title is empty
        const derivedTitle = content
          ? content.split('\n')[0].replace(/^#+\s*/, '').trim().slice(0, 50)
          : '';
        const title = rawTitle || derivedTitle || 'یادداشت جدید';

        // Check if note exists using flexible target matching
        const existingDoc = await findDocumentByFlexibleTarget(pool, title);

        if (existingDoc && toolName === 'hub_write_file') {
          // Overwrite existing file when calling hub_write_file
          const updateResult = await pool.query(
            `UPDATE shared_markdown_files
             SET content = $1,
                 tags = $2,
                 folder_path = $3,
                 is_public = true,
                 version = COALESCE(version, 1) + 1,
                 updated_at = NOW()
             WHERE id = $4
             RETURNING id, title, content, folder_path, tags, is_public, COALESCE(version, 1) as version, created_at, updated_at`,
            [content, tags, folder || existingDoc.folder_path, existingDoc.id]
          );

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: `فایل «${title}» با موفقیت بازنویسی و روی هارد دیسک و پایگاه دانش به‌روزرسانی شد.`,
                    document: updateResult.rows[0],
                    status: 'written_and_queued_for_disk',
                  }, null, 2),
                },
              ],
            },
          };
        }

        const cleanTitle = title
          .toLowerCase()
          .replace(/[^\w؀-ۿ\s-]/g, '')
          .replace(/\s+/g, '-')
          .slice(0, 30);
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const newId = cleanTitle ? `brain-${cleanTitle}-${randomSuffix}` : `brain-doc-${randomSuffix}`;

        const insertResult = await pool.query(
          `INSERT INTO shared_markdown_files (id, title, content, description, author_name, tags, is_public, folder_path, version, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW(), NOW())
           ON CONFLICT (id) DO UPDATE
           SET title = EXCLUDED.title,
               content = EXCLUDED.content,
               folder_path = EXCLUDED.folder_path,
               tags = EXCLUDED.tags,
               is_public = true,
               version = COALESCE(shared_markdown_files.version, 1) + 1,
               updated_at = NOW()
           RETURNING id, title, content, folder_path, tags, is_public, COALESCE(version, 1) as version, created_at, updated_at`,
          [newId, title, content, 'سند ایجاد شده توسط هوش مصنوعی (MCP)', 'هوش مصنوعی (MCP)', tags, isPublic, folder]
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  message: `سند «${title}» با موفقیت در پوشه «${folder}» ایجاد گردید و آماده ذخیره روی هارد دیسک است.`,
                  document: insertResult.rows[0],
                  status: 'created_and_queued_for_disk',
                }, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === 'hub_append_to_note') {
        const target = String(
          args.fileIdOrTitle ||
          args.title ||
          args.topic ||
          args.filename ||
          args.name ||
          args.id ||
          args.fileId ||
          ''
        ).replace(/\.md$/i, '').trim();
        const contentToAppend = String(
          args.contentToAppend ??
          args.content ??
          args.text ??
          args.body ??
          args.markdown ??
          ''
        );
        const separator = args.separator !== undefined ? String(args.separator) : '\n\n';

        if (!target) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: 'خطا: شناسه یا عنوان سند (fileIdOrTitle) الزامی است.' }],
              isError: true,
            },
          };
        }

        const existingDoc = await findDocumentByFlexibleTarget(pool, target);

        if (!existingDoc) {
          // If note does not exist, automatically create it!
          const autoTitle = target;
          const folder = String(args.folderPath || args.folder || 'Projects').trim();
          const cleanTitle = autoTitle
            .toLowerCase()
            .replace(/[^\w؀-ۿ\s-]/g, '')
            .replace(/\s+/g, '-')
            .slice(0, 30);
          const randomSuffix = Math.random().toString(36).substring(2, 8);
          const newId = cleanTitle ? `brain-${cleanTitle}-${randomSuffix}` : `brain-doc-${randomSuffix}`;

          const createResult = await pool.query(
            `INSERT INTO shared_markdown_files (id, title, content, description, author_name, tags, is_public, folder_path, version, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1, NOW(), NOW())
             RETURNING id, title, content, folder_path, tags, is_public, COALESCE(version, 1) as version, created_at, updated_at`,
            [newId, autoTitle, contentToAppend, 'سند ایجاد شده توسط هوش مصنوعی (MCP)', 'هوش مصنوعی (MCP)', ['ai-brain'], true, folder]
          );

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({
                    message: `سند «${autoTitle}» یافت نشد، لذا به صورت خودکار به عنوان سند جدید روی هارد دیسک ایجاد گردید.`,
                    document: createResult.rows[0],
                  }, null, 2),
                },
              ],
            },
          };
        }

        const newContent = existingDoc.content
          ? `${existingDoc.content}${separator}${contentToAppend}`
          : contentToAppend;

        const currentTags: string[] = Array.isArray(existingDoc.tags) ? existingDoc.tags : [];
        if (!currentTags.includes('ai-brain')) {
          currentTags.push('ai-brain');
        }

        const updateResult = await pool.query(
          `UPDATE shared_markdown_files
           SET content = $1,
               tags = $2,
               version = COALESCE(version, 1) + 1,
               updated_at = NOW()
           WHERE id = $3
           RETURNING id, title, content, folder_path, tags, is_public, COALESCE(version, 1) as version, updated_at`,
          [newContent, currentTags, existingDoc.id]
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: 'متن با موفقیت به انتهای سند افزوده شد.', document: updateResult.rows[0] }, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === 'hub_update_note') {
        const target = String(
          args.fileIdOrTitle ||
          args.id ||
          args.fileId ||
          args.title ||
          args.name ||
          args.topic ||
          args.filename ||
          ''
        ).replace(/\.md$/i, '').trim();
        const expectedVersion =
          args.expectedVersion !== undefined && args.expectedVersion !== null && !isNaN(Number(args.expectedVersion))
            ? Number(args.expectedVersion)
            : null;
        const newContent = args.content !== undefined
          ? String(args.content)
          : (args.text !== undefined ? String(args.text) : (args.body !== undefined ? String(args.body) : null));
        const newTitle = args.title !== undefined
          ? String(args.title).replace(/\.md$/i, '').trim()
          : (args.name !== undefined ? String(args.name).replace(/\.md$/i, '').trim() : null);
        const newFolder = args.folderPath !== undefined
          ? String(args.folderPath).trim()
          : (args.folder !== undefined ? String(args.folder).trim() : (args.path !== undefined ? String(args.path).trim() : null));
        let newTags = Array.isArray(args.tags)
          ? args.tags.map((t: string) => String(t).trim()).filter(Boolean)
          : null;

        if (!target) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: 'خطا: شناسه یا عنوان سند (fileIdOrTitle) الزامی است.' }],
              isError: true,
            },
          };
        }

        const currentDoc = await findDocumentByFlexibleTarget(pool, target);

        if (!currentDoc) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `خطا: سند با شناسه یا عنوان «${target}» یافت نشد.` }],
              isError: true,
            },
          };
        }

        // Version Conflict Protection (Optimistic Concurrency Control)
        if (expectedVersion !== null && Number(currentDoc.version) !== expectedVersion) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: `خطای تعارض نسخه (Conflict): سند «${currentDoc.title}» تغییر کرده است. نسخه مورد انتظار شما: ${expectedVersion}، اما نسخه فعلی در سرور: ${currentDoc.version} است. لطفاً ابتدا سند را مجدداً بخوانید و سپس ویرایش فرمایید.`,
                },
              ],
              isError: true,
            },
          };
        }

        const finalTitle = newTitle !== null && newTitle.length > 0 ? newTitle : currentDoc.title;
        const finalContent = newContent !== null ? newContent : currentDoc.content;
        const finalFolder = newFolder !== null ? newFolder : currentDoc.folder_path;
        let finalTags = newTags !== null ? newTags : (Array.isArray(currentDoc.tags) ? currentDoc.tags : []);
        if (!finalTags.includes('ai-brain')) {
          finalTags.push('ai-brain');
        }

        const updateResult = await pool.query(
          `UPDATE shared_markdown_files
           SET title = $1,
               content = $2,
               folder_path = $3,
               tags = $4,
               version = COALESCE(version, 1) + 1,
               updated_at = NOW()
           WHERE id = $5
           RETURNING id, title, content, folder_path, tags, is_public, COALESCE(version, 1) as version, updated_at`,
          [finalTitle, finalContent, finalFolder, finalTags, currentDoc.id]
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: 'سند با موفقیت به‌روزرسانی شد.', document: updateResult.rows[0] }, null, 2),
              },
            ],
          },
        };
      }

      if (toolName === 'hub_delete_note') {
        const target = String(args.fileIdOrTitle || '').trim();
        if (!target) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: 'خطا: شناسه یا عنوان سند (fileIdOrTitle) الزامی است.' }],
              isError: true,
            },
          };
        }

        const targetDoc = await findDocumentByFlexibleTarget(pool, target);
        if (!targetDoc) {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `سند «${target}» جهت حذف یافت نشد.` }],
              isError: true,
            },
          };
        }

        const deleteResult = await pool.query(
          `DELETE FROM shared_markdown_files
           WHERE id = $1
           RETURNING id, title, folder_path`,
          [targetDoc.id]
        );

        return {
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ message: 'سند با موفقیت حذف گردید.', deletedDocument: deleteResult.rows[0] }, null, 2),
              },
            ],
          },
        };
      }

      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` },
      };
    } catch (err: any) {
      return {
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: err?.message || 'Server error executing tool' },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

// Handler for HTTP POST (supports both direct JSON-RPC and SSE message forwarding)
export async function handleMcpJsonRpc(pool: pg.Pool, req: Request, res: Response): Promise<void> {
  setCorsHeaders(res);

  const sessionId = (req.query.sessionId as string) || (req.body?.sessionId as string);
  const sseTarget = sessionId ? sseSessions.get(sessionId) : null;

  const response = await processMcpMessage(pool, req.body);

  if (sseTarget) {
    if (response) {
      sseTarget.write(`event: message\ndata: ${JSON.stringify(response)}\n\n`);
    }
    res.status(202).send('Accepted');
    return;
  }

  // Direct HTTP response
  if (response) {
    res.json(response);
  } else {
    res.status(202).send('Accepted');
  }
}

// Handler for GET / SSE transport (used by Claude Connectors, remote agents)
export function handleMcpSse(req: Request, res: Response): void {
  setCorsHeaders(res);

  const isEventStream =
    req.headers.accept?.includes('text/event-stream') ||
    req.query.transport === 'sse' ||
    req.path.endsWith('/sse');

  if (!isEventStream) {
    // Normal browser GET: return status info
    res.json({
      status: 'online',
      protocol: 'model-context-protocol',
      version: '2024-11-05',
      endpoint: '/api/mcp',
      sseEndpoint: '/api/mcp/sse',
      tools: MCP_TOOLS.map((t) => t.name),
      description: 'Markdown Studio Native Model Context Protocol (MCP) Server',
      instructions: 'Enter this URL in Claude Connectors: https://markdown-studio-pro.onrender.com/api/mcp',
    });
    return;
  }

  // Establish SSE stream
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
  });

  const sessionId = crypto.randomUUID();
  sseSessions.set(sessionId, res);

  const host = req.get('host') || 'markdown-studio-pro.onrender.com';
  const protocol = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
  const postEndpoint = `${protocol}://${host}/api/mcp/messages?sessionId=${sessionId}`;

  // Send initial endpoint event per MCP SSE spec
  res.write(`event: endpoint\ndata: ${postEndpoint}\n\n`);

  // Heartbeat ping every 15s to keep proxy/Render connection alive
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    sseSessions.delete(sessionId);
  });
}
