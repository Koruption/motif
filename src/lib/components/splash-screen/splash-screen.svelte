<script lang="ts">
  import { onMount } from "svelte";

  let { isExiting = false }: { isExiting?: boolean } = $props();
  let frameIndex = $state(0);

  const frames = [
    "motif  [    ]",
    "motif  [=   ]",
    "motif  [==  ]",
    "motif  [=== ]",
    "motif  [ ===]",
    "motif  [  ==]",
    "motif  [   =]",
    "motif  [    ]",
  ];

  onMount(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      frameIndex = 3;
      return;
    }

    const interval = window.setInterval(() => {
      frameIndex = (frameIndex + 1) % frames.length;
    }, 90);

    return () => {
      window.clearInterval(interval);
    };
  });
</script>

<div
  class={`pointer-events-none fixed inset-0 z-50 flex items-center justify-center bg-black text-white transition-opacity duration-500 ease-out ${
    isExiting ? "opacity-0" : "opacity-100"
  }`}
  aria-hidden="true"
>
  <div class="flex flex-col items-center">
    <pre class="splash-ascii">{frames[frameIndex]}</pre>
    <p class="splash-subtitle">image to music</p>
  </div>
</div>

<style>
  .splash-ascii {
    margin: 0;
    min-width: 13ch;
    font-family:
      "SFMono-Regular", "SF Mono", "IBM Plex Mono", "Menlo", "Monaco",
      "Courier New", monospace;
    font-size: clamp(1rem, 2vw, 1.15rem);
    font-weight: 500;
    letter-spacing: 0.12em;
    color: rgb(255 255 255 / 0.92);
    text-transform: lowercase;
  }

  .splash-subtitle {
    margin: 0.85rem 0 0;
    font-size: 0.65rem;
    font-weight: 500;
    letter-spacing: 0.24em;
    text-transform: uppercase;
    color: rgb(255 255 255 / 0.42);
  }

  @media (prefers-reduced-motion: reduce) {
    .splash-ascii,
    .splash-subtitle {
      opacity: 1;
    }
  }
</style>
