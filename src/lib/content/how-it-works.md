# How Motif Works
---
Motif is built on a simple idea:

>  Any domain can be transformed into another if you define the mapping.

Music is not inherent to sound. It is structure.
Images are not inherently visual. They are structure.

Motif constructs a bridge between these two domains, not by copying one into the other, but by **learning a representation and re-expressing it through a different medium** .

At its core, Motif is a system of transformations.


## Core Structure
---
Motif consists of two primary mappings:

* **Pixels → Music**
* **Music → Pixels**

Between these mappings sits a generative engine that produces musical sequences under constraint.

If we write this more formally: $$\begin{align*} \text{Image} \xrightarrow{f} \text{Feature Vector} \xrightarrow{g}  \text{Sequence} \xrightarrow{h} \text{Audio} \xrightarrow{f}^{-1} \text{Image} \end{align*}$$Where the original image is not preserved, we extract its structure, translates it, and reconstructs a new image from the generated sequence.

<img src="https://github.com/Koruption/motif/blob/main/process-pipeline.png" alt="Motif Process Pipeline" />

## Background
---
Everything around us has a sound -- the grass, the trees, people, and even a chair. Why can't we hear them? Maybe we do, but the mapping isn't clear to us. Most organisms are transfomation and representation learning creatures and humans are no exception. We learn to associate a thing with its transformations. What is a transformation? Any mapping from one domain to another, effectively a function. Words are transformations in the same way a digital processor is a transformation of vibrations to sequences of bits. They are compressors of sorts, from one space to another, and as it happens humans have the capacity to learn very many transformations which have allowed us to evolve in an ever changing world, compressing the bulk of it, which is perhaps one of our defining characteristics.

But for all the transformations we've learned, there are many more for which we haven't -- what does a love taste like and what sound does a particular painting make? The beauty lie in our capacity to generate new transformations with which we might, albeit clumsily, answer these questions. 

## Music Theory
---
It’s worth stating plainly that I’m not a music theory expert. Before working on this, I knew very little beyond the basics. I realized quickly that I'd drown in the literature if I didn't find a simple way to reason about it, so I came up with a question: what is the minimal structure required for something to sound coherent? If there were a set of simple rules encode, they perhaps I'd find the right abstraction.

Everything collapsed rather quickly into a very small set of operations, primarily addition. Pitch becomes an integer. Movement becomes addition over that integer space. Once you have that, surprisingly far-reaching structure starts to emerge.

Adding semitones defines raw motion. Constraining those additions to specific interval patterns produces scales. Moving in steps of thirds (effectively skipping every other scale degree) produces chords. Stacking those thirds builds harmonic structures that align with what most people would recognize as consonant or “in key.” Even without deep theoretical knowledge, these operations alone are enough to generate sequences that are at least _structurally consistent_ — enharmonic within a scale, harmonically grounded, and perceptually stable.

At the lowest level, everything reduces to discrete pitch relationships. A `Note` is not a label, its an integer representation of pitch, where movement is defined through semitone shifts. Transposition becomes simple modular arithmetic: $$n'=(n+k) \,\,\text{mod}\,12$$This is the fundamental operation. Everything else builds on top of it.

A `Scale` is then a structured subset of this space, defined by intervals. For example, a major scale can be expressed as a sequence of steps: $$[2,2,1,2,2,2,1]$$which, when accumulated, defines the allowable pitch classes. What matters here is not the specific scale, but the fact that scales define **constraint manifolds** within the full pitch space. Movement is no longer free — it is restricted to paths that remain within the structure.

A `Chord` is constructed through stacking thirds, selecting notes separated by intervals of two scale degrees. This introduces a second layer of structure: local groupings that create harmonic centers. These are not enforced as strict requirements, but they act as attractors in the system. Certain transitions become more likely because they align with these groupings.

The more interesting behavior emerges from how movement is defined across these structures. Rather than jumping arbitrarily, the system uses **pathing** — constructing sequences by stepping through the scale. Given a current note and a target note, the system can generate a path along the scale degrees, effectively creating motion that is perceived as continuous rather than disjoint.

