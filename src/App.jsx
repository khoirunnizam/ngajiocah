import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout     from './components/Layout';
import HomePage   from './pages/HomePage';
import MushafPage from './pages/MushafPage';
import KomunitasPage from './pages/KomunitasPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index         element={<HomePage />}   />
          <Route path="mushaf" element={<MushafPage />} />
          <Route path="/komunitas" element={<KomunitasPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
