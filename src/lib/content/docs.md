# Motif SDK
---
Motif exposes two main generation entry points:

- `Generator` for the fast, high-level workflow
- `MarkovChain` for manual stepping, previews, and lower-level control

If you are building an app or tool on top of Motif, start with `Generator` first. Reach for `MarkovChain` when you need tighter control over progression, previews, or custom orchestration.

## Mental Model
---
The SDK is easiest to use if you treat generation as a pipeline:

1. Create or derive macro controls.
2. Generate a `PlayableSequence`.
3. Inspect or transform the sequence.
4. Send it to Tone.js for playback.
5. Optionally export audio or derive a generated image.

At the center of that pipeline is the `PlayableSequence`. It is the format that connects composition, playback, analysis, export, and visualization.

## Quick Start
---
```ts
import {
  Generator,
  ToneBridge,
  choosePlaybackVelocity,
  imageStatsToMacros,
} from "$lib/utils/music-utils";

const macros = imageStatsToMacros(imageStats);
const sequence = Generator.song(90, macros, 96);

const bridge = new ToneBridge();
await bridge.play(sequence, choosePlaybackVelocity);
```

This is the shortest path from image-derived controls to audible playback.

## Generator
---
Use `Generator` when you want a session-style API that can read forward, preview upcoming material, and accumulate history.

### Create a Generator
```ts
import { Generator } from "$lib/utils/music-utils";

const generator = new Generator(
  {
    energy: 0.74,
    brightness: 0.58,
    warmth: 0.46,
    entropy: 0.33,
    tension: 0.41,
    density: 0.67,
    hue: 0.61,
  },
  92,
);
```

### Read Forward
`read(measures)` advances the internal state and appends the generated material to the generator history.

```ts
const firstPhrase = generator.read(4);
const secondPhrase = generator.read(2);
const fullSequence = generator.toFullSequence();
```

Use this workflow when you want to build a piece in chunks, such as:

- generating four bars at a time for a live tool
- incrementally extending a session
- stitching together sections while keeping continuity

### Peek Without Committing
`peek(measures)` returns a preview without mutating the generator state.

```ts
const candidate = generator.peek(4);
```

This is useful for:

- auditioning the next phrase before accepting it
- building a “regenerate next section” interaction
- comparing alternate futures from the same current state

### Reset a Session
If you want to restart from the same macro profile, call `reset()`.

```ts
generator.reset();
```

That clears generation history and rebuilds the simulation from a fresh seed.

### One-Shot Workflow
If you do not need session state, use `Generator.song(seconds, macros, bpm)`.

```ts
const sequence = Generator.song(120, macros, 100);
```

This is the best fit for:

- “generate track” buttons
- background rendering jobs
- export-oriented flows
- stateless API endpoints

## MarkovChain
---
Use `MarkovChain` when you want to control the initial state directly or work closer to the generative engine.

### Create a Chain
```ts
import {
  Chord,
  KeyStructures,
  MarkovChain,
  Note,
  Scale,
} from "$lib/utils/music-utils";

const scale = new Scale(new Note("C", 4), KeyStructures.Major, 4);

const chain = new MarkovChain({
  initialScale: scale,
  initialNote: new Note("E", 4),
  initialChord: Chord.from(
    [new Note("C", 4), new Note("E", 4), new Note("G", 4)],
    scale,
    { constrained: true, octaveAware: true },
  ),
  tickBeats: 0.25,
  macros,
  bpm: 110,
});
```

Reach for this workflow when you need:

- a known starting scale or note
- deterministic-feeling seeded sessions
- custom authoring tools that step through generation explicitly
- deeper experimentation than the high-level generator API offers

### Generate Playback Data
The most useful conversion method is `toPlayableSequence(measures, options)`.

```ts
const sequence = chain.toPlayableSequence(4, { bpm: 110 });
```

You can also ask for narrower projections depending on your UI or playback layer:

- `toNotePlaybackSequence(...)`
- `toChordPlaybackSequence(...)`
- `previewPlayableSequence(...)`

Those are helpful when you want to:

- render note lanes or piano-roll style views
- inspect harmonic motion independently
- preview a section without advancing chain state

