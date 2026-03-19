type NoteName =
  | "A"
  | "A#"
  | "Ab"
  | "B"
  | "B#"
  | "Bb"
  | "C"
  | "C#"
  | "Cb"
  | "D"
  | "D#"
  | "Db"
  | "E"
  | "E#"
  | "Eb"
  | "F"
  | "F#"
  | "Fb"
  | "G"
  | "G#"
  | "Gb";

const NOTE_IDS_BY_NAME: Readonly<Record<NoteName, number>> = {
  C: 0,
  "C#": 1,
  Db: 1,
  D: 2,
  "D#": 3,
  Eb: 3,
  E: 4,
  F: 5,
  "F#": 6,
  Gb: 6,
  G: 7,
  "G#": 8,
  Ab: 8,
  A: 9,
  "A#": 10,
  Bb: 10,
  B: 11,
  Cb: 11,
  "B#": 0,
  "E#": 5,
  Fb: 4,
};

const NOTE_NAMES_BY_ID = Object.entries(NOTE_IDS_BY_NAME).reduce<
  Record<number, NoteName[]>
>((namesById, [noteName, id]) => {
  const typedNoteName = noteName as NoteName;
  (namesById[id] ??= []).push(typedNoteName);
  return namesById;
}, {});

export const idKey = (id: number): readonly NoteName[] =>
  NOTE_NAMES_BY_ID[((id % 12) + 12) % 12] ?? ["C"];

export const keyId = (key: NoteName): number => NOTE_IDS_BY_NAME[key];

const LETTERS = ["A", "B", "C", "D", "E", "F", "G"] as const;
type Letter = (typeof LETTERS)[number];

const getLetter = (note: NoteName): Letter => note[0] as Letter;

const expectedLetters = (root: Letter, length: number): Letter[] => {
  const start = LETTERS.indexOf(root);
  return Array.from({ length }, (_, i) => LETTERS[(start + i) % 7]);
};

type MovementDirection = "up" | "down";
const numericalDirection = (dir: MovementDirection) => {
  return dir === "up" ? 1 : -1;
};

const mod12 = (n: number) => ((n % 12) + 12) % 12;

type ChordOptions = {
  readonly constrained?: boolean;
  // stackMode?: "scale" | "chromatic" | "sampled";
  // allowDuplicates?: boolean;
  readonly octaveAware?: boolean;
  // sampledThirds?: { minor: number; major: number };
};

export type KeyStructure = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

export const KeyStructures: {
  Major: KeyStructure;
  Minor: KeyStructure;
  Lydian: KeyStructure;
  Dorian: KeyStructure;
} = {
  Major: [0, 2, 4, 5, 7, 9, 11],
  Minor: [0, 2, 3, 5, 7, 8, 10],
  Lydian: [0, 2, 4, 6, 7, 9, 11],
  Dorian: [0, 2, 3, 5, 7, 9, 10],
};

export const namedStructure = (structure: KeyStructure) => {
  if (structure === KeyStructures.Major) return "Major";
  if (structure === KeyStructures.Minor) return "Minor";
  if (structure === KeyStructures.Lydian) return "Lydian";
  if (structure === KeyStructures.Dorian) return "Dorian";
  return "Custom";
};

export class Note {
  readonly name: NoteName;
  readonly id: number;
  readonly octave?: number;

  /**
   * Creates a note from a note name and optional octave.
   *
   * @param noteName - The note spelling to assign.
   * @param octave - The optional octave for the note.
   * @returns A new {@link Note} instance.
   */
  constructor(noteName: NoteName, octave?: number) {
    this.name = noteName;
    this.id = keyId(noteName);
    this.octave = octave;
  }

  idstr() {
    return this.id.toString();
  }

  keyed() {
    return this.absolutePitch() ?? this.id;
  }

  keyedstr() {
    return this.keyed().toString();
  }

  /**
   * Builds a note from a pitch-class id and an optional octave.
   *
   * @param id - The pitch-class id to resolve.
   * @param octave - The optional octave for the resulting note.
   * @param preferredIndex - The preferred enharmonic spelling index.
   * @returns A note matching the requested pitch class.
   */
  static fromPitchId(id: number, octave?: number, preferredIndex = 0) {
    const names = idKey(id);
    return new Note(names[Math.min(preferredIndex, names.length - 1)], octave);
  }

  /**
   * Creates multiple octave-less notes in one call.
   *
   * @param args - The note names to construct.
   * @returns An array of {@link Note} instances.
   */
  static Notes(...args: NoteName[]) {
    return args.map((n) => new Note(n));
  }

  /**
   * Sorts notes by ascending pitch class.
   *
   * @param notes - The notes to sort.
   * @returns A new sorted array.
   */
  static sortByPitch(notes: Note[]) {
    return [...notes].sort((a, b) => a.id - b.id);
  }

  /**
   * Transposes the note by a number of semitones.
   *
   * @param k - The semitone offset to apply.
   * @param preferredIndex - The preferred enharmonic spelling index.
   * @returns A transposed {@link Note}.
   */
  transpose(k: number, preferredIndex = 0): Note {
    const absp = this.absolutePitch();

    if (absp === undefined) {
      const names = idKey(mod12(this.id + k));
      return new Note(names[Math.min(preferredIndex, names.length - 1)]);
    }

    const nextAbs = absp + k;
    const nextId = mod12(this.id + k);
    const nextOctave = Math.floor(nextAbs / 12);
    const names = idKey(nextId);
    return new Note(
      names[Math.min(preferredIndex, names.length - 1)],
      nextOctave,
    );
  }

  /**
   * Returns every enharmonic spelling for the transposed pitch.
   *
   * @param k - The semitone offset to apply.
   * @returns All enharmonic spellings at the transposed pitch.
   */
  transposeAll(k: number): Note[] {
    const nextAbs =
      this.absolutePitch() === undefined
        ? undefined
        : this.absolutePitch()! + k;
    const nextId = mod12(this.id + k);
    const nextOctave =
      nextAbs === undefined ? undefined : Math.floor(nextAbs / 12);

    return idKey(nextId).map((name) => new Note(name, nextOctave));
  }

  /**
   * Returns the absolute semitone position for the note.
   *
   * @returns The absolute pitch, or `undefined` when no octave is assigned.
   */
  absolutePitch() {
    return this.octave === undefined ? undefined : this.octave * 12 + this.id;
  }

  /**
   * Computes the octave reached by moving this note up or down by one semitone.
   *
   * @param direction - The direction of movement.
   * @returns The resulting octave, or `undefined` when no octave is assigned.
   */
  getOctave(direction: MovementDirection) {
    if (this.octave === undefined) return undefined;
    const d = numericalDirection(direction);
    const absp = this.absolutePitch()!;
    const nextOctaveUp = Math.floor((absp + d) / 12);
    return nextOctaveUp;
  }

  /**
   * Returns the same pitch class lowered into the previous octave.
   *
   * @returns A new note one octave lower.
   */
  lower() {
    const octave = this.getOctave("down");
    if (octave === undefined)
      throw new Error(`The note ${this.name} has no octave assigned.`);
    return new Note(this.name, octave);
  }

  /**
   * Returns the same pitch class raised into the next octave.
   *
   * @returns A new note one octave higher.
   */
  raise() {
    const octave = this.getOctave("up");
    if (octave === undefined)
      throw new Error(`The note ${this.name} has no octave assigned.`);
    return new Note(this.name, octave);
  }

  /**
   * Calculates the octave distance from this note to another note.
   *
   * @param n - The note to compare against.
   * @returns The octave offset from this note to {@link n}.
   */
  octaveOffset(n: Note) {
    if (this.octave === undefined || n.octave === undefined)
      throw new Error(
        "Both notes must have assigned octaves to calculate offsets.",
      );
    return n.octave - this.octave;
  }

  /**
   * Walks chromatically from this note toward a target note by fixed steps.
   *
   * @param n - The target note.
   * @param stepSize - The semitone step size for each move.
   * @returns The chromatic path from this note to the target.
   */
  path(n: Note, stepSize = 1): Note[] {
    const start = this.absolutePitch();
    const end = n.absolutePitch();

    if (start === undefined || end === undefined) {
      throw new Error(
        "Both notes must have octaves assigned to compute a path.",
      );
    }

    if (stepSize <= 0) {
      throw new Error("stepSize must be positive.");
    }

    const dir = end >= start ? 1 : -1;
    const notes: Note[] = [];
    let current: Note = this;

    notes.push(current);

    while (current.absolutePitch() !== end) {
      const nextAbs = current.absolutePitch()! + dir * stepSize;

      if ((dir > 0 && nextAbs > end) || (dir < 0 && nextAbs < end)) {
        break;
      }

      current = current.transpose(dir * stepSize);
      notes.push(current);
    }

    return notes;
  }
}

export class Scale {
  readonly base: Note;
  readonly notesRaw: number[];
  readonly structure: KeyStructure;
  private readonly orderedNotes: NoteName[];
  readonly notes: Note[];
  readonly name: string = "";

  /**
   * Creates a scale from a base note and interval structure.
   *
   * @param baseNote - The tonic of the scale.
   * @param structure - The interval structure to apply.
   * @returns A new {@link Scale} instance.
   */
  constructor(
    baseNote: Note,
    structure: KeyStructure,
    octave: number | undefined = undefined,
  ) {
    const spelling = Scale.resolveSpelling(baseNote, structure);

    this.base = new Note(spelling.baseName, baseNote.octave);
    this.name = `${this.base.name} ${namedStructure(structure)}`;
    this.structure = structure;
    this.notesRaw = structure.map((offset) => mod12(this.base.id + offset));
    this.orderedNotes = spelling.notes;
    const anchorOctave = octave ?? this.base.octave;
    this.notes = this.orderedNotes.map((name, i) => {
      if (anchorOctave === undefined) {
        return new Note(name);
      }

      const absolutePitch =
        anchorOctave * 12 + this.base.id + this.structure[i];
      return new Note(name, Math.floor(absolutePitch / 12));
    });
  }

  private static resolveSpelling(
    baseNote: Note,
    structure: KeyStructure,
  ): {
    baseName: NoteName;
    notes: NoteName[];
  } {
    const tonicCandidates = [
      baseNote.name,
      ...idKey(baseNote.id).filter((name) => name !== baseNote.name),
    ];

    for (const baseName of tonicCandidates) {
      const notes = Scale.tryOrderNotes(baseName, structure);
      if (notes) {
        return { baseName, notes };
      }
    }

    throw new Error(
      `Could not spell scale for tonic ${baseNote.name} and structure ${structure.join(",")}.`,
    );
  }

  private static tryOrderNotes(
    baseName: NoteName,
    structure: KeyStructure,
  ): NoteName[] | null {
    const rootLetter = getLetter(baseName);
    const letters = expectedLetters(rootLetter, structure.length);
    const baseId = keyId(baseName);
    const orderedNotes: NoteName[] = [];

    for (let i = 0; i < structure.length; i += 1) {
      const pitch = mod12(baseId + structure[i]);
      const targetLetter = letters[i];
      const match = idKey(pitch).find(
        (candidate) => getLetter(candidate) === targetLetter,
      );

      if (!match) {
        return null;
      }

      orderedNotes.push(match);
    }

    return orderedNotes;
  }

  /**
   * Returns a random note from the scale.
   *
   * @returns A randomly selected scale note.
   */
  sample(): Note {
    const rindx = Math.floor(Math.random() * this.notes.length);
    return this.notes[rindx];
  }

  /**
   * Moves a note by scale degrees within this scale.
   *
   * @param n - The starting note.
   * @param k - The number of scale steps to move.
   * @returns The resulting scale note.
   */
  step(n: Note, k: number = 1): Note {
    const posIndx = this.notes.findIndex((note) => note.id === n.id);
    if (posIndx === -1) {
      throw new Error(`The note ${n.name} is not in the scale.`);
    }

    if (k === 0) {
      return new Note(n.name, n.octave);
    }

    const scaleLen = this.notes.length;
    const rawIndex = posIndx + k;
    const nextIndex = ((rawIndex % scaleLen) + scaleLen) % scaleLen;

    if (n.octave === undefined) {
      return new Note(this.notes[nextIndex].name);
    }

    let currentIndex = posIndx;
    let absolutePitch = n.absolutePitch()!;
    const direction = Math.sign(k);

    for (let i = 0; i < Math.abs(k); i += 1) {
      const followingIndex =
        (((currentIndex + direction) % scaleLen) + scaleLen) % scaleLen;
      const currentPitch = this.notes[currentIndex].id;
      const followingPitch = this.notes[followingIndex].id;
      const semitoneDelta =
        direction > 0
          ? mod12(followingPitch - currentPitch)
          : -mod12(currentPitch - followingPitch);

      absolutePitch += semitoneDelta;
      currentIndex = followingIndex;
    }

    return new Note(this.notes[nextIndex].name, Math.floor(absolutePitch / 12));
  }

  /**
   * Computes the shortest pitch-class distance between two semitone ids.
   *
   * @param a - The first pitch-class id.
   * @param b - The second pitch-class id.
   * @returns The wrapped semitone distance.
   */
  private circularDistance(a: number, b: number) {
    const diff = Math.abs(a - b);
    return Math.min(diff, 12 - diff);
  }

  /**
   * Returns the nearest pitch-class distance from the scale to a note.
   *
   * @param n - The note to compare against the scale.
   * @returns The smallest pitch-class distance.
   */
  distance(n: Note): number {
    let d = Infinity;
    for (const note of this.notes) {
      d = Math.min(d, this.circularDistance(note.id, n.id));
    }
    return d;
  }

  /**
   * Returns every scale note tied for the closest pitch class.
   *
   * @param n - The note to compare against the scale.
   * @returns The nearest scale notes by pitch class.
   */
  closest(n: Note): Note[] {
    let best = Infinity;
    const result: Note[] = [];

    for (const note of this.notes) {
      const d = this.circularDistance(note.id, n.id);
      if (d < best) {
        best = d;
        result.length = 0;
        result.push(note);
      } else if (d === best) {
        result.push(note);
      }
    }

    return result;
  }

  /**
   * Finds the pitch-class index of a note within the scale.
   *
   * @param n - The note to locate.
   * @returns The zero-based index of the note in the scale.
   */
  private scaleIndex(n: Note): number {
    const idx = this.notes.findIndex((note) => note.id === n.id);
    if (idx === -1) {
      throw new Error(
        `The note ${n.name}${n.octave ?? ""} is not in the scale.`,
      );
    }
    return idx;
  }

  /**
   * Moves chromatically until a note lands on a note contained in the scale.
   *
   * @param from - The note to start from.
   * @param direction - The chromatic direction to move.
   * @returns The chromatic approach path into the scale.
   */
  private chromaticApproachToScale(
    from: Note,
    direction: MovementDirection,
  ): Note[] {
    const path: Note[] = [from];
    let current = from;

    // walk chromatically until we land in the scale
    while (!this.contains(current)) {
      current = current.transpose(direction === "up" ? 1 : -1);
      path.push(current);

      if (path.length > 128) {
        throw new Error("chromaticApproachToScale overflowed.");
      }
    }

    return path;
  }

  /**
   * Builds a path into the scale and then across scale degrees to a target note.
   *
   * @param n1 - The starting note.
   * @param n2 - The target note.
   * @param stepSize - The number of scale steps to move per iteration.
   * @returns The full path from the start note to the target.
   */
  path(n1: Note, n2: Note, stepSize = 1): Note[] {
    if (!this.contains(n2)) {
      throw new Error(
        `The target note ${n2.name}${n2.octave ?? ""} is not in the scale.`,
      );
    }

    if (stepSize <= 0) throw new Error("stepSize must be positive.");

    const startAbs = n1.absolutePitch();
    const endAbs = n2.absolutePitch();

    const direction: MovementDirection =
      startAbs !== undefined && endAbs !== undefined
        ? endAbs >= startAbs
          ? "up"
          : "down"
        : "up";

    const result: Note[] = [];

    let current = n1;

    // If start note is out of scale, approach the scale chromatically first.
    if (!this.contains(current)) {
      const approach = this.chromaticApproachToScale(current, direction);
      result.push(...approach);
      current = approach[approach.length - 1];
    } else {
      result.push(current);
    }

    // If we already landed on the target, done.
    if (current.id === n2.id && current.octave === n2.octave) {
      return result;
    }

    // Now walk inside the scale.
    while (current.id !== n2.id || current.octave !== n2.octave) {
      current = this.step(current, direction === "up" ? stepSize : -stepSize);
      result.push(current);

      if (result.length > 512) {
        throw new Error("Scale.path overflowed.");
      }
    }

    return result;
  }

