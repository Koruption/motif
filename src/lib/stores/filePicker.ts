import { writable } from "svelte/store";

export const filePickerStore = writable({
  files: [] as File[],
});
