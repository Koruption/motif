<script lang="ts">
  import { onMount } from "svelte";
  import { renderMarkdown } from "$lib/utils/markdown";

  type MathJaxWindow = Window & {
    MathJax?: {
      tex?: {
        inlineMath?: string[][];
        displayMath?: string[][];
      };
      svg?: {
        fontCache?: string;
      };
      startup?: {
        promise?: Promise<unknown>;
      };
      typesetPromise?: (elements?: HTMLElement[]) => Promise<unknown>;
    };
    hljs?: {
      highlightElement: (element: Element) => void;
    };
  };

  let {
    markdown,
    eyebrow = "Documentation",
    title = "Docs",
    description = "",
    sourcePath,
  }: {
    markdown: string;
    eyebrow?: string;
    title?: string;
    description?: string;
    sourcePath?: string;
  } = $props();

  const content = $derived(renderMarkdown(markdown));
  let article: HTMLElement;

  const ensureMathJax = async () => {
    const mathWindow = window as MathJaxWindow;

    if (mathWindow.MathJax?.typesetPromise) {
      await mathWindow.MathJax.startup?.promise;
      return;
    }

    mathWindow.MathJax = {
      tex: {
        inlineMath: [
          ["$", "$"],
          ["\\(", "\\)"],
        ],
        displayMath: [
          ["$$", "$$"],
          ["\\[", "\\]"],
        ],
      },
      svg: {
        fontCache: "global",
      },
    };

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(
        "motif-mathjax-script",
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Unable to load MathJax.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = "motif-mathjax-script";
      script.src = "https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load MathJax."));
      document.head.appendChild(script);
    });

    await mathWindow.MathJax?.startup?.promise;
  };

  const ensureHighlightJs = async () => {
    const highlightWindow = window as MathJaxWindow;

    if (highlightWindow.hljs?.highlightElement) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const existingScript = document.getElementById(
        "motif-highlightjs-script",
      ) as HTMLScriptElement | null;

      if (existingScript) {
        existingScript.addEventListener("load", () => resolve(), { once: true });
        existingScript.addEventListener(
          "error",
          () => reject(new Error("Unable to load highlight.js.")),
          { once: true },
        );
        return;
      }

      const script = document.createElement("script");
      script.id = "motif-highlightjs-script";
      script.src =
        "https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.11.1/build/highlight.min.js";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Unable to load highlight.js."));
      document.head.appendChild(script);
    });
  };

  onMount(async () => {
    const runtimeWindow = window as MathJaxWindow;

    try {
      await ensureHighlightJs();
      article.querySelectorAll("pre code").forEach((block) => {
        runtimeWindow.hljs?.highlightElement(block);
      });

      await ensureMathJax();
      await runtimeWindow.MathJax?.typesetPromise?.([article]);
    } catch (error) {
      console.error("Failed to typeset the docs page.", error);
    }
  });
</script>