  /**
   * Checks whether this note is present in the scale using pitch-class containment.
   *
   * @param n - The note to test.
   * @returns `true` when the note is contained in the scale.
   */
  contains(n: Note) {
    return this.notes.some((note) => n.id === note.id);
  }

  /**
   * Checks whether this note, including octave, is present in the scale.
   *
   * @param n - The note to test.
   * @returns `true` when the note is contained in the scale.
   */
  containsExect(n: Note) {
    return this.notes.some((note) => n.keyedstr() === note.keyedstr());
  }

  /**
   * Projects a note onto the nearest scale pitch classes in the same octave.
   *
   * @param n - The note to project.
   * @returns The projected scale notes.
   */
  project(n: Note): Note[] {
    return this.closest(n).map((note) => new Note(note.name, n.octave));
  }
}

export class Chord {
  private _root?: Note;
  readonly options: ChordOptions;
  private _scale?: Scale;
  private _notes: Note[] = [];
  private _uniqueNotes: Set<string> = new Set();

  /**
   * Creates an empty chord with optional scale and octave constraints.
   *
   * @param options - The chord behavior options.
   * @returns A new {@link Chord} instance.
   */
  constructor(
    options: ChordOptions = {
      constrained: true,
      octaveAware: true,
    },
  ) {
    this.options = options;
  }

  /**
   * Checks whether the chord already contains the given note identity.
   *
   * @param n - The note to test.
   * @returns `true` when the note is already present.
   */
  contains(n: Note) {
    const key = n.absolutePitch() ?? n.id;
    return this._uniqueNotes.has(key.toString());
  }

  /**
   * Attaches the chord to a scale and validates the existing root against it.
   *
   * @param scale - The scale to associate with the chord.
   * @returns The current chord for chaining.
   */
  inScale(scale: Scale) {
    if (this._root && !scale.contains(this._root))
      throw new Error(
        `The root note ${this._root.name} for this chord is not in the scale ${scale}.`,
      );
    this._scale = scale;
    return this;
  }

  /**
   * Adds a note to the chord, enforcing scale and uniqueness constraints.
   *
   * @param n - The note to add.
   * @returns The current chord for chaining.
   */
  add(n: Note) {
    if (this.options.constrained && this._scale && !this._scale.contains(n)) {
      throw new Error(
        `This chord is scale-aware, but note ${n.name}${n.octave ?? ""} is not in the scale.`,
      );
    }
    if (this.contains(n)) {
      throw new Error(
        `The note ${n.name}${n.octave ?? ""} has already been added to this chord.`,
      );
    }
    this._notes.push(n);
    this._uniqueNotes.add(n.keyedstr());
    return this;
  }

  /**
   * Removes a note by position.
   *
   * @param pos - The zero-based note position to remove.
   * @returns This method is currently incomplete and does not return a value.
   */
  removeFromPos(pos: number): Chord {
    if (pos < 0 || pos >= this._notes.length) {
      throw new Error(
        `The position ${pos} is out of bounds of the chord's notes array.`,
      );
    }
    // shift the root up if removing current root
    if (pos === 0) this._root = this._notes[1];

    const nextNotes = [...this._notes];
    nextNotes.splice(pos, 1);

    if (nextNotes.length === 0) {
      throw new Error("Cannot remove the last note from a chord.");
    }

    return Chord.from(nextNotes, this._scale, this.options);
  }

  /**
   * Removes a specific note from the chord.
   *
   * @param n - The note to remove.
   * @returns This method is currently empty and does not return a value.
   */
  removeNote(n: Note): Chord {
    const idx = this._notes.findIndex(
      (note) => note.keyedstr() === n.keyedstr(),
    );

    if (idx === -1) {
      throw new Error(
        `The note ${n.name}${n.octave ?? ""} is not present in this chord.`,
      );
    }

    return this.removeFromPos(idx);
  }

  /**
   * Seeds the chord with a root note and resets its note collection.
   *
   * @param n - The root note to assign.
   * @returns The current chord for chaining.
   */
  seed(n: Note) {
    if (this._scale && !this._scale.contains(n))
      throw new Error(
        `The root note ${n.name} for this chord is not in the assigned scale ${this._scale}.`,
      );

    this._root = n;
    this._notes = [n];
    this._uniqueNotes.add(n.keyedstr());
    return this;
  }

  /**
   * Returns the scale currently associated with the chord.
   *
   * @returns The assigned scale, or `undefined` when none is set.
   */
  scale() {
    return this._scale;
  }

  /**
   * Returns the chord notes as a readonly view.
   *
   * @returns The current chord notes.
   */
  notes() {
    return this._notes as readonly Note[];
  }

  /**
   * Stacks the next chord tone above the current top note.
   *
   * @returns The current chord for chaining.
   */
  stack(stepSize = 2) {
    if (!this._root)
      throw new Error(
        "A root note must be assigned to the chord to begin stacking.",
      );

    const anchor = this._notes[this._notes.length - 1];
    let next: Note;

    if (this.options.constrained) {
      if (!this._scale) {
        throw new Error("A constrained chord must have an assigned scale.");
      }
      next = this._scale.step(anchor, stepSize);
    } else {
      next = anchor.transpose(4); // can change 4 to be sampled, or variable
    }

    if (!this._notes.some((n) => n.id === next.id)) {
      this._notes.push(next);
    }

    return this;
  }

  /**
   * Adds a note at a fixed semitone interval from an anchor note.
   *
   * @param k - The semitone interval to add.
   * @param from - The note to measure from. Defaults to the latest note or root.
   * @param preferredIndex - The preferred enharmonic spelling index.
   * @returns The current chord for chaining.
   */
  addInterval(k: number, from?: Note, preferredIndex = 0) {
    const anchor = from ?? this._notes[this._notes.length - 1] ?? this._root;
    if (!anchor)
      throw new Error("Chord must be seeded before adding an interval.");
    return this.add(anchor.transpose(k, preferredIndex));
  }

  /**
   * Returns the current root note.
   *
   * @returns The root note, or `undefined` when none is set.
   */
  root() {
    return this._root;
  }

  /**
   * Builds a chord from an existing note collection and optional scale.
   *
   * @param notes - The notes to seed into the chord.
   * @param scale - The optional scale to associate with the chord.
   * @param options - The chord behavior options.
   * @returns A new chord containing the provided notes.
   */
  static from(
    notes: Note[],
    scale?: Scale,
    options: ChordOptions = {
      constrained: true,
      octaveAware: true,
    },
  ) {
    if (notes.length === 0) {
      throw new Error(
        "The notes array in from() must have length greater than 0.",
      );
    }

    const chord = new Chord(options);
    if (scale) chord.inScale(scale);
    chord._root = notes[0];
    chord._notes = [...notes];
    return chord;
  }

  /**
   * Merges this chord with another, deduplicating by absolute pitch or pitch class.
   *
   * @param chord - The chord to merge in.
   * @param mode - The resolution method for resolving duplicates.
   * *Note: Use pitch class if you want harmonic-set merging and absolute pitch if you want voicing-aware merging*
   * @returns A new merged chord.
   */
  mix(chord: Chord, mode: "pitchClass" | "absolutePitch" = "pitchClass") {
    const keyOf = (n: Note) =>
      mode === "absolutePitch"
        ? (n.absolutePitch() ?? n.id).toString()
        : n.id.toString();

    const uniques = new Map<string, Note>();

    for (const n of this._notes) uniques.set(keyOf(n), n);
    for (const n of chord.notes()) uniques.set(keyOf(n), n);

    const merged = [...uniques.values()].sort((a, b) => {
      const ak = mode === "absolutePitch" ? (a.absolutePitch() ?? a.id) : a.id;
      const bk = mode === "absolutePitch" ? (b.absolutePitch() ?? b.id) : b.id;
      return ak - bk;
    });

    return Chord.from(merged, this._scale, this.options);
  }

  /**
   * Moves every chord voice toward a shared target and returns each intermediate chord.
   *
   * @param scale - The scale used to compute motion.
   * @param target - The shared destination note for each voice.
   * @param stepSize - The number of scale steps per move.
   * @returns The sequence of intermediate chords.
   */
  path(scale: Scale, target: Note = scale.base, stepSize = 1): Chord[] {
    if (!this._root) {
      throw new Error("A root note must be assigned to compute a chord path.");
    }

    if (!scale.contains(target)) {
      throw new Error(
        `The target note ${target.name}${target.octave ?? ""} is not in the scale.`,
      );
    }

    const voicePaths = this._notes.map((note) =>
      scale.path(note, target, stepSize),
    );
    const maxLen = Math.max(...voicePaths.map((p) => p.length));

    const chords: Chord[] = [];

    for (let i = 0; i < maxLen; i += 1) {
      const chordNotes = voicePaths.map(
        (path) => path[Math.min(i, path.length - 1)],
      );
      const chord = Chord.from(chordNotes, scale, {
        constrained: true,
        octaveAware: true,
      });
      chords.push(chord);
    }

    return chords;
  }

  /**
   * Resolves each voice to its nearest target in the scale and returns the chord path.
   *
   * @param scale - The scale used to compute motion.
   * @param stepSize - The number of scale steps per move. Keep at 1 if you want natural steps.
   * @returns The sequence of intermediate chords.
   */
  pathToNearest(scale: Scale, stepSize = 1): Chord[] {
    if (!this._root) {
      throw new Error("A root note must be assigned to compute a chord path.");
    }

    if (stepSize <= 0) {
      throw new Error("stepSize must be positive.");
    }

    const chooseNearestTarget = (from: Note): Note => {
      // If already in scale, resolve to self.
      if (scale.contains(from)) {
        return from;
      }

      const candidates = scale.project(from);
      if (candidates.length === 0) {
        throw new Error(
          `Could not project note ${from.name}${from.octave ?? ""} into scale ${scale.name}.`,
        );
      }

      // If octave is missing, take the first nearest pitch-class target
      if (from.octave === undefined) {
        return candidates[0];
      }

      // Rebuild candidates in the source octave so absolute comparisons make sense
      const octaveAwareCandidates = candidates.map(
        (candidate) => new Note(candidate.name, from.octave),
      );

      let best = octaveAwareCandidates[0];
      let bestDist = Infinity;

      for (const candidate of octaveAwareCandidates) {
        const dist = Math.abs(
          candidate.absolutePitch()! - from.absolutePitch()!,
        );
        if (dist < bestDist) {
          best = candidate;
          bestDist = dist;
        }
      }

      return best;
    };

    const voicePaths = this._notes.map((note) => {
      const target = chooseNearestTarget(note);
      return scale.path(note, target, stepSize);
    });

    const maxLen = Math.max(...voicePaths.map((p) => p.length));
    const chords: Chord[] = [];

    for (let i = 0; i < maxLen; i += 1) {
      const chordNotes = voicePaths.map(
        (path) => path[Math.min(i, path.length - 1)],
      );

      const chord = Chord.from(chordNotes, scale, {
        constrained: true,
        octaveAware: this.options.octaveAware,
      });

      chords.push(chord);
    }

    return chords;
  }
}

export class Dist {
  static boxMuller(): { z0: number; z1: number } {
    const u1 = Math.random();
    const u2 = Math.random();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    const z1 = Math.sqrt(-2.0 * Math.log(u1)) * Math.sin(2.0 * Math.PI * u2);
    return { z0, z1 };
  }

  static normal(mean: number, stdDev: number): number {
    const { z0 } = Dist.boxMuller();
    return z0 * stdDev + mean;
  }

  static exponential(lambda: number): number {
    const u = Math.random();
    return -Math.log(u) / lambda;
  }

  // very rough gamma(2, 1)–like by adding two exps
  static gamma2(lambda: number): number {
    const x = -Math.log(Math.random());
    const y = -Math.log(Math.random());
    return (x + y) / lambda;
  }

  // beta(2,2)‑like symmetric bump on [0,1]
  static beta22(): number {
    const u = Math.random();
    const v = Math.random();
    return 0.5 * (u + v);
  }

