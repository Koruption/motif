<script lang="ts">
  import MarkdownDocPage from "$lib/components/docs/markdown-doc-page.svelte";
  import markdown from "$lib/content/docs.md?raw";
</script>

<MarkdownDocPage
  {markdown}
  eyebrow="SDK Docs"
  title="Motif SDK"
  description="Usage-first reference for building on top of the MarkovChain, Generator, and ToneBridge APIs."
  sourcePath="src/lib/content/docs.md"
/>
