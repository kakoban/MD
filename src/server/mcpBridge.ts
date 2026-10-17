import { Request, Response } from 'express';
import pg from 'pg';

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
    name: 'hub_smart_search',
    description: 'جستجوی هوشمند در اسناد مارک‌دان بر اساس عنوان، تگ‌ها یا متن (صرفه‌جویی ۹۰٪ توکن)',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'متن یا کلمه کلیدی مورد جستجو' },
        limit: { type: 'number', description: 'حداکثر تعداد نتایج (پیش‌فرض ۱۰)' },
      },
      required: ['query'],
    },
  },
  {
    name: 'hub_read_note_with_graph',
    description: 'خواندن کامل محتوای یک سند مارک‌دان به همراه پیوندهای متصل به آن (Synapse Links)',
    inputSchema: {
      type: 'object',
      properties: {
        fileIdOrTitle: { type: 'string', description: 'شناسه یا عنوان دقیق سند' },
      },
      required: ['fileIdOrTitle'],
    },
  },
  {
    name: 'hub_list_documents',
    description: 'دریافت فهرست تمام اسناد ثبت‌شده، سرفصل‌ها و خلاصه‌ها در مخزن ابری',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'تعداد اسناد (پیش‌فرض ۲۰)' },
      },
    },
  },
];

export async function handleMcpJsonRpc(pool: pg.Pool, req: Request, res: Response): Promise<void> {
  const { jsonrpc, id, method, params } = req.body || {};

  if (jsonrpc !== '2.0') {
    res.status(400).json({ jsonrpc: '2.0', id: id || null, error: { code: -32600, message: 'Invalid Request: jsonrpc must be 2.0' } });
    return;
  }

  // 1. Initialize MCP handshake
  if (method === 'initialize') {
    res.json({
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
          version: '1.0.0',
        },
      },
    });
    return;
  }

  // 2. List tools
  if (method === 'tools/list') {
    res.json({
      jsonrpc: '2.0',
      id,
      result: {
        tools: MCP_TOOLS,
      },
    });
    return;
  }

  // 3. Call tool
  if (method === 'tools/call') {
    const toolName = params?.name;
    const args = params?.arguments || {};

    try {
      if (toolName === 'hub_smart_search') {
        const queryStr = String(args.query || '').trim().toLowerCase();
        const limitNum = Math.min(Number(args.limit) || 10, 50);

        const result = await pool.query(
          `SELECT id, title, description, author_name, tags, updated_at
           FROM shared_markdown_files
           WHERE is_public = true AND (
             LOWER(title) LIKE $1 OR
             LOWER(description) LIKE $1 OR
             LOWER(content) LIKE $1
           )
           ORDER BY updated_at DESC
           LIMIT $2`,
          [`%${queryStr}%`, limitNum]
        );

        res.json({
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
        });
        return;
      }

      if (toolName === 'hub_read_note_with_graph') {
        const target = String(args.fileIdOrTitle || '').trim();
        const result = await pool.query(
          `SELECT id, title, content, description, author_name, tags, updated_at
           FROM shared_markdown_files
           WHERE id = $1 OR LOWER(title) = LOWER($1)
           LIMIT 1`,
          [target]
        );

        if (result.rows.length === 0) {
          res.json({
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `سند با شناسه یا عنوان «${target}» یافت نشد.` }],
              isError: true,
            },
          });
          return;
        }

        const doc = result.rows[0];
        // Parse inbound / outbound synapse links
        const linkMatches = [...doc.content.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((m) => m[1]);

        res.json({
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
        });
        return;
      }

      if (toolName === 'hub_list_documents') {
        const limitNum = Math.min(Number(args.limit) || 20, 100);
        const result = await pool.query(
          `SELECT id, title, description, author_name, tags, updated_at
           FROM shared_markdown_files
           WHERE is_public = true
           ORDER BY updated_at DESC
           LIMIT $1`,
          [limitNum]
        );

        res.json({
          jsonrpc: '2.0',
          id,
          result: {
            content: [{ type: 'text', text: JSON.stringify(result.rows, null, 2) }],
          },
        });
        return;
      }

      res.status(404).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32601, message: `Tool not found: ${toolName}` },
      });
    } catch (err: any) {
      res.status(500).json({
        jsonrpc: '2.0',
        id,
        error: { code: -32000, message: err?.message || 'Server error executing tool' },
      });
    }
    return;
  }

  res.status(404).json({
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: `Method not found: ${method}` },
  });
}