This can be thought of as operating over a graph, where nodes are notes within the scale and edges are valid transitions (typically stepwise motion). Longer jumps are possible, but they are less probable unless explicitly biased.
## Non-Stationary Markov Processes and RNG
At the center of Motif is a sequence generator that evolves over time. The natural starting point for such a system is a Markov process, where the next state depends on the current state: $$P(x_{t+1} \,\vert\,x_{t})$$This formulation is simple, but it had a limitation: it assumes the transition dynamics are fixed. The system has no notion of progression, no sense of context beyond the immediate present. In contrast, music is about history, theme, and explorations -- a return to normalization and the divergence from it.

We extend this into a non-stationary process: $$P(x_{{t+1}}\,|\,x_{t}, x_{t}, h_{t})$$where:

- $x_t$​ is the current musical state
- $c_{t}$​ represents macro controls derived from the image
- $h_{t}$​ represents local history or context

This turns the transition function into something that evolves. The system is no longer sampling from a static table, but from a distribution that shifts as the sequence unfolds.

The second key idea is factorization. A musical “event” is not sampled as a single object. Instead, it is decomposed into components: $$xt​=(r_{t}​,p_{t}​,i_{t}​,ρ_{t}​,χ_{t})$$where:
- $r_t$​: rhythm
- $p_{t}$​: pitch
- $i_{t}$​: interval (movement relative to previous note)
- $ρ_{t}$​: register (octave placement)
- $χ_{t}$: harmonic relation (chord alignment, tension, etc.)

The transition probability is then approximated as: $$P(x_{t+1}\mid\cdot) \approx P(r_{t+1}\mid\cdot)\,P(p_{t+1}\mid\cdot)\,P(i_{t+1}\mid\cdot)\,P(\rho_{t+1}\mid\cdot)\,P(\chi_{t+1}\mid\cdot)$$This is not strictly independent, these components influence each other — but the factorization makes the problem tractable and, more importantly, controllable.

Each component can be biased independently by the macro state. For example:
- increased “energy” may increase $P(r_{t+1})$ for shorter durations
- increased “contrast” may widen the distribution over $i_{t+1}$​, allowing larger jumps
- harmonic bias may increase the likelihood that $p_{t+1}$ aligns with the current chord

The non-stationarity enters through the dependence on $c_t​ and $h_{t}$​. As the sequence progresses:
- distributions can narrow or widen
- certain transitions can become more or less likely
- the system can shift from exploratory to stable behavior

This introduces something directions that a stationary process alone cannot produce.

Early in a sequence, the system may explore a broader distributions, more variation. Later, it may converge to tighter more repetitious constraints or resolution. These shifts are not hard-coded; they emerge from how the macro controls and history influence the transition probabilities.

Randomness, in this context, is not uniform noise. It is structured uncertainty — a system sampling from a landscape that is continuously reshaped by both global conditions (the image) and local context (the sequence itself).

The result is a process that does not simply generate notes, but produces sequences that feel like they evolve — not because they follow a predefined form, but because the underlying probabilities are allowed to change.

## Process
---
So how does an image turn into music?

The system begins by reducing the image into a set of statistical descriptors: brightness, contrast, color distributions, saturation, density.

These measurements are then mapped into a set of macro controls, but we don't attempt to map pixels directly to notes. Instead, we construct an intermediate representation that captures the “state” of the image in a form the generator can use.

These macro values act as forces on the system. They do not dictate exact outcomes, but they shape the distributions from which outcomes are drawn. They influence tempo, density, harmonic bias, movement, and variation.

From there, the generator produces a `PlayableSequence` constructed step by step, with each decision influenced by the current state, the recent past, and the macro conditions derived from the image.

Once the sequence exists, it is realized in two ways, first as sound, and second, as an image but not the original image. The sequence itself is used to construct an entirely new image. The result is a new transformation, an image that is *of the music*, not of the source.
## Closing Thoughts
---
This project was not about faithfully translating images into music. There is no “correct” sound for a given image, just as there is no inherent taste of a concept or color of a sound. The point of it was to define a mapping, a specific, constructed relationship between two domains, and then explore the consequences of that mapping. What remains after the mapping, is the interesting part -- what one might call, *essence*.

Because if structure can be preserved, even partially, across domains that are fundamentally different, then it suggests something deeper: that what we perceive as separate, sound, vision, language — may just be different projections of underlying patterns.

I hope to see more experiments in that direction.
