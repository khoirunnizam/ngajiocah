import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSurahs } from '../services/quranApi';

const JUZ_LIST = Array.from({ length: 30 }, (_, i) => ({
  number: i + 1,
  name: `Juz ${i + 1}`,
}));

// Surah starts per juz (standard mapping)
const JUZ_SURAH_START = [
  [1,1],[2,1],[2,252],[3,93],[4,24],[4,148],[5,82],[6,111],[7,88],[8,41],
  [9,93],[11,6],[12,53],[15,1],[17,1],[18,75],[21,1],[23,1],[25,21],[27,56],
  [29,46],[33,31],[36,28],[39,32],[41,47],[46,1],[51,31],[58,1],[67,1],[78,1],
];

export default function HomePage() {
  const navigate   = useNavigate();
  const [filter,   setFilter]   = useState('surah'); // 'surah' | 'juz'
  const [query,    setQuery]    = useState('');
  const [inputVal, setInputVal] = useState('');
  const [surahs,   setSurahs]   = useState([]);
  const [results,  setResults]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [searching,setSearching]= useState(false);
  const [error,    setError]    = useState(null);

  // Load all surahs once
  useEffect(() => {
    getAllSurahs()
      .then(data => { setSurahs(data); setResults(data); })
      .catch(() => setError('Gagal memuat data surah.'))
      .finally(() => setLoading(false));
  }, []);

  // When filter changes, reset list
  useEffect(() => {
    setQuery('');
    setInputVal('');
    if (filter === 'juz') setResults(JUZ_LIST);
    else                  setResults(surahs);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  // Filter surah list locally by name
  const filterSurahs = useCallback((q) => {
    if (!q.trim()) { setResults(surahs); return; }
    const low = q.toLowerCase();
    setResults(
      surahs.filter(s =>
        s.englishName.toLowerCase().includes(low) ||
        s.name.includes(q) ||
        String(s.number).includes(q)
      )
    );
  }, [surahs]);

  const handleSearch = async (e) => {
    e?.preventDefault();
    const q = inputVal.trim();
    setQuery(q);
    if (!q) {
      if (filter === 'juz') setResults(JUZ_LIST);
      else                  setResults(surahs);
      return;
    }
    if (filter === 'surah') { filterSurahs(q); return; }
    // Juz: filter by number
    const num = parseInt(q);
    setResults(!isNaN(num)
      ? JUZ_LIST.filter(j => j.number === num)
      : JUZ_LIST
    );
  };

  const goToMushaf = (item) => {
    if (filter === 'surah') navigate(`/mushaf?surah=${item.number}`);
    else                    navigate(`/mushaf?juz=${item.number}`);
  };

  return (
    <div className="container px-4 sm:px-6">
      {/* Hero */}
      <div className="relative text-center py-10 md:py-16 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent pointer-events-none" />
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text-heading tracking-tight mb-3 bg-gradient-to-br from-text-heading to-accent bg-clip-text text-transparent">
          Al-Quran Digital
        </h1>
        <p className="text-base sm:text-lg text-text-muted px-2">
          Baca, hafal, dan pelajari Al-Quran dengan mudah
        </p>
      </div>

      {/* Search + Filter Bar */}
      <div className="glass p-4 sm:p-6 mb-6 flex flex-col gap-4">
        {/* Search row */}
        <form className="flex gap-2.5 items-center" onSubmit={handleSearch} id="search-form">
          <div className="flex-1 relative">
            <svg 
              className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-text-muted pointer-events-none" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            <input
              id="search-input"
              type="text"
              inputMode="search"
              className="w-full pl-10 pr-4 py-3 bg-white/60 border border-border rounded-custom-sm text-text-heading text-base sm:text-sm outline-none placeholder:text-text-muted focus:border-border-glow focus:ring-3 focus:ring-accent/12 transition-all"
              placeholder={filter === 'surah' ? 'Cari surah…' : 'Cari nomor juz…'}
              value={inputVal}
              onChange={e => setInputVal(e.target.value)}
            />
          </div>
          <button 
            id="search-btn" 
            type="submit" 
            className="flex items-center gap-2 px-5 py-3 bg-gradient-to-br from-accent to-accent-2 border-none rounded-custom-sm text-white text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all whitespace-nowrap"
            disabled={searching}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" width="18" height="18">
              <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
            </svg>
            Cari
          </button>
        </form>

        {/* Filter toggle */}
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-text-muted font-medium">Tampilkan:</span>
          <div className="grid grid-cols-2 gap-2 w-full sm:flex sm:w-auto">
            <button
              id="filter-surah"
              type="button"
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-transparent border rounded-full text-sm font-medium transition-all active:scale-95 ${filter === 'surah'
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'border-border text-text-muted hover:text-text-heading hover:border-border-glow'
              }`}
              onClick={() => setFilter('surah')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
              </svg>
              <span className="truncate">Berdasarkan Surah</span>
            </button>
            <button
              id="filter-juz"
              type="button"
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 sm:py-2 bg-transparent border rounded-full text-sm font-medium transition-all active:scale-95 ${filter === 'juz'
                ? 'bg-accent/15 border-accent/40 text-accent'
                : 'border-border text-text-muted hover:text-text-heading hover:border-border-glow'
              }`}
              onClick={() => setFilter('juz')}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="15" height="15">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              <span className="truncate">Berdasarkan Juz</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      {!loading && !error && (
        <p className="text-sm text-text-muted mb-5">
          Menampilkan <strong className="text-accent">{results.length}</strong>{' '}
          {filter === 'surah' ? 'surah' : 'juz'}
          {query && ` untuk "${query}"`}
        </p>
      )}

      {/* List */}
      {loading && <div className="spinner" />}
      {error   && <div className="error-box">⚠ {error}</div>}
      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-3.5 pb-10">
          {results.length === 0 && (
            <p className="col-span-full text-center text-text-muted py-16">
              Tidak ada hasil.
            </p>
          )}

          {filter === 'surah' && results.map(s => (
            <button
              key={s.number}
              id={`surah-${s.number}`}
              className="glass flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left border border-border hover:border-accent/35 hover:shadow-card active:scale-[0.98] active:border-accent/45 transition-all cursor-pointer w-full"
              onClick={() => goToMushaf(s)}
            >
              <span className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 border border-accent/30 font-bold text-xs sm:text-sm text-accent">
                {s.number}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-text-heading mb-1 truncate">
                  {s.englishName}
                </h3>
                <p className="text-xs text-text-muted mb-2 line-clamp-1">
                  {s.englishNameTranslation}
                </p>
                <div className="flex gap-1.5 flex-wrap">
                <span className="badge bg-white/60 border border-border text-text-muted">{s.revelationType}</span>
                  <span className="badge badge-purple">{s.numberOfAyahs} ayat</span>
                </div>
              </div>
              <span className="font-arabic text-lg text-accent-gold flex-shrink-0">
                {s.name}
              </span>
            </button>
          ))}

          {filter === 'juz' && results.map(j => (
            <button
              key={j.number}
              id={`juz-${j.number}`}
              className="glass flex items-center gap-3 sm:gap-4 p-4 sm:p-5 text-left border border-border hover:border-accent/35 hover:shadow-card active:scale-[0.98] active:border-accent/45 transition-all cursor-pointer w-full"
              onClick={() => goToMushaf(j)}
            >
              <span className="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 border border-accent/30 font-bold text-xs sm:text-sm text-accent">
                {j.number}
              </span>
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-semibold text-text-heading mb-1">
                  Juz {j.number}
                </h3>
                <p className="text-xs text-text-muted mb-2">
                  Mulai Surah {JUZ_SURAH_START[j.number - 1]?.[0]} : {JUZ_SURAH_START[j.number - 1]?.[1]}
                </p>
                <div className="flex gap-1.5">
                  <span className="badge badge-gold">Juz {j.number}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Responsive styles */}
      <style jsx>{`
        @media (max-width: 640px) {
          #search-form {
            flex-direction: column;
          }
          #search-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
}