import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout     from './components/Layout';
import HomePage   from './pages/HomePage';
import MushafPage from './pages/MushafPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index         element={<HomePage />}   />
          <Route path="mushaf" element={<MushafPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
