<script lang="ts">
  import { Button } from "$lib/components/ui/button";
  import { Slider } from "$lib/components/ui/slider";
  import { toast } from "svelte-sonner";
  import { Label } from "$lib/components/ui/label";
  import * as Card from "$lib/components/ui/card/index.js";
  import { filePickerStore } from "$lib/stores/filePicker";
  import RadarChart from "../radar-chart/radar-chart.svelte";
  import ScrollArea from "../ui/scroll-area/scroll-area.svelte";
  import BpmVisualizer from "../bpm-visualizer/bpm-visualizer.svelte";
  import { generationConfigStore } from "$lib/stores/generationConfig";
  import { processedImageStore } from "$lib/stores/imageData";
  import { Separator } from "$lib/components/ui/separator/index.js";
  import * as Kbd from "$lib/components/ui/kbd/index.js";
  import {
    imageStatsToMacros,
    playbackSequenceToDisplaySummary,
    type MacroControls,
    type PlaybackSequenceMacroSummary,
  } from "$lib/utils/music-utils";
  import { Generator } from "$lib/utils/music-utils";
  import * as Tabs from "$lib/components/ui/tabs/index.js";
  import { derived, type Readable } from "svelte/store";
  import { Root } from "../ui/empty";

  let selectedFile = $state<string | null>(null);
  let pixelationAmount = $state(50);
  let bpm = $state(90);
  let generated = $state(false);
  let isGenerating = $state(false);
  let lastGeneratedBpm = $state<number | null>(null);

  let macros = $state<MacroControls>();

  let musicStats: Readable<PlaybackSequenceMacroSummary | null> = derived(
    generationConfigStore,
    ($data) => {
      if (!$data.sequence) return null;
      return playbackSequenceToDisplaySummary($data.sequence);
    },
  );

  const placeholderImageUrl =
    "https://favim.com/pd/p/orig/2019/03/15/aesthetic-lofi-chill-Favim.com-7003448.gif";

  const musicProfileSeries = [
    {
      key: "value",
      label: "",
      color: "var(--chart-3)",
    },
  ];

  let musicProfileChartData = $derived([
    { label: "warmth", value: macros?.warmth ?? 20 },
    { label: "brightmess", value: macros?.brightness ?? 20 },
    { label: "density", value: macros?.density ?? 20 },
    { label: "energy", value: macros?.energy ?? 20 },
    { label: "entropy", value: macros?.entropy ?? 20 },
    { label: "tension", value: macros?.tension ?? 20 },
  ]);

  const selectedBpm = $derived(Math.max(1, Math.round(Number(bpm) || 90)));

  let generateButtonLabel = $derived(
    isGenerating ? "Generating..." : generated ? "Generated" : "Generate",
  );

  const macroControlsEqual = (
    left: MacroControls | undefined,
    right: MacroControls | undefined,
  ) =>
    left?.energy === right?.energy &&
    left?.brightness === right?.brightness &&
    left?.warmth === right?.warmth &&
    left?.entropy === right?.entropy &&
    left?.tension === right?.tension &&
    left?.density === right?.density &&
    left?.hue === right?.hue;

  const generate = async () => {
    if (isGenerating) {
      throw new Error("Generation is already in progress.");
    }

    if (!macros) {
      throw new Error("Image analysis is not ready yet.");
    }

    if (generated) {
      throw new Error("A song has already been generated for this image.");
    }

    isGenerating = true;

    try {
      const sequence = Generator.song(60 * 3 + 30, macros, selectedBpm);

      generationConfigStore.update((config) => ({
        ...config,
        sequence: sequence,
      }));

      generated = true;
      lastGeneratedBpm = selectedBpm;

      return {
        message: "Your song was succesfully generated!",
      };
    } finally {
      isGenerating = false;
    }
  };

  const handleGenerationRequest = async () => {
    return toast.promise<{ message: string }>(() => generate(), {
      loading: "Your song is being generated...",
      success: (data) => `${data.message}`,
      error: (error) =>
        error instanceof Error ? error.message : "Unable to generate song.",
    });
  };

  $effect(() => {
    const file = $filePickerStore.files.at(-1);

    if (!file) {
      selectedFile = null;
      generated = false;
      lastGeneratedBpm = null;
      return;
    }

    generated = false;
    lastGeneratedBpm = null;

    const objectUrl = URL.createObjectURL(file);
    selectedFile = objectUrl;

    return () => {
      URL.revokeObjectURL(objectUrl);
    };
  });

  $effect(() => {
    pixelationAmount = $generationConfigStore.pixelationAmount;
  });

  $effect(() => {
    const stats = $processedImageStore
      ? $processedImageStore.analyze().stats
      : null;
    if (!stats) {
      macros = undefined;
      return;
    }
    const nextMacros = imageStatsToMacros(stats);
    macros = nextMacros;

    if (macroControlsEqual($generationConfigStore.macros, nextMacros)) return;

    generationConfigStore.update((config) => ({
      ...config,
      macros: nextMacros,
    }));
  });

  $effect(() => {
    if (lastGeneratedBpm === null || selectedBpm === lastGeneratedBpm) return;

    generated = false;
    lastGeneratedBpm = null;

    if (!$generationConfigStore.sequence) return;

    generationConfigStore.update((config) => ({
      ...config,
      sequence: undefined,
    }));
  });

  $effect(() => {
    const nextValue = pixelationAmount;

    if (nextValue === undefined) return;
    if ($generationConfigStore.pixelationAmount === nextValue) return;

    generationConfigStore.update((config) => ({
      ...config,
      pixelationAmount: nextValue,
    }));
  });
