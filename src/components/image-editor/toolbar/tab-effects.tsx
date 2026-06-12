import { FILTER_PRESETS } from '../utils/filter-presets'
import type { Adjustments } from './types'
import { DEFAULT_ADJUSTMENTS } from './types'
import { cn } from '@/lib/utils'

interface Props {
  adjustments: Adjustments
  activePreset: string | null
  onChange: (a: Adjustments) => void
  onPresetSelect: (label: string) => void
  cols?: number
}

export function TabEffects({ adjustments, activePreset, onChange, onPresetSelect, cols = 3 }: Props) {
  const applyPreset = (label: string, partial: Partial<Adjustments>) => {
    onChange({ ...DEFAULT_ADJUSTMENTS, ...partial })
    onPresetSelect(label)
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground">Filter Presets</p>
      <div className={`grid gap-1.5`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {FILTER_PRESETS.map((preset) => {
          const isActive = activePreset === preset.label
          return (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset.label, preset.adjustments)}
              className={cn(
                'flex flex-col items-center justify-center gap-1 rounded-xl border py-2.5 px-1 text-center transition-colors cursor-pointer',
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-secondary/20 text-muted-foreground hover:text-foreground hover:border-primary/50'
              )}
            >
              <preset.icon className="size-4" />
              <span className="text-[10px] font-medium leading-none">{preset.label}</span>
            </button>
          )
        })}
      </div>
      <p className="text-xs text-muted-foreground pt-1">
        Presets apply to the Adjust tab - tweak values there after applying.
      </p>
    </div>
  )
}
