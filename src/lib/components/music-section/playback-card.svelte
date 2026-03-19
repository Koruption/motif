<script lang="ts">
  import { filePickerStore } from "$lib/stores/filePicker";
  import PlayerPause from "@tabler/icons-svelte/icons/player-pause";
  import PlayerPlay from "@tabler/icons-svelte/icons/player-play";
  import { generationConfigStore } from "$lib/stores/generationConfig";
  import Download from "@tabler/icons-svelte/icons/download";
  import {
    ToneBridge,
    Dist,
    renderPlayableSequenceToWavBlob,
  } from "$lib/utils/music-utils";
  import type { PlayableSequence } from "$lib/utils/music-utils";
  import { onMount } from "svelte";

  let isPlaying = $state(false);
  let isDownloading = $state(false);
  let image = $state<string | null>(null);
  let toneBridge = $state.raw<ToneBridge | null>(null);
  let playbackElapsedSeconds = $state(0);
  let playbackBaseElapsedSeconds = $state(0);
  let playbackStartedAt = $state<number | null>(null);
  let scheduledSequence = $state.raw<PlayableSequence | null>(null);
  let activeSequence = $state.raw<PlayableSequence | null>(null);
  let progressFrame = 0;

  const progressRadius = 74;
  const progressCircumference = 2 * Math.PI * progressRadius;

  const trackTitle = $derived(
    $filePickerStore.files.at(-1)?.name ?? "Untitled Session",
  );

  const totalDurationSeconds = $derived(
    Math.max(0, $generationConfigStore.sequence?.totalSeconds ?? 0),
  );

  const playbackProgress = $derived(
    totalDurationSeconds > 0
      ? Math.min(playbackElapsedSeconds / totalDurationSeconds, 1)
      : 0,
  );

  const progressOffset = $derived(
    progressCircumference * (1 - playbackProgress),
  );

  const downloadLabel = $derived(
    isDownloading ? "Rendering..." : "Download WAV",
  );

  function cancelProgressLoop() {
    if (!progressFrame) return;
    cancelAnimationFrame(progressFrame);
    progressFrame = 0;
  }

  function resetPlaybackState() {
    cancelProgressLoop();
    toneBridge?.stop();
    isPlaying = false;
    playbackElapsedSeconds = 0;
    playbackBaseElapsedSeconds = 0;
    playbackStartedAt = null;
    scheduledSequence = null;
  }

  function tickPlaybackProgress(now: number) {
    if (playbackStartedAt === null) return;

    playbackElapsedSeconds =
      playbackBaseElapsedSeconds + (now - playbackStartedAt) / 1000;

    if (
      totalDurationSeconds > 0 &&
      playbackElapsedSeconds >= totalDurationSeconds
    ) {
      playbackElapsedSeconds = totalDurationSeconds;
      playbackBaseElapsedSeconds = 0;
      playbackStartedAt = null;
      scheduledSequence = null;
      isPlaying = false;
      cancelProgressLoop();
      toneBridge?.stop();
      return;
    }

    progressFrame = requestAnimationFrame(tickPlaybackProgress);
  }

  function startProgressLoop() {
    cancelProgressLoop();
    playbackStartedAt = performance.now();
    progressFrame = requestAnimationFrame(tickPlaybackProgress);
  }

  async function play() {
    if (!toneBridge || !$generationConfigStore.sequence) return;

    if (scheduledSequence !== $generationConfigStore.sequence) {
      playbackElapsedSeconds = 0;
      playbackBaseElapsedSeconds = 0;
      await toneBridge.play($generationConfigStore.sequence, () =>
        Dist.normal(0.5, 0.2),
      );
      scheduledSequence = $generationConfigStore.sequence;
    } else {
      await toneBridge.play();
    }

    isPlaying = true;
    startProgressLoop();
  }

  function pause() {
    if (!toneBridge) return;

    toneBridge.pause();
    cancelProgressLoop();
    playbackBaseElapsedSeconds = playbackElapsedSeconds;
    playbackStartedAt = null;
    isPlaying = false;
  }

  async function togglePlayback() {
    if (isPlaying) {
      pause();
      return;
    }

    await play();
  }

  async function downloadAudio() {
    const sequence = $generationConfigStore.sequence;

    if (!sequence || isDownloading) return;

    isDownloading = true;

    try {
      const blob = await renderPlayableSequenceToWavBlob(sequence, () =>
        Dist.normal(0.5, 0.2),
      );
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      const baseName = trackTitle.replace(/\.[^/.]+$/, "") || "generated-track";

      link.href = objectUrl;
      link.download = `${baseName}.wav`;
      link.click();

      setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
      }, 1000);
    } catch (error) {
      console.error("Failed to render downloadable audio.", error);
    } finally {
      isDownloading = false;
    }
  }

  function formatTime(value: number) {
    const totalSeconds = Math.max(0, Math.round(value));
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  }

  onMount(() => {
    toneBridge = new ToneBridge();
    return () => {
      cancelProgressLoop();
      toneBridge?.dispose();
    };
  });

  $effect(() => {
    const file = $filePickerStore.files.at(-1);

    if (!file) {
      image = null;
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    image = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  });

  $effect(() => {
    const sequence = $generationConfigStore.sequence ?? null;

    if (sequence === activeSequence) return;

    activeSequence = sequence;
    resetPlaybackState();
  });
</script>

<section class="h-full w-full">
  <div
    class="flex h-full w-full items-center gap-6 overflow-hidden rounded-3xl border border-black/10 text-neutral-950 shadow-[0_18px_60px_-32px_rgba(0,0,0,0.45)]"
  >
    <div class="relative flex size-40 shrink-0 items-center justify-center">
      <svg
        viewBox="0 0 160 160"
        class="pointer-events-none absolute inset-0 size-full -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx="80"
          cy="80"
          r={progressRadius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.2)"
          stroke-width="6"
        />
        <circle
          cx="80"
          cy="80"
          r={progressRadius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.95)"
          stroke-width="6"
          stroke-linecap="round"
          stroke-dasharray={progressCircumference}
          stroke-dashoffset={progressOffset}
        />
      </svg>
      <div
        class={`flex size-36 items-center justify-center rounded-full border border-black/15 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.95)_0,_rgba(255,255,255,0.95)_10%,_rgba(20,20,20,0.92)_11%,_rgba(10,10,10,1)_58%,_rgba(45,45,45,1)_76%,_rgba(8,8,8,1)_100%)] p-5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08),0_14px_30px_-18px_rgba(0,0,0,0.8)] ${isPlaying ? "animate-[spin_5s_linear_infinite]" : ""}`}
      >
        <div
          class="relative size-full overflow-hidden rounded-full border border-white/20 bg-neutral-300 shadow-inner"
        >
          {#if image}
            <img
              src={image}
              alt="Track cover"
              class="h-full w-full object-cover grayscale"
            />
          {:else}
            <div
              class="flex h-full w-full items-center justify-center bg-neutral-800 text-[0.55rem] uppercase tracking-[0.35em] text-neutral-300"
            >
              motif
            </div>
          {/if}
          <div class="absolute inset-0 bg-black/10"></div>
        </div>
      </div>
      <div
        class="pointer-events-none absolute size-4 rounded-full border border-white/10 bg-neutral-950 shadow-[0_0_0_4px_rgba(255,255,255,0.08)]"
      ></div>
    </div>

    <div class="flex min-w-0 flex-1 items-center justify-between gap-4">
      <div class="min-w-0">
        <p
          class="mb-2 text-[0.7rem] font-medium uppercase tracking-[0.28em] text-neutral-500"
        >
          Playback
        </p>
        <h3
          class="truncate text-xl font-semibold tracking-tight text-foreground"
        >
          {trackTitle}
        </h3>
        <p class="mt-2 max-w-md text-sm leading-6 text-neutral-500">
          Minimal preview deck with a monochrome vinyl treatment for the current
          image-driven track.
        </p>
        <p class="mt-2 max-w-md text-sm leading-6 text-neutral-500">
          {formatTime(playbackElapsedSeconds)} / {formatTime(
            totalDurationSeconds,
          )}
        </p>
      </div>

      <div class="flex shrink-0 items-center gap-3">
        <button
          type="button"
          class="flex h-11 items-center gap-2 rounded-full border border-white/15 bg-white px-4 text-sm font-medium text-neutral-950 shadow-[0_10px_30px_-18px_rgba(255,255,255,0.75)] transition duration-200 ease-out hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/60 disabled:cursor-not-allowed disabled:opacity-60"
          onclick={downloadAudio}
          disabled={!$generationConfigStore.sequence || isDownloading}
          aria-label="Download generated audio"
        >
          <Download class="size-4" />
          {downloadLabel}
        </button>

        <button
          type="button"
          class="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-white text-neutral-950 shadow-[0_10px_30px_-18px_rgba(255,255,255,0.75)] transition duration-200 ease-out hover:scale-110 hover:bg-neutral-200 focus:outline-none focus:ring-2 focus:ring-white/60"
          onclick={togglePlayback}
          aria-label={isPlaying ? "Pause playback" : "Play playback"}
        >
          {#if isPlaying}
            <PlayerPause class="size-5" />
          {:else}
            <PlayerPlay class="size-5 fill-current" />
          {/if}
        </button>
      </div>
    </div>
  </div>
</section>
