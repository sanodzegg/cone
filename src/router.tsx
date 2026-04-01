import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./lib/useAuth";

import Homepage from './pages/homepage'
const Settings = lazy(() => import('./pages/settings'))
const FaviconConversion = lazy(() => import('./pages/favicons'))
const ImageEditor = lazy(() => import('./pages/image-editor'))
const BulkConverter = lazy(() => import('./pages/bulk-converter'))
const WebsiteScreenshot = lazy(() => import('./pages/website-screenshot'))
const WebsitePdf = lazy(() => import('./pages/website-pdf'))
const PdfMerge = lazy(() => import('./pages/pdf-merge'))
const Auth = lazy(() => import('./pages/auth'))
const Pricing = lazy(() => import('./pages/pricing'))
const SvgEditor = lazy(() => import('./pages/svg-editor'))

function ProRoute({ children }: { children: React.ReactNode }) {
  const { plan } = useAuth()
  if (plan === 'limited') return <Navigate to="/pricing" replace />
  return <>{children}</>
}

export default function Router() {
  return (
    <Suspense>
      <Routes>
          <Route index element={<Homepage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/extensions/favicon" element={<FaviconConversion />} />
          <Route path="/extensions/svg-editor" element={<SvgEditor />} />
          <Route path="/extensions/pdf-merge" element={<PdfMerge />} />
          <Route path="/extensions/image-editor" element={<ProRoute><ImageEditor /></ProRoute>} />
          <Route path="/extensions/bulk-converter" element={<ProRoute><BulkConverter /></ProRoute>} />
          <Route path="/extensions/website-screenshot" element={<ProRoute><WebsiteScreenshot /></ProRoute>} />
          <Route path="/extensions/website-pdf" element={<ProRoute><WebsitePdf /></ProRoute>} />
          <Route path="/account" element={<Auth />} />
          <Route path="/pricing" element={<Pricing />} />
      </Routes>
    </Suspense>
  )
}