  static paretoTail(scale: number, shape: number): number {
    const u = Math.random();
    return scale / Math.pow(u, 1.0 / shape);
  }
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function remapDurationWeights<T extends number>(
  values: T[],
  biasTowardShort: number,
  strength: number,
): WeightedCandidate<T>[] {
  const max = Math.max(...values);
  const min = Math.min(...values);

  return values.map((v) => {
    const shortness = 1 - (v - min) / (max - min || 1);
    const longness = 1 - shortness;
    const score =
      strength *
      (biasTowardShort * shortness + (1 - biasTowardShort) * longness);

    return {
      value: v,
      weight: Math.exp(score),
    };
  });
}

function applyTemperature(weight: number, entropy: number): number {
  // entropy 0 -> sharper distribution
  // entropy 1 -> flatter distribution
  const temperature = lerp(0.65, 1.75, entropy);

  // if weight ~ exp(score), then weight^(1/T) is a simple flatten/sharpen trick
  return Math.pow(weight, 1 / temperature);
}

function mapMacroToStyle(macros: MacroControls): GeneratorStyle {
  const energy = clamp(macros.energy, 0, 1);
  const brightness = clamp(macros.brightness, 0, 1);
  const warmth = clamp(macros.warmth, 0, 1);
  const entropy = clamp(macros.entropy, 0, 1);
  const tension = clamp(macros.tension, 0, 1);
  const density = clamp(macros.density, 0, 1);

  const preferredRegisterMin = Math.round(lerp(45, 60, brightness));
  const preferredRegisterMax = Math.round(lerp(72, 90, brightness));

  return {
    stayInScaleBias: lerp(10, 2, entropy * 0.7 + tension * 0.3) + warmth * 2,
    relatedScaleBias: lerp(4, 1.5, entropy),
    modulationBias: lerp(0.25, 4.5, entropy * 0.6 + tension * 0.4),
    preserveNoteAcrossScaleBias: lerp(3, 1, entropy),

    keepChordBias: lerp(5, 1, energy * 0.5 + entropy * 0.5) + warmth * 2,
    noChordBias: lerp(1.2, 0.3, density),
    chordChangeBias: lerp(1, 5, energy * 0.7 + density * 0.3),
    chordContainsMelodyBias: lerp(6, 2, tension) + warmth * 2,
    chordRootNearMelodyBias: lerp(2, 0.5, entropy),
    outOfScaleChordPenalty: lerp(-12, -2, tension * 0.7 + entropy * 0.3),

    inScaleTargetBias: lerp(6, 2, entropy * 0.6 + tension * 0.4),
    chordToneTargetBias:
      lerp(4.5, 1.4, tension * 0.7 + entropy * 0.3) + warmth * 0.8,
    nonChordToneBias: lerp(1.1, 4.2, tension),
    leapPenalty: lerp(0.55, 0.08, energy),
    repeatNoteBias: lerp(0.35, -0.2, energy * 0.7 + entropy * 0.3),
    directionalDriftBias: lerp(0.45, 1.8, brightness),
    tensionNoteBias: lerp(1.2, 4.6, tension),
    arpeggioPathBias: lerp(0.25, 0.9, energy * 0.55 + brightness * 0.45),
    harmonyRefreshMelodyChance: lerp(
      0.25,
      0.78,
      energy * 0.6 + entropy * 0.4,
    ),

    preferredHarmonyDurations: remapDurationWeights(
      [1, 2, 4, 8],
      Math.min(1, 0.78 * energy + 0.22 * density),
      4.2,
    ),

    preferredMelodyDurations: remapDurationWeights(
      [0.25, 0.5, 1, 2],
      Math.min(1, 0.82 * energy + 0.18 * density),
      4.4,
    ),

    maxLeapSemitones: Math.round(lerp(4, 14, energy)),
    preferredRegisterMin,
    preferredRegisterMax,

    allowModulation: entropy > 0.2 || tension > 0.35,
    allowNoChord: density < 0.8,
    allowBorrowedChords: tension > 0.6 || entropy > 0.75,
    allowOutOfScaleMelody: tension > 0.7 || entropy > 0.85,
    maxRelatedScales: Math.round(lerp(2, 8, entropy)),
    maxMelodyCandidates: Math.round(lerp(10, 32, entropy * 0.7 + energy * 0.3)),
  };
}

export type MacroControls = {
  energy: number; // motion / drive / activity
  brightness: number; // tonal/luminous sharpness
  warmth: number; // softness / consonance / low-mid gravity
  entropy: number; // unpredictability / disorder / variance
  tension: number; // instability / suspendedness / urge to resolve
  density: number; // how much is happening
};

const DefaultMacros: MacroControls = {
  energy: 0.5,
  brightness: 0.5,
  warmth: 0.5,
  entropy: 0.2,
  tension: 0.3,
  density: 0.5,
};

type RhythmValue = 0.25 | 0.5 | 1 | 2 | 4 | 8;

type WeightedCandidate<T> = {
  value: T;
  weight: number;
};

type HarmonyEvent = {
  scale: Scale;
  chord: Chord | null;
  durationBeats: number;
};

type MelodyEvent = {
  target: Note;
  path: Note[];
  stepBeats: number;
};

type GeneratorState = {
  scale: Scale;
  chord: Chord | null;
  harmonyBeatsLeft: number;

  currentNote: Note;

  currentMelodyPath: Note[];
  melodyPathIndex: number;
  melodyStepBeats: number;
  melodyStepBeatsLeft: number;

  beat: number;
  tick: number;
  measure: number;
};

type EmittedFrame = {
  tick: number;
  beat: number;
  measure: number;
  scale: Scale;
  chord: Chord | null;
  note: Note;
};

type GeneratorStyle = {
  // ---- scale behavior ----
  stayInScaleBias: number;
  relatedScaleBias: number;
  modulationBias: number;
  preserveNoteAcrossScaleBias: number;

  // ---- harmonic behavior ----
  keepChordBias: number;
  noChordBias: number;
  chordChangeBias: number;
  chordContainsMelodyBias: number;
  chordRootNearMelodyBias: number;
  outOfScaleChordPenalty: number;

  // ---- melody behavior ----
  inScaleTargetBias: number;
  chordToneTargetBias: number;
  nonChordToneBias: number;
  leapPenalty: number;
  repeatNoteBias: number;
  directionalDriftBias: number;
  tensionNoteBias: number;
  arpeggioPathBias: number;
  harmonyRefreshMelodyChance: number;

  // ---- time behavior ----
  preferredHarmonyDurations: WeightedCandidate<RhythmValue>[];
  preferredMelodyDurations: WeightedCandidate<RhythmValue>[];

  // ---- register / motion ----
  maxLeapSemitones: number;
  preferredRegisterMin?: number;
  preferredRegisterMax?: number;

  // ---- generation pool behavior ----
  allowModulation: boolean;
  allowNoChord: boolean;
  allowBorrowedChords: boolean;
  allowOutOfScaleMelody: boolean;
  maxRelatedScales: number;

  // ---- candidate counts ----
  maxMelodyCandidates: number;
};

type GeneratorOptions = {
  tickBeats?: number; // e.g. 0.25 = 16th note grid
  macros?: Partial<MacroControls>;
  initialScale: Scale;
  initialNote: Note;
  initialChord?: Chord | null;
};

const DefaultStyle: GeneratorStyle = {
  // scale
  stayInScaleBias: 8,
  relatedScaleBias: 3,
  modulationBias: 0.5,
  preserveNoteAcrossScaleBias: 2,

  // harmony
  keepChordBias: 3,
  noChordBias: 0.75,
  chordChangeBias: 1.5,
  chordContainsMelodyBias: 4,
  chordRootNearMelodyBias: 1.5,
  outOfScaleChordPenalty: -8,

  // melody
  inScaleTargetBias: 4,
  chordToneTargetBias: 5,
  nonChordToneBias: 1,
  leapPenalty: 0.45,
  repeatNoteBias: 0.8,
  directionalDriftBias: 0.35,
  tensionNoteBias: 1.25,
  arpeggioPathBias: 0.45,
  harmonyRefreshMelodyChance: 0.35,

  // time
  preferredHarmonyDurations: [
    { value: 1, weight: 4 },
    { value: 2, weight: 5 },
    { value: 4, weight: 3 },
    { value: 8, weight: 0.5 },
  ],
  preferredMelodyDurations: [
    { value: 0.25, weight: 7 },
    { value: 0.5, weight: 7 },
    { value: 1, weight: 3 },
    { value: 2, weight: 0.5 },
  ],

  // motion
  maxLeapSemitones: 12,
  preferredRegisterMin: 48, // C4
  preferredRegisterMax: 84, // C7

  // pool behavior
  allowModulation: true,
  allowNoChord: true,
  allowBorrowedChords: false,
  allowOutOfScaleMelody: false,
  maxRelatedScales: 6,

  // counts
  maxMelodyCandidates: 24,
};

function noteLabel(note: Note): string {
  return `${note.name}${note.octave ?? ""}`;
}

function chordLabel(chord: Chord | null): string {
  if (chord === null) return "null";
  return chord
    .notes()
    .map((n) => `${n.name}${n.octave ?? ""}`)
    .sort()
    .join("|");
}

function scaleLabel(scale: Scale): string {
  return `${scale.name}:${scale.base.name}${scale.base.octave ?? ""}:${scale.structure.join(",")}`;
}

type DrumVoice = "kick" | "snare";

type PlayableEventType = "note" | "chord" | "scale" | "drum";

type PlayableEvent = {
  type: PlayableEventType;

  startTick: number;
  endTick: number;

  startBeat: number;
  durationBeats: number;

  startSeconds: number;
  durationSeconds: number;

  measure: number;
  beatInMeasure: number;

  note?: Note;
  chord?: Chord | null;
  scale?: Scale;
  drum?: DrumVoice;
  velocity?: number;

  // Active context at the start of this event
  activeScale?: Scale;
  activeChord?: Chord | null;
};

export type PlayableSequence = {
  bpm: number;
  tickBeats: number;
  secondsPerBeat: number;

  totalTicks: number;
  totalBeats: number;
  totalSeconds: number;

  events: PlayableEvent[];
  notes: PlayableEvent[];
  chords: PlayableEvent[];
  scales: PlayableEvent[];
  drums: PlayableEvent[];
};

type PlayableSequenceOptions = {
  bpm?: number;
};

function beatsToSeconds(beats: number, bpm: number): number {
  return beats * (60 / bpm);
}

function clamp(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}

type DrumPatternHit = {
  voice: DrumVoice;
  beat: number;
  durationBeats: number;
  velocity: number;
};

function buildRepeatedDrumPattern(
  totalTicks: number,
  tickBeats: number,
  bpm: number,
): PlayableEvent[] {
  if (totalTicks <= 0) return [];

  const totalBeats = totalTicks * tickBeats;
  const totalMeasures = Math.ceil(totalBeats / 4);
  const bpmNormalized = clamp((bpm - 72) / 76, 0, 1);
  const oneTick = Math.max(tickBeats, 0.25);
  const stochasticGrid = bpm >= 132 ? 0.25 : 0.5;

  const backbone: DrumPatternHit[] = [
    { voice: "kick", beat: 0, durationBeats: oneTick, velocity: 0.96 },
    {
      voice: "kick",
      beat: bpm >= 124 ? 2.5 : 2,
      durationBeats: oneTick,
      velocity: 0.82,
    },
    { voice: "snare", beat: 1, durationBeats: oneTick, velocity: 0.78 },
    { voice: "snare", beat: 3, durationBeats: oneTick, velocity: 0.86 },
  ];

  const stochasticCandidates: Array<
    DrumPatternHit & {
      probability: number;
    }
  > = [
    {
      voice: "kick",
      beat: 0.75,
      durationBeats: oneTick,
      velocity: 0.64,
      probability: 0.12 + bpmNormalized * 0.08,
    },
    {
      voice: "kick",
      beat: 1.5,
      durationBeats: oneTick,
      velocity: 0.7,
      probability: 0.2 + bpmNormalized * 0.18,
    },
    {
      voice: "kick",
      beat: 2.75,
      durationBeats: oneTick,
      velocity: 0.68,
      probability: 0.16 + bpmNormalized * 0.16,
    },
    {
      voice: "kick",
      beat: 3.5,
      durationBeats: oneTick,
      velocity: 0.6,
      probability: 0.1 + bpmNormalized * 0.12,
    },
    {
      voice: "snare",
      beat: 0.5,
      durationBeats: oneTick,
      velocity: 0.36,
      probability: 0.08 + bpmNormalized * 0.1,
    },
    {
      voice: "snare",
      beat: 1.75,
      durationBeats: oneTick,
      velocity: 0.42,
      probability: 0.14 + bpmNormalized * 0.12,
    },
    {
      voice: "snare",
      beat: 2.5,
      durationBeats: oneTick,
      velocity: 0.34,
      probability: 0.08 + bpmNormalized * 0.1,
    },
    {
      voice: "snare",
      beat: 3.75,
      durationBeats: oneTick,
      velocity: 0.44,
      probability: 0.18 + bpmNormalized * 0.14,
    },
  ];

  const pattern = [...backbone];
  const occupied = new Set(backbone.map((hit) => `${hit.voice}:${hit.beat}`));

  for (const candidate of stochasticCandidates) {
    if (candidate.beat % stochasticGrid !== 0) continue;
    if (occupied.has(`${candidate.voice}:${candidate.beat}`)) continue;
    if (Math.random() <= candidate.probability) {
      pattern.push(candidate);
      occupied.add(`${candidate.voice}:${candidate.beat}`);
    }
  }

  pattern.sort((left, right) => left.beat - right.beat);

  const drums: PlayableEvent[] = [];

  for (let measureIndex = 0; measureIndex < totalMeasures; measureIndex += 1) {
    const measureStartBeat = measureIndex * 4;

    for (const hit of pattern) {
      const startBeat = measureStartBeat + hit.beat;

      if (startBeat >= totalBeats) continue;

      const startTick = Math.round(startBeat / tickBeats);
      const durationTicks = Math.max(
        1,
        Math.round(hit.durationBeats / tickBeats),
      );
      const endTick = Math.min(totalTicks - 1, startTick + durationTicks - 1);

      drums.push({
        type: "drum",
        startTick,
        endTick,
        startBeat,
        durationBeats: durationTicks * tickBeats,
        startSeconds: beatsToSeconds(startBeat, bpm),
        durationSeconds: beatsToSeconds(durationTicks * tickBeats, bpm),
        measure: measureIndex + 1,
        beatInMeasure: hit.beat,
        drum: hit.voice,
        velocity: hit.velocity,
      });
    }
  }

  return drums;
}

function expScore(x: number) {
  // keeps weights positive without exploding too hard
  return Math.exp(clamp(x, -12, 12));
}

function randChoice<T>(items: T[]): T {
  if (items.length === 0)
    throw new Error("randChoice called with empty array.");
  const idx = Math.floor(Math.random() * items.length);
  return items[idx];
}

function weightedSample<T>(items: WeightedCandidate<T>[]): T {
  if (items.length === 0) {
    throw new Error("weightedSample called with no candidates.");
  }

  const cleaned = items
    .map((i) => ({
      value: i.value,
      weight: Number.isFinite(i.weight) ? Math.max(0, i.weight) : 0,
    }))
    .filter((i) => i.weight > 0);

  if (cleaned.length === 0) {
    throw new Error("All candidate weights were zero.");
  }

  const total = cleaned.reduce((sum, item) => sum + item.weight, 0);
  let r = Math.random() * total;

  for (const item of cleaned) {
    r -= item.weight;
    if (r <= 0) return item.value;
  }

  return cleaned[cleaned.length - 1].value;
}

function dedupeBy<T>(items: T[], keyOf: (item: T) => string): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = keyOf(item);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

function absDistance(a: Note, b: Note): number {
  const ap = a.absolutePitch();
  const bp = b.absolutePitch();

  if (ap !== undefined && bp !== undefined) {
    return Math.abs(ap - bp);
  }

  const diff = Math.abs(a.id - b.id);
  return Math.min(diff, 12 - diff);
}

function noteEq(a: Note, b: Note): boolean {
  return a.keyedstr() === b.keyedstr();
}

function chordEq(a: Chord | null, b: Chord | null): boolean {
  if (a === null && b === null) return true;
  if (a === null || b === null) return false;

  const an = [...a.notes()]
    .map((n) => n.keyedstr())
    .sort()
    .join("|");
  const bn = [...b.notes()]
    .map((n) => n.keyedstr())
    .sort()
    .join("|");
  return an === bn;
}

function scaleEq(a: Scale, b: Scale): boolean {
  if (a.base.id !== b.base.id) return false;
  if (a.structure.length !== b.structure.length) return false;
  return a.structure.every((v, i) => v === b.structure[i]);
}

function registerPenalty(note: Note, min?: number, max?: number): number {
  const ap = note.absolutePitch();
  if (ap === undefined) return 0;
  let penalty = 0;
  if (min !== undefined && ap < min) penalty += (min - ap) * 0.2;
  if (max !== undefined && ap > max) penalty += (ap - max) * 0.2;
  return penalty;
}

function buildScale(
  tonic: Note,
  structure: KeyStructure,
  octave?: number,
): Scale {
  return new Scale(
    new Note(tonic.name, octave ?? tonic.octave),
    structure,
    octave,
  );
}

function relatedScales(scale: Scale): Scale[] {
  const tonic = scale.base;
  const octave = tonic.octave;

  const isMajor = scale.structure === KeyStructures.Major;
  const isMinor = scale.structure === KeyStructures.Minor;

  const candidates: Scale[] = [];

  // same tonic parallel mode
  if (isMajor) {
    candidates.push(buildScale(tonic, KeyStructures.Minor, octave));
  } else if (isMinor) {
    candidates.push(buildScale(tonic, KeyStructures.Major, octave));
  }

  // relative major/minor
  if (isMajor) {
    const relMinorTonic = tonic.transpose(9); // down 3 == up 9 mod 12
    candidates.push(buildScale(relMinorTonic, KeyStructures.Minor, octave));
  } else if (isMinor) {
    const relMajorTonic = tonic.transpose(3);
    candidates.push(buildScale(relMajorTonic, KeyStructures.Major, octave));
  }

  // dominant / subdominant flavored
  candidates.push(buildScale(tonic.transpose(7), scale.structure, octave));
  candidates.push(buildScale(tonic.transpose(5), scale.structure, octave));

  // neighbors
  candidates.push(buildScale(tonic.transpose(2), scale.structure, octave));
  candidates.push(buildScale(tonic.transpose(-2), scale.structure, octave));

  return dedupeBy(
    candidates,
    (s) => `${s.base.id}:${s.structure.join(",")}`,
  ).filter((s) => !scaleEq(s, scale));
}

function chordNotesContain(chord: Chord | null, note: Note): boolean {
  if (!chord) return false;
  return chord.notes().some((n) => n.id === note.id);
}

function arpeggioPathFromChord(
  currentNote: Note,
  chord: Chord,
  maxSteps = 4,
): Note[] {
  const chordNotes = chord.notes();
  if (chordNotes.length === 0) return [currentNote];

  const targetOctave = currentNote.octave ?? chord.root()?.octave ?? 4;
  const voicedNotes = chordNotes
    .map((note) => new Note(note.name, note.octave ?? targetOctave))
    .sort((a, b) => (a.absolutePitch() ?? a.id) - (b.absolutePitch() ?? b.id));

  const closestIndex = voicedNotes.reduce((bestIndex, note, index) => {
    const best = voicedNotes[bestIndex];
    return absDistance(note, currentNote) < absDistance(best, currentNote)
      ? index
      : bestIndex;
  }, 0);

  const direction = Math.random() < 0.6 ? 1 : -1;
  const path: Note[] = [];

  for (let step = 0; step < maxSteps; step += 1) {
    const index = closestIndex + step * direction;
    const wrappedIndex =
      ((index % voicedNotes.length) + voicedNotes.length) % voicedNotes.length;
    const octaveShift = Math.floor(index / voicedNotes.length);
    const source = voicedNotes[wrappedIndex];
    const octave = (source.octave ?? targetOctave) + octaveShift;

    path.push(new Note(source.name, octave));
  }

  return dedupeBy(path, (note) => note.keyedstr());
}

function buildScaleTriads(scale: Scale, octave?: number): Chord[] {
  const chords: Chord[] = [];
  const baseOct = octave ?? scale.base.octave ?? 4;

  for (let i = 0; i < scale.notes.length; i++) {
    const root = new Note(scale.notes[i].name, baseOct);

    const third = scale.step(root, 2);
    const fifth = scale.step(root, 4);

    const chord = Chord.from([root, third, fifth], scale, {
      constrained: true,
      octaveAware: true,
    });

    chords.push(chord);
  }

  return dedupeBy(chords, (c) =>
    [...c.notes()]
      .map((n) => n.idstr())
      .sort()
      .join("|"),
  );
}

function maybeAddSevenths(scale: Scale, triads: Chord[]): Chord[] {
  const out: Chord[] = [...triads];

  for (const triad of triads) {
    const root = triad.root();
    if (!root) continue;
    const seventh = scale.step(root, 6);
    const seventhChord = triad.mix(
      Chord.from([seventh], scale, { constrained: true, octaveAware: true }),
      "absolutePitch",
    );
    out.push(seventhChord);
  }

  return dedupeBy(out, (c) =>
    [...c.notes()]
      .map((n) => n.keyedstr())
      .sort()
      .join("|"),
  );
}

function notePoolAround(note: Note, radius: number): Note[] {
  const ap = note.absolutePitch();
  if (ap === undefined) {
    // octave-less fallback: just all pitch classes once
    return Array.from({ length: 12 }, (_, i) => Note.fromPitchId(i));
  }

  const out: Note[] = [];
  for (let k = -radius; k <= radius; k++) {
    out.push(note.transpose(k));
  }

  return dedupeBy(out, (n) => n.keyedstr());
}

function melodicDirectionHint(path: Note[], current: Note): number {
  if (path.length < 2) return 0;
  const last = path[Math.max(0, path.length - 1)];
  const ap1 = current.absolutePitch();
  const ap2 = last.absolutePitch();
  if (ap1 === undefined || ap2 === undefined) return 0;
  return Math.sign(ap2 - ap1);
}

export const BPM = (bpm: number) => {
  if (bpm <= 0) throw new Error("BPM invalid. BPM must exceed 0.");
  if (bpm > 250) throw new Error("BPM invalid. BPM must not ecveed 250.");
  return bpm;
};

type InitialSeed = {
  scale: Scale;
  note: Note;
  bpm: number;
};

function chooseWeighted<T>(items: Array<{ value: T; weight: number }>): T {
  return weightedSample(items);
}

function normalizeMacroValue(x: number | undefined, fallback: number): number {
  return clamp(x ?? fallback, 0, 1);
}

function weightedDegreeChoice(
  scale: Scale,
  macros: MacroControls,
  octave?: number,
): Note {
  const tension = normalizeMacroValue(macros.tension, DefaultMacros.tension);
  const warmth = normalizeMacroValue(macros.warmth, DefaultMacros.warmth);
  const brightness = normalizeMacroValue(
    macros.brightness,
    DefaultMacros.brightness,
  );

  const notes = scale.notes.map(
    (n) => new Note(n.name, octave ?? n.octave ?? scale.base.octave ?? 4),
  );

  // Scale degrees relative to scale.notes:
  // 0 tonic, 1 second, 2 third, 3 fourth, 4 fifth, 5 sixth, 6 seventh
  const candidates = notes.map((note, idx) => {
    let weight = 1;

    switch (idx) {
      case 0: // tonic
        weight += 6 + warmth * 2;
        break;
      case 2: // third
        weight += 4 + warmth * 1.5 + brightness * 1.5;
        break;
      case 4: // fifth
        weight += 5 + warmth;
        break;
      case 1: // second
        weight += 1 + tension * 2;
        break;
      case 3: // fourth
        weight += 1 + tension * 1.5;
        break;
      case 5: // sixth
        weight += 2 + brightness * 1.5;
        break;
      case 6: // seventh
        weight += 0.5 + tension * 3;
        break;
      default:
        weight += 1;
    }

    return { value: note, weight };
  });

  return chooseWeighted(candidates);
}

function chooseInitialStructure(macros: MacroControls): KeyStructure {
  const brightness = normalizeMacroValue(
    macros.brightness,
    DefaultMacros.brightness,
  );
  const warmth = normalizeMacroValue(macros.warmth, DefaultMacros.warmth);
  const tension = normalizeMacroValue(macros.tension, DefaultMacros.tension);
  const entropy = normalizeMacroValue(macros.entropy, DefaultMacros.entropy);

  // Simple first-pass mode palette.
  // You can expand this later with Dorian, Lydian, Mixolydian, harmonic minor, etc.
  const majorWeight = 1 + brightness * 4 + warmth * 1.5 - tension * 1.5;

  const minorWeight = 1 + warmth * 2 + (1 - brightness) * 2 + tension * 1.25;

  // Slightly brighter / more floating
  const lydianWeight = 0.5 + brightness * 3 + entropy * 1.5 - warmth * 0.25;

  // Slightly warmer but still mobile
  const dorianWeight = 0.5 + warmth * 2 + tension * 1.2 + entropy * 0.8;

  const chosen = chooseWeighted<KeyStructure>([
    { value: KeyStructures.Major, weight: Math.max(0.01, majorWeight) },
    { value: KeyStructures.Minor, weight: Math.max(0.01, minorWeight) },
    { value: KeyStructures.Lydian, weight: Math.max(0.01, lydianWeight) },
    { value: KeyStructures.Dorian, weight: Math.max(0.01, dorianWeight) },
  ]);

  return chosen;
}

function chooseInitialTonic(macros: MacroControls, octave = 4): Note {
  const brightness = normalizeMacroValue(
    macros.brightness,
    DefaultMacros.brightness,
  );
  const warmth = normalizeMacroValue(macros.warmth, DefaultMacros.warmth);
  const tension = normalizeMacroValue(macros.tension, DefaultMacros.tension);

  const tonicCandidates = [
    new Note("C", octave),
    new Note("D", octave),
    new Note("E", octave),
    new Note("F", octave),
    new Note("G", octave),
    new Note("A", octave),
    new Note("B", octave),
  ];

  const candidates = tonicCandidates.map((note) => {
    let weight = 1;

    // Warmth tends to like flatter / rounder centers
    if (["C", "F", "A"].includes(note.name)) weight += warmth * 1.5;

    // Brightness tends to like clearer/lifted tonal centers
    if (["D", "E", "G", "B"].includes(note.name)) weight += brightness * 1.25;

    // Tension slightly favors tonal centers that can feel less settled
    if (["B", "D"].includes(note.name)) weight += tension * 1.2;

    return { value: note, weight };
  });

  return chooseWeighted(candidates);
}

function chooseInitialOctave(macros: MacroControls): number {
  const brightness = normalizeMacroValue(
    macros.brightness,
    DefaultMacros.brightness,
  );
  const warmth = normalizeMacroValue(macros.warmth, DefaultMacros.warmth);

  // brighter -> higher, warmer -> slightly lower/mid
  const center = 4 + brightness * 1.2 - warmth * 0.4;
  return Math.round(clamp(center, 3, 6));
}

function chooseInitialBpm(macros: MacroControls): number {
  const energy = normalizeMacroValue(macros.energy, DefaultMacros.energy);
  const density = normalizeMacroValue(macros.density, DefaultMacros.density);
  const entropy = normalizeMacroValue(macros.entropy, DefaultMacros.entropy);
  const tension = normalizeMacroValue(macros.tension, DefaultMacros.tension);

  // Base BPM mostly from energy + density,
  // with a mild push from entropy/tension.
  const raw = 55 + energy * 70 + density * 20 + entropy * 8 + tension * 7;

  // Snap to a nice musical range
  return Math.round(clamp(raw, 50, 170));
}

export function createInitialSeed(
  partialMacros?: Partial<MacroControls>,
): InitialSeed {
  const macros: MacroControls = {
    ...DefaultMacros,
    ...(partialMacros ?? {}),
  };

  const octave = chooseInitialOctave(macros);
  const tonic = chooseInitialTonic(macros, octave);
  const structure = chooseInitialStructure(macros);

  const scale = new Scale(new Note(tonic.name, octave), structure, octave);

  const note = weightedDegreeChoice(scale, macros, octave);
  const bpm = chooseInitialBpm(macros);

  return {
    scale,
    note,
    bpm,
  };
}

export class MarkovChain {
  readonly tickBeats: number;
  style: GeneratorStyle;
  macros: MacroControls;

