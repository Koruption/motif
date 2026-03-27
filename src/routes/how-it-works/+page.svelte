<script lang="ts">
  import { onMount } from "svelte";
  import markdown from "$lib/content/how-it-works.md?raw";
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
  };

  const content = renderMarkdown(markdown);
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

  onMount(async () => {
    const mathWindow = window as MathJaxWindow;

    try {
      await ensureMathJax();
      await mathWindow.MathJax?.typesetPromise?.([article]);
    } catch (error) {
      console.error("Failed to typeset the How It Works page.", error);
    }
  });
</script>

<section class="h-full overflow-y-auto">
  <div class="min-h-full bg-[radial-gradient(circle_at_top,rgba(52,211,153,0.14),transparent_32%),linear-gradient(180deg,rgba(10,10,10,0.94),rgba(0,0,0,1))] px-6 py-10 sm:px-10 lg:px-16">
    <div class="mx-auto max-w-4xl">
      <div class="mb-8">
        <p class="text-xs font-medium uppercase tracking-[0.32em] text-emerald-300/72">
          Documentation
        </p>
        <p class="mt-3 max-w-2xl text-sm leading-7 text-white/55">
          Edit
          <code class="rounded bg-white/8 px-1.5 py-0.5 text-[0.92em] text-white">
            src/lib/content/how-it-works.md
          </code>
          to update this page.
        </p>
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
