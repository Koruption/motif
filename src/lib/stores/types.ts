import type { MacroControls, PlayableSequence } from "$lib/utils/music-utils";

export type PixelatedResult = {
  width: number;
  height: number;
  imageData: ImageData;
};

export type ProcessedImageData = {
  data: ImageData;
};

export type GenerationConfigData = {
  pixelationAmount: number;
  macros?: MacroControls;
  sequence?: PlayableSequence;
};