  private state: GeneratorState;

  constructor(options: GeneratorOptions) {
    this.tickBeats = options.tickBeats ?? 0.25;
    this.macros = {
      ...DefaultMacros,
      ...(options.macros ?? {}),
    };
    this.style = mapMacroToStyle(this.macros);

    const initialChord = options.initialChord ?? null;

    this.state = {
      scale: options.initialScale,
      chord: initialChord,
      harmonyBeatsLeft: 0,

      currentNote: options.initialNote,
      currentMelodyPath: [options.initialNote],
      melodyPathIndex: 0,
      melodyStepBeats: this.tickBeats,
      melodyStepBeatsLeft: 0,

      beat: 0,
      tick: 0,
      measure: 1,
    };
  }

  getState(): Readonly<GeneratorState> {
    return this.state;
  }

  setMacros(partial: Partial<MacroControls>) {
    this.macros = {
      ...this.macros,
      ...partial,
    };

    this.style = mapMacroToStyle(this.macros);
  }

  reset(options: GeneratorOptions) {
    const initialChord = options.initialChord ?? null;

    this.macros = {
      ...DefaultMacros,
      ...(options.macros ?? {}),
    };

    this.style = mapMacroToStyle(this.macros);

    this.state = {
      scale: options.initialScale,
      chord: initialChord,
      harmonyBeatsLeft: 0,

      currentNote: options.initialNote,
      currentMelodyPath: [options.initialNote],
      melodyPathIndex: 0,
      melodyStepBeats: this.tickBeats,
      melodyStepBeatsLeft: 0,

      beat: 0,
      tick: 0,
      measure: 1,
    };
  }
  private sampleDuration(
    pool: WeightedCandidate<RhythmValue>[],
    min = this.tickBeats,
  ): number {
    const candidates = pool.filter((c) => c.value >= min);
    if (candidates.length === 0) {
      return min;
    }
    return weightedSample(candidates);
  }

  private scaleCandidates(current: GeneratorState): Scale[] {
    const candidates: Scale[] = [current.scale];

    if (this.style.allowModulation) {
      candidates.push(
        ...relatedScales(current.scale).slice(0, this.style.maxRelatedScales),
      );
    }

    return dedupeBy(candidates, (s) => `${s.base.id}:${s.structure.join(",")}`);
  }

  private scoreScaleCandidate(
    candidate: Scale,
    current: GeneratorState,
  ): number {
    let score = 0;

    if (scaleEq(candidate, current.scale)) {
      score += this.style.stayInScaleBias;
    } else {
      score += this.style.modulationBias;
    }

    const rel = relatedScales(current.scale).some((s) => scaleEq(s, candidate));
    if (rel) score += this.style.relatedScaleBias;

    if (candidate.contains(current.currentNote)) {
      score += this.style.preserveNoteAcrossScaleBias;
    }

    if (current.chord) {
      const containedCount = current.chord
        .notes()
        .filter((n) => candidate.contains(n)).length;
      score += containedCount * 0.75;
    }

    return expScore(score);
  }

  private chooseScale(current: GeneratorState): Scale {
    const candidates = this.scaleCandidates(current).map((scale) => {
      const rawWeight = this.scoreScaleCandidate(scale, current);
      return {
        value: scale,
        weight: applyTemperature(rawWeight, this.macros.entropy),
      };
    });

    return weightedSample(candidates);
  }

  private chordCandidates(
    scale: Scale,
    current: GeneratorState,
  ): (Chord | null)[] {
    const triads = buildScaleTriads(
      scale,
      current.currentNote.octave ?? scale.base.octave ?? 4,
    );
    const harmonicPool = maybeAddSevenths(scale, triads);

    const candidates: (Chord | null)[] = [];

    if (this.style.allowNoChord) {
      candidates.push(null);
    }

    if (current.chord) {
      candidates.push(
        current.chord.pathToNearest(scale, 1).at(-1) ?? current.chord,
      );
    }

    candidates.push(...harmonicPool);

    return dedupeBy(candidates, (c) => {
      if (c === null) return "null";
      return [...c.notes()]
        .map((n) => n.id.toString())
        .sort()
        .join("|");
    });
  }

  private scoreChordCandidate(
    candidate: Chord | null,
    scale: Scale,
    current: GeneratorState,
  ): number {
    let score = 0;

    if (candidate === null) {
      score += this.style.noChordBias;
      return expScore(score);
    }

    if (current.chord && chordEq(candidate, current.chord)) {
      score += this.style.keepChordBias;
    } else {
      score += this.style.chordChangeBias;
    }

    const notes = candidate.notes();

    if (notes.some((n) => n.id === current.currentNote.id)) {
      score += this.style.chordContainsMelodyBias;
    }

    const root = candidate.root();
    if (root) {
      const dist = absDistance(root, current.currentNote);
      score += this.style.chordRootNearMelodyBias - 0.2 * dist;
    }

    const containedCount = notes.filter((n) => scale.contains(n)).length;
    if (containedCount !== notes.length) {
      score += this.style.outOfScaleChordPenalty;
    } else {
      score += containedCount * 0.5;
    }

    return expScore(score);
  }

  private chooseChord(scale: Scale, current: GeneratorState): Chord | null {
    const candidates = this.chordCandidates(scale, current).map((chord) => {
      const rawWeight = this.scoreChordCandidate(chord, scale, current);
      return {
        value: chord,
        weight: applyTemperature(rawWeight, this.macros.entropy),
      };
    });

    return weightedSample(candidates);
  }

  private sampleHarmony(current: GeneratorState): HarmonyEvent {
    const nextScale = this.chooseScale(current);
    const nextChord = this.chooseChord(nextScale, current);
    const durationBeats = this.sampleDuration(
      this.style.preferredHarmonyDurations,
      this.tickBeats,
    );

    return {
      scale: nextScale,
      chord: nextChord,
      durationBeats,
    };
  }

  private melodyCandidates(
    scale: Scale,
    chord: Chord | null,
    current: GeneratorState,
  ): Note[] {
    const pool = notePoolAround(
      current.currentNote,
      this.style.maxLeapSemitones,
    );

    const candidates = pool.filter((n) => {
      if (!this.style.allowOutOfScaleMelody && !scale.contains(n)) {
        return false;
      }
      return true;
    });

    // bias pool by scale/chord membership before scoring by just restricting volume a bit
    const prioritized = [
      ...candidates.filter((n) => chord && chordNotesContain(chord, n)),
      ...candidates.filter((n) => scale.contains(n)),
      ...candidates,
    ];

    return dedupeBy(prioritized, (n) => n.keyedstr()).slice(
      0,
      this.style.maxMelodyCandidates,
    );
  }

  private scoreMelodyCandidate(
    candidate: Note,
    scale: Scale,
    chord: Chord | null,
    current: GeneratorState,
  ): number {
    let score = 0;

    if (scale.contains(candidate)) {
      score += this.style.inScaleTargetBias;
    } else if (!this.style.allowOutOfScaleMelody) {
      score -= 999;
    }

    if (chord && chordNotesContain(chord, candidate)) {
      score += this.style.chordToneTargetBias;
    } else {
      score += this.style.nonChordToneBias;
    }

    const leap = absDistance(current.currentNote, candidate);
    score -= this.style.leapPenalty * leap;

    if (noteEq(candidate, current.currentNote)) {
      score += this.style.repeatNoteBias;
    }

    const dirHint = melodicDirectionHint(
      current.currentMelodyPath,
      current.currentNote,
    );
    const apCur = current.currentNote.absolutePitch();
    const apCand = candidate.absolutePitch();
    if (dirHint !== 0 && apCur !== undefined && apCand !== undefined) {
      const dir = Math.sign(apCand - apCur);
      if (dir === dirHint) {
        score += this.style.directionalDriftBias;
      }
    }

    // tensions: scale note but not chord tone
    if (
      scale.contains(candidate) &&
      chord &&
      !chordNotesContain(chord, candidate)
    ) {
      score += this.style.tensionNoteBias;
    }

    score -= registerPenalty(
      candidate,
      this.style.preferredRegisterMin,
      this.style.preferredRegisterMax,
    );

    return expScore(score);
  }

