import { writable } from "svelte/store";
import type { GenerationConfigData } from "./types";

export const generationConfigStore = writable<GenerationConfigData>({
  pixelationAmount: 50,
  macros: undefined,
  sequence: undefined,
});