<section class="h-full overflow-y-auto">
  <div class="min-h-full bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.12),transparent_28%),linear-gradient(180deg,rgba(10,10,10,0.96),rgba(0,0,0,1))] px-6 py-10 sm:px-10 lg:px-16">
    <div class="mx-auto max-w-5xl">
      <div class="mb-10 grid gap-6 border border-white/8 bg-white/[0.03] p-6 shadow-[0_30px_80px_-56px_rgba(16,185,129,0.65)] backdrop-blur sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <div>
          <p class="text-xs font-medium uppercase tracking-[0.32em] text-emerald-300/72">
            {eyebrow}
          </p>
          <h1 class="mt-3 text-4xl font-semibold tracking-tight text-white">
            {title}
          </h1>
          {#if description}
            <p class="mt-4 max-w-3xl text-base leading-8 text-white/62">
              {description}
            </p>
          {/if}
        </div>

        {#if sourcePath}
          <div class="justify-self-start sm:justify-self-end">
            <p class="text-[0.7rem] font-medium uppercase tracking-[0.24em] text-white/42">
              Source
            </p>
            <code class="mt-2 inline-block border border-white/10 bg-black/30 px-3 py-2 text-sm text-white/84">
              {sourcePath}
            </code>
          </div>
        {/if}
      </div>

      <article bind:this={article} class="markdown-content space-y-6">
        {@html content}
      </article>
    </div>
  </div>
</section>

<style>
  :global(.markdown-content img) {
    display: block;
    width: 100%;
    margin: 2rem 0;
    border: 1px solid rgb(255 255 255 / 0.1);
    border-radius: 1rem;
    box-shadow: 0 24px 80px -40px rgb(16 185 129 / 0.5);
  }

  :global(.markdown-content hr) {
    border: 0;
    border-top: 1px solid rgb(255 255 255 / 0.1);
  }

  :global(.markdown-content pre) {
    box-shadow: 0 24px 70px -50px rgb(0 0 0 / 0.9);
  }

  :global(.markdown-content .code-block) {
    margin: 2rem 0;
  }

  :global(.markdown-content .code-block__header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    border: 1px solid rgb(255 255 255 / 0.1);
    border-bottom: 0;
    border-top-left-radius: 1rem;
    border-top-right-radius: 1rem;
    background: linear-gradient(
      180deg,
      rgb(255 255 255 / 0.06),
      rgb(255 255 255 / 0.03)
    );
    padding: 0.7rem 1rem;
  }

  :global(.markdown-content .code-block__label) {
    font-size: 0.72rem;
    font-weight: 600;
    letter-spacing: 0.18em;
    text-transform: uppercase;
    color: rgb(167 243 208 / 0.72);
  }

  :global(.markdown-content .code-block__pre) {
    margin: 0;
  }

  :global(.markdown-content .code-block__pre code) {
    display: block;
    background: transparent;
    color: rgb(232 236 241);
  }

  :global(.markdown-content .hljs-keyword) {
    color: rgb(248 113 113);
  }

  :global(.markdown-content .hljs-string) {
    color: rgb(253 224 71);
  }

  :global(.markdown-content .hljs-number) {
    color: rgb(251 146 60);
  }

  :global(.markdown-content .hljs-title),
  :global(.markdown-content .hljs-title.class_),
  :global(.markdown-content .hljs-title.function_) {
    color: rgb(96 165 250);
  }

  :global(.markdown-content .hljs-params),
  :global(.markdown-content .hljs-variable),
  :global(.markdown-content .hljs-literal) {
    color: rgb(226 232 240);
  }

  :global(.markdown-content .hljs-built_in),
  :global(.markdown-content .hljs-type) {
    color: rgb(52 211 153);
  }

  :global(.markdown-content .hljs-comment) {
    color: rgb(148 163 184);
    font-style: italic;
  }

  :global(.markdown-content .hljs-meta),
  :global(.markdown-content .hljs-symbol),
  :global(.markdown-content .hljs-bullet) {
    color: rgb(196 181 253);
  }

  :global(.markdown-content .hljs-attr),
  :global(.markdown-content .hljs-attribute),
  :global(.markdown-content .hljs-property) {
    color: rgb(125 211 252);
  }

  :global(.markdown-content .hljs-subst) {
    color: inherit;
  }

  :global(.markdown-content a) {
    transition: color 160ms ease;
  }

  :global(.markdown-content mjx-container[display="true"]) {
    margin: 1.5rem 0;
    overflow-x: auto;
    overflow-y: hidden;
  }

  :global(.markdown-content .math-display) {
    margin: 1.5rem 0;
  }

  :global(.markdown-content mjx-container:not([display="true"])) {
    display: inline-block;
    margin: 0 0.08em;
    vertical-align: -0.08em;
  }

  :global(.markdown-content mjx-container) {
    color: white;
  }

  :global(.markdown-content .art-exhibit-wall) {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 1.5rem;
    margin: 2.5rem 0 3rem;
    padding: 1.5rem;
    background:
      linear-gradient(180deg, rgb(248 248 244 / 0.98), rgb(233 233 226 / 0.96));
    box-shadow:
      0 28px 70px -42px rgb(0 0 0 / 0.8),
      inset 0 1px 0 rgb(255 255 255 / 0.8);
  }

  :global(.markdown-content .art-exhibit-piece) {
    width: 100%;
    margin: 0;
    padding: 0.6rem;
    border: 1px solid rgb(15 23 42 / 0.08);
    border-radius: 0;
    background: linear-gradient(180deg, #fffefc, #f7f3ea);
    box-shadow:
      0 18px 30px -24px rgb(15 23 42 / 0.45),
      0 0 0 10px rgb(255 255 255 / 0.92);
  }

  @media (max-width: 720px) {
    :global(.markdown-content .art-exhibit-wall) {
      grid-template-columns: 1fr;
      padding: 1rem;
    }
  }
</style>
