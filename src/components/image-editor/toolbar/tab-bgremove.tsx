import { Eraser, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type BgRemoveStatus = 'idle' | 'loading' | 'done' | 'error'

interface Props {
  status: BgRemoveStatus
  progress: number
  onRemove: () => void
  onCancel: () => void
}

export function TabBgRemove({ status, progress, onRemove, onCancel }: Props) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Remove the background from your image using on-device AI. <br/>
        Model is downloaded once <em>(~40 MB)</em> and cached locally.
      </p>

      {status === 'loading' ? (
        <Button
          className="w-full gap-2"
          size="sm"
          variant="outline"
          onClick={onCancel}
        >
          <X className="size-3.5" />
          Cancel
        </Button>
      ) : (
        <Button
          className="w-full gap-2"
          size="sm"
          onClick={onRemove}
        >
          <Eraser className="size-3.5" />
          {status === 'done' ? 'Remove Again' : 'Remove Background'}
        </Button>
      )}

      {status === 'loading' && (
        <div className="space-y-1.5">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{progress < 5 ? 'Loading model…' : 'Processing…'}</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === 'error' && (
        <p className="text-xs text-destructive">Something went wrong. Try again.</p>
      )}

      {status === 'done' && (
        <p className="text-xs text-green-500">Background removed.</p>
      )}
    </div>
  )
}