  private chooseMelodicTarget(
    scale: Scale,
    chord: Chord | null,
    current: GeneratorState,
  ): Note {
    const candidates = this.melodyCandidates(scale, chord, current).map(
      (note) => {
        const rawWeight = this.scoreMelodyCandidate(
          note,
          scale,
          chord,
          current,
        );
        return {
          value: note,
          weight: applyTemperature(rawWeight, this.macros.entropy),
        };
      },
    );

    return weightedSample(candidates);
  }

  private realizeMelodicPath(
    currentNote: Note,
    target: Note,
    scale: Scale,
    chord: Chord | null,
  ): Note[] {
    if (chord && Math.random() < this.style.arpeggioPathBias) {
      const arpeggioLength = 3 + (Math.random() < 0.5 ? 1 : 0);
      const arpPath = arpeggioPathFromChord(currentNote, chord, arpeggioLength);

      if (arpPath.length > 1) {
        return arpPath;
      }
    }

    // Prefer scale paths for musical motion
    if (scale.contains(target)) {
      const path = scale.path(currentNote, target, 1);
      if (path.length > 0) return path;
    }

    // fallback
    const chromatic = currentNote.path(target, 1);
    if (chromatic.length > 0) return chromatic;

    // impossible-ish fallback
    return [currentNote];
  }

  private sampleMelody(
    current: GeneratorState,
    scale: Scale,
    chord: Chord | null,
  ): MelodyEvent {
    const target = this.chooseMelodicTarget(scale, chord, current);
    const path = this.realizeMelodicPath(
      current.currentNote,
      target,
      scale,
      chord,
    );
    const stepBeats = this.sampleDuration(
      this.style.preferredMelodyDurations,
      this.tickBeats,
    );

    return {
      target,
      path,
      stepBeats,
    };
  }

  private shouldRefreshHarmony(): boolean {
    return this.state.harmonyBeatsLeft <= 0;
  }

  private shouldRefreshMelody(): boolean {
    return (
      this.state.currentMelodyPath.length === 0 ||
      this.state.melodyPathIndex >= this.state.currentMelodyPath.length ||
      this.state.melodyStepBeatsLeft <= 0
    );
  }

  private advanceClock() {
    const nextBeat = this.state.beat + this.tickBeats;
    const wrappedBeat = nextBeat >= 4 ? nextBeat - 4 : nextBeat;
    const measureInc = nextBeat >= 4 ? 1 : 0;

    this.state = {
      ...this.state,
      tick: this.state.tick + 1,
      beat: wrappedBeat,
      measure: this.state.measure + measureInc,
    };
  }

  private emitCurrentFrame(): EmittedFrame {
    return {
      tick: this.state.tick,
      beat: this.state.beat,
      measure: this.state.measure,
      scale: this.state.scale,
      chord: this.state.chord,
      note: this.state.currentNote,
    };
  }

  /**
   * Advances the generator by one grid tick and emits the currently sounding frame.
   */
  step(): EmittedFrame {
    let harmonyRefreshed = false;

    // refresh harmony if its window expired
    if (this.shouldRefreshHarmony()) {
      const harmony = this.sampleHarmony(this.state);
      this.state = {
        ...this.state,
        scale: harmony.scale,
        chord: harmony.chord,
        harmonyBeatsLeft: harmony.durationBeats,
      };
      harmonyRefreshed = true;
    }

    // refresh melody if its current path is done OR note duration expired
    if (
      this.shouldRefreshMelody() ||
      (harmonyRefreshed &&
        this.state.chord !== null &&
        Math.random() < this.style.harmonyRefreshMelodyChance)
    ) {
      const melody = this.sampleMelody(
        this.state,
        this.state.scale,
        this.state.chord,
      );

      this.state = {
        ...this.state,
        currentMelodyPath: melody.path,
        melodyPathIndex: 0,
        melodyStepBeats: melody.stepBeats,
        melodyStepBeatsLeft: melody.stepBeats,
      };
    }

    // set current emitted note from current path position
    const currentPathNote =
      this.state.currentMelodyPath[
        Math.min(
          this.state.melodyPathIndex,
          this.state.currentMelodyPath.length - 1,
        )
      ] ?? this.state.currentNote;

    this.state = {
      ...this.state,
      currentNote: currentPathNote,
    };

    const frame = this.emitCurrentFrame();

    // consume duration counters
    this.state = {
      ...this.state,
      harmonyBeatsLeft: this.state.harmonyBeatsLeft - this.tickBeats,
      melodyStepBeatsLeft: this.state.melodyStepBeatsLeft - this.tickBeats,
    };

    // if the note's duration elapsed, advance path index
    if (this.state.melodyStepBeatsLeft <= 0) {
      this.state = {
        ...this.state,
        melodyPathIndex: this.state.melodyPathIndex + 1,
        melodyStepBeatsLeft: this.state.melodyStepBeats,
      };
    }

    this.advanceClock();

    return frame;
  }

  /**
   * Runs the engine for a number of ticks.
   */
  runTicks(ticks: number): EmittedFrame[] {
    if (ticks <= 0) return [];
    const frames: EmittedFrame[] = [];
    for (let i = 0; i < ticks; i++) {
      frames.push(this.step());
    }
    return frames;
  }

  /**
   * Runs the engine for a number of measures.
   */
  runMeasures(measures: number): EmittedFrame[] {
    if (measures <= 0) return [];
    const ticksPerMeasure = Math.round(4 / this.tickBeats);
    return this.runTicks(measures * ticksPerMeasure);
  }

  /**
   * Returns phrase-like grouped events by compressing repeated harmonic/melodic frames.
   */
  runCompressed(measures: number) {
    const frames = this.runMeasures(measures);
    const out: Array<{
      startTick: number;
      endTick: number;
      measure: number;
      beat: number;
      scale: string;
      chord: string | null;
      note: string;
    }> = [];

    const chordLabel = (chord: Chord | null) =>
      chord
        ? chord
            .notes()
            .map((n) => `${n.name}${n.octave ?? ""}`)
            .join("-")
        : null;

    const noteLabel = (note: Note) => `${note.name}${note.octave ?? ""}`;

    for (const frame of frames) {
      const label = {
        scale: frame.scale.name,
        chord: chordLabel(frame.chord),
        note: noteLabel(frame.note),
      };

      const prev = out[out.length - 1];
      if (
        prev &&
        prev.scale === label.scale &&
        prev.chord === label.chord &&
        prev.note === label.note
      ) {
        prev.endTick = frame.tick;
      } else {
        out.push({
          startTick: frame.tick,
          endTick: frame.tick,
          measure: frame.measure,
          beat: frame.beat,
          scale: label.scale,
          chord: label.chord,
          note: label.note,
        });
      }
    }

    return out;
  }

  toPlayableSequence(
    measures: number,
    options?: PlayableSequenceOptions,
  ): PlayableSequence {
    const bpm = options?.bpm ?? 120;
    const secondsPerBeat = 60 / bpm;

    const frames = this.runMeasures(measures);

    const notes: PlayableEvent[] = [];
    const chords: PlayableEvent[] = [];
    const scales: PlayableEvent[] = [];

    const finalizeEventDurations = (event: PlayableEvent) => {
      event.durationBeats =
        (event.endTick - event.startTick + 1) * this.tickBeats;
      event.startSeconds = beatsToSeconds(event.startBeat, bpm);
      event.durationSeconds = beatsToSeconds(event.durationBeats, bpm);
    };

    const pushOrExtend = (
      list: PlayableEvent[],
      next: PlayableEvent,
      same: (a: PlayableEvent, b: PlayableEvent) => boolean,
    ) => {
      const prev = list[list.length - 1];

      if (prev && same(prev, next)) {
        prev.endTick = next.endTick;
        finalizeEventDurations(prev);
        return;
      }

      finalizeEventDurations(next);
      list.push(next);
    };

    for (const frame of frames) {
      const startTick = frame.tick;
      const endTick = frame.tick;
      const startBeat = frame.tick * this.tickBeats;

      const noteEvent: PlayableEvent = {
        type: "note",
        startTick,
        endTick,
        startBeat,
        durationBeats: this.tickBeats,
        startSeconds: beatsToSeconds(startBeat, bpm),
        durationSeconds: beatsToSeconds(this.tickBeats, bpm),
        measure: frame.measure,
        beatInMeasure: frame.beat,

        note: frame.note,

        // active context at note onset
        activeScale: frame.scale,
        activeChord: frame.chord,
      };

      const chordEvent: PlayableEvent = {
        type: "chord",
        startTick,
        endTick,
        startBeat,
        durationBeats: this.tickBeats,
        startSeconds: beatsToSeconds(startBeat, bpm),
        durationSeconds: beatsToSeconds(this.tickBeats, bpm),
        measure: frame.measure,
        beatInMeasure: frame.beat,

        chord: frame.chord,
        activeScale: frame.scale,
        activeChord: frame.chord,
      };

      const scaleEvent: PlayableEvent = {
        type: "scale",
        startTick,
        endTick,
        startBeat,
        durationBeats: this.tickBeats,
        startSeconds: beatsToSeconds(startBeat, bpm),
        durationSeconds: beatsToSeconds(this.tickBeats, bpm),
        measure: frame.measure,
        beatInMeasure: frame.beat,

        scale: frame.scale,
        activeScale: frame.scale,
        activeChord: frame.chord,
      };

      pushOrExtend(
        notes,
        noteEvent,
        (a, b) => !!a.note && !!b.note && noteEq(a.note, b.note),
      );

      pushOrExtend(chords, chordEvent, (a, b) =>
        chordEq(a.chord ?? null, b.chord ?? null),
      );

      pushOrExtend(
        scales,
        scaleEvent,
        (a, b) => !!a.scale && !!b.scale && scaleEq(a.scale, b.scale),
      );
    }

    const totalTicks = frames.length;
    const drums = buildRepeatedDrumPattern(totalTicks, this.tickBeats, bpm);

    const events = [...notes, ...chords, ...scales].sort((a, b) => {
      if (a.startTick !== b.startTick) return a.startTick - b.startTick;

      const order: Record<PlayableEventType, number> = {
        scale: 0,
        chord: 1,
        drum: 2,
        note: 3,
      };

      return order[a.type] - order[b.type];
    });

    const totalBeats = totalTicks * this.tickBeats;
    const totalSeconds = beatsToSeconds(totalBeats, bpm);

    return {
      bpm,
      tickBeats: this.tickBeats,
      secondsPerBeat,

      totalTicks,
      totalBeats,
      totalSeconds,

      events: [...events, ...drums].sort((a, b) => {
        if (a.startTick !== b.startTick) return a.startTick - b.startTick;

        const order: Record<PlayableEventType, number> = {
          scale: 0,
          chord: 1,
          drum: 2,
          note: 3,
        };

        return order[a.type] - order[b.type];
      }),
      notes,
      chords,
      scales,
      drums,
    };
  }

  toNotePlaybackSequence(
    measures: number,
    options?: PlayableSequenceOptions,
  ): Array<{
    note: Note;
    startBeat: number;
    durationBeats: number;
    startSeconds: number;
    durationSeconds: number;
    measure: number;
    beatInMeasure: number;
    activeScale?: Scale;
    activeChord?: Chord | null;
  }> {
    const sequence = this.toPlayableSequence(measures, options);

    return sequence.notes
      .filter((event) => !!event.note)
      .map((event) => ({
        note: event.note!,
        startBeat: event.startBeat,
        durationBeats: event.durationBeats,
        startSeconds: event.startSeconds,
        durationSeconds: event.durationSeconds,
        measure: event.measure,
        beatInMeasure: event.beatInMeasure,
        activeScale: event.activeScale,
        activeChord: event.activeChord,
      }));
  }

  toChordPlaybackSequence(
    measures: number,
    options?: PlayableSequenceOptions,
  ): Array<{
    chord: Chord | null;
    startBeat: number;
    durationBeats: number;
    startSeconds: number;
    durationSeconds: number;
    measure: number;
    beatInMeasure: number;
    activeScale?: Scale;
  }> {
    const sequence = this.toPlayableSequence(measures, options);

    return sequence.chords.map((event) => ({
      chord: event.chord ?? null,
      startBeat: event.startBeat,
      durationBeats: event.durationBeats,
      startSeconds: event.startSeconds,
      durationSeconds: event.durationSeconds,
      measure: event.measure,
      beatInMeasure: event.beatInMeasure,
      activeScale: event.activeScale,
    }));
  }

  private cloneState(): GeneratorState {
    return {
      ...this.state,
      scale: this.state.scale,
      chord: this.state.chord,
      currentNote: this.state.currentNote,
      currentMelodyPath: [...this.state.currentMelodyPath],
    };
  }

  previewPlayableSequence(
    measures: number,
    options?: PlayableSequenceOptions,
  ): PlayableSequence {
    try {
      const savedState = JSON.parse(JSON.stringify(this.state));
      const result = this.toPlayableSequence(measures, options);
      this.state = savedState;

      return result;
    } catch (err) {
      const savedState = this.cloneState();
      const result = this.toPlayableSequence(measures, options);
      this.state = savedState;

      return result;
    }
  }
}

export class Generator {
  private _history: PlayableSequence[] = [];
  private _sim: MarkovChain;
  private _totalBeats = 0;
  bpm: number;

  constructor(
    private macros: Partial<MacroControls>,
    bpm?: number,
  ) {
    const seed = createInitialSeed(macros);

    this.bpm = bpm ?? seed.bpm;

    this._sim = new MarkovChain({
      initialNote: seed.note,
      initialScale: seed.scale,
      macros,
    });
  }

  reset() {
    const seed = createInitialSeed(this.macros);
    this._sim = new MarkovChain({
      initialNote: seed.note,
      initialScale: seed.scale,
      macros: this.macros,
    });
    this._history = [];
    this._totalBeats = 0;
  }

  toFullSequence(): PlayableSequence {
    if (this._history.length === 0) {
      return {
        bpm: this.bpm,
        tickBeats: this._sim.tickBeats,
        secondsPerBeat: 60 / this.bpm,
        totalTicks: 0,
        totalBeats: 0,
        totalSeconds: 0,
        events: [],
        notes: [],
        chords: [],
        scales: [],
        drums: [],
      };
    }

    const events = this._history.flatMap((h) => h.events);
    const notes = this._history.flatMap((h) => h.notes);
    const chords = this._history.flatMap((h) => h.chords);
    const scales = this._history.flatMap((h) => h.scales);
    const drums = this._history.flatMap((h) => h.drums);

    const totalTicks = this._history.reduce((sum, h) => sum + h.totalTicks, 0);
    const totalBeats = this._history.reduce((sum, h) => sum + h.totalBeats, 0);
    const totalSeconds = this._history.reduce(
      (sum, h) => sum + h.totalSeconds,
      0,
    );

    return {
      bpm: this.bpm,
      tickBeats: this._sim.tickBeats,
      secondsPerBeat: 60 / this.bpm,
      totalTicks,
      totalBeats,
      totalSeconds,
      events,
      notes,
      chords,
      scales,
      drums,
    };
  }

  static song(
    seconds: number,
    macros: Partial<MacroControls>,
    bpm: number = 90,
  ) {
    const scaled = seconds / 10;
    const gen = new Generator(macros, bpm);
    for (let i = 0; i < scaled; i += 1) {
      gen.read(4);
    }

    const seq = gen.toFullSequence();
    if (seq.events.length === 0) {
      throw new Error("Generated sequence was empty.");
    }
    return seq;
  }

  history(): Readonly<PlayableSequence[]> {
    return this._history;
  }

  read(measures = 4) {
    const seq = this._sim.toPlayableSequence(measures, {
      bpm: this.bpm,
    });

    seq.events.forEach((e) => {
      e.startBeat += this._totalBeats;
      e.startSeconds += this._totalBeats * (60 / this.bpm);
    });

    this._totalBeats += seq.totalBeats;

    this._history.push(seq);
    return seq;
  }

