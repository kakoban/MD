import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';

export type DocVisibility = 'private' | 'unlisted' | 'public';

export interface UserRow {
  id: string;
  google_id?: string | null;
  email: string;
  username: string;
  display_name: string;
  password_hash?: string;
  avatar_url: string;
  bio: string;
  is_verified?: boolean;
  created_at: string;
  updated_at?: string;
}

export interface FileRow {
  id: string;
  title: string;
  content: string;
  description: string;
  author_name: string;
  author_username?: string;
  author_avatar?: string;
  user_id: string | null;
  tags: string[];
  visibility: DocVisibility;
  is_public: boolean;
  is_favorite: boolean;
  views_count: number;
  stars_count: number;
  created_at: string;
  updated_at: string;
  content_length?: number;
}

let pgPool: pg.Pool | null = null;
let sqliteDb: DatabaseSync | null = null;
let activeBackend: 'postgres' | 'sqlite' = 'sqlite';

function parseSqliteTags(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalizeSqliteFile(row: any): FileRow {
  const visibility: DocVisibility =
    row.visibility === 'public' || row.visibility === 'unlisted' || row.visibility === 'private'
      ? row.visibility
      : row.is_public
      ? 'public'
      : 'private';
  return {
    id: row.id,
    title: row.title,
    content: row.content ?? '',
    description: row.description ?? '',
    author_name: row.author_name || 'کاربر',
    author_username: row.author_username || undefined,
    author_avatar: row.author_avatar || '',
    user_id: row.user_id ?? null,
    tags: parseSqliteTags(row.tags),
    visibility,
    is_public: Boolean(row.is_public),
    is_favorite: Boolean(row.is_favorite),
    views_count: Number(row.views_count || 0),
    stars_count: Number(row.stars_count || 0),
    created_at: row.created_at,
    updated_at: row.updated_at,
    content_length: row.content_length !== undefined ? Number(row.content_length) : undefined,
  };
}

function initSqlite() {
  const dataDir = path.resolve(process.cwd(), 'data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  const dbPath = path.join(dataDir, 'markdown-studio.db');
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      google_id TEXT,
      email TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      display_name TEXT NOT NULL,
      password_hash TEXT NOT NULL,
      avatar_url TEXT DEFAULT '',
      bio TEXT DEFAULT '',
      is_verified INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shared_markdown_files (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      description TEXT DEFAULT '',
      author_name TEXT DEFAULT 'کاربر',
      user_id TEXT,
      tags TEXT DEFAULT '[]',
      visibility TEXT DEFAULT 'private',
      is_public INTEGER DEFAULT 0,
      is_favorite INTEGER DEFAULT 0,
      views_count INTEGER DEFAULT 0,
      stars_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_files_user ON shared_markdown_files(user_id);
    CREATE INDEX IF NOT EXISTS idx_files_visibility ON shared_markdown_files(visibility);
    CREATE INDEX IF NOT EXISTS idx_files_created ON shared_markdown_files(created_at DESC);

    DELETE FROM shared_markdown_files
    WHERE user_id IS NULL
      AND id IN ('ai-llm-guide-2025', 'react-clean-architecture', 'deep-work-summary-book');
  `);

  // Safe migration for existing SQLite databases missing google_id / is_verified
  const userCols = sqliteDb.prepare('PRAGMA table_info(users)').all() as Array<{ name: string }>;
  const colNames = new Set(userCols.map((c) => c.name));
  if (!colNames.has('google_id')) {
    sqliteDb.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
  }
  if (!colNames.has('is_verified')) {
    sqliteDb.exec('ALTER TABLE users ADD COLUMN is_verified INTEGER DEFAULT 0');
  }

  activeBackend = 'sqlite';
  console.log(`Storage initialized with persistent SQLite (${dbPath}).`);
}

export async function initStorage(): Promise<void> {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (connectionString) {
    const pool = new pg.Pool({
      connectionString,
      ssl: connectionString.includes('localhost') || connectionString.includes('127.0.0.1')
        ? false
        : { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 15000,
    });
    pool.on('error', (err) => {
      console.error('PostgreSQL pool error:', err.message);
    });

    try {
      const client = await pool.connect();
      try {
        await client.query(`
          CREATE TABLE IF NOT EXISTS users (
            id VARCHAR(100) PRIMARY KEY,
            google_id VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            username VARCHAR(100) UNIQUE NOT NULL,
            display_name VARCHAR(150) NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            avatar_url VARCHAR(500) DEFAULT '',
            bio TEXT DEFAULT '',
            is_verified BOOLEAN DEFAULT false,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          ALTER TABLE users ALTER COLUMN email DROP NOT NULL;
          ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255);
          ALTER TABLE users ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;

          CREATE TABLE IF NOT EXISTS shared_markdown_files (
            id VARCHAR(100) PRIMARY KEY,
            title VARCHAR(255) NOT NULL,
            content TEXT NOT NULL,
            description VARCHAR(500) DEFAULT '',
            author_name VARCHAR(100) DEFAULT 'کاربر',
            user_id VARCHAR(100),
            tags TEXT[] DEFAULT '{}'::text[],
            is_public BOOLEAN DEFAULT false,
            views_count INTEGER DEFAULT 0,
            stars_count INTEGER DEFAULT 0,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
          );

          ALTER TABLE shared_markdown_files ADD COLUMN IF NOT EXISTS user_id VARCHAR(100);
          ALTER TABLE shared_markdown_files ADD COLUMN IF NOT EXISTS visibility VARCHAR(20);
          ALTER TABLE shared_markdown_files ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

          UPDATE shared_markdown_files
          SET visibility = CASE WHEN is_public = true THEN 'public' ELSE 'private' END
          WHERE visibility IS NULL OR visibility NOT IN ('private', 'unlisted', 'public');

          ALTER TABLE shared_markdown_files ALTER COLUMN visibility SET DEFAULT 'private';

          CREATE INDEX IF NOT EXISTS idx_shared_files_created ON shared_markdown_files(created_at DESC);
          CREATE INDEX IF NOT EXISTS idx_shared_files_public ON shared_markdown_files(is_public);
          CREATE INDEX IF NOT EXISTS idx_shared_files_visibility ON shared_markdown_files(visibility);
          CREATE INDEX IF NOT EXISTS idx_shared_files_user ON shared_markdown_files(user_id);

          DELETE FROM shared_markdown_files
          WHERE user_id IS NULL
            AND id IN ('ai-llm-guide-2025', 'react-clean-architecture', 'deep-work-summary-book');

          UPDATE shared_markdown_files f
          SET author_name = u.display_name
          FROM users u
          WHERE f.user_id = u.id AND u.display_name IS NOT NULL AND u.display_name != '';
        `);
        pgPool = pool;
        activeBackend = 'postgres';
        console.log('Storage initialized with PostgreSQL.');
        return;
      } finally {
        client.release();
      }
    } catch (err: any) {
      console.warn('PostgreSQL unavailable, falling back to persistent local SQLite:', err.message);
      await pool.end().catch(() => {});
    }
  }

  initSqlite();
}

export const storage = {
  getBackendType() {
    return activeBackend;
  },

  async getHealthStats(): Promise<{
    totalFiles: number;
    totalViews: number;
    totalStars: number;
    totalUsers: number;
  }> {
    if (activeBackend === 'postgres' && pgPool) {
      const statsRes = await pgPool.query(`
        SELECT 
          COUNT(*) as total_files,
          COALESCE(SUM(views_count), 0) as total_views,
          COALESCE(SUM(stars_count), 0) as total_stars
        FROM shared_markdown_files
        WHERE visibility = 'public'
      `);
      const usersCountRes = await pgPool.query('SELECT COUNT(*) as total_users FROM users');
      return {
        totalFiles: Number(statsRes.rows[0].total_files),
        totalViews: Number(statsRes.rows[0].total_views),
        totalStars: Number(statsRes.rows[0].total_stars),
        totalUsers: Number(usersCountRes.rows[0].total_users),
      };
    }

    const db = sqliteDb!;
    const stats = db
      .prepare(
        `SELECT COUNT(*) as total_files, COALESCE(SUM(views_count), 0) as total_views, COALESCE(SUM(stars_count), 0) as total_stars FROM shared_markdown_files WHERE visibility = 'public'`
      )
      .get() as any;
    const users = db.prepare('SELECT COUNT(*) as total_users FROM users').get() as any;
    return {
      totalFiles: Number(stats?.total_files || 0),
      totalViews: Number(stats?.total_views || 0),
      totalStars: Number(stats?.total_stars || 0),
      totalUsers: Number(users?.total_users || 0),
    };
  },

  async findUserByEmail(email: string): Promise<UserRow | null> {
    const clean = email.trim().toLowerCase();
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        'SELECT id, email, username, display_name, avatar_url, bio, created_at FROM users WHERE LOWER(email) = $1',
        [clean]
      );
      return res.rows[0] || null;
    }
    const row = sqliteDb!
      .prepare('SELECT id, email, username, display_name, avatar_url, bio, created_at FROM users WHERE LOWER(email) = ?')
      .get(clean) as UserRow | undefined;
    return row || null;
  },

  async findUserByUsername(username: string): Promise<UserRow | null> {
    const clean = username.trim().toLowerCase();
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        'SELECT id, email, username, display_name, avatar_url, bio, created_at FROM users WHERE LOWER(username) = $1',
        [clean]
      );
      return res.rows[0] || null;
    }
    const row = sqliteDb!
      .prepare('SELECT id, email, username, display_name, avatar_url, bio, created_at FROM users WHERE LOWER(username) = ?')
      .get(clean) as UserRow | undefined;
    return row || null;
  },

  async findUserByEmailOrUsername(input: string): Promise<UserRow | null> {
    const clean = input.trim().toLowerCase();
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        'SELECT * FROM users WHERE LOWER(email) = $1 OR LOWER(username) = $1',
        [clean]
      );
      return res.rows[0] || null;
    }
    const row = sqliteDb!
      .prepare('SELECT * FROM users WHERE LOWER(email) = ? OR LOWER(username) = ?')
      .get(clean, clean) as UserRow | undefined;
    return row || null;
  },

  async findUserById(id: string): Promise<UserRow | null> {
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        'SELECT id, email, username, display_name, avatar_url, bio, created_at FROM users WHERE id = $1',
        [id]
      );
      return res.rows[0] || null;
    }
    const row = sqliteDb!
      .prepare('SELECT id, email, username, display_name, avatar_url, bio, created_at FROM users WHERE id = ?')
      .get(id) as UserRow | undefined;
    return row || null;
  },

  async isUsernameTaken(username: string, excludeUserId?: string): Promise<boolean> {
    const clean = username.trim().toLowerCase();
    if (activeBackend === 'postgres' && pgPool) {
      const res = excludeUserId
        ? await pgPool.query('SELECT id FROM users WHERE LOWER(username) = $1 AND id != $2', [clean, excludeUserId])
        : await pgPool.query('SELECT id FROM users WHERE LOWER(username) = $1', [clean]);
      return res.rows.length > 0;
    }
    const row = excludeUserId
      ? sqliteDb!.prepare('SELECT id FROM users WHERE LOWER(username) = ? AND id != ?').get(clean, excludeUserId)
      : sqliteDb!.prepare('SELECT id FROM users WHERE LOWER(username) = ?').get(clean);
    return Boolean(row);
  },

  async isEmailTaken(email: string): Promise<boolean> {
    const clean = email.trim().toLowerCase();
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query('SELECT id FROM users WHERE LOWER(email) = $1', [clean]);
      return res.rows.length > 0;
    }
    const row = sqliteDb!.prepare('SELECT id FROM users WHERE LOWER(email) = ?').get(clean);
    return Boolean(row);
  },

  async createUser(params: {
    id: string;
    email: string;
    username: string;
    displayName: string;
    passwordHash: string;
    avatarUrl?: string;
  }): Promise<UserRow> {
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        `
        INSERT INTO users (id, email, username, display_name, avatar_url, password_hash, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        RETURNING id, email, username, display_name, avatar_url, bio, created_at
        `,
        [params.id, params.email, params.username, params.displayName, params.avatarUrl || '', params.passwordHash]
      );
      return res.rows[0];
    }

    const now = new Date().toISOString();
    sqliteDb!
      .prepare(
        `INSERT INTO users (id, email, username, display_name, avatar_url, bio, password_hash, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, '', ?, ?, ?)`
      )
      .run(params.id, params.email, params.username, params.displayName, params.avatarUrl || '', params.passwordHash, now, now);

    return (await this.findUserById(params.id))!;
  },

  async upsertGoogleUser(params: {
    id: string;
    googleId: string;
    email: string;
    username: string;
    displayName: string;
    avatarUrl: string;
    passwordHash: string;
  }): Promise<UserRow> {
    const cleanEmail = params.email.trim().toLowerCase();

    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        `
        INSERT INTO users (id, google_id, email, username, display_name, avatar_url, password_hash, is_verified, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, true, NOW(), NOW())
        ON CONFLICT (email) DO UPDATE
        SET
          google_id = COALESCE(EXCLUDED.google_id, users.google_id),
          display_name = CASE
            WHEN users.display_name IS NOT NULL AND users.display_name != '' THEN users.display_name
            ELSE EXCLUDED.display_name
          END,
          avatar_url = CASE
            WHEN EXCLUDED.avatar_url IS NOT NULL AND EXCLUDED.avatar_url != '' THEN EXCLUDED.avatar_url
            ELSE users.avatar_url
          END,
          is_verified = true,
          updated_at = NOW()
        RETURNING id, google_id, email, username, display_name, avatar_url, bio, is_verified, created_at
        `,
        [
          params.id,
          params.googleId,
          cleanEmail,
          params.username,
          params.displayName,
          params.avatarUrl,
          params.passwordHash,
        ]
      );
      return res.rows[0];
    }

    const now = new Date().toISOString();
    const existing = await this.findUserByEmail(cleanEmail);
    if (existing) {
      const nextDisplayName = existing.display_name?.trim() ? existing.display_name : params.displayName;
      const nextAvatar = params.avatarUrl || existing.avatar_url || '';
      sqliteDb!
        .prepare(
          `UPDATE users
           SET google_id = COALESCE(?, google_id),
               display_name = ?,
               avatar_url = ?,
               is_verified = 1,
               updated_at = ?
           WHERE id = ?`
        )
        .run(params.googleId, nextDisplayName, nextAvatar, now, existing.id);
      return (await this.findUserById(existing.id))!;
    }

    sqliteDb!
      .prepare(
        `INSERT INTO users (id, google_id, email, username, display_name, avatar_url, bio, password_hash, is_verified, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, '', ?, 1, ?, ?)`
      )
      .run(
        params.id,
        params.googleId,
        cleanEmail,
        params.username,
        params.displayName,
        params.avatarUrl,
        params.passwordHash,
        now,
        now
      );

    return (await this.findUserById(params.id))!;
  },

  async updateUser(
    id: string,
    params: {
      displayName?: string | null;
      username?: string | null;
      bio?: string | null;
      avatarUrl?: string | null;
    }
  ): Promise<UserRow> {
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
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
        [params.displayName ?? null, params.username ?? null, params.bio ?? null, params.avatarUrl ?? null, id]
      );
      if (params.displayName) {
        await pgPool.query('UPDATE shared_markdown_files SET author_name = $1 WHERE user_id = $2', [
          params.displayName,
          id,
        ]);
      }
      return res.rows[0];
    }

    const existing = await this.findUserById(id);
    const nextDisplayName = params.displayName ?? existing!.display_name;
    const nextUsername = params.username ?? existing!.username;
    const nextBio = params.bio ?? existing!.bio;
    const nextAvatar = params.avatarUrl ?? existing!.avatar_url;
    const now = new Date().toISOString();

    sqliteDb!
      .prepare(
        `UPDATE users SET display_name = ?, username = ?, bio = ?, avatar_url = ?, updated_at = ? WHERE id = ?`
      )
      .run(nextDisplayName, nextUsername, nextBio, nextAvatar, now, id);

    if (params.displayName) {
      sqliteDb!
        .prepare('UPDATE shared_markdown_files SET author_name = ? WHERE user_id = ?')
        .run(params.displayName, id);
    }
    return (await this.findUserById(id))!;
  },

  async getMyDocuments(userId: string): Promise<FileRow[]> {
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        `
        SELECT 
          f.id, f.title, f.content, f.description, 
          COALESCE(NULLIF(u.display_name, ''), f.author_name) as author_name,
          u.username as author_username,
          u.avatar_url as author_avatar,
          f.user_id, f.tags, f.visibility, f.is_public, f.is_favorite,
          f.views_count, f.stars_count, f.created_at, f.updated_at
        FROM shared_markdown_files f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.user_id = $1
        ORDER BY f.updated_at DESC
        `,
        [userId]
      );
      return res.rows;
    }

    const rows = sqliteDb!
      .prepare(
        `
        SELECT 
          f.id, f.title, f.content, f.description,
          COALESCE(NULLIF(u.display_name, ''), f.author_name) as author_name,
          u.username as author_username,
          u.avatar_url as author_avatar,
          f.user_id, f.tags, f.visibility, f.is_public, f.is_favorite,
          f.views_count, f.stars_count, f.created_at, f.updated_at
        FROM shared_markdown_files f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.user_id = ?
        ORDER BY f.updated_at DESC
        `
      )
      .all(userId);
    return rows.map(normalizeSqliteFile);
  },

  async getPublicFiles(params: {
    search?: string;
    tag?: string;
    sort: string;
    limit: number;
    offset: number;
  }): Promise<{ files: FileRow[]; tags: { tag: string; count: number }[] }> {
    if (activeBackend === 'postgres' && pgPool) {
      let query = `
        SELECT 
          f.id, f.title, f.description, 
          COALESCE(NULLIF(u.display_name, ''), f.author_name) as author_name,
          u.username as author_username,
          u.avatar_url as author_avatar,
          f.user_id, f.tags, f.visibility, f.is_public, f.views_count, f.stars_count, f.created_at, f.updated_at,
          LENGTH(f.content) as content_length
        FROM shared_markdown_files f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.visibility = 'public'
      `;
      const qParams: any[] = [];
      let paramIndex = 1;

      if (params.search?.trim()) {
        query += ` AND (f.title ILIKE $${paramIndex} OR f.description ILIKE $${paramIndex} OR f.content ILIKE $${paramIndex} OR COALESCE(u.display_name, f.author_name) ILIKE $${paramIndex})`;
        qParams.push(`%${params.search.trim()}%`);
        paramIndex++;
      }
      if (params.tag?.trim()) {
        query += ` AND $${paramIndex} = ANY(f.tags)`;
        qParams.push(params.tag.trim());
        paramIndex++;
      }

      if (params.sort === 'popular') {
        query += ' ORDER BY f.stars_count DESC, f.created_at DESC';
      } else if (params.sort === 'views') {
        query += ' ORDER BY f.views_count DESC, f.created_at DESC';
      } else {
        query += ' ORDER BY f.created_at DESC';
      }

      query += ` LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
      qParams.push(params.limit, params.offset);

      const result = await pgPool.query(query, qParams);
      const tagsRes = await pgPool.query(`
        SELECT DISTINCT unnest(tags) as tag, COUNT(*) as count
        FROM shared_markdown_files
        WHERE visibility = 'public'
        GROUP BY tag
        ORDER BY count DESC
        LIMIT 20
      `);
      return { files: result.rows, tags: tagsRes.rows.map((r: any) => ({ tag: r.tag, count: Number(r.count) })) };
    }

    // SQLite implementation
    const rows = sqliteDb!
      .prepare(
        `
        SELECT 
          f.id, f.title, f.content, f.description,
          COALESCE(NULLIF(u.display_name, ''), f.author_name) as author_name,
          u.username as author_username,
          u.avatar_url as author_avatar,
          f.user_id, f.tags, f.visibility, f.is_public, f.is_favorite,
          f.views_count, f.stars_count, f.created_at, f.updated_at,
          LENGTH(f.content) as content_length
        FROM shared_markdown_files f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.visibility = 'public'
        `
      )
      .all()
      .map(normalizeSqliteFile);

    // Collect tags across all public files
    const tagCounts = new Map<string, number>();
    rows.forEach((f) => {
      f.tags.forEach((t) => {
        if (t.trim()) tagCounts.set(t.trim(), (tagCounts.get(t.trim()) || 0) + 1);
      });
    });
    const tags = Array.from(tagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    let filtered = rows;
    if (params.search?.trim()) {
      const q = params.search.trim().toLowerCase();
      filtered = filtered.filter(
        (f) =>
          f.title.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          f.content.toLowerCase().includes(q) ||
          f.author_name.toLowerCase().includes(q)
      );
    }
    if (params.tag?.trim()) {
      const targetTag = params.tag.trim();
      filtered = filtered.filter((f) => f.tags.includes(targetTag));
    }

    filtered.sort((a, b) => {
      if (params.sort === 'popular') {
        return b.stars_count - a.stars_count || b.created_at.localeCompare(a.created_at);
      }
      if (params.sort === 'views') {
        return b.views_count - a.views_count || b.created_at.localeCompare(a.created_at);
      }
      return b.created_at.localeCompare(a.created_at);
    });

    const sliced = filtered.slice(params.offset, params.offset + params.limit).map((f) => ({
      ...f,
      content: '',
    }));

    return { files: sliced, tags };
  },

  async getFileById(id: string): Promise<FileRow | null> {
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
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
      return res.rows[0] || null;
    }

    const row = sqliteDb!
      .prepare(
        `
        SELECT 
          f.*,
          COALESCE(NULLIF(u.display_name, ''), f.author_name) as author_name,
          u.username as author_username,
          u.avatar_url as author_avatar
        FROM shared_markdown_files f
        LEFT JOIN users u ON f.user_id = u.id
        WHERE f.id = ?
        `
      )
      .get(id);
    return row ? normalizeSqliteFile(row) : null;
  },

  async incrementFileViews(id: string): Promise<void> {
    if (activeBackend === 'postgres' && pgPool) {
      await pgPool.query('UPDATE shared_markdown_files SET views_count = views_count + 1 WHERE id = $1', [id]);
      return;
    }
    sqliteDb!.prepare('UPDATE shared_markdown_files SET views_count = views_count + 1 WHERE id = ?').run(id);
  },

  async createFile(params: {
    id: string;
    title: string;
    content: string;
    description: string;
    authorName: string;
    userId: string;
    tags: string[];
    visibility: DocVisibility;
    isPublic: boolean;
    isFavorite: boolean;
  }): Promise<FileRow> {
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        `
        INSERT INTO shared_markdown_files (id, title, content, description, author_name, user_id, tags, visibility, is_public, is_favorite, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
        RETURNING *
        `,
        [
          params.id,
          params.title,
          params.content,
          params.description,
          params.authorName,
          params.userId,
          params.tags,
          params.visibility,
          params.isPublic,
          params.isFavorite,
        ]
      );
      return res.rows[0];
    }

    const now = new Date().toISOString();
    sqliteDb!
      .prepare(
        `
        INSERT INTO shared_markdown_files (id, title, content, description, author_name, user_id, tags, visibility, is_public, is_favorite, views_count, stars_count, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)
        `
      )
      .run(
        params.id,
        params.title,
        params.content,
        params.description,
        params.authorName,
        params.userId,
        JSON.stringify(params.tags),
        params.visibility,
        params.isPublic ? 1 : 0,
        params.isFavorite ? 1 : 0,
        now,
        now
      );

    return (await this.getFileById(params.id))!;
  },

  async updateFile(
    id: string,
    params: {
      title?: string | null;
      content?: string | null;
      description?: string | null;
      tags?: string[] | null;
      visibility?: DocVisibility | null;
      isPublic?: boolean | null;
      isFavorite?: boolean | null;
    }
  ): Promise<FileRow> {
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        `
        UPDATE shared_markdown_files 
        SET 
          title = COALESCE($1, title),
          content = COALESCE($2, content),
          description = COALESCE($3, description),
          tags = COALESCE($4, tags),
          visibility = COALESCE($5, visibility),
          is_public = COALESCE($6, is_public),
          is_favorite = COALESCE($7, is_favorite),
          updated_at = NOW()
        WHERE id = $8
        RETURNING *
        `,
        [
          params.title ?? null,
          params.content ?? null,
          params.description ?? null,
          params.tags ?? null,
          params.visibility ?? null,
          params.isPublic ?? null,
          params.isFavorite ?? null,
          id,
        ]
      );
      return res.rows[0];
    }

    const existing = (await this.getFileById(id))!;
    const now = new Date().toISOString();
    const nextTitle = params.title ?? existing.title;
    const nextContent = params.content !== undefined && params.content !== null ? params.content : existing.content;
    const nextDescription =
      params.description !== undefined && params.description !== null ? params.description : existing.description;
    const nextTags = params.tags ?? existing.tags;
    const nextVisibility = params.visibility ?? existing.visibility;
    const nextIsPublic =
      params.isPublic !== undefined && params.isPublic !== null ? params.isPublic : existing.is_public;
    const nextIsFavorite =
      params.isFavorite !== undefined && params.isFavorite !== null ? params.isFavorite : existing.is_favorite;

    sqliteDb!
      .prepare(
        `
        UPDATE shared_markdown_files
        SET title = ?, content = ?, description = ?, tags = ?, visibility = ?, is_public = ?, is_favorite = ?, updated_at = ?
        WHERE id = ?
        `
      )
      .run(
        nextTitle,
        nextContent,
        nextDescription,
        JSON.stringify(nextTags),
        nextVisibility,
        nextIsPublic ? 1 : 0,
        nextIsFavorite ? 1 : 0,
        now,
        id
      );

    return (await this.getFileById(id))!;
  },

  async deleteFile(id: string): Promise<void> {
    if (activeBackend === 'postgres' && pgPool) {
      await pgPool.query('DELETE FROM shared_markdown_files WHERE id = $1', [id]);
      return;
    }
    sqliteDb!.prepare('DELETE FROM shared_markdown_files WHERE id = ?').run(id);
  },

  async starPublicFile(id: string): Promise<number | null> {
    if (activeBackend === 'postgres' && pgPool) {
      const res = await pgPool.query(
        "UPDATE shared_markdown_files SET stars_count = stars_count + 1 WHERE id = $1 AND visibility = 'public' RETURNING stars_count",
        [id]
      );
      return res.rows.length > 0 ? Number(res.rows[0].stars_count) : null;
    }

    const res = sqliteDb!
      .prepare("UPDATE shared_markdown_files SET stars_count = stars_count + 1 WHERE id = ? AND visibility = 'public'")
      .run(id);
    if (res.changes === 0) return null;
    const updated = sqliteDb!.prepare('SELECT stars_count FROM shared_markdown_files WHERE id = ?').get(id) as any;
    return Number(updated?.stars_count || 0);
  },
};
