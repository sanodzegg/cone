import './index.css'
import Router from './router'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter as BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme/theme-provider'
import { ErrorBoundary } from '@/components/error-boundary'
import Navigation from './components/navigation/navigation'
import { useAuthStore } from './store/useAuthStore'
import { useSettingsSync } from './lib/useSettingsSync'
import { useConversionCount, isTrialExhausted } from './lib/useConversionCount'
import { supabase } from './lib/supabase'
import { SettingsConflictDialog } from './components/settings/settings-conflict-dialog'
import { ConversionCountContext, toEngineType } from './lib/ConversionCountContext'
import { Toaster } from './components/ui/sonner'
import { toast } from 'sonner'

const splash = document.getElementById('splash')
if (splash) splash.remove();

function App() {
  const { user, plan, setPlan } = useAuthStore()
  const { conflictSettings, localAtConflict, applyRemote, keepLocal } = useSettingsSync(user)
  const { syncCountToServer } = useConversionCount(user)

  function onConversionSuccess(engineId: string) {
    const type = toEngineType(engineId)
    if (!type) return
    syncCountToServer()
    if (plan === 'trial' && isTrialExhausted()) {
      onPlanExhausted()
    }
  }

  function onPlanExhausted() {
    setPlan('limited')
    if (user) supabase.from('users').update({ plan: 'limited' }).eq('id', user.id).then(({ error }) => {
      if (error) console.error('[auth] failed to persist limited plan:', error)
    })
  }

  function onBatchComplete(successCount: number, totalCount: number) {
    const failed = totalCount - successCount
    const body = failed > 0
      ? `${successCount} converted, ${failed} failed.`
      : `${successCount} file${successCount !== 1 ? 's' : ''} converted successfully.`
    window.electron.showNotification('Conversion complete', body)
    if (failed > 0) {
      toast.error(`${failed} file${failed !== 1 ? 's' : ''} failed - tokens refunded`, {
        description: "Failed conversions don't cost tokens.",
        duration: 5000,
      })
    }
  }

  return (
    <ConversionCountContext.Provider value={{ onConversionSuccess, onBatchComplete, onPlanExhausted }}>
      <Navigation />
      <Router />
      {conflictSettings && localAtConflict && (
        <SettingsConflictDialog
          remote={conflictSettings}
          local={localAtConflict}
          onApplyRemote={() => applyRemote(conflictSettings)}
          onKeepLocal={keepLocal}
        />
      )}
    </ConversionCountContext.Provider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
        <Toaster />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
