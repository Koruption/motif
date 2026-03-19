import { writable } from "svelte/store";
import type { ImageWrapper } from "$lib/utils/image-utils";

export const processedImageStore = writable<ImageWrapper | undefined>();
