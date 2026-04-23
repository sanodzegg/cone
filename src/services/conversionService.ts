import { getEngineForFile } from '@/engines/engineRegistry'
import { fileKey } from '@/utils/fileUtils'
import type { ConvertStore } from '@/store/useConvertStore'
import { isAtLimit, isTrialExhausted, incrementLocalCount } from '@/lib/useConversionCount'
import { toEngineType } from '@/lib/ConversionCountContext'

type ConversionDeps = Pick<
  ConvertStore,
  | 'quality'
  | 'imageQuality'
  | 'fileSettings'
  | 'convertedFiles'
  | 'convertingFiles'
  | 'startConversion'
  | 'setConvertedFile'
  | 'setFailedFile'
  | 'markFileConverting'
  | 'unmarkFileConverting'
  | 'removeFile'
> & {
  plan: string
  onConversionSuccess?: (engineId: string) => void
  onBatchComplete?: (successCount: number, totalCount: number) => void
}

function getDefaultQualityForFile(file: File, deps: ConversionDeps): number {
  const engineId = getEngineForFile(file)?.id
  if (engineId === 'image') return deps.imageQuality
  return deps.quality
}

export async function convertSingle(file: File, deps: ConversionDeps): Promise<void> {
  await convertAll([file], deps)
}

async function convertFile(file: File, deps: ConversionDeps): Promise<void> {
  const engine = getEngineForFile(file)
  if (!engine) {
    deps.setFailedFile(file, 'No engine available for this file type')
    return
  }

  const limitType = toEngineType(engine.id)
  if (limitType && isAtLimit(limitType, deps.plan)) {
    const label = limitType.charAt(0).toUpperCase() + limitType.slice(1)
    const msg = deps.plan === 'limited' || isTrialExhausted()
      ? `${label} daily limit reached. Try again tomorrow or upgrade to Pro.`
      : `${label} conversion limit reached. Upgrade to continue.`
    deps.setFailedFile(file, msg)
    return
  }
  // Reserve the slot immediately so parallel conversions don't all pass the same limit check.
  // If the conversion never actually runs (bad settings, engine throws), refund it.
  const refund = limitType ? incrementLocalCount(limitType, deps.plan) : () => {}

  const settings = deps.fileSettings[fileKey(file)]
  const targetFormat = settings?.targetFormat
  if (!targetFormat) {
    refund()
    deps.setFailedFile(file, 'No target format selected')
    return
  }

  const quality = settings.quality ?? getDefaultQualityForFile(file, deps)

  try {
    deps.markFileConverting(file)
    const blob = await engine.convert(file, targetFormat, {
      quality,
      width: settings.width,
      height: settings.height,
      fit: settings.fit,
      keepMetadata: settings.keepMetadata,
    })
    deps.setConvertedFile(file, blob)
    deps.unmarkFileConverting(file)
    deps.removeFile(file)
    deps.onConversionSuccess?.(engine.id)
  } catch (err) {
    refund()
    deps.unmarkFileConverting(file)
    deps.setFailedFile(file, err instanceof Error ? err.message : (err as any)?.message ?? String(err) ?? 'Unknown error')
  }
}

export async function convertAll(files: File[], deps: ConversionDeps): Promise<void> {
  const pending = files.filter((f) => !deps.convertedFiles[fileKey(f)])
  if (pending.length === 0) return

  deps.startConversion(pending)

  let successCount = 0
  const wrappedDeps = {
    ...deps,
    onConversionSuccess: (engineId: string) => {
      successCount++
      deps.onConversionSuccess?.(engineId)
    },
  }

  const images = pending.filter((f) => getEngineForFile(f)?.id === 'image')
  const nonImages = pending.filter((f) => getEngineForFile(f)?.id !== 'image')

  const imagePromise = Promise.allSettled(images.map((f) => convertFile(f, wrappedDeps)))

  const nonImagePromise = (async () => {
    for (const f of nonImages) {
      await convertFile(f, wrappedDeps)
    }
  })()

  await Promise.all([imagePromise, nonImagePromise])

  deps.onBatchComplete?.(successCount, pending.length)
}
