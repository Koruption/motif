<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { Label } from "$lib/components/ui/label";
  import type { ImageWrapper } from "$lib/utils/image-utils";

  let { imageWrapper }: { imageWrapper: ImageWrapper | undefined } = $props();

  const descriptionText =
    "We sampled the image and reduced it to structured pixel data we can read musically. Next, we'll map color, brightness, and pixel patterns to notes, rhythm, and texture so the image can become the foundation for a generated song.";

  let displayedDescription = $state("");
  let typingInterval: ReturnType<typeof setInterval> | null = null;

  let hueAverage = $state(0);
  let energyAverage = $state(0);
  let warmthAverage = $state(0);
  let colorAverage = $state("N/A");
  let saturationAverage = $state(0);
  let dominantColor = $state("N/A");
  let darkestColor = $state("black");
  let brightestColor = $state("white");
  let pixelCount = $state(0);

  onMount(() => {
    let index = 0;
    typingInterval = setInterval(() => {
      index += 1;
      displayedDescription = descriptionText.slice(0, index);

      if (index >= descriptionText.length && typingInterval) {
        clearInterval(typingInterval);
        typingInterval = null;
      }
    }, 4);
  });

  onDestroy(() => {
    if (typingInterval) {
      clearInterval(typingInterval);
      typingInterval = null;
    }
  });

  $effect(() => {
    if (!imageWrapper) return;
    const analysis = imageWrapper.analyze();
    const { energy, hues, saturation, warmth, dominant } = analysis.stats;

    energyAverage = energy;
    hueAverage = hues;
    saturationAverage = saturation;
    warmthAverage = warmth;
    dominantColor = dominant;
    colorAverage = analysis.averageColor.rgbaToHex();
    darkestColor = analysis.darkestColor.rgbaToHex();
    brightestColor = analysis.brightestColor.rgbaToHex();
    pixelCount = analysis.pixelCount;
  });
</script>

<div class="flex flex-col gap-8">
  <div class="flex flex-col w-full gap-2">
    <Label class="text-xs text-muted-foreground">Process</Label>
    <p class="text-sm">
      {displayedDescription}
    </p>
  </div>

  <span class="w-full bg-gray-500 h-[1px]"> </span>
  {#if imageWrapper}
    <div class="grid grid-cols-2 gap-8 transition-all duration-75">
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">Avg. Color</Label>
        <div class="flex flex-row items-center gap-2">
          <div
            class="h-2 w-2 rounded-full"
            style:background-color={colorAverage}
          ></div>
          <p class="text-sm">{colorAverage}</p>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">Energy</Label>
        <p class="text-lg">{Math.round(energyAverage)}</p>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">Hue</Label>
        <p class="text-lg">{hueAverage.toFixed(2)}</p>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">Saturation</Label>
        <p class="text-lg">{Math.round(saturationAverage)}</p>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">Warmth</Label>
        <p class="text-lg">{Math.round(warmthAverage)}</p>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">Dominant</Label>
        <p class="text-lg capitalize">{dominantColor}</p>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-sm text-muted-foreground">Color Curve</Label>
        <div
          class="h-12 w-12 rounded-md border border-neutral-700"
          style={`background: linear-gradient(to top right, ${darkestColor}, ${brightestColor});`}
        ></div>
      </div>
      <div class="flex flex-col gap-2">
        <Label class="text-xs text-muted-foreground">Pixel Count</Label>
        <p class="text-lg capitalize">{pixelCount}</p>
      </div>
    </div>
  {:else}
    <div class="flex flex-col gap-2">
      <Label class="text-xs text-muted-foreground">Image Analysis</Label>
      <p class="text-lg">Unknown</p>
    </div>
  {/if}
</div>