</script>

<div
  class="flex h-screen min-h-0 w-full max-w-[25%] flex-col overflow-hidden border-r-2 border-r-gray-700 bg-background p-4"
>
  <Tabs.Root value="account" class="flex min-h-0 flex-1 flex-col">
    <Tabs.List
      class="rounded-9px bg-dark-10 shadow-mini-inset dark:bg-background grid w-full grid-cols-2 gap-1 p-1 text-sm font-semibold leading-[0.01em] dark:border dark:border-neutral-600/30"
    >
      <Tabs.Trigger
        value="account"
        class="data-[state=active]:shadow-mini dark:data-[state=active]:bg-muted h-8 rounded-[7px] bg-transparent py-2 data-[state=active]:bg-white"
        >Settings</Tabs.Trigger
      >
      <Tabs.Trigger
        value="stats"
        class="data-[state=active]:shadow-mini dark:data-[state=active]:bg-muted h-8 rounded-[7px] bg-transparent py-2 data-[state=active]:bg-white"
        >Stats</Tabs.Trigger
      >
    </Tabs.List>
    <ScrollArea class="h-0 flex-1">
      <div class="flex flex-col">
        <Tabs.Content value="account">
          <img
            class="mb-4 h-70 w-full rounded-md object-cover"
            src={selectedFile ?? placeholderImageUrl}
            alt={"Selected Image"}
            decoding="async"
          />

          <Card.Root class="w-full max-w-sm rounded-md bg-transparent border-0">
            <Card.Header class="p-0">
              <Card.Title>Generation Settings</Card.Title>
              <Card.Description
                >Edit values to control generation.</Card.Description
              >
            </Card.Header>
            <Card.Content class="p-0">
              <div class="flex flex-col gap-4 pr-2">
                <div class="flex flex-col gap-2">
                  <Label for="pixelation" class="text-xs"
                    >Pixelation Amount: {pixelationAmount}</Label
                  >
                  <Slider
                    type="single"
                    bind:value={pixelationAmount}
                    max={100}
                    step={1}
                    class="w-full"
                  />
                </div>
                <div class="flex flex-col gap-4">
                  <div class="flex flex-col gap-2">
                    <Label for="bpm" class="text-xs">BPM: {selectedBpm}</Label>
                    <Slider
                      type="single"
                      bind:value={bpm}
                      max={180}
                      step={1}
                      class="w-full"
                    />
                  </div>
                </div>
              </div>
            </Card.Content>
          </Card.Root>
        </Tabs.Content>
        <Tabs.Content value="stats">
          <div class="flex shrink-0 flex-col gap-4 py-6">
            <RadarChart
              chartProps={{
                chartData: musicProfileChartData,
                series: musicProfileSeries,
              }}
            />

            <div>
              <div class="space-y-1">
                <h4 class="text-sm leading-none font-medium">
                  Sequence Summary
                </h4>
                <p class="text-muted-foreground text-sm">
                  Musical details extracted from the generated playback
                  sequence.
                </p>
              </div>
              <Separator class="my-4" />
              {#if $musicStats}
                <div class="grid grid-cols-2 gap-3 text-sm">
                  <div class="rounded-md border border-border/60 p-3">
                    <p
                      class="text-muted-foreground text-xs uppercase tracking-wide"
                    >
                      Primary Scale
                    </p>
                    <p class="mt-1 font-medium">
                      {$musicStats.primaryScaleName ?? "Unknown"}
                    </p>
                  </div>
                  <div class="rounded-md border border-border/60 p-3">
                    <p
                      class="text-muted-foreground text-xs uppercase tracking-wide"
                    >
                      Structure
                    </p>
                    <p class="mt-1 font-medium">
                      {$musicStats.primaryStructure ?? "Unknown"}
                    </p>
                  </div>
                  <div class="rounded-md border border-border/60 p-3">
                    <p
                      class="text-muted-foreground text-xs uppercase tracking-wide"
                    >
                      Note Count
                    </p>
                    <p class="mt-1 font-medium">{$musicStats.noteCount}</p>
                  </div>
                  <div class="rounded-md border border-border/60 p-3">
                    <p
                      class="text-muted-foreground text-xs uppercase tracking-wide"
                    >
                      Chord Count
                    </p>
                    <p class="mt-1 font-medium">{$musicStats.chordCount}</p>
                  </div>
                </div>

                <Separator class="my-4" />

                <div class="space-y-4 text-sm">
                  <div>
                    <p
                      class="text-muted-foreground text-xs uppercase tracking-wide"
                    >
                      Top Notes
                    </p>
                    {#if $musicStats.topNotes.length}
                      <Kbd.Group class="mt-1 flex flex-wrap gap-2">
                        {#each $musicStats.topNotes as entry}
                          <Kbd.Root>{entry.label}</Kbd.Root>
                        {/each}
                      </Kbd.Group>
                    {:else}
                      <p class="mt-1 text-muted-foreground">None</p>
                    {/if}
                  </div>
                  <div>
                    <p
                      class="text-muted-foreground text-xs uppercase tracking-wide"
                    >
                      Top Chords
                    </p>
                    {#if $musicStats.topChords.length}
                      <Kbd.Group class="mt-1 flex flex-wrap gap-2">
                        {#each $musicStats.topChords as entry}
                          <Kbd.Root>{entry.label}</Kbd.Root>
                        {/each}
                      </Kbd.Group>
                    {:else}
                      <p class="mt-1 text-muted-foreground">None</p>
                    {/if}
                  </div>
                </div>
              {:else}
                <p class="text-muted-foreground text-sm">
                  Generate a sequence to inspect its scales, note counts, and
                  chord usage.
                </p>
              {/if}
            </div>
          </div>
        </Tabs.Content>
      </div>
    </ScrollArea>
  </Tabs.Root>
  {#if $filePickerStore.files.length}
    <div class="w-full shrink-0 pt-4 rounded-md transition-all duration-700">
      <Button
        class="w-full shadow-[0_-8px_3px_rgba(0,0,0,0.05)] "
        onclick={handleGenerationRequest}>{generateButtonLabel}</Button
      >
    </div>
  {/if}
</div>
