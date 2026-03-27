import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";

const Homepage = lazy(() => import('./pages/homepage'))
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

export default function Router() {
  return (
    <Suspense>
      <Routes>
          <Route index element={<Homepage />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/extensions/favicon" element={<FaviconConversion />} />
          <Route path="/extensions/image-editor" element={<ImageEditor />} />
          <Route path="/extensions/bulk-converter" element={<BulkConverter />} />
          <Route path="/extensions/website-screenshot" element={<WebsiteScreenshot />} />
          <Route path="/extensions/pdf-merge" element={<PdfMerge />} />
          <Route path="/extensions/website-pdf" element={<WebsitePdf />} />
          <Route path="/extensions/svg-editor" element={<SvgEditor />} />
          <Route path="/account" element={<Auth />} />
          <Route path="/pricing" element={<Pricing />} />
      </Routes>
    </Suspense>
  )
}
