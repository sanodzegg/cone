import './index.css'
import Router from './router'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter as BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme/theme-provider'
import Navigation from './components/navigation/navigation'
import { useAuth } from './lib/useAuth'
import { useSettingsSync } from './lib/useSettingsSync'
import { SettingsConflictDialog } from './components/settings/settings-conflict-dialog'

const splash = document.getElementById('splash')
if (splash) {
  splash.style.opacity = '0'
  setTimeout(() => splash.remove(), 300)
}

function App() {
  const { user } = useAuth()
  const { conflictSettings, localAtConflict, applyRemote, keepLocal } = useSettingsSync(user)
  return (
    <>
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
    </>
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
