const STATIC_RATIO: Partial<Record<string, Partial<Record<string, number>>>> = {
  // Images
  jpg:  { webp: 0.30, avif: 0.25, png: 2.8,  gif: 1.8,  tiff: 3.2 },
  jpeg: { webp: 0.30, avif: 0.25, png: 2.8,  gif: 1.8,  tiff: 3.2 },
  jfif: { webp: 0.30, avif: 0.25, png: 2.8,  gif: 1.8,  tiff: 3.2 },
  webp: { jpg: 1.2,  avif: 0.85,  png: 3.2,  gif: 2.0,  tiff: 3.8 },
  avif: { jpg: 1.4,  webp: 1.2,   png: 3.8,  gif: 2.2,  tiff: 4.2 },
  heic: { jpg: 1.2,  webp: 1.0,   png: 3.2,  avif: 0.9, tiff: 3.8 },
  heif: { jpg: 1.2,  webp: 1.0,   png: 3.2,  avif: 0.9, tiff: 3.8 },
  png:  { webp: 0.12, avif: 0.10, jpg: 0.18, gif: 0.85, tiff: 1.1 },
  gif:  { webp: 0.15, avif: 0.12, jpg: 0.22, png: 1.2,  tiff: 1.3 },
  tiff: { webp: 0.10, avif: 0.08, jpg: 0.15, png: 0.90, gif: 0.75 },
  tif:  { webp: 0.10, avif: 0.08, jpg: 0.15, png: 0.90, gif: 0.75 },
  // SVG intentionally excluded - file size has no correlation to raster output size

  // Video
  mp4:  { webm: 0.85, mov: 1.0,  avi: 1.1,  mkv: 0.95, gif: 1.3 },
  mov:  { mp4: 0.95,  webm: 0.80, avi: 1.05, mkv: 0.90 },
  avi:  { mp4: 0.90,  webm: 0.75, mov: 0.95, mkv: 0.85 },
  mkv:  { mp4: 1.0,   webm: 0.85, mov: 1.05, avi: 1.1  },
  webm: { mp4: 1.1,   mov: 1.15,  avi: 1.2,  mkv: 1.05 },

  // Document
  pdf:  { docx: 1.2, txt: 0.05 },
  docx: { pdf: 0.9,  txt: 0.04 },
  txt:  { pdf: 2.0,  docx: 2.5 },

  // Audio
  mp3:  { wav: 8.0,  flac: 5.0, aac: 0.9,  ogg: 0.95, m4a: 0.9  },
  wav:  { mp3: 0.12, flac: 0.55, aac: 0.10, ogg: 0.11, m4a: 0.10 },
  flac: { mp3: 0.20, wav: 1.8,  aac: 0.18, ogg: 0.22, m4a: 0.18 },
  aac:  { mp3: 1.05, wav: 9.0,  flac: 5.5, ogg: 1.0,  m4a: 1.0  },
  ogg:  { mp3: 1.0,  wav: 8.5,  flac: 5.2, aac: 0.95, m4a: 0.95 },
  m4a:  { mp3: 1.05, wav: 9.0,  flac: 5.5, aac: 1.0,  ogg: 1.0  },
}

const MAX_SAMPLES = 50

function qualityScale(quality: number): number {
  return Math.pow(quality / 80, 1.2)
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function ratioKey(sourceExt: string, targetFormat: string): string {
  return `${sourceExt.toLowerCase()}->${targetFormat.toLowerCase()}`
}

/** Call after a successful conversion to get the updated samples array to persist. */
export function computeUpdatedSamples(
  existing: number[],
  inputSize: number,
  outputSize: number,
  quality: number,
): number[] {
  // Normalize ratio to q80 equivalent so samples are comparable across quality settings
  const normalizedRatio = (outputSize / inputSize) / qualityScale(quality)
  const updated = [...existing, normalizedRatio]
  if (updated.length > MAX_SAMPLES) updated.shift()
  return updated
}

export function isLearnedEstimate(
  sourceExt: string,
  targetFormat: string,
  ratios: Record<string, number[]>,
): boolean {
  const key = ratioKey(sourceExt, targetFormat)
  return (ratios[key]?.length ?? 0) > 0
}

export function estimateOutputSize(
  inputSize: number,
  sourceExt: string,
  targetFormat: string,
  quality: number,
  ratios: Record<string, number[]>,
): number | null {
  const src = sourceExt.toLowerCase()
  const tgt = targetFormat.toLowerCase()

  const key = ratioKey(src, tgt)
  const samples = ratios?.[key]

  if (samples && samples.length > 0) {
    return Math.round(inputSize * median(samples) * qualityScale(quality))
  }

  const staticRatio = src === tgt ? 1.0 : STATIC_RATIO[src]?.[tgt]
  if (staticRatio === undefined) return null

  return Math.round(inputSize * staticRatio * qualityScale(quality))
}
