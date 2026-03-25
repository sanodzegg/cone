import { Route, Routes } from "react-router-dom";
import Homepage from "./pages/homepage";
import Settings from "./pages/settings";
import FaviconConversion from "./pages/favicons";
import ImageEditor from "./pages/image-editor";
import BulkConverter from "./pages/bulk-converter";
import WebsiteScreenshot from "./pages/website-screenshot";
import WebsitePdf from "./pages/website-pdf";
import PdfMerge from "./pages/pdf-merge";
import Auth from "./pages/auth";

export default function Router() {
  return (
    <Routes>
        <Route index element={<Homepage />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/extensions/favicon" element={<FaviconConversion />} />
        <Route path="/extensions/image-editor" element={<ImageEditor />} />
        <Route path="/extensions/bulk-converter" element={<BulkConverter />} />
        <Route path="/extensions/website-screenshot" element={<WebsiteScreenshot />} />
        <Route path="/extensions/pdf-merge" element={<PdfMerge />} />
        <Route path="/extensions/website-pdf" element={<WebsitePdf />} />
        <Route path="/account" element={<Auth />} />
    </Routes>
  )
}
