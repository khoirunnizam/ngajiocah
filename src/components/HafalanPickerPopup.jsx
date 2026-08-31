import PopupOverlay from './PopupOverlay';

// Popup pemilih surat & ayat awal untuk memulai (atau mengganti) sesi hafalan.
// Semua state (surah/ayah terpilih, error, loading) dikontrol dari parent (MushafPage)
// lewat props — komponen ini murni presentasional.
export default function HafalanPickerPopup({
  allSurahs,
  surah,
  ayah,
  maxAyah,
  error,
  loading,
  onSurahChange,
  onAyahChange,
  onCancel,
  onConfirm,
}) {
  return (
    <PopupOverlay onClose={onCancel}>
      <h3 className="text-base font-bold text-text-heading mb-4">Mulai Hafalan dari mana?</h3>

      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-heading">Surat</label>
          <select
            className="w-full px-4 py-3 bg-white/60 border border-border rounded-custom-sm text-text-heading text-sm outline-none focus:border-border-glow focus:ring-3 focus:ring-accent/12 transition-all"
            value={surah}
            onChange={(e) => onSurahChange(e.target.value)}
          >
            {allSurahs.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.englishName} ({s.name}) · {s.numberOfAyahs} ayat
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-semibold text-text-heading">Mulai dari ayat ke-</label>
          <input
            type="number"
            min={1}
            max={maxAyah}
            value={ayah}
            onChange={(e) => onAyahChange(e.target.value)}
            className="w-full px-4 py-3 bg-white/60 border border-border rounded-custom-sm text-text-heading text-sm outline-none focus:border-border-glow focus:ring-3 focus:ring-accent/12 transition-all"
          />
          <p className="text-xs text-text-muted">
            Defaultnya ayat pertama pada halaman mushaf yang sedang dibuka. Surat ini punya {maxAyah} ayat.
          </p>
        </div>

        {error && <div className="error-box">⚠ {error}</div>}

        <div className="flex gap-3 mt-1">
          <button
            className="flex-1 px-4 py-2.5 bg-white/60 border border-border rounded-custom-sm text-text-muted font-semibold text-sm hover:text-text-heading transition-all"
            onClick={onCancel}
          >
            Batal
          </button>
          <button
            className="flex-1 px-4 py-2.5 bg-gradient-to-br from-accent to-accent-2 border-none rounded-custom-sm text-white font-semibold text-sm hover:opacity-90 disabled:opacity-50 transition-all"
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? 'Memuat…' : 'Mulai Hafalan'}
          </button>
        </div>
      </div>
    </PopupOverlay>
  );
}