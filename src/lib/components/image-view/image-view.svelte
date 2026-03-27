<script lang="ts">
  import { filePickerStore } from "$lib/stores/filePicker";
  import { Skeleton } from "$lib/components/ui/skeleton";
  import { onDestroy, onMount, untrack } from "svelte";
  import { processedImageStore } from "$lib/stores/imageData";
  import { ImageWrapper } from "$lib/utils/image-utils";
  import { generationConfigStore } from "$lib/stores/generationConfig";
  import {
    downloadBlob,
    renderGeneratedImageBlob,
  } from "$lib/utils/export-utils";
  import {
    playbackSequencesToPixelColors,
    type PlayableSequence,
  } from "$lib/utils/music-utils";

  let processedStore = processedImageStore;

  let { pixelationAmount = 10 } = $props();

  let selectedFile = $derived($filePickerStore.files.at(-1) ?? null);
  let targetPixelSize = $derived(Math.max(1, Math.floor(pixelationAmount)));

  let canvas: HTMLCanvasElement;
  let ctx: CanvasRenderingContext2D | null = null;
  let generatedCanvas: HTMLCanvasElement;
  let generatedCtx: CanvasRenderingContext2D | null = null;

  let offscreen: HTMLCanvasElement;
  let offscreenCtx: CanvasRenderingContext2D | null = null;
  let generatedOffscreen: HTMLCanvasElement;
  let generatedOffscreenCtx: CanvasRenderingContext2D | null = null;
  let analysisOffscreen: HTMLCanvasElement;
  let analysisOffscreenCtx: CanvasRenderingContext2D | null = null;

  let img: HTMLImageElement | null = null;
  let hasMounted = $state(false);
  let contentVisible = $state(false);

  let imageUrl = $state<string | null>(null);
  let pixelSize = $state(1); // 1 = normal, larger = more pixelated
  let isReady = $state(false);
  let isLoading = $state(true);
  let animationFrame = 0;
  let animationDelayTimeout: ReturnType<typeof setTimeout> | null = null;
  let generatedPaintTimeout: ReturnType<typeof setTimeout> | null = null;
  let generatedPaintDelayTimeout: ReturnType<typeof setTimeout> | null = null;
  let generatedPaintRunId = 0;
  let hasSelectedFile = $derived(selectedFile !== null);
  let activeCanvas = $state<"image" | "generated">("image");
  let renderedCanvasWidth = $state(0);
  let renderedCanvasHeight = $state(0);
  let renderedPixelWidth = $state(0);
  let renderedPixelHeight = $state(0);
  let hasGeneratedSequence = $derived($generationConfigStore.sequence != null);
  let isDownloadingGeneratedImage = $state(false);
  let generatedDownloadName = $derived(
    `${(selectedFile?.name ?? "generated-image").replace(/\.[^/.]+$/, "")}-generated.png`,
  );

  type PixelatedResult = {
    width: number;
    height: number;
    imageData: ImageData;
  };

  const MAX_ANALYSIS_DIMENSION = 160;
  const GENERATED_REVEAL_INTERVAL_MS = 12;
  const GENERATED_REVEAL_DURATION_MS = 1400;

  function hexDigitToNumber(charCode: number) {
    if (charCode >= 48 && charCode <= 57) return charCode - 48;
    if (charCode >= 65 && charCode <= 70) return charCode - 55;
    if (charCode >= 97 && charCode <= 102) return charCode - 87;
    return 0;
  }

  function hexChannel(hex: string, index: number) {
    return (
      (hexDigitToNumber(hex.charCodeAt(index)) << 4) |
      hexDigitToNumber(hex.charCodeAt(index + 1))
    );
  }

  onMount(() => {
    img = new Image();
    ctx = canvas.getContext("2d");
    generatedCtx = generatedCanvas.getContext("2d");
    offscreen = document.createElement("canvas");
    offscreenCtx = offscreen.getContext("2d");
    generatedOffscreen = document.createElement("canvas");
    generatedOffscreenCtx = generatedOffscreen.getContext("2d");
    analysisOffscreen = document.createElement("canvas");
    analysisOffscreenCtx = analysisOffscreen.getContext("2d");

    if (
      !ctx ||
      !generatedCtx ||
      !offscreenCtx ||
      !generatedOffscreenCtx ||
      !analysisOffscreenCtx
    ) {
      throw new Error("Could not get canvas 2D context");
    }

    ctx.imageSmoothingEnabled = false;
    generatedCtx.imageSmoothingEnabled = false;
    offscreenCtx.imageSmoothingEnabled = false;
    generatedOffscreenCtx.imageSmoothingEnabled = false;
    analysisOffscreenCtx.imageSmoothingEnabled = false;

    img.onload = () => {
      isReady = true;
      draw();
      isLoading = false;
    };

    img.onerror = () => {
      isReady = false;
      isLoading = false;
    };

    hasMounted = true;
    requestAnimationFrame(() => {
      contentVisible = true;
    });
  });

  onDestroy(() => {
    cancelAnimation();
    cancelGeneratedPaint();

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
    }
  });

  function cancelAnimation() {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }

    if (animationDelayTimeout) {
      clearTimeout(animationDelayTimeout);
      animationDelayTimeout = null;
    }
  }

  function cancelGeneratedPaint() {
    generatedPaintRunId += 1;

    if (generatedPaintTimeout) {
      clearTimeout(generatedPaintTimeout);
      generatedPaintTimeout = null;
    }

    if (generatedPaintDelayTimeout) {
      clearTimeout(generatedPaintDelayTimeout);
      generatedPaintDelayTimeout = null;
    }
  }

  function clearGeneratedCanvas() {
    if (generatedOffscreenCtx && renderedPixelWidth > 0 && renderedPixelHeight > 0) {
      generatedOffscreenCtx.clearRect(
        0,
        0,
        renderedPixelWidth,
        renderedPixelHeight,
      );
    }

    if (generatedCtx) {
      generatedCtx.clearRect(0, 0, generatedCanvas.width, generatedCanvas.height);
    }
  }

  function loadSelectedImage(file: File | null) {
    cancelAnimation();
    cancelGeneratedPaint();
    isReady = false;
    isLoading = file !== null;
    pixelSize = 1;
    activeCanvas = "image";

    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      imageUrl = null;
    }

    if (!file) {
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      if (generatedCtx) {
        generatedCtx.clearRect(
          0,
          0,
          generatedCanvas.width,
          generatedCanvas.height,
        );
      }
      renderedCanvasWidth = 0;
      renderedCanvasHeight = 0;
      renderedPixelWidth = 0;
      renderedPixelHeight = 0;
      clearGeneratedCanvas();
      processedStore.set(undefined);
      isLoading = false;
      return;
    }

    imageUrl = URL.createObjectURL(file);
    if (!img) return;
    img.src = imageUrl;
  }

  function draw() {
    if (
      !ctx ||
      !generatedCtx ||
      !offscreenCtx ||
      !generatedOffscreenCtx ||
      !img ||
      !isReady
    ) {
      return;
    }

    const displayWidth = img.width;
    const displayHeight = img.height;
    const canvasAspectRatio = 570 / 480;
    const imageAspectRatio = displayWidth / displayHeight;
    const sourceWidth =
      imageAspectRatio > canvasAspectRatio
        ? Math.floor(displayHeight * canvasAspectRatio)
        : displayWidth;
    const sourceHeight =
      imageAspectRatio > canvasAspectRatio
        ? displayHeight
        : Math.floor(displayWidth / canvasAspectRatio);
    const sourceX = Math.floor((displayWidth - sourceWidth) / 2);
    const sourceY = Math.floor((displayHeight - sourceHeight) / 2);

    canvas.width = sourceWidth;
    canvas.height = sourceHeight;
    generatedCanvas.width = sourceWidth;
    generatedCanvas.height = sourceHeight;
    ctx.imageSmoothingEnabled = false;
    generatedCtx.imageSmoothingEnabled = false;

    const scale = Math.max(1, Math.floor(pixelSize));
    const smallWidth = Math.max(1, Math.floor(sourceWidth / scale));
    const smallHeight = Math.max(1, Math.floor(sourceHeight / scale));

    offscreen.width = smallWidth;
    offscreen.height = smallHeight;
    generatedOffscreen.width = smallWidth;
    generatedOffscreen.height = smallHeight;
    offscreenCtx.imageSmoothingEnabled = false;
    generatedOffscreenCtx.imageSmoothingEnabled = false;
    renderedCanvasWidth = sourceWidth;
    renderedCanvasHeight = sourceHeight;
    renderedPixelWidth = smallWidth;
    renderedPixelHeight = smallHeight;

    offscreenCtx.clearRect(0, 0, smallWidth, smallHeight);
    offscreenCtx.drawImage(
      img,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      smallWidth,
      smallHeight,
    );

    ctx.clearRect(0, 0, sourceWidth, sourceHeight);
    ctx.drawImage(
      offscreen,
      0,
      0,
      smallWidth,
      smallHeight,
      0,
      0,
      sourceWidth,
      sourceHeight,
    );
  }

  function drawGeneratedFrame(imageData: ImageData) {
    if (!generatedCtx || !generatedOffscreenCtx) return;

    generatedOffscreenCtx.putImageData(imageData, 0, 0);
    generatedCtx.clearRect(0, 0, renderedCanvasWidth, renderedCanvasHeight);
    generatedCtx.drawImage(
      generatedOffscreen,
      0,
      0,
      renderedPixelWidth,
      renderedPixelHeight,
      0,
      0,
      renderedCanvasWidth,
      renderedCanvasHeight,
    );
  }

  function paintGeneratedSequence(sequence: PlayableSequence) {
    if (
      !generatedCtx ||
      !generatedOffscreenCtx ||
      renderedCanvasWidth <= 0 ||
      renderedCanvasHeight <= 0 ||
      renderedPixelWidth <= 0 ||
      renderedPixelHeight <= 0
    ) {
      return;
    }

    const colors = playbackSequencesToPixelColors(
      sequence,
      renderedPixelWidth,
      renderedPixelHeight,
    );
    const pixelCount = colors.length;
    const imageData = generatedOffscreenCtx.createImageData(
      renderedPixelWidth,
      renderedPixelHeight,
    );
    const targetData = new Uint8ClampedArray(pixelCount * 4);

    for (let i = 0; i < pixelCount; i += 1) {
      const color = colors[i] ?? "#000000";
      const offset = i * 4;

      targetData[offset] = hexChannel(color, 1);
      targetData[offset + 1] = hexChannel(color, 3);
      targetData[offset + 2] = hexChannel(color, 5);
      targetData[offset + 3] = color.length >= 9 ? hexChannel(color, 7) : 255;
    }

    clearGeneratedCanvas();

    if (pixelCount === 0) return;

    const totalSteps = Math.max(
      1,
      Math.floor(GENERATED_REVEAL_DURATION_MS / GENERATED_REVEAL_INTERVAL_MS),
    );
    const pixelsPerStep = Math.max(1, Math.ceil(pixelCount / totalSteps));
    const runId = ++generatedPaintRunId;
    let cursor = 0;

    const revealNextPixels = () => {
      if (
        runId !== generatedPaintRunId ||
        !generatedCtx ||
        !generatedOffscreenCtx
      ) {
        return;
      }

      const data = imageData.data;
      const nextCursor = Math.min(pixelCount, cursor + pixelsPerStep);

      for (let i = cursor; i < nextCursor; i += 1) {
        const offset = i * 4;
        data[offset] = targetData[offset];
        data[offset + 1] = targetData[offset + 1];
        data[offset + 2] = targetData[offset + 2];
        data[offset + 3] = targetData[offset + 3];
      }

      cursor = nextCursor;
      drawGeneratedFrame(imageData);

      if (cursor >= pixelCount) {
        generatedPaintTimeout = null;
        return;
      }

      generatedPaintTimeout = setTimeout(
        revealNextPixels,
        GENERATED_REVEAL_INTERVAL_MS,
      );
    };

    revealNextPixels();
  }

  function getPixelatedImageData(): PixelatedResult | null {
    if (!offscreenCtx || !analysisOffscreenCtx || !isReady) return null;

    const sourceWidth = offscreen.width;
    const sourceHeight = offscreen.height;
    const longestEdge = Math.max(sourceWidth, sourceHeight, 1);
    const analysisScale = Math.min(1, MAX_ANALYSIS_DIMENSION / longestEdge);
    const analysisWidth = Math.max(1, Math.floor(sourceWidth * analysisScale));
    const analysisHeight = Math.max(
      1,
      Math.floor(sourceHeight * analysisScale),
    );

    analysisOffscreen.width = analysisWidth;
    analysisOffscreen.height = analysisHeight;
    analysisOffscreenCtx.imageSmoothingEnabled = false;
    analysisOffscreenCtx.clearRect(0, 0, analysisWidth, analysisHeight);
    analysisOffscreenCtx.drawImage(
      offscreen,
      0,
      0,
      sourceWidth,
      sourceHeight,
      0,
      0,
      analysisWidth,
      analysisHeight,
    );

    const imageData = analysisOffscreenCtx.getImageData(
      0,
      0,
      analysisWidth,
      analysisHeight,
    );

    return {
      width: analysisWidth,
      height: analysisHeight,
      imageData,
    };
  }

  function updateProcessedImage() {
    const result = getPixelatedImageData();
    if (!result) return;

    processedStore.set(new ImageWrapper(result.imageData));
  }

  function animateToPixelated(target = targetPixelSize) {
    cancelAnimation();

    let current = pixelSize;
    const resolvedTarget = Math.max(1, target);

    if (current === resolvedTarget) {
      draw();
      updateProcessedImage();
      return;
    }

    const step = () => {
      const distance = resolvedTarget - current;

      if (Math.abs(distance) <= 0.2) {
        pixelSize = resolvedTarget;
        draw();
        updateProcessedImage();
        animationFrame = 0;
        return;
      }

      current += distance * 0.14;
      pixelSize = current;
      draw();
      animationFrame = requestAnimationFrame(step);
    };

    animationFrame = requestAnimationFrame(step);
  }

  async function downloadGeneratedImage() {
    const file = selectedFile;
    const sequence = $generationConfigStore.sequence;

    if (!file || !sequence || isDownloadingGeneratedImage) return;

    isDownloadingGeneratedImage = true;

    try {
      const blob = await renderGeneratedImageBlob({
        imageFile: file,
        sequence,
        pixelationAmount: targetPixelSize,
      });

      downloadBlob(blob, generatedDownloadName);
    } catch (error) {
      console.error("Failed to render the generated image.", error);
    } finally {
      isDownloadingGeneratedImage = false;
    }
  }

  $effect(() => {
    if (!isReady) return;
    draw();
  });

  $effect(() => {
    if (!generatedCtx || !generatedOffscreenCtx) return;

    const sequence = $generationConfigStore.sequence ?? null;
    const width = renderedCanvasWidth;
    const height = renderedCanvasHeight;
    const pixelWidth = renderedPixelWidth;
    const pixelHeight = renderedPixelHeight;

    if (
      !sequence ||
      width <= 0 ||
      height <= 0 ||
      pixelWidth <= 0 ||
      pixelHeight <= 0
    ) {
      cancelGeneratedPaint();
      clearGeneratedCanvas();
      if (!sequence) {
        activeCanvas = "image";
      }
      return;
    }

    cancelGeneratedPaint();
    clearGeneratedCanvas();
    activeCanvas = "generated";
    generatedPaintDelayTimeout = setTimeout(() => {
      generatedPaintDelayTimeout = null;
      paintGeneratedSequence(sequence);
    }, 40);

    return () => {
      cancelGeneratedPaint();
    };
  });

  $effect(() => {
    if (!hasMounted) return;
    const file = selectedFile;
    untrack(() => {
      loadSelectedImage(file);
    });
  });

  $effect(() => {
    if (!isReady) return;
    const target = targetPixelSize;

    cancelAnimation();
    animationDelayTimeout = setTimeout(() => {
      animateToPixelated(target);
    }, 100);

    return () => {
      cancelAnimation();
    };
  });
