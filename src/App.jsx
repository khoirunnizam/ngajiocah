import { BrowserRouter, Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import HomePage from "./pages/HomePage";
import MushafPage from "./pages/MushafPage";
import AduanPage from "./pages/AduanPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<HomePage />} />
          <Route path="mushaf" element={<MushafPage />} />
          <Route path="/Aduan" element={<AduanPage />} />
          <Route path="*" element={<div className="container py-10 text-center">Halaman tidak ditemukan</div>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