## Working With PlayableSequence
---
`PlayableSequence` is the interchange format for the Motif SDK.

It contains:

- timing information such as `bpm`, `totalBeats`, and `totalSeconds`
- flattened `events`
- grouped musical streams in `notes`, `chords`, `scales`, and `drums`

That means one sequence can power several downstream workflows:

- live playback
- analysis summaries
- WAV export
- generated image rendering
- custom visualizations

### Summaries and UI Data
If you need user-facing metadata, use `playbackSequenceToDisplaySummary(sequence)`.

```ts
import { playbackSequenceToDisplaySummary } from "$lib/utils/music-utils";

const summary = playbackSequenceToDisplaySummary(sequence);
```

This gives you a presentation-friendly overview of note counts, chord usage, scale names, and related stats without forcing your UI to inspect raw events directly.

### Color and Image Workflows
The sequence can also drive generated visuals:

```ts
import { playbackSequencesToPixelColors } from "$lib/utils/music-utils";

const colors = playbackSequencesToPixelColors(sequence, 96, 96);
```

This is the workflow to use when you want a generated image that is derived from the sequence rather than copied from the source image.

## Tone.js Integration
---
Motif already includes a Tone.js integration layer through `ToneBridge`.

### Simple Playback
```ts
import {
  ToneBridge,
  choosePlaybackVelocity,
} from "$lib/utils/music-utils";

const bridge = new ToneBridge();
await bridge.play(sequence, choosePlaybackVelocity);
```

This is the recommended integration path for most apps. It handles transport setup, scheduling, and instrument wiring for you.

### Convert Without Scheduling
If you want to plug Motif into your own Tone.js graph, first convert the sequence into Tone-friendly events.

```ts
const bridge = new ToneBridge();
const toneSequence = bridge.toToneSequence(sequence, choosePlaybackVelocity);
```

Use this when you want to:

- schedule into a custom Transport workflow
- apply your own synth or sampler graph
- merge Motif output with other Tone.js systems

### Schedule With Custom Instruments
`scheduleSequence` lets you override instruments for a specific scheduling pass.

```ts
bridge.scheduleSequence(
  sequence,
  {
    noteSynth: myLeadSynth,
    chordSynth: myPadSynth,
    noteVolumeDb: -9,
    chordVolumeDb: -14,
  },
  choosePlaybackVelocity,
);
```

That is a good pattern for:

- swapping presets per track
- building an instrument browser
- keeping one `ToneBridge` while changing voices dynamically

## Export Workflows
---
For offline audio export, use `renderPlayableSequenceToWavBlob`.

```ts
import {
  choosePlaybackVelocity,
  renderPlayableSequenceToWavBlob,
} from "$lib/utils/music-utils";

const wavBlob = await renderPlayableSequenceToWavBlob(
  sequence,
  choosePlaybackVelocity,
);
```

This is the right choice when you need:

- downloadable WAV files
- share/export actions
- background render pipelines
- audio artifacts that do not depend on live Tone.js transport state

## Recommended Workflows
---
### Build a Simple Image-to-Music Tool
1. Analyze an image.
2. Convert image stats with `imageStatsToMacros`.
3. Call `Generator.song(...)`.
4. Play the result with `ToneBridge`.
5. Show summary data with `playbackSequenceToDisplaySummary`.

### Build an Interactive Composer
1. Create a long-lived `Generator`.
2. Use `peek(...)` to audition upcoming measures.
3. Use `read(...)` to commit accepted sections.
4. Merge history with `toFullSequence()`.
5. Keep a `ToneBridge` alive for repeated playback.

### Build a Research or Visualization Tool
1. Construct a `MarkovChain` with explicit initial state.
2. Convert to `PlayableSequence`.
3. Inspect `notes`, `chords`, `scales`, and `events`.
4. Feed the same sequence into playback, summaries, and generated-image logic.

## Choosing the Right Entry Point
---
- Use `Generator.song(...)` for the fastest stateless workflow.
- Use `Generator` for session-based generation with history.
- Use `MarkovChain` when you need explicit control over initialization and stepping.
- Use `ToneBridge` when you want the easiest path into Tone.js playback.
- Use `PlayableSequence` as the boundary object between generation and everything else.
