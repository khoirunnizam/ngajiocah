import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllSurahs, getSurah, EDITIONS } from '../services/quranApi';
import { compareRecitation } from '../utils/arabicCompare';

const MATCH_THRESHOLD = 0.75; // 75% kata cocok dianggap benar (toleransi speech-to-text)

export default function HafalanPage() {
  const navigate = useNavigate();

  /* ── Setup ── */
  const [surahs, setSurahs] = useState([]);
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [startAyah, setStartAyah] = useState(1);

  /* ── Sesi hafalan ── */
  const [stage, setStage] = useState('setup'); // 'setup' | 'session' | 'finished'
  const [surahMeta, setSurahMeta] = useState(null); // { name, englishName, ayahs: [...] }
  const [cursor, setCursor] = useState(0); // index ayat yang sedang disembunyikan (relatif ke surahMeta.ayahs)
  const [revealed, setRevealed] = useState([]); // ayat-ayat yang sudah benar & ditampilkan
  const [loadingSurah, setLoadingSurah] = useState(false);
  const [loadError, setLoadError] = useState(null);

  /* ── Voice ── */
  const [micState, setMicState] = useState('idle'); // 'idle' | 'listening' | 'checking'
  const [interimText, setInterimText] = useState('');
  const [micError, setMicError] = useState(null);
  const recognitionRef = useRef(null);
  const speechSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  /* ── Popup hasil salah ── */
  const [popup, setPopup] = useState(null); // { correctSteps, userSteps, score }

  useEffect(() => {
    getAllSurahs()
      .then(setSurahs)
      .catch(() => setLoadError('Gagal memuat daftar surah.'))
      .finally(() => setLoadingSurahs(false));
  }, []);

  useEffect(() => () => {
    recognitionRef.current?.stop?.();
  }, []);

  const currentSurahInfo = surahs.find(s => s.number === Number(selectedSurah));
  const maxAyah = currentSurahInfo?.numberOfAyahs ?? 999;

  /* ── Mulai sesi ── */
  const startSession = async () => {
    setLoadError(null);
    setLoadingSurah(true);
    try {
      const data = await getSurah(Number(selectedSurah), EDITIONS.ARABIC_UTHMANI);
      const clampedStart = Math.min(Math.max(1, Number(startAyah) || 1), data.ayahs.length);
      setSurahMeta(data);
      setCursor(clampedStart - 1);
      setRevealed([]);
      setStage('session');
    } catch {
      setLoadError('Gagal memuat surat. Coba lagi.');
    } finally {
      setLoadingSurah(false);
    }
  };

  const backToSetup = () => {
    recognitionRef.current?.stop?.();
    setMicState('idle');
    setInterimText('');
    setPopup(null);
    setStage('setup');
  };

  const currentAyah = surahMeta?.ayahs?.[cursor];

  /* ── Cek hasil ucapan vs ayat aktif ── */
  const evaluate = useCallback((recognizedText) => {
    if (!currentAyah) return;
    const result = compareRecitation(currentAyah.text, recognizedText, MATCH_THRESHOLD);

    if (result.isCorrect) {
      setRevealed(prev => [...prev, currentAyah]);
      setPopup(null);
      setInterimText('');
      const isLast = cursor >= surahMeta.ayahs.length - 1;
      if (isLast) {
        setStage('finished');
      } else {
        setCursor(c => c + 1);
      }
    } else {
      setPopup(result);
    }
  }, [currentAyah, cursor, surahMeta]);

  /* ── Kontrol mic ── */
  const startListening = () => {
    if (!speechSupported) {
      setMicError('Browser kamu belum mendukung rekam suara. Coba pakai Chrome/Edge terbaru.');
      return;
    }
    setMicError(null);
    setPopup(null);
    setInterimText('');

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'ar-SA';
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      let finalText = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText += t;
        else interim += t;
      }
      setInterimText(interim || finalText);
      if (finalText) {
        setMicState('checking');
        evaluate(finalText);
        setMicState('idle');
      }
    };

    recognition.onerror = (event) => {
      setMicState('idle');
      if (event.error === 'not-allowed' || event.error === 'permission-denied') {
        setMicError('Akses mikrofon ditolak. Izinkan akses mic di pengaturan browser.');
      } else if (event.error === 'no-speech') {
        setMicError('Tidak ada suara terdeteksi. Coba lagi.');
      } else {
        setMicError('Terjadi kesalahan saat merekam. Coba lagi.');
      }
    };

    recognition.onend = () => {
      setMicState(prev => (prev === 'listening' ? 'idle' : prev));
    };

    recognitionRef.current = recognition;
    setMicState('listening');
    recognition.start();
  };

  const stopListening = () => {
    recognitionRef.current?.stop?.();
    setMicState('idle');
  };

  const retrySameAyah = () => {
    setPopup(null);
    setInterimText('');
  };

  const skipRevealAnyway = () => {
    if (!currentAyah) return;
    setRevealed(prev => [...prev, currentAyah]);
    setPopup(null);
    setInterimText('');
    const isLast = cursor >= surahMeta.ayahs.length - 1;
    if (isLast) setStage('finished');
    else setCursor(c => c + 1);
  };

  const goToNextSurah = async () => {
    const nextNumber = Number(selectedSurah) + 1;
    if (nextNumber > 114) return;
    setSelectedSurah(nextNumber);
    setStartAyah(1);
    setLoadingSurah(true);
    try {
      const data = await getSurah(nextNumber, EDITIONS.ARABIC_UTHMANI);
      setSurahMeta(data);
      setCursor(0);
      setRevealed([]);
      setStage('session');
    } catch {
      setLoadError('Gagal memuat surat berikutnya.');
      setStage('setup');
    } finally {
      setLoadingSurah(false);
    }
  };

  /* ══════════════════════════ RENDER ══════════════════════════ */

  return (
    <div className="container px-4 sm:px-6 max-w-3xl mx-auto">
      {/* Toolbar */}
      <div className="glass flex items-center justify-between gap-3 flex-wrap my-6 p-4">
        <button
          id="hafalan-back-btn"
          className="flex items-center gap-2 px-4 py-2 bg-white/4 border border-border rounded-custom-sm text-text text-sm font-medium hover:border-border-glow hover:text-text-heading transition-all"
          onClick={() => (stage === 'setup' ? navigate(-1) : backToSetup())}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          {stage === 'setup' ? 'Kembali' : 'Ganti Surat/Ayat'}
        </button>
        <h1 className="text-lg font-bold text-text-heading">Mode Hafalan</h1>
      </div>

      {!speechSupported && (
        <div className="error-box mb-4">
          ⚠ Browser ini tidak mendukung rekam suara (Web Speech API). Gunakan Chrome/Edge di desktop atau Android untuk hasil terbaik.
        </div>
      )}

      {/* ── SETUP ── */}
      {stage === 'setup' && (
        <div className="glass p-5 sm:p-7 flex flex-col gap-5">
          {loadingSurahs && <div className="spinner" />}
          {loadError && <div className="error-box">⚠ {loadError}</div>}

          {!loadingSurahs && !loadError && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-heading">Mulai dari surat</label>
                <select
                  id="hafalan-surah-select"
                  className="w-full px-4 py-3 bg-white/60 border border-border rounded-custom-sm text-text-heading text-sm outline-none focus:border-border-glow focus:ring-3 focus:ring-accent/12 transition-all"
                  value={selectedSurah}
                  onChange={(e) => { setSelectedSurah(e.target.value); setStartAyah(1); }}
                >
                  {surahs.map(s => (
                    <option key={s.number} value={s.number}>
                      {s.number}. {s.englishName} ({s.name}) · {s.numberOfAyahs} ayat
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-heading">Mulai dari ayat ke-</label>
                <input
                  id="hafalan-ayah-input"
                  type="number"
                  min={1}
                  max={maxAyah}
                  value={startAyah}
                  onChange={(e) => setStartAyah(e.target.value)}
                  className="w-full px-4 py-3 bg-white/60 border border-border rounded-custom-sm text-text-heading text-sm outline-none focus:border-border-glow focus:ring-3 focus:ring-accent/12 transition-all"
                />
                <p className="text-xs text-text-muted">Surat ini punya {maxAyah} ayat.</p>
              </div>

              <button
                id="hafalan-start-btn"
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-br from-accent to-accent-2 border-none rounded-custom-sm text-white text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 transition-all"
                onClick={startSession}
                disabled={loadingSurah}
              >
                {loadingSurah ? 'Memuat…' : 'Mulai Hafalan'}
              </button>
            </>
          )}
        </div>
      )}

      {/* ── SESI HAFALAN ── */}
      {stage === 'session' && surahMeta && (
        <div className="flex flex-col gap-5 pb-16">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span className="font-arabic text-lg text-accent-gold font-semibold">
              {surahMeta.name} — {surahMeta.englishName}
            </span>
            <span className="text-sm font-semibold text-accent">
              Ayat {currentAyah?.numberInSurah} dari {surahMeta.ayahs.length}
            </span>
          </div>

          {/* Ayat-ayat yang sudah benar (terungkap) */}
          {revealed.length > 0 && (
            <div className="hafalan-reveal-box p-5 sm:p-7" dir="rtl">
              {revealed.map(a => (
                <span key={a.number} className="ayah-run font-arabic">
                  {a.text}
                  <span className="ayah-badge">{toArabicNumeral(a.numberInSurah)}</span>
                </span>
              ))}
            </div>
          )}

          {/* Ayat aktif yang disembunyikan */}
          <div className="hafalan-hidden-box p-6 sm:p-8 flex flex-col items-center gap-4 text-center">
            <div className="flex items-center gap-2 text-text-muted text-sm">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              Ayat {currentAyah?.numberInSurah} tersembunyi — baca dari hafalanmu
            </div>

            <button
              id="hafalan-mic-btn"
              onClick={micState === 'listening' ? stopListening : startListening}
              disabled={!speechSupported || micState === 'checking'}
              className={`mic-btn ${micState === 'listening' ? 'mic-btn-active' : ''}`}
              title={micState === 'listening' ? 'Berhenti merekam' : 'Mulai merekam'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
                <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>
              </svg>
            </button>

            <p className="text-xs text-text-muted min-h-[1rem]">
              {micState === 'listening' && 'Mendengarkan… ucapkan ayatnya'}
              {micState === 'checking' && 'Memeriksa bacaan…'}
              {micState === 'idle' && !micError && 'Tekan mic lalu baca ayat berikutnya'}
            </p>

            {interimText && micState === 'listening' && (
              <p className="font-arabic text-base text-text-muted italic" dir="rtl">{interimText}</p>
            )}

            {micError && <p className="text-xs text-red-600">⚠ {micError}</p>}
          </div>
        </div>
      )}

      {/* ── SELESAI SATU SURAT ── */}
      {stage === 'finished' && surahMeta && (
        <div className="glass p-7 flex flex-col items-center gap-4 text-center">
          <span className="text-2xl">🎉</span>
          <h2 className="text-lg font-bold text-text-heading">
            Selesai! Kamu berhasil menghafal {surahMeta.englishName} sampai ayat terakhir.
          </h2>
          <div className="flex flex-wrap gap-3 justify-center mt-2">
            <button
              className="px-5 py-2.5 bg-accent/10 border border-accent/25 rounded-custom-sm text-accent font-semibold text-sm hover:bg-accent/20 transition-all"
              onClick={backToSetup}
            >
              Pilih Surat Lain
            </button>
            {Number(selectedSurah) < 114 && (
              <button
                className="px-5 py-2.5 bg-gradient-to-br from-accent to-accent-2 border-none rounded-custom-sm text-white font-semibold text-sm hover:opacity-90 transition-all"
                onClick={goToNextSurah}
              >
                Lanjut ke Surat Berikutnya
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── POPUP HASIL SALAH ── */}
      {popup && (
        <div className="hafalan-popup-overlay" onClick={retrySameAyah}>
          <div className="hafalan-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">✗</span>
              <h3 className="text-base font-bold text-text-heading">Belum tepat, coba lagi</h3>
            </div>

            <div className="flex flex-col gap-4">
              <div>
                <p className="text-xs font-semibold text-text-muted mb-2">Ayat yang benar:</p>
                <p className="font-arabic text-lg leading-relaxed" dir="rtl">
                  {popup.correctSteps.map((s, i) => (
                    <span key={i} className={s.ok ? '' : 'diff-wrong'}> {s.word}</span>
                  ))}
                </p>
              </div>

              <div className="h-px bg-border" />

              <div>
                <p className="text-xs font-semibold text-text-muted mb-2">Bacaan kamu (hasil pengenalan suara):</p>
                {popup.userSteps.length > 0 ? (
                  <p className="font-arabic text-lg leading-relaxed" dir="rtl">
                    {popup.userSteps.map((s, i) => (
                      <span key={i} className={s.ok ? '' : 'diff-wrong'}> {s.word}</span>
                    ))}
                  </p>
                ) : (
                  <p className="text-sm text-text-muted italic">Tidak ada suara terdeteksi.</p>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                className="flex-1 px-4 py-2.5 bg-accent/10 border border-accent/25 rounded-custom-sm text-accent font-semibold text-sm hover:bg-accent/20 transition-all"
                onClick={retrySameAyah}
              >
                Coba Lagi
              </button>
              <button
                className="flex-1 px-4 py-2.5 bg-white/60 border border-border rounded-custom-sm text-text-muted font-semibold text-sm hover:text-text-heading transition-all"
                onClick={skipRevealAnyway}
              >
                Lewati & Tampilkan
              </button>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .hafalan-reveal-box {
          text-align: justify;
          text-align-last: right;
          background: #f7f3ea;
          border: 1px solid rgba(169, 119, 47, 0.25);
          border-radius: 14px;
        }
        .hafalan-hidden-box {
          background: repeating-linear-gradient(
            135deg, rgba(169,119,47,0.05) 0px, rgba(169,119,47,0.05) 10px,
            transparent 10px, transparent 20px
          ), #faf7ef;
          border: 1.5px dashed rgba(169, 119, 47, 0.4);
          border-radius: 14px;
        }
        .ayah-run {
          font-size: 1.4rem;
          line-height: 2.2;
          color: #2e2718;
        }
        .ayah-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.7rem;
          height: 1.7rem;
          margin: 0 0.3rem;
          font-size: 0.8rem;
          font-family: sans-serif;
          color: #a9772f;
          border: 1.5px solid rgba(169, 119, 47, 0.45);
          border-radius: 50%;
          vertical-align: 0.05em;
          background: rgba(169, 119, 47, 0.06);
        }
        .mic-btn {
          width: 68px;
          height: 68px;
          border-radius: 50%;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(to bottom right, #a9772f, #8a7ab5);
          color: white;
          cursor: pointer;
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          box-shadow: 0 4px 16px rgba(169,119,47,0.35);
        }
        .mic-btn:active { transform: scale(0.94); }
        .mic-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .mic-btn-active {
          animation: mic-pulse 1.4s ease-in-out infinite;
        }
        @keyframes mic-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(169,119,47,0.45); }
          70%  { box-shadow: 0 0 0 16px rgba(169,119,47,0); }
          100% { box-shadow: 0 0 0 0 rgba(169,119,47,0); }
        }
        .hafalan-popup-overlay {
          position: fixed;
          inset: 0;
          background: rgba(36, 31, 24, 0.55);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          z-index: 50;
        }
        .hafalan-popup-card {
          background: #fffdf8;
          border-radius: 16px;
          padding: 1.75rem;
          max-width: 480px;
          width: 100%;
          max-height: 85vh;
          overflow-y: auto;
          box-shadow: 0 24px 60px rgba(0,0,0,0.3);
        }
        .diff-wrong {
          color: #b02e2e;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-color: rgba(176,46,46,0.4);
          text-underline-offset: 3px;
        }
      `}</style>
    </div>
  );
}

function toArabicNumeral(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}