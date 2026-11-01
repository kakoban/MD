import mermaid from 'mermaid';

let isInitialized = false;
let currentTheme: 'light' | 'dark' = 'light';
let debounceTimer: any = null;

/**
 * Configure and initialize Mermaid with Vazirmatn Persian typography,
 * loose security, and theme matching the app theme.
 */
export function initMermaid(theme: 'light' | 'dark' = 'light'): void {
  currentTheme = theme;
  const isDark = theme === 'dark';

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'loose',
    fontFamily: 'Vazirmatn, -apple-system, BlinkMacSystemFont, Tahoma, sans-serif',
    theme: isDark ? 'dark' : 'default',
    themeVariables: {
      fontFamily: 'Vazirmatn, -apple-system, BlinkMacSystemFont, Tahoma, sans-serif',
      fontSize: '13px',
      primaryColor: isDark ? '#1e293b' : '#eff6ff',
      primaryBorderColor: isDark ? '#3b82f6' : '#0061FF',
      primaryTextColor: isDark ? '#f8fafc' : '#0f172a',
      secondaryColor: isDark ? '#0f172a' : '#f8fafc',
      tertiaryColor: isDark ? '#334155' : '#f1f5f9',
      lineColor: isDark ? '#64748b' : '#94a3b8',
      textColor: isDark ? '#f1f5f9' : '#1e293b',
      mainBkg: isDark ? '#1e293b' : '#ffffff',
      nodeBorder: isDark ? '#3b82f6' : '#0061FF',
      clusterBkg: isDark ? '#0f172a' : '#f8fafc',
      clusterBorder: isDark ? '#334155' : '#e2e8f0',
      edgeLabelBackground: isDark ? '#1e293b' : '#ffffff',
      actorBorder: isDark ? '#3b82f6' : '#0061FF',
      actorBkg: isDark ? '#1e293b' : '#eff6ff',
      actorTextColor: isDark ? '#f8fafc' : '#0f172a',
      actorLineColor: isDark ? '#64748b' : '#94a3b8',
      signalColor: isDark ? '#94a3b8' : '#64748b',
      signalTextColor: isDark ? '#f8fafc' : '#0f172a',
      labelBoxBkgColor: isDark ? '#1e293b' : '#eff6ff',
      labelBoxBorderColor: isDark ? '#3b82f6' : '#0061FF',
      labelTextColor: isDark ? '#f8fafc' : '#0f172a',
      loopTextColor: isDark ? '#f8fafc' : '#0f172a',
      noteBorderColor: isDark ? '#eab308' : '#ca8a04',
      noteBkgColor: isDark ? 'rgba(234, 179, 8, 0.15)' : '#fef9c3',
      noteTextColor: isDark ? '#fef08a' : '#854d0e',
    },
    suppressErrorRendering: true,
  });

  isInitialized = true;
}

/**
 * Render all .mermaid-block-wrapper elements in the DOM container.
 * Uses a unique ID per block and handles errors gracefully.
 */
export async function renderMermaidBlocks(
  rootElement: HTMLElement,
  theme: 'light' | 'dark' = 'light'
): Promise<void> {
  if (!isInitialized || currentTheme !== theme) {
    initMermaid(theme);
  }

  const wrappers = rootElement.querySelectorAll<HTMLElement>('.mermaid-block-wrapper');
  if (wrappers.length === 0) return;

  const renderPromises = Array.from(wrappers).map(async (wrapper, index) => {
    const rawCode = decodeURIComponent(wrapper.getAttribute('data-mermaid-code') || '').trim();
    if (!rawCode) return;

    const renderContainer = wrapper.querySelector<HTMLElement>('.mermaid-render-container');
    if (!renderContainer) return;

    // Check if already rendered for this exact code and theme
    const renderedAttr = wrapper.getAttribute('data-rendered-code');
    const renderedTheme = wrapper.getAttribute('data-rendered-theme');
    if (renderedAttr === rawCode && renderedTheme === theme && renderContainer.querySelector('svg')) {
      return;
    }

    const uniqueId = `mermaid-svg-${Date.now()}-${index}-${Math.random().toString(36).substring(2, 7)}`;

    try {
      // Validate and parse syntax
      const { svg } = await mermaid.render(uniqueId, rawCode);

      // Successfully rendered!
      renderContainer.innerHTML = svg;
      const svgElement = renderContainer.querySelector('svg');
      if (svgElement) {
        svgElement.classList.add('mermaid-svg', 'max-w-full', 'h-auto', 'transition-all');
        svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
      }

      wrapper.setAttribute('data-rendered-code', rawCode);
      wrapper.setAttribute('data-rendered-theme', theme);
      wrapper.classList.remove('has-mermaid-error');
    } catch (err: any) {
      console.warn('Mermaid rendering syntax notice:', err);
      wrapper.classList.add('has-mermaid-error');
      renderContainer.innerHTML = `
        <div class="mermaid-error-box w-full p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs font-mono text-start dir-ltr">
          <div class="font-bold flex items-center gap-1.5 mb-1.5 text-rose-600 dark:text-rose-400">
            <svg class="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>خطا در رسم نمودار Mermaid (Syntax Error)</span>
          </div>
          <pre class="overflow-x-auto text-[11px] p-2 bg-black/10 rounded mt-1 text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">${err?.message || 'نحوه نوشتار دیاگرام نامعتبر است.'}</pre>
        </div>
      `;
    }
  });

  await Promise.all(renderPromises);
}

/**
 * Debounced trigger for Mermaid rendering to avoid UI stutter on fast typing.
 */
export function debounceRenderMermaid(
  rootElement: HTMLElement,
  theme: 'light' | 'dark' = 'light',
  delayMs: number = 250
): Promise<void> {
  return new Promise((resolve) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(async () => {
      await renderMermaidBlocks(rootElement, theme);
      resolve();
    }, delayMs);
  });
}
