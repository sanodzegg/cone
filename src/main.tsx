import './index.css'
import Router from './router'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter as BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme/theme-provider'
import Navigation from './components/navigation/navigation'
import { useAuth } from './lib/useAuth'
import { useSettingsSync } from './lib/useSettingsSync'
import { useConversionCount, incrementLocalCount } from './lib/useConversionCount'
import { SettingsConflictDialog } from './components/settings/settings-conflict-dialog'
import { ConversionCountContext, toEngineType } from './lib/ConversionCountContext'

const splash = document.getElementById('splash')
if (splash) {
  splash.style.opacity = '0'
  setTimeout(() => splash.remove(), 300)
}

function App() {
  const { user, plan } = useAuth()
  const { conflictSettings, localAtConflict, applyRemote, keepLocal } = useSettingsSync(user)
  const { syncCountToServer } = useConversionCount(user, plan)

  function onConversionSuccess(engineId: string) {
    const type = toEngineType(engineId)
    if (!type) return
    incrementLocalCount(type)
    syncCountToServer(type)
  }

  function onBatchComplete(successCount: number, totalCount: number) {
    const failed = totalCount - successCount
    const body = failed > 0
      ? `${successCount} converted, ${failed} failed.`
      : `${successCount} file${successCount !== 1 ? 's' : ''} converted successfully.`
    window.electron.showNotification('Conversion complete', body)
  }

  return (
    <ConversionCountContext.Provider value={{ onConversionSuccess, onBatchComplete }}>
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
        <App />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
