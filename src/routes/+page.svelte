<script lang="ts">
  import ConfigBar from "$lib/components/config-bar/config-bar.svelte";
  import DisplayArea from "$lib/components/display-area/display-area.svelte";
  import FileDrop from "$lib/components/file-drop/file-drop.svelte";
  import { filePickerStore } from "$lib/stores/filePicker";
  import { processedImageStore } from "$lib/stores/imageData";

  let uploadImageSelected = $state(false);

  const defaultBackground =
    "linear-gradient(to bottom, rgb(23 23 23 / 0.18) 0%, rgb(10 10 10 / 0.7) 62%, rgb(0 0 0 / 0.98) 100%), radial-gradient(circle at top center, rgb(64 64 64 / 0.28) 0%, rgb(17 17 17 / 0.72) 48%, rgb(0 0 0 / 0.92) 100%)";

  const colorToRgba = (
    color: { r: number; g: number; b: number },
    alpha: number,
  ) =>
    `rgba(${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}, ${alpha})`;

  let mainBackground = $derived.by(() => {
    const analysis = $processedImageStore?.analyze();

    if (!analysis) {
      return defaultBackground;
    }

    const darkest = colorToRgba(analysis.darkestColor, 0.88);
    const average = colorToRgba(analysis.averageColor, 0.45);
    const brightest = colorToRgba(analysis.brightestColor, 0.32);

    return `linear-gradient(to bottom, rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 0.28) 58%, rgba(0, 0, 0, 0.96) 100%), radial-gradient(circle at top center, ${brightest} 0%, ${average} 34%, ${darkest} 76%, rgba(0, 0, 0, 0.92) 100%)`;
  });

  function onFileSelected(files: File[]) {
    filePickerStore.set({ files });
  }
</script>

<main
  class="flex h-screen w-screen flex-row transition-colors duration-2000 ease-out"
  style={`background: ${mainBackground};`}
>
  <ConfigBar />
  <FileDrop
    {uploadImageSelected}
    {onFileSelected}
    onSelectionCanceled={() => {
      uploadImageSelected = false;
    }}
  >
    <DisplayArea onUploadImageSelected={() => (uploadImageSelected = true)} />
  </FileDrop>
</main>
