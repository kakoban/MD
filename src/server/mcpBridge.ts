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

// Active SSE sessions for remote MCP clients (e.g. Claude.ai Connectors)
const sseSessions = new Map<string, Response>();

export function setCorsHeaders(res: Response): void {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept, X-Requested-With');
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
          version: '1.0.0',
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
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [{ type: 'text', text: `سند با شناسه یا عنوان «${target}» یافت نشد.` }],
              isError: true,
            },
          };
        }

        const doc = result.rows[0];
        const linkMatches = [...doc.content.matchAll(/\[\[([^\]\n]+)\]\]/g)].map((m) => m[1]);

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
        const limitNum = Math.min(Number(args.limit) || 20, 100);
        const result = await pool.query(
          `SELECT id, title, description, author_name, tags, updated_at
           FROM shared_markdown_files
           WHERE is_public = true
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
