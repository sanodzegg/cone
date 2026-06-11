import { Component, type ErrorInfo, type ReactNode } from 'react'
import { RefreshCw, TriangleAlert } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

// Top-level safety net. A render error anywhere below this boundary would otherwise blank
// the whole window (React unmounts the tree on an uncaught render throw). Instead we catch
// it, log for diagnostics, and show a recoverable fallback. Must be a class component —
// there is no hook equivalent for getDerivedStateFromError / componentDidCatch.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] render error:', error, info.componentStack)
  }

  handleReload = () => {
    // Full renderer reload is the most reliable recovery — HashRouter state, stores, and any
    // wedged component tree are all rebuilt from scratch.
    window.location.reload()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background p-8">
        <div className="flex max-w-md flex-col items-center gap-4 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10">
            <TriangleAlert className="size-6 text-destructive" />
          </div>
          <div className="flex flex-col gap-1.5">
            <h1 className="text-lg font-semibold text-foreground">Something went wrong</h1>
            <p className="text-sm text-muted-foreground">
              The app hit an unexpected error. Reloading should get you back — your files and
              settings are safe.
            </p>
          </div>
          {error.message && (
            <pre className="max-h-32 w-full overflow-auto rounded-lg bg-muted px-3 py-2 text-left text-xs text-muted-foreground">
              {error.message}
            </pre>
          )}
          <Button onClick={this.handleReload}>
            <RefreshCw />
            Reload app
          </Button>
        </div>
      </div>
    )
  }
}
