<script lang="ts">
  import markdown from "$lib/content/how-it-works.md?raw";
  import { renderMarkdown } from "$lib/utils/markdown";

  const content = renderMarkdown(markdown);
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

      <article class="space-y-6" class:empty={!content}>
        {@html content}
      </article>
    </div>
  </div>
</section>
