import './index.css'
import Router from './router'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter as BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from '@/components/theme/theme-provider'
import Navigation from './components/navigation/navigation'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <Navigation />
        <Router />
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
