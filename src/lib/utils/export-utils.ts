import {
  choosePlaybackVelocity,
  playbackSequencesToPixelColors,
  renderPlayableSequenceToWavBlob,
  type PlayableSequence,
} from "$lib/utils/music-utils";

type ZipEntry = {
  name: string;
  data: Uint8Array;
  lastModified?: Date;
};

type GeneratedImageOptions = {
  imageFile: File;
  sequence: PlayableSequence;
  pixelationAmount: number;
};

type MotifExportZipOptions = GeneratedImageOptions & {
  baseName?: string;
};

const EXPORT_CANVAS_ASPECT_RATIO = 570 / 480;
const ZIP_VERSION = 20;

const CRC32_TABLE = (() => {
  const table = new Uint32Array(256);

  for (let i = 0; i < table.length; i += 1) {
    let value = i;

    for (let j = 0; j < 8; j += 1) {
      value = (value & 1) === 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
    }

    table[i] = value >>> 0;
  }

  return table;
})();

function sanitizeExportBaseName(name: string) {
  const trimmed = name.trim().replace(/\.[^/.]+$/, "");
  const sanitized = trimmed.replace(/[\\/:*?"<>|]+/g, "-").trim();

  return sanitized || "motif";
}

function hexDigitToNumber(charCode: number) {
  if (charCode >= 48 && charCode <= 57) return charCode - 48;
  if (charCode >= 65 && charCode <= 70) return charCode - 55;
  if (charCode >= 97 && charCode <= 102) return charCode - 87;
  return 0;
}

function hexChannel(hex: string, index: number) {
  return (
    (hexDigitToNumber(hex.charCodeAt(index)) << 4) |
    hexDigitToNumber(hex.charCodeAt(index + 1))
  );
}

function loadImageFromFile(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to load the selected image for export."));
    };

    image.src = objectUrl;
  });
}

function resolveCroppedDimensions(image: HTMLImageElement) {
  const displayWidth = image.width;
  const displayHeight = image.height;
  const imageAspectRatio = displayWidth / displayHeight;
  const sourceWidth =
    imageAspectRatio > EXPORT_CANVAS_ASPECT_RATIO
      ? Math.floor(displayHeight * EXPORT_CANVAS_ASPECT_RATIO)
      : displayWidth;
  const sourceHeight =
    imageAspectRatio > EXPORT_CANVAS_ASPECT_RATIO
      ? displayHeight
      : Math.floor(displayWidth / EXPORT_CANVAS_ASPECT_RATIO);
  const sourceX = Math.floor((displayWidth - sourceWidth) / 2);
  const sourceY = Math.floor((displayHeight - sourceHeight) / 2);

  return {
    sourceWidth,
    sourceHeight,
    sourceX,
    sourceY,
  };
}

function blobFromCanvas(canvas: HTMLCanvasElement, type: string) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        reject(new Error("Unable to render the generated image."));
        return;
      }

      resolve(blob);
    }, type);
  });
}

function crc32(data: Uint8Array) {
  let checksum = 0xffffffff;

  for (const value of data) {
    checksum =
      CRC32_TABLE[(checksum ^ value) & 0xff] ^ (checksum >>> 8);
  }

  return (checksum ^ 0xffffffff) >>> 0;
}

function toDosTimestamp(date: Date) {
  const year = Math.max(1980, date.getFullYear());

  return {
    time:
      (date.getHours() << 11) |
      (date.getMinutes() << 5) |
      Math.floor(date.getSeconds() / 2),
    date:
      ((year - 1980) << 9) |
      ((date.getMonth() + 1) << 5) |
      date.getDate(),
  };
}

