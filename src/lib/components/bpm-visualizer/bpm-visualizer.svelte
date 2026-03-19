<script lang="ts">
  let { bpm = 0, timeSignature = "4/4" } = $props();

  let safeBpm = $derived(Math.max(Number(bpm) || 0, 0));
  let beatDurationMs = $derived(safeBpm > 0 ? 60000 / safeBpm : 1000);
  let animationState = $derived(safeBpm > 0 ? "running" : "paused");
  let beatsPerMeasure = $derived.by(() => {
    const [numerator] = String(timeSignature).split("/");
    const parsed = Number.parseInt(numerator, 10);
    return parsed > 0 ? parsed : 4;
  });

  let beatInMeasure = $state(0);
  let isOverlapping = $state(false);
  let displayedBeat = $derived(beatInMeasure || 1);

  function triggerBeat() {
    isOverlapping = true;
    beatInMeasure = (beatInMeasure % beatsPerMeasure) + 1;

    const flashDuration = Math.min(Math.max(beatDurationMs * 0.35, 120), 220);
    const resetHandle = window.setTimeout(() => {
      isOverlapping = false;
    }, flashDuration);

    return () => window.clearTimeout(resetHandle);
  }

  $effect(() => {
    beatInMeasure = 0;
    isOverlapping = false;

    if (safeBpm <= 0) {
      return;
    }

    let clearPulse = () => {};
    const firstBeatDelay = beatDurationMs / 2;

    const startHandle = window.setTimeout(() => {
      clearPulse();
      clearPulse = triggerBeat();

      const intervalHandle = window.setInterval(() => {
        clearPulse();
        clearPulse = triggerBeat();
      }, beatDurationMs);

      cleanup = () => {
        window.clearInterval(intervalHandle);
        clearPulse();
      };
    }, firstBeatDelay);

    let cleanup = () => {};

    return () => {
      window.clearTimeout(startHandle);
      cleanup();
    };
  });
</script>

<section
  class="relative flex w-full min-h-48 flex-col overflow-hidden rounded-3xl border border-neutral-800 bg-neutral-950/90 px-4 py-6"
>
  <div class="flex min-h-0 flex-1 items-center justify-center">
    <div
      class="relative h-44 w-full overflow-hidden"
      style:--beat-duration={`${beatDurationMs}ms`}
      style:--animation-state={animationState}
      style:--orbit-size="clamp(2.75rem, 10vw, 4rem)"
      style:--core-size="clamp(4rem, 14vw, 6rem)"
      style:--travel-distance="calc(100% - var(--orbit-size))"
    >
      <div
        class:core-overlap={isOverlapping}
        class="core-circle pointer-events-none absolute inset-0 m-auto flex h-[var(--core-size)] w-[var(--core-size)] items-center justify-center rounded-full border border-neutral-200/90"
      >
        <div class="core-fill h-full w-full rounded-full bg-neutral-100"></div>
      </div>

      <div
        class="orbit-circle absolute inset-y-0 h-[var(--orbit-size)] w-[var(--orbit-size)] my-auto rounded-full border border-neutral-300 bg-neutral-950"
      ></div>
    </div>
  </div>

  <div class="mt-3 flex items-baseline justify-center gap-2 text-neutral-200">
    <span class="text-3xl font-light tabular-nums">{displayedBeat}</span>
    <span class="text-sm text-neutral-500">/ {timeSignature}</span>
  </div>
</section>

<style>
  .orbit-circle {
    left: 0;
    animation: orbit-pass var(--beat-duration) linear infinite alternate;
    animation-play-state: var(--animation-state);
    will-change: left, transform;
  }

  .core-circle {
    overflow: hidden;
    transform: scale(1);
    transition:
      transform 180ms ease-out,
      border-color 180ms ease-out;
    will-change: transform, border-color;
  }

  .core-fill {
    opacity: 0.08;
    transform: scale(0.82);
    transition:
      transform 180ms ease-out,
      opacity 180ms ease-out;
    will-change: transform, opacity;
  }

  .core-overlap {
    transform: scale(1.12);
    border-color: rgb(255 255 255 / 1);
  }

  .core-overlap .core-fill {
    opacity: 0.92;
    transform: scale(1);
  }

  @keyframes orbit-pass {
    0% {
      left: 0;
      transform: scale(0.94);
    }
    50% {
      left: calc(50% - (var(--orbit-size) / 2));
      transform: scale(1);
    }
    100% {
      left: var(--travel-distance);
      transform: scale(0.94);
    }
  }
</style>
