<script lang="ts">
  import * as Empty from "$lib/components/ui/empty/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import FolderCodeIcon from "@tabler/icons-svelte/icons/folder-code";
  import ArrowUpRightIcon from "@lucide/svelte/icons/arrow-up-right";
  import { filePickerStore } from "$lib/stores/filePicker";
  import { derived } from "svelte/store";
  import ImageView from "../image-view/image-view.svelte";
  import ImageContent from "../image-view/image-content.svelte";
  import { processedImageStore } from "$lib/stores/imageData";
  import { generationConfigStore } from "$lib/stores/generationConfig";
  import PlaybackCard from "../music-section/playback-card.svelte";

  let { onUploadImageSelected } = $props();
  let fileSelected = derived(
    filePickerStore,
    ($state) => $state.files.at(-1) ?? null,
  );
</script>

{#if $fileSelected != null}
  <div class="flex min-h-0 flex-col gap-4">
    <div class="flex flex-row gap-4">
      <ImageView pixelationAmount={$generationConfigStore.pixelationAmount} />
      <ImageContent imageWrapper={$processedImageStore} />
    </div>
    <PlaybackCard />
  </div>
{:else}
  <div class="flex h-full w-full flex-col bg-background">
    <Empty.Root>
      <Empty.Header>
        <Empty.Media variant="icon">
          <FolderCodeIcon />
        </Empty.Media>
        <Empty.Title>No Image Provided</Empty.Title>
        <Empty.Description>
          You haven't uploaded any images yet. Get started by uploading your
          first image.
        </Empty.Description>
      </Empty.Header>
      <Empty.Content>
        <div class="flex gap-2">
          <Button onclick={onUploadImageSelected}>Upload Image</Button>
          <Button variant="outline">Import Project</Button>
        </div>
      </Empty.Content>
      <Button variant="link" class="text-muted-foreground" size="sm">
        <a href="#/">
          Learn More <ArrowUpRightIcon class="inline" />
        </a>
      </Button>
    </Empty.Root>
  </div>
{/if}
