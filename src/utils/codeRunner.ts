export type RunnableLanguage = 'html' | 'javascript' | 'python';

export interface RunResult {
  success: boolean;
  output?: string;
  htmlDoc?: string;
  error?: string;
  executionTimeMs: number;
  lang: RunnableLanguage;
}

export function getRunnableLanguage(lang?: string): RunnableLanguage | null {
  if (!lang) return null;
  const l = lang.trim().toLowerCase();
  if (l === 'html' || l === 'htm') return 'html';
  if (l === 'javascript' || l === 'js') return 'javascript';
  if (l === 'python' || l === 'py') return 'python';
  return null;
}

function formatValue(val: any): string {
  if (val === undefined) return 'undefined';
  if (val === null) return 'null';
  if (typeof val === 'object') {
    try {
      return JSON.stringify(val, null, 2);
    } catch {
      return String(val);
    }
  }
  return String(val);
}

// Global cached Pyodide loader
let pyodideLoadingPromise: Promise<any> | null = null;

export async function loadPyodideInstance(onStatusUpdate?: (status: string) => void): Promise<any> {
  const win = window as any;
  if (win.__pyodideInstance) {
    return win.__pyodideInstance;
  }

  if (!pyodideLoadingPromise) {
    pyodideLoadingPromise = (async () => {
      onStatusUpdate?.('در حال بارگذاری موتور پایتون (Pyodide WebAssembly)...');
      if (!win.loadPyodide) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js';
          script.async = true;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error('عدم امکان دانلود ماژول Pyodide از CDN'));
          document.head.appendChild(script);
        });
      }

      onStatusUpdate?.('در حال راه‌اندازی محیط مفسر پایتون...');
      const pyodide = await win.loadPyodide({
        indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/',
      });
      win.__pyodideInstance = pyodide;
      return pyodide;
    })();
  }

  return pyodideLoadingPromise;
}

export async function executeCode(
  code: string,
  rawLang: string,
  onStatusUpdate?: (status: string) => void
): Promise<RunResult> {
  const lang = getRunnableLanguage(rawLang);
  if (!lang) {
    return {
      success: false,
      error: `زبان ${rawLang} برای اجرای مستقیم پشتیبانی نمی‌شود.`,
      executionTimeMs: 0,
      lang: 'javascript',
    };
  }

  const startTime = performance.now();

  // 1. HTML Execution: Render in Sandboxed Preview
  if (lang === 'html') {
    return {
      success: true,
      htmlDoc: code,
      executionTimeMs: Math.round(performance.now() - startTime),
      lang: 'html',
    };
  }

  // 2. JavaScript Execution
  if (lang === 'javascript') {
    const logs: string[] = [];
    const customConsole = {
      log: (...args: any[]) => logs.push(args.map(formatValue).join(' ')),
      info: (...args: any[]) => logs.push(args.map(formatValue).join(' ')),
      warn: (...args: any[]) => logs.push('⚠️ ' + args.map(formatValue).join(' ')),
      error: (...args: any[]) => logs.push('❌ ' + args.map(formatValue).join(' ')),
    };

    try {
      // Execute in isolated function scope
      const runner = new Function('console', `"use strict";\n${code}`);
      const result = runner(customConsole);
      if (result !== undefined) {
        logs.push(`=> ${formatValue(result)}`);
      }
      return {
        success: true,
        output: logs.length > 0 ? logs.join('\n') : '(کد با موفقیت اجرا شد بدون خروجی کنسول)',
        executionTimeMs: Math.round(performance.now() - startTime),
        lang: 'javascript',
      };
    } catch (err: any) {
      return {
        success: false,
        output: logs.join('\n'),
        error: err?.message || String(err),
        executionTimeMs: Math.round(performance.now() - startTime),
        lang: 'javascript',
      };
    }
  }

  // 3. Python Execution (via Pyodide WebAssembly)
  if (lang === 'python') {
    try {
      const pyodide = await loadPyodideInstance(onStatusUpdate);
      onStatusUpdate?.('در حال اجرای کد پایتون...');

      const logs: string[] = [];
      pyodide.setStdout({ batched: (msg: string) => logs.push(msg) });
      pyodide.setStderr({ batched: (msg: string) => logs.push(`[stderr] ${msg}`) });

      const evalResult = await pyodide.runPythonAsync(code);
      if (evalResult !== undefined && evalResult !== null) {
        // Only append evalResult if it's not None
        const strVal = String(evalResult);
        if (strVal && strVal !== 'None') {
          logs.push(strVal);
        }
      }

      return {
        success: true,
        output: logs.length > 0 ? logs.join('\n') : '(کد پایتون با موفقیت اجرا شد بدون خروجی print)',
        executionTimeMs: Math.round(performance.now() - startTime),
        lang: 'python',
      };
    } catch (err: any) {
      return {
        success: false,
        error: err?.message || String(err),
        executionTimeMs: Math.round(performance.now() - startTime),
        lang: 'python',
      };
    }
  }

  return {
    success: false,
    error: 'زبان ناشناخته',
    executionTimeMs: 0,
    lang,
  };
}
