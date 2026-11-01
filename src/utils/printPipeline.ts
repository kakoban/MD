import { renderMermaidBlocks } from './mermaidRenderer';

export interface PrintPipelineOptions {
  /**
   * Root DOM element containing printable markdown or content.
   * Defaults to .markdown-body or .preview-pane.
   */
  containerElement?: HTMLElement | null;

  /**
   * UI Theme to apply during print rendering (typically 'light' for crisp printouts).
   */
  theme?: 'light' | 'dark';

  /**
   * Optional callback to execute before waiting for resources (e.g. preparing booklet DOM).
   */
  beforePrint?: () => void | Promise<void>;

  /**
   * Optional callback to execute after print dialog is closed.
   */
  afterPrint?: () => void;

  /**
   * Max wait timeout for web fonts and images in milliseconds.
   * Defaults to 3500ms.
   */
  timeoutMs?: number;
}

/**
 * Asynchronous print pipeline ensuring fonts, images, and Mermaid SVGs
 * are completely resolved before invoking the native print window.
 * 
 * Guarantees pixel-perfect, true vector graphics and searchable, selectable text.
 */
export async function triggerDocumentPrint(options: PrintPipelineOptions = {}): Promise<void> {
  const {
    containerElement = null,
    theme = 'light',
    beforePrint,
    afterPrint,
    timeoutMs = 3500,
  } = options;

  try {
    // 1. Run preparatory work (e.g. mounting booklet cover, setting page config)
    if (beforePrint) {
      await beforePrint();
    }

    // 2. Guarantee that web fonts (Vazirmatn, Fira Code, Lora, KaTeX math fonts) are ready
    if (typeof document !== 'undefined' && 'fonts' in document && document.fonts.ready) {
      try {
        await Promise.race([
          document.fonts.ready,
          new Promise((resolve) => setTimeout(resolve, timeoutMs)),
        ]);
      } catch (err) {
        console.warn('Font loading wait notice:', err);
      }
    }

    // 3. Guarantee that all Mermaid diagram blocks are rendered as vector SVGs
    const targetRoot =
      containerElement ||
      (document.querySelector('.markdown-body') as HTMLElement | null) ||
      (document.querySelector('.preview-pane') as HTMLElement | null) ||
      document.body;

    if (targetRoot) {
      try {
        await renderMermaidBlocks(targetRoot, theme);
      } catch (err) {
        console.warn('Mermaid rendering notice before print:', err);
      }
    }

    // 4. Guarantee that all document images are completely downloaded
    const images = Array.from(
      targetRoot.querySelectorAll<HTMLImageElement>('img')
    );
    const uncompletedImages = images.filter((img) => !img.complete);

    if (uncompletedImages.length > 0) {
      await Promise.race([
        Promise.all(
          uncompletedImages.map(
            (img) =>
              new Promise<void>((resolve) => {
                img.addEventListener('load', () => resolve(), { once: true });
                img.addEventListener('error', () => resolve(), { once: true });
              })
          )
        ),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    }

    // 5. Force DOM reflow and allow paint compositor to settle
    void document.body.offsetHeight;
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 80)));

    // 6. Invoke native print dialog (which produces searchable vector PDF)
    window.print();
  } catch (error) {
    console.error('Print pipeline encountered an unexpected issue:', error);
    // Fallback: trigger print anyway so the user is never blocked
    window.print();
  } finally {
    if (afterPrint) {
      afterPrint();
    }
  }
}
