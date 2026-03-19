export class Color {
  r: number;
  g: number;
  b: number;
  a: number;

  constructor(r: number, g: number, b: number, a: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }

  luminance() {
    return 0.2126 * this.r + 0.7152 * this.g + 0.0722 * this.b;
  }

  energy() {
    return Math.sqrt(this.r * this.r + this.g * this.g + this.b * this.b);
  }

  saturation() {
    return Math.max(this.r, this.g, this.b) - Math.min(this.r, this.g, this.b);
  }

  hue() {
    return Math.atan2(
      Math.sqrt(3) * (this.g - this.b),
      2 * this.r - this.g - this.b,
    );
  }

  warmth() {
    return this.r - this.b;
  }

  dominant() {
    return this.r > this.b && this.r > this.g
      ? "red"
      : this.g > this.b
        ? "green"
        : "blue";
  }

  rgbaToHex(): string {
    const toHex = (n: number) => Math.round(n).toString(16).padStart(2, "0");

    const hex = `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;

    if (this.a === undefined) return hex;

    const alpha = toHex(this.a);
    return `${hex}${alpha}`;
  }

  distance(color: Color) {
    return Math.sqrt(
      (this.r - color.r) ** 2 +
        (this.g - color.g) ** 2 +
        (this.b - color.b) ** 2,
    );
  }

  static fromChannels(
    rChannel: number[],
    gChannel: number[],
    bChannel: number[],
    aChannel: number[],
    reducer: (a: number, b: number) => number,
  ): Color {
    return new Color(
      rChannel.reduce(reducer),
      gChannel.reduce(reducer),
      bChannel.reduce(reducer),
      aChannel.reduce(reducer),
    );
  }

  static fromChannelsMixed(
    rChannel: [rChannel: number[], (a: number, b: number) => number],
    gChannel: [gChannel: number[], (a: number, b: number) => number],
    bChannel: [bChannel: number[], (a: number, b: number) => number],
    aChannel: [aChannel: number[], (a: number, b: number) => number],
  ): Color {
    return new Color(
      rChannel[0].reduce(rChannel[1]),
      gChannel[0].reduce(gChannel[1]),
      bChannel[0].reduce(bChannel[1]),
      aChannel[0].reduce(aChannel[1]),
    );
  }
}

class DominantColorCounter {
  private counts: Record<string, number> = {
    red: 0,
    green: 0,
    blue: 0,
  };

  add(value: string) {
    this.counts[value]++;
  }

  mode(): string {
    return Object.entries(this.counts).sort(
      (a, b) => b[1] - a[1],
    )[0][0] as string;
  }
}

export class ImageUtils {
  static getPixelCount(imageData: ImageData): number {
    return imageData.width * imageData.height;
  }

  static getChannels(imageData: ImageData) {
    const { width, height } = imageData;
    const rChannel = [];
    const gChannel = [];
    const bChannel = [];
    const aChannel = [];

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const { r, g, b, a } = this.getPixelColor(imageData, x, y);
        rChannel.push(r);
        gChannel.push(g);
        bChannel.push(b);
        aChannel.push(a);
      }
    }

    return {
      rChannel,
      gChannel,
      bChannel,
      aChannel,
    };
  }

  static getAverageColor(imageData: ImageData): Color {
    const { rChannel, gChannel, bChannel, aChannel } =
      ImageUtils.getChannels(imageData);

    const count = rChannel.length || 1;
    const average = (channel: number[]) =>
      channel.reduce((sum, value) => sum + value, 0) / count;

    return new Color(
      average(rChannel),
      average(gChannel),
      average(bChannel),
      average(aChannel),
    );
  }

  static getBrightestColor(imageData: ImageData) {
    const { width, height } = imageData;
    let brightest = this.getPixelColor(imageData, 0, 0);
    let maxLuminance = brightest.luminance();

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const color = this.getPixelColor(imageData, x, y);
        const luminance = color.luminance();

        if (luminance > maxLuminance) {
          brightest = color;
          maxLuminance = luminance;
        }
      }
    }

    return brightest;
  }

  static getDarkestColor(imageData: ImageData) {
    const { width, height } = imageData;
    let darkest = this.getPixelColor(imageData, 0, 0);
    let minLuminance = darkest.luminance();

    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const color = this.getPixelColor(imageData, x, y);
        const luminance = color.luminance();

        if (luminance < minLuminance) {
          darkest = color;
          minLuminance = luminance;
        }
      }
    }

    return darkest;
  }

  static getPixelColor(imageData: ImageData, x: number, y: number) {
    const index = (y * imageData.width + x) * 4;
    const imageDataArray = imageData.data;

    return new Color(
      imageDataArray[index],
      imageDataArray[index + 1],
      imageDataArray[index + 2],
      imageDataArray[index + 3],
    );
  }
}

export class ImageWrapper {
  readonly imageData: ImageData;
  private analysisCache?: ImageAnalysisSnapshot;

  constructor(imageData: ImageData) {
    this.imageData = imageData;
  }

  async foreachPixel(
    handler: (color: Color) => Promise<void> | void,
  ): Promise<void> {
    for (let x = 0; x < this.imageData.width; x += 1) {
      for (let y = 0; y < this.imageData.height; y += 1) {
        await handler(this.getPixelColor(x, y));
      }
    }
  }

  getPixelColor(x: number, y: number) {
    return ImageUtils.getPixelColor(this.imageData, x, y);
  }

  analyze(): ImageAnalysisSnapshot {
    if (this.analysisCache) {
      return this.analysisCache;
    }

    const { width, height } = this.imageData;
    const pixelCount = width * height;

    if (pixelCount === 0) {
      const emptyColor = new Color(0, 0, 0, 0);
      this.analysisCache = {
        averageColor: emptyColor,
        brightestColor: emptyColor,
        darkestColor: emptyColor,
        pixelCount: 0,
        stats: {
          energy: 0,
          hues: 0,
          saturation: 0,
          warmth: 0,
          dominant: "blue",
        },
      };

      return this.analysisCache;
    }

    let totalR = 0;
    let totalG = 0;
    let totalB = 0;
    let totalA = 0;
    let totalEnergy = 0;
    let totalHue = 0;
    let totalSaturation = 0;
    let totalWarmth = 0;

    let brightestColor = this.getPixelColor(0, 0);
    let darkestColor = brightestColor;
    let maxLuminance = brightestColor.luminance();
    let minLuminance = maxLuminance;

    const dominantCounter = new DominantColorCounter();

    for (let x = 0; x < width; x += 1) {
      for (let y = 0; y < height; y += 1) {
        const color = this.getPixelColor(x, y);

        totalR += color.r;
        totalG += color.g;
        totalB += color.b;
        totalA += color.a;
        totalEnergy += color.energy();
        totalHue += color.hue();
        totalSaturation += color.saturation();
        totalWarmth += color.warmth();
        dominantCounter.add(color.dominant());

        const luminance = color.luminance();

        if (luminance > maxLuminance) {
          brightestColor = color;
          maxLuminance = luminance;
        }

        if (luminance < minLuminance) {
          darkestColor = color;
          minLuminance = luminance;
        }
      }
    }

    this.analysisCache = {
      averageColor: new Color(
        totalR / pixelCount,
        totalG / pixelCount,
        totalB / pixelCount,
        totalA / pixelCount,
      ),
      brightestColor,
      darkestColor,
      pixelCount,
      stats: {
        energy: totalEnergy / pixelCount,
        hues: totalHue / pixelCount,
        saturation: totalSaturation / pixelCount,
        warmth: totalWarmth / pixelCount,
        dominant: dominantCounter.mode(),
      },
    };

    return this.analysisCache;
  }

  average() {
    return this.analyze().averageColor;
  }

  brightest() {
    return this.analyze().brightestColor;
  }

  darkest() {
    return this.analyze().darkestColor;
  }

  pixelCount() {
    return this.analyze().pixelCount;
  }

  averages(): ImageStats {
    return this.analyze().stats;
  }
}

export type ImageStats = {
  energy: number;
  hues: number;
  saturation: number;
  warmth: number;
  dominant: string;
};

export type ImageAnalysisSnapshot = {
  averageColor: Color;
  brightestColor: Color;
  darkestColor: Color;
  pixelCount: number;
  stats: ImageStats;
};