  peek(measures = 4) {
    return this._sim.previewPlayableSequence(measures, {
      bpm: this.bpm,
    });
  }
}

/**
 * const chain = new MarkovChain({
  initialScale: new Scale(new Note("C", 4), KeyStructures.Major, 4),
  initialNote: new Note("E", 4),
  initialChord: Chord.from(
    [new Note("C", 4), new Note("E", 4), new Note("G", 4)],
    new Scale(new Note("C", 4), KeyStructures.Major, 4),
    { constrained: true, octaveAware: true }
  ),
  tickBeats: 0.25,
  macros: {
    energy: 0.7,
    brightness: 0.8,
    warmth: 0.4,
    entropy: 0.35,
    tension: 0.45,
    density: 0.6,
  },
});

const frames = chain.runMeasures(4);
console.log(frames);

const compressed = chain.runCompressed(4);
console.log(compressed);

----

const seq = chain.toPlayableSequence(4, { bpm: 110 });

console.log(seq.events);
console.log(seq.notes);
console.log(seq.chords);
console.log(seq.scales);

const notePlayback = chain.toNotePlaybackSequence(4, { bpm: 110 });
console.log(notePlayback);
 */

type ToneBridgeInstrumentConfig = {
  noteSynth?:
    | Tone.Synth
    | Tone.MonoSynth
    | Tone.FMSynth
    | Tone.AMSynth
    | Tone.Sampler;
  chordSynth?: Tone.PolySynth | Tone.Sampler;
  kickSynth?: Tone.MembraneSynth;
  snareSynth?: Tone.NoiseSynth;
  noteVolumeDb?: number;
  chordVolumeDb?: number;
  drumVolumeDb?: number;
};

type ToneScheduledIds = {
  all: number[];
  notes: number[];
  chords: number[];
  drums: number[];
};

type ToneScheduledSequence = {
  ids: ToneScheduledIds;
  seq: PlayableSequence;
};

type DisposableToneNode = {
  dispose(): void;
};

type LofiInstrument<TSynth> = {
  synth: TSynth;
  effects: DisposableToneNode[];
};

const channelsToWavBlob = (
  channels: Float32Array[],
  sampleRate: number,
): Blob => {
  const channelCount = channels.length;
  const frameCount = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = channelCount * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = frameCount * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channelCount, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;

  for (let frame = 0; frame < frameCount; frame += 1) {
    for (let channel = 0; channel < channelCount; channel += 1) {
      const sample = clamp(channels[channel][frame], -1, 1);
      const int16 =
        sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
      view.setInt16(offset, int16, true);
      offset += bytesPerSample;
    }
  }

  return new Blob([buffer], { type: "audio/wav" });
};

const noteToFrequency = (note: Note): number => {
  const midi = note.absolutePitch() ?? note.id + 60;
  return 440 * Math.pow(2, (midi - 69) / 12);
};

const sampleTriangle = (phase: number): number =>
  2 * Math.abs(2 * (phase - Math.floor(phase + 0.5))) - 1;

const sampleSine = (phase: number): number => Math.sin(phase * Math.PI * 2);

const applyAmbientTail = (
  buffer: Float32Array,
  sampleRate: number,
  dryMix = 0.78,
  wetMix = 0.38,
) => {
  const wet = new Float32Array(buffer.length);
  const tapDelays = [0.18, 0.37, 0.73, 1.1];
  const tapGains = [0.2, 0.16, 0.12, 0.08];

  for (let tapIndex = 0; tapIndex < tapDelays.length; tapIndex += 1) {
    const delaySamples = Math.floor(tapDelays[tapIndex] * sampleRate);
    const gain = tapGains[tapIndex];

    for (let i = 0; i + delaySamples < buffer.length; i += 1) {
      wet[i + delaySamples] += buffer[i] * gain;
    }
  }

  let filtered = 0;

  for (let i = 0; i < wet.length; i += 1) {
    filtered = filtered * 0.92 + wet[i] * 0.08;
    wet[i] = filtered;
  }

  for (let i = 0; i < buffer.length; i += 1) {
    buffer[i] = buffer[i] * dryMix + wet[i] * wetMix;
  }
};

const envelopeAt = (
  index: number,
  length: number,
  attackSamples: number,
  releaseSamples: number,
): number => {
  if (length <= 0) return 0;

  const attack =
    attackSamples > 0 ? Math.min(1, index / Math.max(1, attackSamples)) : 1;
  const releaseStart = Math.max(0, length - releaseSamples);

  if (index < releaseStart) {
    return attack;
  }

  const releaseProgress =
    (index - releaseStart) / Math.max(1, length - releaseStart);

  return attack * (1 - releaseProgress);
};

function noteToTone(note: Note): string {
  const octave = note.octave ?? 4;
  return `${note.name}${octave}`;
}

function chordToToneNotes(chord: Chord): string[] {
  return chord.notes().map(noteToTone);
}

const sequenceToToneEvents = (
  seq: PlayableSequence,
  velocitySampler: () => number = () => 0.9,
) => {
  const sampleVelocity = (fallback = 0.9) =>
    clamp(velocitySampler(), 0.05, 1) || fallback;

  const notes = seq.notes
    .filter((event) => !!event.note)
    .map((event) => ({
      type: "note" as const,
      time: event.startBeat,
      duration: event.durationBeats,
      pitch: noteToTone(event.note!),
      velocity: sampleVelocity(),
      source: event,
    }));

  const chords = seq.chords
    .filter((event) => !!event.chord)
    .map((event) => ({
      type: "chord" as const,
      time: event.startBeat,
      duration: event.durationBeats,
      pitches: chordToToneNotes(event.chord!),
      velocity: sampleVelocity(),
      source: event,
    }));

  const drums = seq.drums
    .filter((event) => !!event.drum)
    .map((event) => ({
      type: "drum" as const,
      time: event.startBeat,
      duration: event.durationBeats,
      voice: event.drum!,
      velocity: clamp(event.velocity ?? sampleVelocity(0.72), 0.05, 1),
      source: event,
    }));

  return {
    bpm: seq.bpm,
    notes,
    chords,
    drums,
    events: [...notes, ...chords, ...drums].sort((a, b) => a.time - b.time),
  };
};

export const renderPlayableSequenceToWavBlob = async (
  seq: PlayableSequence,
  velocitySampler: () => number = () => 0.9,
): Promise<Blob> => {
  const sampleRate = 22050;
  const tailSeconds = 2;
  const renderDuration = Math.max(seq.totalSeconds + tailSeconds, tailSeconds);
  const totalSamples = Math.max(1, Math.ceil(renderDuration * sampleRate));
  const output = new Float32Array(totalSamples);
  const sampleVelocity = (fallback = 0.9) =>
    clamp(velocitySampler(), 0.05, 1) || fallback;

  for (const event of seq.notes) {
    if (!event.note) continue;

    const startSample = Math.max(0, Math.floor(event.startSeconds * sampleRate));
    const length = Math.max(1, Math.floor(event.durationSeconds * sampleRate));
    const endSample = Math.min(totalSamples, startSample + length);
    const attackSamples = Math.floor(sampleRate * 0.05);
    const releaseSamples = Math.floor(sampleRate * 0.55);
    const phaseStep = noteToFrequency(event.note) / sampleRate;
    const amplitude = sampleVelocity() * 0.11;
    let phase = 0;

    for (let i = startSample; i < endSample; i += 1) {
      const localIndex = i - startSample;
      const env = envelopeAt(
        localIndex,
        endSample - startSample,
        attackSamples,
        releaseSamples,
      );
      const vibrato =
        1 + 0.0025 * sampleSine((localIndex / sampleRate) * 0.18);
      const voice =
        sampleSine(phase) * 0.76 +
        sampleTriangle(phase * 0.5) * 0.18 +
        sampleSine(phase * 2) * 0.06;

      output[i] += voice * env * amplitude;
      phase += phaseStep * vibrato;
    }
  }

  for (const event of seq.chords) {
    if (!event.chord) continue;

    const chordNotes = event.chord.notes();
    if (chordNotes.length === 0) continue;

    const startSample = Math.max(0, Math.floor(event.startSeconds * sampleRate));
    const length = Math.max(1, Math.floor(event.durationSeconds * sampleRate));
    const endSample = Math.min(totalSamples, startSample + length);
    const attackSamples = Math.floor(sampleRate * 0.18);
    const releaseSamples = Math.floor(sampleRate * 1.6);
    const amplitude = sampleVelocity() * (0.05 / chordNotes.length);
    const phases = chordNotes.map(() => 0);
    const phaseSteps = chordNotes.map((note) => noteToFrequency(note) / sampleRate);

    for (let i = startSample; i < endSample; i += 1) {
      const localIndex = i - startSample;
      const env = envelopeAt(
        localIndex,
        endSample - startSample,
        attackSamples,
        releaseSamples,
      );
      let mixed = 0;

      for (let noteIndex = 0; noteIndex < chordNotes.length; noteIndex += 1) {
        mixed +=
          sampleSine(phases[noteIndex]) * 0.72 +
          sampleSine(phases[noteIndex] * 0.5) * 0.18 +
          sampleTriangle(phases[noteIndex] * 0.25) * 0.05;
        phases[noteIndex] +=
          phaseSteps[noteIndex] *
          (1 + 0.0009 * sampleSine((localIndex / sampleRate) * 0.05));
      }

      output[i] += mixed * env * amplitude;
    }
  }

  for (const event of seq.drums) {
    if (!event.drum) continue;

    const startSample = Math.max(0, Math.floor(event.startSeconds * sampleRate));
    const length = Math.max(
      1,
      Math.floor(Math.max(event.durationSeconds, 0.08) * sampleRate),
    );
    const endSample = Math.min(totalSamples, startSample + length);
    const velocity = clamp(event.velocity ?? sampleVelocity(0.72), 0.05, 1);

    if (event.drum === "kick") {
      let phase = 0;

      for (let i = startSample; i < endSample; i += 1) {
        const localIndex = i - startSample;
        const t = localIndex / sampleRate;
        const env = Math.exp(-t * 14) * velocity * 0.42;
        const frequency = 92 * Math.exp(-t * 10) + 38;
        phase += frequency / sampleRate;
        output[i] += (sampleSine(phase) * 0.85 + sampleSine(phase * 0.5) * 0.15) * env;
      }

      continue;
    }

    for (let i = startSample; i < endSample; i += 1) {
      const localIndex = i - startSample;
      const t = localIndex / sampleRate;
      const env = Math.exp(-t * 18) * velocity * 0.16;
      const noise =
        hashUnit((i + 1) * 12.9898 + event.startSeconds * 78.233) * 2 - 1;
      output[i] += (noise * 0.6 + sampleSine(t * 220) * 0.08) * env;
    }
  }

  applyAmbientTail(output, sampleRate, 0.74, 0.52);

  let peak = 0;

  for (let i = 0; i < output.length; i += 1) {
    const abs = Math.abs(output[i]);
    if (abs > peak) peak = abs;
  }

  const normalization = peak > 0.98 ? 0.98 / peak : 1;

  if (normalization !== 1) {
    for (let i = 0; i < output.length; i += 1) {
      output[i] *= normalization;
    }
  }

  return channelsToWavBlob([output], sampleRate);
};

import * as Tone from "tone";
/**
 * This class manages Tone.js setup, instruments, scheduling, transport cleanup,
 * playback helpers, and disposal.
 * 
 * ## Example
 * ---
 * ```
 * const gen = new Generator(
  {
    energy: 0.7,
    brightness: 0.8,
    warmth: 0.4,
    entropy: 0.3,
    tension: 0.45,
    density: 0.6,
  },
  118
);

const bridge = new ToneBridge();

const seq = gen.read();
await bridge.play(seq);

// later
bridge.pause();
bridge.stop();
bridge.setNoteVolume(-6);
bridge.setChordVolume(-12);

// cleanup
bridge.dispose();
```
 */

const buildLofiPianoLead = (
  output: Tone.Volume,
): LofiInstrument<Tone.PolySynth> => {
  const synth = new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 1.25,
    oscillator: {
      type: "sine",
    },
    modulation: {
      type: "triangle",
    },
    envelope: {
      attack: 0.08,
      decay: 1.6,
      sustain: 0.52,
      release: 4.8,
    },
    modulationEnvelope: {
      attack: 0.14,
      decay: 0.8,
      sustain: 0.35,
      release: 2.4,
    },
    volume: -10,
  });

  const hp = new Tone.Filter({
    type: "highpass",
    frequency: 45,
    rolloff: -12,
  });
  const tone = new Tone.Filter({
    type: "lowpass",
    frequency: 4200,
    rolloff: -24,
    Q: 0.25,
  });
  const bloom = new Tone.Filter({
    type: "peaking",
    frequency: 540,
    gain: 1.8,
    Q: 0.7,
  });
  const wobble = new Tone.Chorus({
    frequency: 0.07,
    delayTime: 6.2,
    depth: 0.22,
    spread: 120,
    wet: 0.2,
  }).start();
  const tape = new Tone.FeedbackDelay({
    delayTime: "8n.",
    feedback: 0.24,
    wet: 0.14,
  });
  const room = new Tone.Reverb({
    decay: 9.5,
    preDelay: 0.04,
    wet: 0.3,
  });
  const compressor = new Tone.Compressor({
    threshold: -24,
    ratio: 2,
    attack: 0.04,
    release: 0.3,
  });

  synth.chain(hp, tone, bloom, wobble, tape, room, compressor, output);

  return {
    synth,
    effects: [hp, tone, bloom, wobble, tape, room, compressor],
  };
};

const buildLofiPianoChords = (
  output: Tone.Volume,
): LofiInstrument<Tone.PolySynth> => {
  const synth = new Tone.PolySynth(Tone.AMSynth, {
    harmonicity: 0.5,
    oscillator: {
      type: "sine",
    },
    modulation: {
      type: "sine",
    },
    envelope: {
      attack: 0.45,
      decay: 4.8,
      sustain: 0.82,
      release: 10.5,
    },
    modulationEnvelope: {
      attack: 0.2,
      decay: 2.4,
      sustain: 0.6,
      release: 6,
    },
    volume: -20,
  });

  const hp = new Tone.Filter({
    type: "highpass",
    frequency: 20,
    rolloff: -12,
  });
  const tone = new Tone.Filter({
    type: "lowpass",
    frequency: 1500,
    rolloff: -24,
    Q: 0.2,
  });
  const warmth = new Tone.Filter({
    type: "peaking",
    frequency: 240,
    gain: 3.4,
    Q: 0.55,
  });
  const haze = new Tone.Filter({
    type: "peaking",
    frequency: 980,
    gain: -3,
    Q: 0.7,
  });
  const wobble = new Tone.Chorus({
    frequency: 0.025,
    delayTime: 12,
    depth: 0.3,
    spread: 180,
    wet: 0.38,
  }).start();
  const shimmer = new Tone.PingPongDelay({
    delayTime: "2n",
    feedback: 0.22,
    wet: 0.16,
  });
  const tape = new Tone.FeedbackDelay({
    delayTime: "1m",
    feedback: 0.34,
    wet: 0.22,
  });
  const room = new Tone.Reverb({
    decay: 18,
    preDelay: 0.08,
    wet: 0.62,
  });
  const compressor = new Tone.Compressor({
    threshold: -30,
    ratio: 1.6,
    attack: 0.08,
    release: 0.8,
  });

  synth.chain(
    hp,
    tone,
    warmth,
    haze,
    wobble,
    shimmer,
    tape,
    room,
    compressor,
    output,
  );

  return {
    synth,
    effects: [hp, tone, warmth, haze, wobble, shimmer, tape, room, compressor],
  };
};

export class ToneBridge {
  private noteOutput: Tone.Volume;
  private chordOutput: Tone.Volume;
  private drumOutput: Tone.Volume;
  private noteEffects: DisposableToneNode[] = [];
  private chordEffects: DisposableToneNode[] = [];

  private noteSynth:
    | Tone.Synth
    | Tone.MonoSynth
    | Tone.FMSynth
    | Tone.AMSynth
    | Tone.Sampler
    | Tone.PolySynth;
  private chordSynth: Tone.PolySynth | Tone.Sampler;
  private kickSynth: Tone.MembraneSynth;
  private snareSynth: Tone.NoiseSynth;

  private scheduledIds: ToneScheduledIds = {
    all: [],
    notes: [],
    chords: [],
    drums: [],
  };

  private initialized = false;

