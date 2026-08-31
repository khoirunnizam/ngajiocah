import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="border-t border-border bg-bg/60 py-7 mt-auto">
      <div className="container flex items-center justify-between flex-wrap gap-2">
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

        <p className="text-sm text-text-muted">
          Data Al-Quran dari{' '}
          <a 
            href="https://alquran.cloud" 
            target="_blank" 
            rel="noreferrer"
            className="text-accent hover:opacity-75 transition-opacity"
          >
            alquran.cloud
          </a>{' '}
          · {new Date().getFullYear()}
        </p>
      </div>
    </footer>
  );
}