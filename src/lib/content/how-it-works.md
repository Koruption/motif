# How Motif Works

Motif really consists of 2 primary transformations

- Music gets mapped to pixels and pixels to notes
- Notes get mapped back to pixels

Between each of those mappings sits a music engine that generates melodies, chords, and beats according to certain harmonic rules, music theory, and rng. 


## Core Flow

1. Upload an image.
2. Analyze the image for visual traits like brightness, warmth, contrast, and density.
3. Convert those traits into musical macro controls.
4. Generate a `PlayableSequence` from those macros.
5. Render the sequence as audio and as a new pixel-based image.

## Notes To Expand

- Explain how image statistics become macro values.
- Describe the sequence generator and why it favors atmospheric output.
- Document how the generated image is derived from the sequence rather than copied from the source.
- Add examples, screenshots, and future ideas.