</script>

<div class="flex w-full align-middle flex-col align gap-4">
  <div class="relative overflow-hidden p-4">
    {#if hasSelectedFile && isLoading}
      <div class="absolute inset-4 z-10 flex flex-col gap-3">
        <Skeleton class="block h-[480px] w-[570px] rounded-md bg-neutral-900" />
      </div>
    {/if}
    <div
      class="flex flex-col gap-4 transition-opacity duration-700"
      class:opacity-0={!contentVisible}
      class:opacity-100={contentVisible}
    >
      <div class="relative h-[480px] w-[570px]">
        <canvas
          bind:this={canvas}
          class="absolute inset-0 block h-[480px] w-[570px] rounded-md border border-neutral-700 bg-black transition-opacity duration-500"
          class:opacity-0={isLoading || activeCanvas !== "image"}
          class:opacity-100={!isLoading && activeCanvas === "image"}
        ></canvas>
        <canvas
          bind:this={generatedCanvas}
          class="absolute inset-0 block h-[480px] w-[570px] rounded-md border border-neutral-700 bg-black transition-opacity duration-500"
          class:opacity-0={isLoading || activeCanvas !== "generated"}
          class:opacity-100={!isLoading && activeCanvas === "generated"}
        ></canvas>
      </div>
      <div class="flex flex-row gap-4" id="canvas-selector">
        <button
          id="image-canvas"
          type="button"
          class={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
            activeCanvas === "image"
              ? "border-neutral-200 bg-neutral-100 text-neutral-950"
              : "border-neutral-700 bg-neutral-900 text-neutral-300"
          }`}
          onclick={() => {
            activeCanvas = "image";
          }}
        >
          Image
        </button>
        <button
          id="generated-canvas"
          type="button"
          disabled={!hasGeneratedSequence}
          class={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
            activeCanvas === "generated" && hasGeneratedSequence
              ? "border-emerald-300 bg-emerald-100 text-emerald-950"
              : hasGeneratedSequence
                ? "border-neutral-700 bg-neutral-900 text-neutral-300"
                : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-600"
          }`}
          onclick={() => {
            if (!hasGeneratedSequence) return;
            activeCanvas = "generated";
          }}
        >
          Generated
        </button>
        <button
          id="download-generated-canvas"
          type="button"
          disabled={!hasGeneratedSequence || isLoading || isDownloadingGeneratedImage}
          class={`rounded-md border px-3 py-2 text-xs font-medium transition-colors ${
            hasGeneratedSequence && !isLoading && !isDownloadingGeneratedImage
              ? "border-sky-300 bg-sky-100 text-sky-950"
              : "cursor-not-allowed border-neutral-800 bg-neutral-950 text-neutral-600"
          }`}
          onclick={downloadGeneratedImage}
        >
          {isDownloadingGeneratedImage ? "Rendering..." : "Download PNG"}
        </button>
      </div>
    </div>
  </div>
</div>
