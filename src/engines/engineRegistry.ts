import type { ConversionEngine } from './ConversionEngine'
import { imageEngine } from './imageEngine'
import { videoEngine } from './videoEngine'
import { documentEngine } from './documentEngine'
import { audioEngine } from './audioEngine'
import { getExtension } from '@/utils/fileUtils'

const ALL_ENGINES: ConversionEngine[] = [imageEngine, videoEngine, documentEngine, audioEngine]

const extensionToEngine = new Map<string, ConversionEngine>()
for (const engine of ALL_ENGINES) {
  for (const ext of engine.supportedInputExtensions) {
    if (!extensionToEngine.has(ext)) {
      extensionToEngine.set(ext, engine)
    }
  }
}

export function getEngineForFile(file: File): ConversionEngine | null {
  const ext = getExtension(file)
  return extensionToEngine.get(ext) ?? null
}

export const LIMITED_OUTPUT_FORMATS: Record<string, string[]> = {
  image: ['jpg', 'png', 'webp'],
  video: ['mp4', 'webm'],
  audio: ['mp3', 'aac', 'flac', 'wav'],
}

export function isFormatLocked(engineId: string, format: string): boolean {
  const allowed = LIMITED_OUTPUT_FORMATS[engineId]
  if (!allowed) return false
  return !allowed.includes(format)
}

export function getFormatsForFile(file: File, limited = false): string[] {
  const engine = getEngineForFile(file)
  if (!engine) return []
  if (limited && LIMITED_OUTPUT_FORMATS[engine.id]) return LIMITED_OUTPUT_FORMATS[engine.id]
  return engine.outputFormats
}

export function getAllSupportedExtensions(): string[] {
  return Array.from(extensionToEngine.keys())
}

const ENGINE_LABELS: Record<string, string> = {
  image: 'Image',
  video: 'Video',
  document: 'Document',
  audio: 'Audio',
}

export function getExtensionsByGroup(): { label: string; formats: string[] }[] {
  return ALL_ENGINES.map(engine => ({
    label: ENGINE_LABELS[engine.id] ?? engine.id,
    formats: engine.supportedInputExtensions.map(f => f.toUpperCase()),
  }))
}

export { imageEngine }
