import { Link, NavLink } from 'react-router-dom';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-bg/85 border-b border-border backdrop-blur-lg">
      <div className="container flex items-center justify-between h-16 md:h-17">
        {/* Logo */}
        <Link to="/" className="group flex items-center gap-2.5 text-lg font-bold text-text-heading hover:opacity-90 transition-all">
          {/* Ikon Bulan Sabit dengan Badge Modern */}
          <div className="flex items-center justify-center w-8 h-8 rounded-lg shadow-sm">
            <span className="text-base bg-gradient-to-br from-accent to-accent-2 bg-clip-text text-transparent transform -rotate-12 group-hover:rotate-0 transition-transform">
              ☾
            </span>
          </div>

          {/* Teks Logo */}
          <div className="flex items-center tracking-tight">
            <span className="font-extrabold text-text-heading">Ngajio</span>
            <span className="font-extrabold bg-gradient-to-br from-accent to-accent-2 bg-clip-text text-transparent ml-0.5">Cah</span>
          </div>
        </Link>

        {/* Nav */}
        <nav className="flex items-center gap-1">
          <NavLink
            to="/"
            end
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-custom-sm font-medium text-sm text-text-muted border border-transparent transition-all ${isActive
                ? 'text-accent bg-accent/12 border-accent/30'
                : 'hover:text-text-heading hover:bg-accent/8 hover:border-accent/20'
              }`
            }
          >
            Beranda
          </NavLink>
          <NavLink
            to="/mushaf"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-custom-sm font-medium text-sm text-text-muted border border-transparent transition-all ${isActive
                ? 'text-accent bg-accent/12 border-accent/30'
                : 'hover:text-text-heading hover:bg-accent/8 hover:border-accent/20'
              }`
            }
          >
            Mushaf
          </NavLink>
          <NavLink
            to="/komunitas"
            className={({ isActive }) =>
              `px-4 py-1.5 rounded-custom-sm font-medium text-sm text-text-muted border border-transparent transition-all ${isActive
                ? 'text-accent bg-accent/12 border-accent/30'
                : 'hover:text-text-heading hover:bg-accent/8 hover:border-accent/20'
              }`
            }
          >
            Komunitas
          </NavLink>
        </nav>
      </div>
    </header>
  );
}