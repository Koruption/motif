<script lang="ts">
  import "./layout.css";
  import "../app.css";

  import { Button } from "$lib/components/ui/button/index.js";
  import SplashScreen from "$lib/components/splash-screen/splash-screen.svelte";
  import { Toaster } from "$lib/components/ui/sonner/index.js";
  import { filePickerStore } from "$lib/stores/filePicker";
  import { generationConfigStore } from "$lib/stores/generationConfig";
  import {
    buildMotifExportZipBlob,
    downloadBlob,
  } from "$lib/utils/export-utils";
  import BrandGithub from "@tabler/icons-svelte/icons/brand-github";
  import Download from "@tabler/icons-svelte/icons/download";
  import { onMount } from "svelte";
  import { toast } from "svelte-sonner";

  let { children } = $props();
  let isExporting = $state(false);
  let appVisible = $state(false);
  let splashExiting = $state(false);
  let showSplash = $state(true);

  const githubUrl = "https://github.com/Koruption/motif";
  const splashVisibleMs = 900;
  const splashFadeMs = 500;

  const exportLabel = $derived(isExporting ? "Exporting..." : "Export ZIP");
  const canExport = $derived(
    $generationConfigStore.sequence != null && $filePickerStore.files.at(-1) != null,
  );

  onMount(() => {
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const visibleDelay = prefersReducedMotion ? 180 : splashVisibleMs;
    const fadeDelay = prefersReducedMotion ? 120 : splashFadeMs;

    const fadeInTimeout = window.setTimeout(() => {
      appVisible = true;
      splashExiting = true;
    }, visibleDelay);

    const hideTimeout = window.setTimeout(() => {
      showSplash = false;
    }, visibleDelay + fadeDelay);

    return () => {
      window.clearTimeout(fadeInTimeout);
      window.clearTimeout(hideTimeout);
    };
  });

  async function exportGeneratedAssets() {
    const imageFile = $filePickerStore.files.at(-1);
    const sequence = $generationConfigStore.sequence;

    if (!imageFile || !sequence || isExporting) return;

    isExporting = true;

    try {
      const baseName =
        imageFile.name.replace(/\.[^/.]+$/, "") || "motif-export";
      const zipBlob = await buildMotifExportZipBlob({
        imageFile,
        sequence,
        pixelationAmount: $generationConfigStore.pixelationAmount,
        baseName,
      });

      downloadBlob(zipBlob, `${baseName}-motif-export.zip`);
      toast.success("Exported your generated image and WAV as a ZIP.");
    } catch (error) {
      console.error("Failed to export the generated assets.", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Unable to export the generated assets.",
      );
    } finally {
      isExporting = false;
    }
  }
</script>

<Toaster />

{#if showSplash}
  <SplashScreen isExiting={splashExiting} />
{/if}

<div
  class={`flex h-screen min-h-0 flex-col overflow-hidden bg-black text-foreground transition-all duration-700 ease-out ${
    appVisible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0"
  }`}
>
  <header class="border-b border-white/10 bg-black/35 px-4 py-3 backdrop-blur-xl">
    <div class="flex items-center justify-between gap-3">
      <a
        href="/"
        class="text-sm font-semibold uppercase tracking-[0.38em] text-white"
      >
        Motif
      </a>

      <div class="flex items-center gap-2">
        <a
          href="/docs"
          class="rounded-full px-3 py-2 text-sm font-medium text-white/72 transition hover:bg-white/6 hover:text-white"
        >
          Docs
        </a>

        <a
          href="/how-it-works"
          class="rounded-full px-3 py-2 text-sm font-medium text-white/72 transition hover:bg-white/6 hover:text-white"
        >
          How It Works
        </a>

        <Button
          href={githubUrl}
          target="_blank"
          rel="noreferrer"
          variant="outline"
          size="icon"
          class="border-white/10 bg-white/5 text-white hover:bg-white/10"
          aria-label="Open the Motif GitHub repository"
        >
          <BrandGithub class="size-4" />
        </Button>

        <Button
          variant="secondary"
          class="bg-white text-neutral-950 hover:bg-neutral-200"
          onclick={exportGeneratedAssets}
          disabled={!canExport || isExporting}
        >
          <Download class="size-4" />
          {exportLabel}
        </Button>
      </div>
    </div>
  </header>

  <div class="min-h-0 flex-1 overflow-hidden">
    {@render children()}
  </div>
</div>
