import { Route, Routes } from "react-router-dom";
import Homepage from "./pages/homepage";
import Settings from "./pages/settings";

export default function Router() {
  return (
    <Routes>
        <Route index element={<Homepage />} />
        <Route path="/settings" element={<Settings />} />
    </Routes>
  )
}