  constructor(config: ToneBridgeInstrumentConfig = {}) {
    this.noteOutput = new Tone.Volume(
      config.noteVolumeDb ?? -5,
    ).toDestination();
    this.chordOutput = new Tone.Volume(
      config.chordVolumeDb ?? -14,
    ).toDestination();
    this.drumOutput = new Tone.Volume(
      config.drumVolumeDb ?? -12,
    ).toDestination();

    if (config.noteSynth) {
      this.noteSynth = config.noteSynth.connect(this.noteOutput);
    } else {
      const lead = buildLofiPianoLead(this.noteOutput);
      this.noteSynth = lead.synth;
      this.noteEffects = lead.effects;
    }

    if (config.chordSynth) {
      this.chordSynth = config.chordSynth.connect(this.chordOutput);
    } else {
      const chords = buildLofiPianoChords(this.chordOutput);
      this.chordSynth = chords.synth;
      this.chordEffects = chords.effects;
    }
    // new Tone.PolySynth(Tone.Synth, {
    //   oscillator: { type: "sine" },
    //   envelope: {
    //     attack: 0.02,
    //     decay: 0.12,
    //     sustain: 0.45,
    //     release: 1.2,
    //   },
    // }).connect(this.chordOutput);
    this.kickSynth =
      config.kickSynth ??
      new Tone.MembraneSynth({
        pitchDecay: 0.04,
        octaves: 8,
        oscillator: { type: "sine" },
        envelope: {
          attack: 0.001,
          decay: 0.32,
          sustain: 0,
          release: 0.18,
        },
      }).connect(this.drumOutput);

    this.snareSynth =
      config.snareSynth ??
      new Tone.NoiseSynth({
        noise: {
          type: "white",
          playbackRate: 2.4,
        },
        envelope: {
          attack: 0.001,
          decay: 0.12,
          sustain: 0,
          release: 0.08,
        },
      }).connect(this.drumOutput);
  }

  async init(): Promise<void> {
    if (this.initialized) return;
    await Tone.start();
    this.initialized = true;
  }

  /**
   * Converts your sequence into two Tone-friendly event lists.
   * This does not schedule anything yet.
   */
  toToneSequence(
    seq: PlayableSequence,
    velocitySampler: () => number = () => 0.9,
  ) {
    return sequenceToToneEvents(seq, velocitySampler);
  }

  /**
   * Clears all previously scheduled Transport events managed by this bridge.
   * Does not dispose instruments.
   */
  clearScheduledEvents(): void {
    for (const id of this.scheduledIds.all) {
      Tone.Transport.clear(id);
    }

    this.scheduledIds = {
      all: [],
      notes: [],
      chords: [],
      drums: [],
    };
  }

  /**
   * Schedules note and chord streams independently on Tone.Transport.
   * Returns the scheduled event IDs so callers can cancel later if needed.
   */
  scheduleSequence(
    seq: PlayableSequence,
    instruments: ToneBridgeInstrumentConfig = {},
    velocitySampler: () => number = () => 0.9,
  ): ToneScheduledSequence {
    // optional temporary instrument override for this scheduling call
    const noteSynth = instruments.noteSynth ?? this.noteSynth;
    const chordSynth = instruments.chordSynth ?? this.chordSynth;
    const kickSynth = instruments.kickSynth ?? this.kickSynth;
    const snareSynth = instruments.snareSynth ?? this.snareSynth;

    if (typeof instruments.noteVolumeDb === "number") {
      this.noteOutput.volume.value = instruments.noteVolumeDb;
    }
    if (typeof instruments.chordVolumeDb === "number") {
      this.chordOutput.volume.value = instruments.chordVolumeDb;
    }
    if (typeof instruments.drumVolumeDb === "number") {
      this.drumOutput.volume.value = instruments.drumVolumeDb;
    }

    this.clearScheduledEvents();
    Tone.getTransport().stop();
    Tone.getTransport().cancel(0);
    Tone.getTransport().position = 0;
    Tone.getTransport().bpm.value = seq.bpm;

    const toneSeq = this.toToneSequence(seq, velocitySampler);

    for (const ev of toneSeq.notes) {
      const id = Tone.getTransport().scheduleOnce((time) => {
        noteSynth.triggerAttackRelease(
          ev.pitch,
          ev.duration,
          time,
          ev.velocity,
        );
      }, ev.time);

      this.scheduledIds.notes.push(id);
      this.scheduledIds.all.push(id);
    }

    for (const ev of toneSeq.chords) {
      const id = Tone.getTransport().scheduleOnce((time) => {
        chordSynth.triggerAttackRelease(
          ev.pitches,
          ev.duration,
          time,
          ev.velocity,
        );
      }, ev.time);

      this.scheduledIds.chords.push(id);
      this.scheduledIds.all.push(id);
    }

    for (const ev of toneSeq.drums) {
      const id = Tone.getTransport().scheduleOnce((time) => {
        if (ev.voice === "kick") {
          kickSynth.triggerAttackRelease("C1", ev.duration, time, ev.velocity);
          return;
        }

        snareSynth.triggerAttackRelease(ev.duration, time, ev.velocity);
      }, ev.time);

      this.scheduledIds.drums.push(id);
      this.scheduledIds.all.push(id);
    }

    return {
      ids: {
        all: [...this.scheduledIds.all],
        notes: [...this.scheduledIds.notes],
        chords: [...this.scheduledIds.chords],
        drums: [...this.scheduledIds.drums],
      },
      seq,
    };
  }

  async play(
    seq?: PlayableSequence,
    velocitySampler?: () => number,
  ): Promise<ToneScheduledSequence | void> {
    await this.init();

    let scheduled: ToneScheduledSequence | void = undefined;
    if (seq) {
      scheduled = this.scheduleSequence(seq, {}, velocitySampler);
    }

    await Tone.loaded();
    Tone.getTransport().start();

    return scheduled;
  }

  pause(): void {
    Tone.getTransport().pause();
  }

  stop(): void {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
  }

  setBpm(bpm: number): void {
    Tone.getTransport().bpm.value = bpm;
  }

  getBpm(): number {
    return Tone.getTransport().bpm.value;
  }

  setNoteVolume(db: number): void {
    this.noteOutput.volume.value = db;
  }

  setChordVolume(db: number): void {
    this.chordOutput.volume.value = db;
  }

  setDrumVolume(db: number): void {
    this.drumOutput.volume.value = db;
  }

  muteNotes(muted = true): void {
    this.noteOutput.mute = muted;
  }

  muteChords(muted = true): void {
    this.chordOutput.mute = muted;
  }

  /**
   * Clears schedules and releases currently sounding voices.
   */
  panic(): void {
    this.clearScheduledEvents();
    Tone.getTransport().stop();
    Tone.getTransport().cancel(0);
    Tone.getTransport().position = 0;

    if (
      "releaseAll" in this.chordSynth &&
      typeof this.chordSynth.releaseAll === "function"
    ) {
      this.chordSynth.releaseAll();
    }
  }

  /**
   * Full cleanup.
   */
  dispose(): void {
    this.panic();

    this.noteSynth.dispose();
    this.chordSynth.dispose();
    for (const effect of this.noteEffects) {
      effect.dispose();
    }
    for (const effect of this.chordEffects) {
      effect.dispose();
    }
    this.kickSynth.dispose();
    this.snareSynth.dispose();
    this.noteOutput.dispose();
    this.chordOutput.dispose();
    this.drumOutput.dispose();
  }
}

type ImageStats = {
  energy: number;
  hues: number; // assumed 0..1
  saturation: number; // assumed 0..100
  warmth: number; // assumed 0..100
  dominant: string;
};

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

const normalize = (value: number, min: number, max: number) => {
  if (max <= min) return 0;
  return clamp01((value - min) / (max - min));
};

/**
 * Hue interpretation:
 * 0.00 ~ red
 * 0.16 ~ yellow
 * 0.33 ~ green
 * 0.50 ~ cyan
 * 0.66 ~ blue
 * 0.83 ~ magenta
 *
 * This function gives a rough "perceived brightness" bias from hue family.
 */
const hueToBrightnessBias = (hue01: number): number => {
  const h = ((hue01 % 1) + 1) % 1;

  // Yellow / gold / greenish are often perceived brighter,
  // blue / violet darker, red somewhere in the middle.
  if (h < 0.1) return 0.55; // red
  if (h < 0.22) return 0.9; // orange/yellow
  if (h < 0.42) return 0.75; // green
  if (h < 0.58) return 0.6; // cyan
  if (h < 0.75) return 0.35; // blue
  if (h < 0.9) return 0.45; // purple/magenta
  return 0.55; // red wraparound
};

const dominantColorBias = (dominant: string) => {
  const d = dominant.trim().toLowerCase();

  switch (d) {
    case "red":
      return {
        brightness: 0.55,
        warmth: 0.95,
        tension: 0.75,
      };
    case "orange":
      return {
        brightness: 0.8,
        warmth: 0.95,
        tension: 0.55,
      };
    case "yellow":
      return {
        brightness: 0.98,
        warmth: 0.85,
        tension: 0.45,
      };
    case "green":
      return {
        brightness: 0.65,
        warmth: 0.45,
        tension: 0.35,
      };
    case "cyan":
      return {
        brightness: 0.7,
        warmth: 0.2,
        tension: 0.3,
      };
    case "blue":
      return {
        brightness: 0.3,
        warmth: 0.1,
        tension: 0.5,
      };
    case "purple":
    case "violet":
      return {
        brightness: 0.4,
        warmth: 0.25,
        tension: 0.65,
      };
    case "magenta":
      return {
        brightness: 0.55,
        warmth: 0.45,
        tension: 0.7,
      };
    case "brown":
      return {
        brightness: 0.22,
        warmth: 0.9,
        tension: 0.3,
      };
    case "white":
      return {
        brightness: 1.0,
        warmth: 0.5,
        tension: 0.1,
      };
    case "black":
      return {
        brightness: 0.0,
        warmth: 0.2,
        tension: 0.55,
      };
    case "gray":
    case "grey":
      return {
        brightness: 0.45,
        warmth: 0.35,
        tension: 0.2,
      };
    default:
      return {
        brightness: 0.5,
        warmth: 0.5,
        tension: 0.4,
      };
  }
};

/**
 * Converts normalized image-analysis metrics into the macro control values used
 * by the music system.
 *
 * This is a lightweight heuristic mapper: it does not try to infer musical
 * intent directly, but instead translates visual traits into a stable set of
 * cross-domain controls that downstream generators can interpret consistently.
 * Each output macro is clamped to the `0..1` range and is derived from a small
 * weighted blend of the incoming image statistics.
 *
 * How it works:
 * - Raw image fields are first normalized into unit-space values.
 * - The dominant color name is converted into brightness, warmth, and tension
 *   bias values via `dominantColorBias`.
 * - Hue is converted into a perceptual brightness bias via
 *   `hueToBrightnessBias`.
 * - Final macros are computed as weighted combinations of the normalized image
 *   traits and those color-derived biases.
 *
 * Assumptions:
 * - `stats.energy` is in the `0..255` range.
 * - `stats.saturation` and `stats.warmth` are in the `0..100` range.
 * - `stats.hues` is already normalized to `0..1`.
 * - `stats.dominant` is a coarse color label understood by
 *   `dominantColorBias`; unknown labels fall back to neutral defaults there.
 *
 * Relationships between inputs and outputs:
 * - `energy` is driven mostly by image energy, with a smaller saturation boost.
 * - `brightness` blends hue-based brightness perception, dominant color bias,
 *   saturation, and a small amount of image energy.
 * - `warmth` is primarily the direct image warmth score with dominant color
 *   correction.
 * - `entropy` estimates visual complexity from energy, saturation, and the
 *   disagreement between computed warmth and brightness.
 * - `tension` increases with dominant-color instability, energy, saturation,
 *   and lower warmth.
 * - `density` tracks perceived visual fullness, mostly from energy with some
 *   support from saturation.
 *
 * @param stats Image-derived analysis values used as the source signal for the
 * macro mapping.
 * @returns A `MacroControls` object whose fields can be consumed by later
 * music-generation stages.
 */
export const imageStatsToMacros = (stats: ImageStats): MacroControls => {
  const energy01 = normalize(stats.energy, 0, 255);
  const hue01 = clamp01(stats.hues); // assuming already 0..1
  const saturation01 = normalize(stats.saturation, 0, 100);
  const warmth01 = normalize(stats.warmth, 0, 100);

  const dominant = dominantColorBias(stats.dominant);
  const hueBrightness = hueToBrightnessBias(hue01);

  // ENERGY
  // Mostly direct from image energy, with a slight boost from saturation.
  const macroEnergy = clamp01(0.8 * energy01 + 0.2 * saturation01);

  // BRIGHTNESS
  // Not just raw hue — image "brightness feeling" is a combo of
  // hue family, saturation, and dominant color character.
  const brightness = clamp01(
    0.45 * hueBrightness +
      0.25 * dominant.brightness +
      0.2 * saturation01 +
      0.1 * energy01,
  );

  // WARMTH
  // Mostly direct warmth, plus dominant color correction.
  const warmth = clamp01(0.75 * warmth01 + 0.25 * dominant.warmth);

  // ENTROPY
  // infer from:
  // - energy (more variation/activity)
  // - saturation (more vivid variation)
  // - disagreement between warmth and brightness
  const contrastDisagreement = Math.abs(warmth - brightness);

  const entropy = clamp01(
    0.5 * energy01 + 0.2 * saturation01 + 0.3 * contrastDisagreement,
  );

  // TENSION
  // Driven by:
  // - strong red/purple bias or darker unstable colors
  // - higher energy
  // - higher saturation
  // - lower warmth can sometimes feel colder / more tense
  const tension = clamp01(
    0.35 * dominant.tension +
      0.25 * energy01 +
      0.2 * saturation01 +
      0.2 * (1 - warmth),
  );

  // DENSITY
  // Visual fullness/activity.
  // Strongly tied to energy, but saturation helps it feel more "busy."
  const density = clamp01(0.7 * energy01 + 0.3 * saturation01);

  return {
    energy: macroEnergy,
    brightness,
    warmth,
    entropy,
    tension,
    density,
  };
};

const hue2rgb = (p: number, q: number, t: number): number => {
  let wrapped = t;

  if (wrapped < 0) wrapped += 1;
  if (wrapped > 1) wrapped -= 1;
  if (wrapped < 1 / 6) return p + (q - p) * 6 * wrapped;
  if (wrapped < 1 / 2) return q;
  if (wrapped < 2 / 3) return p + (q - p) * (2 / 3 - wrapped) * 6;

  return p;
};

const channelToHex = (value: number): string =>
  Math.round(clamp(value, 0, 255))
    .toString(16)
    .padStart(2, "0");

const hslToHex = (h: number, s: number, l: number): string => {
  const hue = ((h % 1) + 1) % 1;
  const saturation = clamp01(s);
  const lightness = clamp01(l);

  if (saturation === 0) {
    const gray = lightness * 255;
    const hex = channelToHex(gray);
    return `#${hex}${hex}${hex}`;
  }

  const q =
    lightness < 0.5
      ? lightness * (1 + saturation)
      : lightness + saturation - lightness * saturation;
  const p = 2 * lightness - q;

  const r = hue2rgb(p, q, hue + 1 / 3) * 255;
  const g = hue2rgb(p, q, hue) * 255;
  const b = hue2rgb(p, q, hue - 1 / 3) * 255;

  return `#${channelToHex(r)}${channelToHex(g)}${channelToHex(b)}`;
};

const fract = (value: number) => value - Math.floor(value);

const hashUnit = (seed: number) => fract(Math.sin(seed) * 43758.5453123);

export type PlaybackSequenceDisplayEntry = {
  label: string;
  count: number;
  share: number;
};

export type PlaybackSequenceDisplaySummary = {
  bpm: number;
  totalSeconds: number;
  totalBeats: number;
  totalTicks: number;
  noteCount: number;
  chordCount: number;
  scaleCount: number;
  drumCount: number;
  uniqueNoteCount: number;
  uniqueChordCount: number;
  uniqueScaleCount: number;
  scaleNames: string[];
  structures: string[];
  primaryScaleName: string | null;
  primaryStructure: string | null;
  topNotes: PlaybackSequenceDisplayEntry[];
  topChords: PlaybackSequenceDisplayEntry[];
  topScales: PlaybackSequenceDisplayEntry[];
  topStructures: PlaybackSequenceDisplayEntry[];
};

export type PlaybackSequenceMacroSummary = PlaybackSequenceDisplaySummary;

