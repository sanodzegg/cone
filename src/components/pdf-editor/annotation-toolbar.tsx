import { Highlighter, Type, Pencil, ArrowRight, MousePointer } from 'lucide-react'
import { cn } from '@/lib/utils'

export type AnnotationTool = 'select' | 'highlight' | 'text' | 'draw' | 'arrow'

const TOOLS: { id: AnnotationTool; label: string; icon: React.ReactNode }[] = [
  { id: 'select', label: 'Select', icon: <MousePointer className="size-4" /> },
  { id: 'highlight', label: 'Highlight', icon: <Highlighter className="size-4" /> },
  { id: 'text', label: 'Text', icon: <Type className="size-4" /> },
  { id: 'draw', label: 'Draw', icon: <Pencil className="size-4" /> },
  { id: 'arrow', label: 'Arrow', icon: <ArrowRight className="size-4" /> },
]

const COLORS = ['#FFFF00', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#000000', '#FFFFFF']

const STROKE_WIDTHS = [2, 4, 6, 10]

interface AnnotationToolbarProps {
  tool: AnnotationTool
  color: string
  strokeWidth: number
  onToolChange: (t: AnnotationTool) => void
  onColorChange: (c: string) => void
  onStrokeWidthChange: (w: number) => void
}

export default function AnnotationToolbar({
  tool,
  color,
  strokeWidth,
  onToolChange,
  onColorChange,
  onStrokeWidthChange,
}: AnnotationToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card px-4 py-2.5">
      {/* Tools */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {TOOLS.map(t => (
          <button
            key={t.id}
            onClick={() => onToolChange(t.id)}
            title={t.label}
            className={cn(
              'flex items-center gap-1.5 px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
              tool === t.id
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent'
            )}
          >
            {t.icon}
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Color swatches */}
      <div className="flex items-center gap-1.5">
        {COLORS.map(c => (
          <button
            key={c}
            onClick={() => onColorChange(c)}
            title={c}
            className={cn(
              'size-6 rounded-full border-2 transition-transform cursor-pointer',
              color === c ? 'border-primary scale-110' : 'border-transparent hover:scale-105'
            )}
            style={{ backgroundColor: c, boxShadow: c === '#FFFFFF' ? 'inset 0 0 0 1px #ccc' : undefined }}
          />
        ))}
        {/* Custom color */}
        <label title="Custom color" className="relative cursor-pointer">
          <input
            type="color"
            value={color}
            onChange={e => onColorChange(e.target.value)}
            className="sr-only"
          />
          <div
            className={cn(
              'size-6 rounded-full border-2 transition-transform hover:scale-105',
              !COLORS.includes(color) ? 'border-primary scale-110' : 'border-dashed border-border'
            )}
            style={{ background: `conic-gradient(red, yellow, lime, cyan, blue, magenta, red)` }}
          />
        </label>
      </div>

      {/* Separator */}
      <div className="h-6 w-px bg-border" />

      {/* Stroke width */}
      <div className="flex items-center gap-1.5">
        {STROKE_WIDTHS.map(w => (
          <button
            key={w}
            onClick={() => onStrokeWidthChange(w)}
            title={`${w}px`}
            className={cn(
              'flex items-center justify-center size-7 rounded-md border transition-colors cursor-pointer',
              strokeWidth === w
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-accent'
            )}
          >
            <div
              className="rounded-full bg-foreground"
              style={{ width: w + 4, height: w }}
            />
          </button>
        ))}
      </div>
    </div>
  )
}
