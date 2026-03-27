<script lang="ts">
  import MarkdownDocPage from "$lib/components/docs/markdown-doc-page.svelte";
  import markdown from "$lib/content/how-it-works.md?raw";
</script>

<MarkdownDocPage
  {markdown}
  eyebrow="Documentation"
  title="How Motif Works"
  description="A conceptual walkthrough of the image-to-music-to-image loop and the ideas behind the project."
  sourcePath="src/lib/content/how-it-works.md"
/>
