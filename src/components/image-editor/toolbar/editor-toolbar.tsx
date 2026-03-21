import { useState } from 'react'
import { cn } from '@/lib/utils'
import { TabAdjust } from './tab-adjust'
import { TabEffects } from './tab-effects'
import { TabTransform } from './tab-transform'
import { TabOverlay, type OverlayMode } from './tab-overlay'
import { TabCanvas } from './tab-canvas'
import type { Adjustments, Transform, EditorTab } from './types'
import { DEFAULT_ADJUSTMENTS } from './types'
import type { ResizeState } from '../utils/resize-presets'
import type { TextOverlay } from '../layers/use-text-overlays'
import type { DrawTool } from '../layers/use-draw-commands'

const TABS: { id: EditorTab; label: string; mode: OverlayMode }[] = [
  { id: 'adjust', label: 'Adjust', mode: 'none' },
  { id: 'effects', label: 'Effects', mode: 'none' },
  { id: 'transform', label: 'Transform', mode: 'none' },
  { id: 'overlay', label: 'Overlay', mode: 'text' },
  { id: 'canvas', label: 'Crop', mode: 'crop' },
  { id: 'bgremove', label: 'BG Remove', mode: 'none' },
]

interface Props {
  adjustments: Adjustments
  transform: Transform
  resize: ResizeState
  naturalW: number
  naturalH: number
  mode: OverlayMode
  // Text
  textOverlays: TextOverlay[]
  selectedTextId: string | null
  // Draw
  drawTool: DrawTool
  drawColor: string
  drawWidth: number
  canUndo: boolean
  // Callbacks
  onAdjustments: (a: Adjustments) => void
  onTransform: (t: Transform) => void
  onResize: (r: ResizeState) => void
  onMode: (m: OverlayMode) => void
  onSelectText: (id: string | null) => void
  onUpdateText: (id: string, patch: Partial<TextOverlay>) => void
  onDeleteText: (id: string) => void
  onDrawTool: (t: DrawTool) => void
  onDrawColor: (c: string) => void
  onDrawWidth: (w: number) => void
  onDrawUndo: () => void
}

export default function EditorToolbar({
  adjustments, transform, resize, naturalW, naturalH,
  mode, textOverlays, selectedTextId,
  drawTool, drawColor, drawWidth, canUndo,
  onAdjustments, onTransform, onResize, onMode,
  onSelectText, onUpdateText, onDeleteText,
  onDrawTool, onDrawColor, onDrawWidth, onDrawUndo,
}: Props) {
  const [activeTab, setActiveTab] = useState<EditorTab>('canvas')
  const [activePreset, setActivePreset] = useState<string | null>(null)

  const handleAdjustments = (a: Adjustments) => {
    setActivePreset(null)
    onAdjustments(a)
  }

  return (
    <div className="rounded-2xl border border-border bg-secondary/20 overflow-hidden">
      {/* Tab bar */}
      <div className="flex border-b border-border">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); onMode(tab.mode) }}
            className={cn(
              'flex-1 py-2 text-[10px] font-medium transition-colors cursor-pointer',
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="p-4 overflow-y-auto max-h-[calc(100vh-280px)]">
        {activeTab === 'adjust' && (
          <TabAdjust
            adjustments={adjustments}
            onChange={handleAdjustments}
            onReset={() => { onAdjustments(DEFAULT_ADJUSTMENTS); setActivePreset(null) }}
          />
        )}
        {activeTab === 'effects' && (
          <TabEffects
            adjustments={adjustments}
            activePreset={activePreset}
            onChange={onAdjustments}
            onPresetSelect={setActivePreset}
          />
        )}
        {activeTab === 'transform' && (
          <TabTransform
            transform={transform}
            vignette={adjustments.vignette}
            onTransform={onTransform}
            onVignette={v => onAdjustments({ ...adjustments, vignette: v })}
          />
        )}
        {activeTab === 'overlay' && (
          <TabOverlay
            mode={mode}
            onModeChange={onMode}
            textOverlays={textOverlays}
            selectedTextId={selectedTextId}
            onSelectText={onSelectText}
            onUpdateText={onUpdateText}
            onDeleteText={onDeleteText}
            drawTool={drawTool}
            drawColor={drawColor}
            drawWidth={drawWidth}
            onDrawTool={onDrawTool}
            onDrawColor={onDrawColor}
            onDrawWidth={onDrawWidth}
            onDrawUndo={onDrawUndo}
            canUndo={canUndo}
          />
        )}
        {activeTab === 'canvas' && (
          <TabCanvas
            resize={resize}
            naturalW={naturalW}
            naturalH={naturalH}
            onChange={onResize}
          />
        )}
      </div>
    </div>
  )
}

export type { Adjustments, Transform }
export { DEFAULT_ADJUSTMENTS }
export type { OverlayMode }
