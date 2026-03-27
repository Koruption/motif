<script lang="ts">
  import { on } from "svelte/events";

  let { children, uploadImageSelected, onFileSelected, onSelectionCanceled } =
    $props();
  let isDragging = false;
  let files: File[] = [];
  let fileInput: HTMLInputElement;

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    isDragging = true;
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault();
    isDragging = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    isDragging = false;

    const droppedFiles = event.dataTransfer?.files;
    if (!droppedFiles) return;

    files = [...files, ...Array.from(droppedFiles)];

    onFileSelected?.(files);
  }

  function handleFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const selectedFiles = input.files;

    if (!selectedFiles) return;

    files = [...files, ...Array.from(selectedFiles)];

    onFileSelected?.(files);
  }

  function openFilePicker() {
    fileInput.click();
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index);
  }

  $effect(() => {
    if (uploadImageSelected) {
      openFilePicker();
    }
  });
</script>

<div
  class="flex h-full min-h-0 w-full flex-col gap-4 p-4"
  ondragover={handleDragOver}
  ondragleave={handleDragLeave}
  ondrop={handleDrop}
  role="region"
  aria-label="File Drop Area"
>
  <input
    bind:this={fileInput}
    type="file"
    multiple
    class="hidden"
    onchange={handleFileChange}
    oncancel={onSelectionCanceled}
  />
  {@render children?.()}
</div>
