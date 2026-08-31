import { Outlet } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';

export default function Layout() {
  return (
    <div className="min-h-screen flex flex-col scrollbar-custom">
      <Header />
      <main className="page flex-1">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}