const describePlaybackSequenceColor = (
  sequence: PlayableSequence,
): {
  hue: number;
  saturation: number;
  lightness: number;
  warmth: number;
  brightness: number;
  energy: number;
  tension: number;
  entropy: number;
  density: number;
  paletteShift: number;
  paletteSpread: number;
  paletteContrast: number;
} => {
  const notes = sequence.notes;
  const noteCount = notes.length;
  const chordCount = sequence.chords.length;
  const scaleCount = sequence.scales.length;
  const drumCount = sequence.drums.length;
  const pitchClassWeights = new Array<number>(12).fill(0);

  let pitchWeightedSum = 0;
  let pitchClassWeightedSum = 0;
  let durationWeight = 0;
  let motionSum = 0;
  let minPitch = Infinity;
  let maxPitch = -Infinity;
  let previousPitch: number | undefined;
  let paletteSeed =
    sequence.bpm * 0.173 +
    sequence.totalTicks * 0.071 +
    noteCount * 0.113 +
    chordCount * 0.197 +
    scaleCount * 0.233 +
    drumCount * 0.317;

  for (let i = 0; i < noteCount; i += 1) {
    const event = notes[i];
    const note = event.note;

    if (!note) continue;

    const pitch = note.keyed();
    const duration = event.durationBeats || 0;

    pitchWeightedSum += pitch * duration;
    pitchClassWeightedSum += note.id * duration;
    durationWeight += duration;
    pitchClassWeights[note.id] += duration || 1;
    paletteSeed +=
      (i + 1) * (note.id + 1) * 0.019 +
      pitch * 0.0017 +
      (duration || 1) * 0.013;

    if (pitch < minPitch) minPitch = pitch;
    if (pitch > maxPitch) maxPitch = pitch;

    if (previousPitch !== undefined) {
      motionSum += Math.abs(pitch - previousPitch);
    }

    previousPitch = pitch;
  }

  for (let i = 0; i < sequence.chords.length; i += 1) {
    const chord = sequence.chords[i].chord;
    if (!chord) continue;

    const chordNotes = chord.notes();
    if (chordNotes.length === 0) continue;

    let intervalSignature = 0;

    for (let j = 1; j < chordNotes.length; j += 1) {
      intervalSignature +=
        mod12(chordNotes[j].id - chordNotes[0].id) * (j + 1);
    }

    paletteSeed +=
      chordNotes[0].id * 0.061 +
      chordNotes.length * 0.127 +
      intervalSignature * 0.0143;
  }

  for (let i = 0; i < sequence.scales.length; i += 1) {
    const scale = sequence.scales[i].scale;
    if (!scale) continue;

    let structureSignature = 0;

    for (let j = 0; j < scale.structure.length; j += 1) {
      structureSignature += scale.structure[j] * (j + 1);
    }

    paletteSeed += scale.base.id * 0.089 + structureSignature * 0.021;
  }

  const totalBeats = sequence.totalBeats || 1;
  const avgPitch = durationWeight > 0 ? pitchWeightedSum / durationWeight : 48;
  const avgPitchClass =
    durationWeight > 0
      ? pitchClassWeightedSum / durationWeight
      : ((sequence.bpm % 12) + 12) % 12;
  const pitchRange =
    minPitch === Infinity || maxPitch === -Infinity ? 0 : maxPitch - minPitch;

  const bpm01 = normalize(sequence.bpm, 60, 180);
  const rhythmDensity = clamp01(
    (noteCount + drumCount + chordCount * 0.5) / (totalBeats * 2),
  );
  const harmonicDensity = clamp01((chordCount + scaleCount * 0.5) / totalBeats);
  const motion01 = clamp01(
    noteCount > 1 ? motionSum / ((noteCount - 1) * 12) : 0,
  );
  const pitch01 = normalize(avgPitch, 24, 84);
  const range01 = normalize(pitchRange, 0, 24);
  const density = clamp01(
    0.45 * rhythmDensity + 0.35 * harmonicDensity + 0.2 * range01,
  );

  const warmth = clamp01(0.65 * (1 - pitch01) + 0.35 * (1 - motion01 * 0.75));
  const brightness = clamp01(
    0.55 * pitch01 + 0.25 * bpm01 + 0.2 * harmonicDensity,
  );
  const energy = clamp01(0.45 * rhythmDensity + 0.3 * motion01 + 0.25 * bpm01);
  const tension = clamp01(
    0.4 * motion01 + 0.25 * rhythmDensity + 0.2 * range01 + 0.15 * (1 - warmth),
  );
  const entropy = clamp01(
    0.4 * motion01 +
      0.25 * range01 +
      0.2 * rhythmDensity +
      0.15 * Math.abs(brightness - warmth),
  );

  let dominantPitchClass = 0;
  let secondaryPitchClass = 0;

  for (let i = 0; i < pitchClassWeights.length; i += 1) {
    if (pitchClassWeights[i] > pitchClassWeights[dominantPitchClass]) {
      secondaryPitchClass = dominantPitchClass;
      dominantPitchClass = i;
    } else if (
      i !== dominantPitchClass &&
      pitchClassWeights[i] > pitchClassWeights[secondaryPitchClass]
    ) {
      secondaryPitchClass = i;
    }
  }

  const paletteShift = hashUnit(
    paletteSeed * 0.97 +
      dominantPitchClass * 1.73 +
      secondaryPitchClass * 2.31,
  );
  const paletteSpread = hashUnit(
    paletteSeed * 1.37 + range01 * 11 + motion01 * 7,
  );
  const paletteContrast = hashUnit(
    paletteSeed * 1.91 + density * 13 + entropy * 17,
  );

  const hue =
    (dominantPitchClass / 12 * 0.32 +
      secondaryPitchClass / 12 * 0.18 +
      avgPitchClass / 12 * 0.15 +
      paletteShift * 0.27 +
      tension * 0.05 +
      bpm01 * 0.03) %
    1;
  const saturation = clamp01(
    0.18 +
      energy * 0.28 +
      tension * 0.18 +
      paletteSpread * 0.24 +
      paletteContrast * 0.12,
  );
  const lightness = clamp01(
    0.12 +
      brightness * 0.34 +
      warmth * 0.11 +
      (1 - rhythmDensity) * 0.08 +
      paletteContrast * 0.2,
  );

  return {
    hue,
    saturation,
    lightness,
    warmth,
    brightness,
    energy,
    tension,
    entropy,
    density,
    paletteShift,
    paletteSpread,
    paletteContrast,
  };
};

export const playbackSequenceToMacroSummary = (
  sequence: PlayableSequence,
): PlaybackSequenceMacroSummary => {
  const noteCounts = new Map<string, number>();
  const chordCounts = new Map<string, number>();
  const scaleCounts = new Map<string, number>();
  const structureCounts = new Map<string, number>();

  const incrementCount = (counts: Map<string, number>, key: string) => {
    counts.set(key, (counts.get(key) ?? 0) + 1);
  };

  const toTopEntries = (
    counts: Map<string, number>,
    total: number,
    limit = 3,
  ): PlaybackSequenceDisplayEntry[] =>
    [...counts.entries()]
      .sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1];
        return a[0].localeCompare(b[0]);
      })
      .slice(0, limit)
      .map(([label, count]) => ({
        label,
        count,
        share: total > 0 ? count / total : 0,
      }));

  const scaleNames = new Set<string>();
  const structureNames = new Set<string>();

  for (const event of sequence.notes) {
    if (!event.note) continue;
    incrementCount(noteCounts, noteLabel(event.note));
  }

  for (const event of sequence.chords) {
    if (!event.chord) continue;
    incrementCount(chordCounts, chordLabel(event.chord));
  }

  for (const event of sequence.scales) {
    if (!event.scale) continue;

    const scaleName = event.scale.name;
    const structureName = namedStructure(event.scale.structure);

    scaleNames.add(scaleName);
    structureNames.add(structureName);
    incrementCount(scaleCounts, scaleName);
    incrementCount(structureCounts, structureName);
  }

  const topScales = toTopEntries(scaleCounts, sequence.scales.length);
  const topStructures = toTopEntries(structureCounts, sequence.scales.length);

  return {
    bpm: sequence.bpm,
    totalSeconds: sequence.totalSeconds,
    totalBeats: sequence.totalBeats,
    totalTicks: sequence.totalTicks,
    noteCount: sequence.notes.length,
    chordCount: sequence.chords.filter((event) => !!event.chord).length,
    scaleCount: sequence.scales.length,
    drumCount: sequence.drums.length,
    uniqueNoteCount: noteCounts.size,
    uniqueChordCount: chordCounts.size,
    uniqueScaleCount: scaleCounts.size,
    scaleNames: [...scaleNames],
    structures: [...structureNames],
    primaryScaleName: topScales[0]?.label ?? null,
    primaryStructure: topStructures[0]?.label ?? null,
    topNotes: toTopEntries(noteCounts, sequence.notes.length),
    topChords: toTopEntries(
      chordCounts,
      sequence.chords.filter((event) => !!event.chord).length,
    ),
    topScales,
    topStructures,
  };
};

export const playbackSequenceToDisplaySummary = playbackSequenceToMacroSummary;

export const playbackSequenceToHexColor = (
  sequence: PlayableSequence,
): string => {
  const profile = describePlaybackSequenceColor(sequence);
  return hslToHex(profile.hue, profile.saturation, profile.lightness);
};

export const playbackSequencesToPixelColors = (
  sequence: PlayableSequence,
  width: number,
  height: number,
): string[] => {
  const safeWidth = Math.max(0, Math.floor(width));
  const safeHeight = Math.max(0, Math.floor(height));
  const pixelCount = safeWidth * safeHeight;

  if (pixelCount === 0) return [];

  const colors = new Array<string>(pixelCount);
  const profile = describePlaybackSequenceColor(sequence);
  const fallbackColor = hslToHex(
    profile.hue,
    profile.saturation,
    profile.lightness,
  );

  if (sequence.totalBeats <= 0 || sequence.events.length === 0) {
    colors.fill(fallbackColor);
    return colors;
  }

  const eventEndBeat = (event: PlayableEvent) =>
    event.startBeat + event.durationBeats;

  const chordHueFor = (chord: Chord | null | undefined): number => {
    if (!chord) return profile.hue;

    const chordNotes = chord.notes();
    if (chordNotes.length === 0) return profile.hue;

    let pitchClassSum = 0;
    let intervalSignature = 0;

    for (let i = 0; i < chordNotes.length; i += 1) {
      pitchClassSum += chordNotes[i].id;

      if (i > 0) {
        intervalSignature +=
          mod12(chordNotes[i].id - chordNotes[0].id) * (i + 1);
      }
    }

    const averagePitchClass = (pitchClassSum / chordNotes.length) / 12;
    const rootHue = chordNotes[0].id / 12;
    const chordSeed = hashUnit(
      intervalSignature * 0.37 +
        chordNotes.length * 1.19 +
        chordNotes[0].id * 0.83 +
        profile.paletteShift * 7,
    );

    return (
      rootHue * 0.38 +
      averagePitchClass * 0.22 +
      chordSeed * 0.28 +
      profile.paletteShift * 0.12
    ) % 1;
  };

  const totalBeats = sequence.totalBeats;
  const lastPixelIndex = Math.max(1, pixelCount - 1);

  const notes = sequence.notes;
  const chords = sequence.chords;
  const scales = sequence.scales;
  const drums = sequence.drums;

  let noteIndex = 0;
  let chordIndex = 0;
  let scaleIndex = 0;
  let drumIndex = 0;

  let activeNoteEvent: PlayableEvent | undefined;
  let activeChordEvent: PlayableEvent | undefined;
  let activeScaleEvent: PlayableEvent | undefined;
  let activeDrumEvent: PlayableEvent | undefined;

  let noteHue = profile.hue;
  let noteLightness = profile.lightness;
  let noteEnergy = 0;
  let chordHue = profile.hue;
  let chordPresence = 0;
  let scaleHue = profile.hue;
  let scalePresence = 0;
  let drumAccent = 0;

  for (let pixelIndex = 0; pixelIndex < pixelCount; pixelIndex += 1) {
    const beat = ((pixelIndex + 0.5) / pixelCount) * totalBeats;
    const progress = pixelIndex / lastPixelIndex;

    while (
      noteIndex < notes.length &&
      eventEndBeat(notes[noteIndex]) <= beat
    ) {
      noteIndex += 1;
    }

    while (
      chordIndex < chords.length &&
      eventEndBeat(chords[chordIndex]) <= beat
    ) {
      chordIndex += 1;
    }

    while (
      scaleIndex < scales.length &&
      eventEndBeat(scales[scaleIndex]) <= beat
    ) {
      scaleIndex += 1;
    }

    while (
      drumIndex < drums.length &&
      eventEndBeat(drums[drumIndex]) <= beat
    ) {
      drumIndex += 1;
    }

    const nextNoteEvent =
      noteIndex < notes.length && notes[noteIndex].startBeat <= beat
        ? notes[noteIndex]
        : undefined;
    const nextChordEvent =
      chordIndex < chords.length && chords[chordIndex].startBeat <= beat
        ? chords[chordIndex]
        : undefined;
    const nextScaleEvent =
      scaleIndex < scales.length && scales[scaleIndex].startBeat <= beat
        ? scales[scaleIndex]
        : undefined;
    const nextDrumEvent =
      drumIndex < drums.length && drums[drumIndex].startBeat <= beat
        ? drums[drumIndex]
        : undefined;

    if (nextNoteEvent !== activeNoteEvent) {
      activeNoteEvent = nextNoteEvent;

      if (activeNoteEvent?.note) {
        const notePitch01 = normalize(activeNoteEvent.note.keyed(), 24, 96);
        noteHue =
          (activeNoteEvent.note.id / 12 * 0.54 +
            notePitch01 * 0.16 +
            profile.paletteShift * 0.3) %
          1;
        noteLightness = clamp01(normalize(activeNoteEvent.note.keyed(), 24, 84));
        noteEnergy = clamp01(
          1 - normalize(activeNoteEvent.durationBeats, 0.25, 4),
        );
      } else {
        noteHue = profile.hue;
        noteLightness = profile.lightness;
        noteEnergy = 0;
      }
    }

    if (nextChordEvent !== activeChordEvent) {
      activeChordEvent = nextChordEvent;
      chordHue = chordHueFor(activeChordEvent?.chord);
      chordPresence = activeChordEvent?.chord ? 1 : 0;
    }

    if (nextScaleEvent !== activeScaleEvent) {
      activeScaleEvent = nextScaleEvent;

      if (activeScaleEvent?.scale) {
        let structureSignature = 0;

        for (let i = 0; i < activeScaleEvent.scale.structure.length; i += 1) {
          structureSignature +=
            activeScaleEvent.scale.structure[i] * (i + 1);
        }

        const scaleSeed = hashUnit(
          activeScaleEvent.scale.base.id * 0.71 +
            structureSignature * 0.13 +
            profile.paletteSpread * 11,
        );

        scaleHue =
          (activeScaleEvent.scale.base.id / 12 * 0.35 +
            scaleSeed * 0.45 +
            profile.paletteShift * 0.2) %
          1;
      } else {
        scaleHue = profile.hue;
      }

      scalePresence = activeScaleEvent?.scale ? 1 : 0;
    }

    if (nextDrumEvent !== activeDrumEvent) {
      activeDrumEvent = nextDrumEvent;
      drumAccent = clamp01((activeDrumEvent?.velocity ?? 0) / 127);
    }

    const hue =
      (profile.hue * 0.14 +
        noteHue * 0.34 +
        chordHue * 0.2 +
        scaleHue * 0.14 +
        profile.paletteShift * 0.08 +
        profile.paletteSpread * 0.06 +
        progress * 0.03 +
        drumAccent * 0.01) %
      1;
    const saturation = clamp01(
      profile.saturation * 0.42 +
        noteEnergy * 0.14 +
        chordPresence * 0.1 +
        scalePresence * 0.06 +
        drumAccent * 0.18 +
        profile.tension * 0.05 +
        profile.paletteSpread * 0.15 +
        profile.paletteContrast * 0.1,
    );
    const lightness = clamp01(
      profile.lightness * 0.35 +
        noteLightness * 0.24 +
        profile.brightness * 0.12 +
        scalePresence * 0.06 +
        chordPresence * 0.04 +
        (1 - drumAccent) * 0.04 +
        profile.paletteContrast * 0.15,
    );

    colors[pixelIndex] = hslToHex(hue, saturation, lightness);
  }

  return colors;
};
