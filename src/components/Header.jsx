import { useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { Menu, X } from "lucide-react";

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const navClass = ({ isActive }) =>
    `px-4 py-2 rounded-custom-sm font-medium text-sm border border-transparent transition-all ${isActive ? "text-accent bg-accent/12 border-accent/30" : "text-text-muted hover:text-text-heading hover:bg-accent/8 hover:border-accent/20"}`;

  const mobileNavClass = ({ isActive }) =>
    `block w-full px-4 py-3 rounded-custom-sm font-medium text-sm border border-transparent transition-all ${
      isActive ? "text-accent bg-accent/12 border-accent/30" : "text-text-muted hover:text-text-heading hover:bg-accent/8 hover:border-accent/20"
    }`;

  function closeMenu() {
    setIsOpen(false);
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur-lg">
      <div className="container flex h-16 items-center justify-between md:h-17">
        {/* =========================
            LOGO
        ========================== */}
        <Link to="/" onClick={closeMenu} className="group flex items-center gap-2.5 text-lg font-bold text-text-heading transition-all hover:opacity-90">
          {/* Ikon Bulan */}
          <div className="flex h-8 w-8 items-center justify-center rounded-lg shadow-sm">
            <span className="transform bg-gradient-to-br from-accent to-accent-2 bg-clip-text text-base text-transparent transition-transform group-hover:rotate-0 -rotate-12">☾</span>
          </div>

          {/* Teks Logo */}
          <div className="flex items-center tracking-tight">
            <span className="font-extrabold text-text-heading">Ngajio</span>

            <span className="ml-0.5 bg-gradient-to-br from-accent to-accent-2 bg-clip-text font-extrabold text-transparent">Cah</span>
          </div>
        </Link>

        {/* =========================
            DESKTOP NAV
        ========================== */}
        <nav className="hidden items-center gap-1 md:flex">
          <NavLink to="/" end className={navClass}>
            Beranda
          </NavLink>

          <NavLink to="/mushaf" className={navClass}>
            Mushaf
          </NavLink>

          <NavLink to="/mushaf?hafalan=1" className={navClass}>
            Hafalan
          </NavLink>

          <NavLink to="/Aduan" className={navClass}>
            Aduan
          </NavLink>
        </nav>

        {/* =========================
            MOBILE BUTTON
        ========================== */}
        <button
          type="button"
          onClick={() => setIsOpen((value) => !value)}
          className="flex h-10 w-10 items-center justify-center rounded-custom-sm border border-border bg-white/40 text-text-heading transition hover:bg-accent/10 md:hidden"
          aria-label={isOpen ? "Tutup menu" : "Buka menu"}
          aria-expanded={isOpen}
        >
          {isOpen ? <X size={21} /> : <Menu size={21} />}
        </button>
      </div>

      {/* =========================
          MOBILE NAV
      ========================== */}
      {isOpen && (
        <div className="border-t border-border bg-bg/95 px-4 py-3 shadow-sm backdrop-blur-lg md:hidden">
          <nav className="container flex flex-col gap-1">
            <NavLink to="/" end onClick={closeMenu} className={mobileNavClass}>
              Beranda
            </NavLink>

            <NavLink to="/mushaf" onClick={closeMenu} className={mobileNavClass}>
              Mushaf
            </NavLink>

            <NavLink to="/mushaf?hafalan=1" onClick={closeMenu} className={mobileNavClass}>
              Hafalan
            </NavLink>

            <NavLink to="/Aduan" onClick={closeMenu} className={mobileNavClass}>
              Aduan
            </NavLink>
          </nav>
        </div>
      )}
    </header>
  );
}
