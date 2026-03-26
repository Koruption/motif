# Motif

> I found myself staring at a painting of my wife and wondering:
> what does she sound like?
>
> Motif came from that question — translating visual form into sound, and back into visual.
> It’s far from perfect, even further from finished, but nothing real ever starts without asking something strange.

Motif is an image-to-music generation studio built with Svelte and Tone.js. It takes an uploaded image, analyzes its visual character, translates those findings into musical control data, generates a sequence, and presents the result as both sound and a newly painted visual artifact.

The project is designed as a creative instrument rather than a one-click novelty. Users can inspect image-derived statistics, influence the generation process through configuration controls, preview the resulting composition, study the musical summary, and export both the generated image and generated audio.

<img src="https://github.com/Koruption/motif/blob/main/primary_screen.png" />

## Overview

Motif turns visual input into a multi-stage generative workflow:

1. Ingest and preprocess an image.
2. Extract image statistics and derive musical macros.
3. Generate harmonic, melodic, and rhythmic sequence data.
4. Render the result as audio and as a sequence-driven image.

In practice, that means a single uploaded image can become:

- a set of visual measurements such as dominant color behavior, brightness, and contrast
- a macro profile that shapes energy, warmth, density, tension, and entropy
- a playable generative composition with melodic motion, chord textures, and percussion
- a painted pixel canvas derived from the sequence itself
- downloadable outputs for both the visual and audio result

## Feature Highlights

- Drag-and-drop image upload
- Image analysis and macro extraction
- Adjustable generation parameters including BPM and pixelation
- Procedural composition with melody, chord, scale, and drum events
- Ambient-oriented playback with custom synth and effects chains
- Musical display summary with scale names, structure, note counts, chord counts, and top recurring material
- Animated generated-image view painted pixel by pixel from the resulting sequence
- PNG export for the generated canvas
- WAV export for the generated audio

## How It Works

<img src="https://raw.githubusercontent.com/Koruption/motif/refs/heads/main/generated_screen.png" />

### Image Analysis

The image pipeline computes a compact representation of the uploaded artwork, including values such as:

- average color
- brightest and darkest regions
- dominant hue tendencies
- saturation and warmth
- overall visual energy and complexity

These outputs are not treated as decorative metadata. They become the raw material for the music generator.

### Macro Mapping

Motif converts image statistics into a smaller musical control surface:

- `energy`
- `brightness`
- `warmth`
- `entropy`
- `tension`
- `density`

Those controls influence the sequence engine in several ways:

- tonic and scale selection
- pacing and BPM behavior
- harmonic stability and modulation tendency
- melodic movement and interval preference
- phrase density and duration weighting
- rhythmic activity and arrangement feel

### Sequence Generation

The music engine builds a `PlayableSequence` made up of note, chord, scale, and drum events. The generator keeps harmonic and melodic state partially independent so it can sustain washed harmonic textures while still producing more active lead motion, phrase refreshes, and arpeggiated material.

This structure makes it possible to produce output that feels more like a composed generative sketch than a simple color-to-note lookup table.

### Playback, Rendering, and Export

Once a sequence is generated, Motif uses it in three distinct ways:

- it is transformed into playback-ready events for the live listening experience
- it is summarized into UI-facing musical metadata for inspection
- it is converted into a row-major grid of hex colors that paints the generated image view

The app then supports exporting:

- a PNG of the generated image
- a WAV of the generated audio

## User Experience

The core experience is built around an iterative creative loop:

1. Upload an image.
2. Let the app analyze the source and derive macro values.
3. Review the visual and musical profile.
4. Adjust configuration values such as BPM or pixelation.
5. Generate and audition a new sequence.
6. Inspect the generated canvas and music summary.
7. Export the outputs you want to keep.

That loop is intentionally quick. The project is meant to encourage experimentation, comparison, and repeated regeneration from the same source material.

## Architectural Notes

- The project is intentionally organized around focused utility modules and Svelte components rather than a large application framework or backend service.
- `music-utils.ts` is the main domain-heavy module and currently contains generation logic, synthesis setup, sequence summarization, image-color derivation, and export helpers.
- The generated WAV export uses a direct PCM rendering path for reliability instead of relying entirely on offline scheduling.
- The generated image view is sequence-driven, which means the visual output is not a filtered copy of the source image but a new artifact informed by the resulting music.

## Design Direction

Motif is biased toward atmospheric output rather than strict transcription. The current sound world emphasizes:

- soft leads
- blurred harmonic textures
- reverberant space
- motion that feels image-guided instead of mechanically deterministic

The visual side follows the same philosophy. The generated image is meant to feel like a companion piece to the audio, not merely a debug view of the sequence.

## Roadmap Ideas

Areas I'd like to expand on:

- richer arrangement layers and instrument families
- preset systems for generation styles
- alternate color-to-music mapping strategies
- improved drum design and stereo spatialization
- saved sessions or generation history
- batch comparison of multiple generations from the same image
- stronger progress and error feedback around long-running exports

## License

This repository does not currently declare a license. If the project is intended for broader distribution, an explicit license file should be added.