function createStoredZip(entries: ZipEntry[]) {
  const encoder = new TextEncoder();
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let localOffset = 0;

  for (const entry of entries) {
    const filenameBytes = encoder.encode(entry.name);
    const checksum = crc32(entry.data);
    const size = entry.data.length;
    const { time, date } = toDosTimestamp(entry.lastModified ?? new Date());

    const localHeader = new Uint8Array(30 + filenameBytes.length);
    const localView = new DataView(localHeader.buffer);

    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, ZIP_VERSION, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, time, true);
    localView.setUint16(12, date, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, size, true);
    localView.setUint32(22, size, true);
    localView.setUint16(26, filenameBytes.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(filenameBytes, 30);

    const centralHeader = new Uint8Array(46 + filenameBytes.length);
    const centralView = new DataView(centralHeader.buffer);

    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, ZIP_VERSION, true);
    centralView.setUint16(6, ZIP_VERSION, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, time, true);
    centralView.setUint16(14, date, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, filenameBytes.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, localOffset, true);
    centralHeader.set(filenameBytes, 46);

    localParts.push(localHeader, entry.data);
    centralParts.push(centralHeader);
    localOffset += localHeader.length + size;
  }

  const centralSize = centralParts.reduce((sum, part) => sum + part.length, 0);
  const endOfCentralDirectory = new Uint8Array(22);
  const endView = new DataView(endOfCentralDirectory.buffer);

  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, localOffset, true);
  endView.setUint16(20, 0, true);

  const archiveParts = [
    ...localParts,
    ...centralParts,
    endOfCentralDirectory,
  ];
  const archive = new Uint8Array(
    archiveParts.reduce((sum, part) => sum + part.length, 0),
  );
  let offset = 0;

  for (const part of archiveParts) {
    archive.set(part, offset);
    offset += part.length;
  }

  return new Blob([archive.buffer], { type: "application/zip" });
}

export function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = objectUrl;
  link.download = filename;
  link.click();

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}

export async function renderGeneratedImageBlob({
  imageFile,
  sequence,
  pixelationAmount,
}: GeneratedImageOptions) {
  const image = await loadImageFromFile(imageFile);
  const { sourceWidth, sourceHeight } = resolveCroppedDimensions(image);
  const pixelSize = Math.max(1, Math.floor(pixelationAmount));
  const pixelWidth = Math.max(1, Math.floor(sourceWidth / pixelSize));
  const pixelHeight = Math.max(1, Math.floor(sourceHeight / pixelSize));
  const colors = playbackSequencesToPixelColors(sequence, pixelWidth, pixelHeight);

  const displayCanvas = document.createElement("canvas");
  const displayContext = displayCanvas.getContext("2d");
  const pixelCanvas = document.createElement("canvas");
  const pixelContext = pixelCanvas.getContext("2d");

  if (!displayContext || !pixelContext) {
    throw new Error("Could not create a canvas context for export.");
  }

  displayCanvas.width = sourceWidth;
  displayCanvas.height = sourceHeight;
  pixelCanvas.width = pixelWidth;
  pixelCanvas.height = pixelHeight;
  displayContext.imageSmoothingEnabled = false;
  pixelContext.imageSmoothingEnabled = false;

  const imageData = pixelContext.createImageData(pixelWidth, pixelHeight);

  for (let index = 0; index < colors.length; index += 1) {
    const color = colors[index] ?? "#000000";
    const offset = index * 4;

    imageData.data[offset] = hexChannel(color, 1);
    imageData.data[offset + 1] = hexChannel(color, 3);
    imageData.data[offset + 2] = hexChannel(color, 5);
    imageData.data[offset + 3] =
      color.length >= 9 ? hexChannel(color, 7) : 255;
  }

  pixelContext.putImageData(imageData, 0, 0);
  displayContext.clearRect(0, 0, sourceWidth, sourceHeight);
  displayContext.drawImage(
    pixelCanvas,
    0,
    0,
    pixelWidth,
    pixelHeight,
    0,
    0,
    sourceWidth,
    sourceHeight,
  );

  return blobFromCanvas(displayCanvas, "image/png");
}

export async function buildMotifExportZipBlob({
  imageFile,
  sequence,
  pixelationAmount,
  baseName,
}: MotifExportZipOptions) {
  const resolvedBaseName = sanitizeExportBaseName(
    baseName ?? imageFile.name ?? "motif",
  );
  const [imageBlob, audioBlob] = await Promise.all([
    renderGeneratedImageBlob({
      imageFile,
      sequence,
      pixelationAmount,
    }),
    renderPlayableSequenceToWavBlob(sequence, choosePlaybackVelocity),
  ]);

  const [imageBytes, audioBytes] = await Promise.all([
    imageBlob.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
    audioBlob.arrayBuffer().then((buffer) => new Uint8Array(buffer)),
  ]);

  return createStoredZip([
    {
      name: `${resolvedBaseName}-generated.png`,
      data: imageBytes,
      lastModified: new Date(imageFile.lastModified || Date.now()),
    },
    {
      name: `${resolvedBaseName}-generated.wav`,
      data: audioBytes,
      lastModified: new Date(),
    },
  ]);
}
