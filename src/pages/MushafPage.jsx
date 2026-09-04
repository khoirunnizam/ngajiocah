import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getSurah, getJuz, getAllSurahs, getPage, EDITIONS } from '../services/quranApi';
import { normalizeArabic, normalizeMuqattaahInText, isMuqattaahWordMatch, getTranscriptDelta } from '../utils/arabicCompare';
import HafalanPickerPopup from '../components/HafalanPickerPopup';
import WrongAnswerPopup from '../components/WrongAnswerPopup';

const MUSHAF_TOTAL_PAGES = 604; // total halaman standar mushaf Madinah

// ── Konstanta pencocokan per-kata ──
const WORD_SIMILARITY_THRESHOLD = 0.8; // toleransi kemiripan kata (typo tipis dari STT)
const WRONG_STREAK_LIMIT = 1;          // jumlah kata salah berturut sebelum popup koreksi muncul
// Catatan: toleransi pengulangan kata (waqaf/napas/kebiasaan mengulang) DIBATASI
// maksimal 1 ayat — hanya kata yang sudah terinput pada ayat yang SEDANG berjalan
// yang boleh diulang. Lihat evaluateBuffer().

// ── Util kemiripan kata (Levenshtein) — toleransi typo tipis hasil speech-to-text ──
function levenshtein(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[a.length][b.length];
}

function wordsMatch(a, b) {
  if (a === b) return true;
  if (!a || !b) return false;
  if (isMuqattaahWordMatch(a, b)) return true;
  const normA = normalizeMuqattaahInText(a);
  const normB = normalizeMuqattaahInText(b);
  if (normA && normB && normA === normB) return true;
  const dist = levenshtein(normA, normB);
  return 1 - dist / Math.max(normA.length, normB.length, 1) >= WORD_SIMILARITY_THRESHOLD;
}

// Lafad bismillah TIDAK dianggap bagian dari ayat 1 pada surat manapun, KECUALI
// Al-Fatihah (di sana bismillah memang ayat 1 itu sendiri). Beberapa edisi API
// menaruh bismillah menyatu di depan teks ayat 1 — fungsi ini memotongnya supaya
// ayat 1 selalu tampil (dan dicocokkan di mode hafalan) TANPA bismillah, karena
// bismillah sudah punya baris tampilannya sendiri (lihat item type 'bismillah').
const NORMALIZED_BISMILLAH = normalizeArabic('بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ');
const BISMILLAH_WORD_COUNT = NORMALIZED_BISMILLAH.split(' ').filter(Boolean).length;

function stripLeadingBismillah(rawText) {
  if (normalizeArabic(rawText).startsWith(NORMALIZED_BISMILLAH)) {
    const words = rawText.trim().split(/\s+/).filter(Boolean);
    return words.slice(BISMILLAH_WORD_COUNT).join(' ');
  }
  return rawText;
}

// Teks ayat yang SEHARUSNYA ditampilkan/dicocokkan: sama dengan ayah.text, kecuali
// untuk ayat 1 pada surat selain Al-Fatihah (nomor 1) — di situ bismillah yang
// menyatu di depan teks dibuang duluan.
function getAyahDisplayText(ayah) {
  const isFirstAyahOfNonFatihah = ayah.numberInSurah === 1 && ayah.surah && ayah.surah.number !== 1;
  return isFirstAyahOfNonFatihah ? stripLeadingBismillah(ayah.text) : ayah.text;
}

// Bangun tampilan koreksi: kata yang sudah benar tetap ditandai ok,
// sisanya (mulai dari kursor) ditandai target vs kata yang salah diucapkan.
function buildWrongResult(targetWords, cursor, wrongSpokenWords) {
  const correctSteps = targetWords.map((w, i) => ({ word: w, ok: i < cursor }));
  const userSteps = wrongSpokenWords.map(w => ({ word: w, ok: false }));
  return { correctSteps, userSteps };
}

export default function MushafPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const surahParam     = searchParams.get('surah');
  const juzParam       = searchParams.get('juz');

  const [pageRange,   setPageRange]   = useState(null); // { start, end } — dipakai untuk dot cepat & label awal
  const [pageNum,     setPageNum]     = useState(null);  // nomor halaman mushaf absolut yang sedang aktif (1..604)
  const [pageData,    setPageData]    = useState(null);  // data halaman mushaf saat ini
  const [loading,     setLoading]     = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [error,       setError]       = useState(null);
  const [label,       setLabel]       = useState('');
  const bookRef = useRef(null);

  /* ══════════════════════ MODE HAFALAN (menyatu di halaman ini) ══════════════════════ */
  const [allSurahs, setAllSurahs] = useState([]);

  // popup pemilih surat/ayat awal hafalan
  const [showHafalanPopup, setShowHafalanPopup] = useState(false);
  const [popupSurah,  setPopupSurah]  = useState(1);
  const [popupAyah,   setPopupAyah]   = useState(1);
  const [popupLoading, setPopupLoading] = useState(false);
  const [popupError,  setPopupError]  = useState(null);

  // status sesi hafalan aktif
  const [hafalanActive, setHafalanActive] = useState(false);
  const [hafalanCursor, setHafalanCursor] = useState(null); // nomor ayat GLOBAL (1..6236) berikutnya yang wajib dibaca
  const [revealedAyat,  setRevealedAyat]  = useState(() => new Set()); // ayat global yang sudah lolos ucap & ditampilkan

  // Jumlah kata yang sudah terucap benar pada ayat target SAAT INI (untuk reveal kata-per-kata
  // yang tampil langsung/live di mushaf, bukan cuma kelihatan setelah satu ayat penuh selesai).
  const [targetWordCursor, setTargetWordCursor] = useState(0);

  // mic / speech recognition
  const [micState, setMicState]       = useState('idle'); // 'idle' | 'listening' — mode dengar terus, lintas ayat
  const [interimText, setInterimText] = useState('');
  const [micError, setMicError]       = useState(null);
  const [wrongPopup, setWrongPopup]   = useState(null); // { correctSteps, userSteps }
  const recognitionRef   = useRef(null);
  const manualStopRef    = useRef(true);  // true = user memang minta berhenti (jangan auto-restart)
  const spokenWordsRef   = useRef([]);    // kata-kata (sudah dinormalisasi) yang menunggu dicocokkan ke ayat aktif
  const targetAyahRef    = useRef(null);  // ref ke ayat target terkini, supaya callback recognition selalu lihat data terbaru
  const wordCursorRef    = useRef(0);     // indeks kata FINAL berikutnya yang diharapkan pada ayat target (0-based)
  const wrongStreakRef   = useRef(0);     // hitungan kata salah berturut-turut
  const sessionFinalTextRef = useRef(''); // akumulasi teks final sesi berjalan untuk ekstraksi delta (anti-duplikasi di HP)
  const wakeLockRef      = useRef(null);  // menjaga layar HP tetap hidup saat merekam hafalan

  // Ref kursor hafalan yang selalu terbaru (dibaca & DIUPDATE sinkron di dalam evaluateBuffer),
  // supaya pencocokan bisa lanjut lintas ayat dalam satu pemanggilan yang sama walau user
  // membaca menyambung tanpa waqaf/jeda di ujung ayat.
  const hafalanCursorRef = useRef(null);
  useEffect(() => { hafalanCursorRef.current = hafalanCursor; }, [hafalanCursor]);

  // Cache ayat lintas halaman: terkumpul dari setiap halaman yang pernah dimuat,
  // supaya evaluateBuffer bisa langsung lanjut ke ayat berikutnya meski ayat itu
  // sudah pernah ada di halaman sebelumnya (atau halaman saat ini) tanpa fetch ulang.
  // Juga dipakai untuk mengecek kata-kata terakhir AYAT SEBELUMNYA saat mendeteksi
  // pengulangan yang terjadi tepat di perbatasan dua ayat.
  const ayahCacheRef = useRef(new Map());
  useEffect(() => {
    if (!pageData?.ayahs) return;
    pageData.ayahs.forEach(a => ayahCacheRef.current.set(a.number, a));
  }, [pageData]);
  const speechSupported = typeof window !== 'undefined' &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  // Web Speech API (dan getUserMedia) hanya berjalan di secure context: https://
  // atau host bernama persis "localhost"/"127.0.0.1". Akses lewat IP jaringan
  // lokal (mis. 192.168.x.x) lewat http:// dianggap TIDAK aman oleh browser,
  // sehingga popup izin mic tidak pernah muncul dan mic langsung gagal.
  const isSecureContextForMic = typeof window !== 'undefined' &&
    (window.isSecureContext ?? (
      window.location.protocol === 'https:' ||
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1'
    ));

  useEffect(() => {
    getAllSurahs().then(setAllSurahs).catch(() => {});
  }, []);

  useEffect(() => () => {
    manualStopRef.current = true;
    recognitionRef.current?.stop?.();
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  /* ── Tahap 1: tentukan rentang halaman mushaf dari surat/juz yang dipilih ── */
  useEffect(() => {
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    setError(null);
    setPageNum(null);
    setPageData(null);

    const resolveRange = async () => {
      try {
        let ayahs = [];

        if (surahParam) {
          const data = await getSurah(Number(surahParam), EDITIONS.ARABIC_UTHMANI);
          if (cancelled) return;
          setLabel(`${data.name} — ${data.englishName}`);
          ayahs = data.ayahs;
        } else if (juzParam) {
          const data = await getJuz(Number(juzParam), EDITIONS.ARABIC_UTHMANI);
          if (cancelled) return;
          setLabel(`Juz ${juzParam}`);
          ayahs = data.ayahs;
        } else {
          const data = await getSurah(1, EDITIONS.ARABIC_UTHMANI);
          if (cancelled) return;
          setLabel(`${data.name} — ${data.englishName}`);
          ayahs = data.ayahs;
        }

        const pageNums = ayahs.map(a => a.page).filter(Boolean);
        const start = Math.min(...pageNums);
        const end   = Math.max(...pageNums);
        if (!cancelled) {
          setPageRange({ start, end });
          setPageNum(start);
        }
      } catch {
        if (!cancelled) setError('Gagal memuat data. Coba lagi.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    resolveRange();
    return () => { cancelled = true; };
  }, [surahParam, juzParam]);

  /* ── Tahap 2: fetch halaman mushaf yang sedang aktif (lengkap, lintas surat) ── */
  const currentPageNum = pageNum;

  useEffect(() => {
    if (!currentPageNum) return;
    let cancelled = false;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPageLoading(true);

    getPage(currentPageNum)
      .then(data => { if (!cancelled) setPageData(data); })
      .catch(() => { if (!cancelled) setError('Gagal memuat halaman. Coba lagi.'); })
      .finally(() => { if (!cancelled) setPageLoading(false); });

    return () => { cancelled = true; };
  }, [currentPageNum]);

  /* ── Navigasi (lintas surah/juz, dibatasi cuma di halaman 1 dan 604) ───── */
  const scrollToBook = () => bookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  const prevPage = useCallback(() => {
    setPageNum(p => Math.max(1, (p ?? 1) - 1));
    scrollToBook();
  }, []);
  const nextPage = useCallback(() => {
    setPageNum(p => Math.min(MUSHAF_TOTAL_PAGES, (p ?? MUSHAF_TOTAL_PAGES) + 1));
    scrollToBook();
  }, []);
  const goToPage = (p) => { setPageNum(p); scrollToBook(); };

  useEffect(() => {
    const h = (e) => {
      if (e.key === 'ArrowRight') nextPage();
      if (e.key === 'ArrowLeft')  prevPage();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [nextPage, prevPage]);

  /* ══════════════════════ Logika popup pemilih ayat hafalan ══════════════════════ */

  // Ayat pertama yang tampak di halaman mushaf saat ini → default popup
  const firstAyahOnPage = pageData?.ayahs?.[0] ?? null;

  const openHafalanPopup = () => {
    setPopupSurah(firstAyahOnPage?.surah?.number ?? 1);
    setPopupAyah(firstAyahOnPage?.numberInSurah ?? 1);
    setPopupError(null);
    setShowHafalanPopup(true);
  };

  const popupSurahInfo = allSurahs.find(s => s.number === Number(popupSurah));
  const popupMaxAyah   = popupSurahInfo?.numberOfAyahs ?? 999;

  const confirmHafalanStart = async () => {
    setPopupLoading(true);
    setPopupError(null);
    try {
      const data = await getSurah(Number(popupSurah), EDITIONS.ARABIC_UTHMANI);
      const target = data.ayahs.find(a => a.numberInSurah === Number(popupAyah));
      if (!target) throw new Error('Ayat tidak ditemukan');

      spokenWordsRef.current = []; // reset buffer kata untuk sesi baru
      wordCursorRef.current = 0;
      wrongStreakRef.current = 0;
      sessionFinalTextRef.current = '';
      setTargetWordCursor(0);
      setRevealedAyat(new Set());
      hafalanCursorRef.current = target.number; // nomor ayat global (ref dibaca segera oleh evaluateBuffer)
      setHafalanCursor(target.number);
      setHafalanActive(true);
      setShowHafalanPopup(false);
      setWrongPopup(null);
      setInterimText('');
      setMicError(null);

      if (target.page !== pageNum) {
        setPageNum(target.page);
      }
      scrollToBook();
    } catch {
      setPopupError('Gagal memuat ayat. Coba lagi.');
    } finally {
      setPopupLoading(false);
    }
  };

  const exitHafalan = () => {
    manualStopRef.current = true;
    cleanupRecognition();
    setHafalanActive(false);
    hafalanCursorRef.current = null;
    setHafalanCursor(null);
    setRevealedAyat(new Set());
    setMicState('idle');
    setInterimText('');
    setMicError(null);
    setWrongPopup(null);
    spokenWordsRef.current = [];
    wordCursorRef.current = 0;
    wrongStreakRef.current = 0;
    sessionFinalTextRef.current = '';
    setTargetWordCursor(0);
  };

  /* ── Ayat target: ayat pertama yang BELUM diucapkan dengan benar, dan ada di halaman ini ── */
  const targetAyah = (hafalanActive && pageData)
    ? pageData.ayahs.find(a => a.number === hafalanCursor)
    : null;

  // Callback recognition dibuat sekali lalu jalan terus lintas ayat (continuous),
  // jadi closure-nya tidak ikut ter-refresh tiap render — ambil data ayat terbaru lewat ref ini.
  useEffect(() => { targetAyahRef.current = targetAyah; }, [targetAyah]);

  const isHiddenAyah = (ayah) =>
    hafalanActive && hafalanCursor != null &&
    ayah.number >= hafalanCursor && !revealedAyat.has(ayah.number);

  /* ── Auto-lanjut halaman kalau ayat hafalan berikutnya sudah tidak ada di halaman ini ── */
  useEffect(() => {
    if (!hafalanActive || pageLoading || !pageData || hafalanCursor == null) return;
    if (micState !== 'listening') return;
    const stillOnThisPage = pageData.ayahs.some(a => a.number === hafalanCursor);
    if (!stillOnThisPage) {
      setPageNum(p => Math.min(MUSHAF_TOTAL_PAGES, (p ?? 1) + 1));
    }
  }, [hafalanActive, hafalanCursor, pageData, pageLoading, micState]);

  /* ── Preview OPTIMISTIS dari hasil INTERIM (belum final) ── */
  const previewOptimisticReveal = useCallback((interimRaw) => {
    const cursorAyahNumber = hafalanCursorRef.current;
    if (cursorAyahNumber == null) return;
    const ayah = ayahCacheRef.current.get(cursorAyahNumber);
    if (!ayah) return;

    const targetWords = normalizeMuqattaahInText(getAyahDisplayText(ayah)).split(' ').filter(Boolean);
    const interimWords = normalizeMuqattaahInText(interimRaw).split(' ').filter(Boolean);
    if (interimWords.length === 0) return;

    let startIndex = 0;
    if (interimWords.length > wordCursorRef.current && wordsMatch(interimWords[0], targetWords[0])) {
      startIndex = wordCursorRef.current;
    }

    let previewCursor = wordCursorRef.current;
    for (let i = startIndex; i < interimWords.length; i++) {
      const w = interimWords[i];
      if (previewCursor < targetWords.length && wordsMatch(w, targetWords[previewCursor])) {
        previewCursor += 1;
      } else {
        break;
      }
    }
    if (previewCursor > wordCursorRef.current) {
      setTargetWordCursor(previewCursor);
    }
  }, []);

  /* ── Pencocokan PER-KATA terhadap ayat target dari hasil FINAL ── */
  const evaluateBuffer = useCallback(() => {
    setTargetWordCursor(wordCursorRef.current);

    while (spokenWordsRef.current.length > 0) {
      const cursorAyahNumber = hafalanCursorRef.current;
      if (cursorAyahNumber == null) return;

      const ayah = ayahCacheRef.current.get(cursorAyahNumber);
      if (!ayah) return;

      const targetWords = normalizeMuqattaahInText(getAyahDisplayText(ayah)).split(' ').filter(Boolean);
      if (targetWords.length === 0) { spokenWordsRef.current.shift(); continue; }

      const word = spokenWordsRef.current[0];
      const cursor = wordCursorRef.current;

      // 1) Cocok dengan kata yang diharapkan berikutnya → maju
      if (cursor < targetWords.length && wordsMatch(word, targetWords[cursor])) {
        spokenWordsRef.current.shift();
        wordCursorRef.current += 1;
        wrongStreakRef.current = 0;
        setTargetWordCursor(wordCursorRef.current);

        if (wordCursorRef.current >= targetWords.length) {
          setRevealedAyat(prev => new Set(prev).add(ayah.number));
          setWrongPopup(null);
          wordCursorRef.current = 0;
          wrongStreakRef.current = 0;

          if (ayah.number >= 6236) {
            setHafalanActive(false);
            hafalanCursorRef.current = null;
            setHafalanCursor(null);
            setTargetWordCursor(0);
            return;
          }
          hafalanCursorRef.current = ayah.number + 1;
          setHafalanCursor(ayah.number + 1);
          setTargetWordCursor(0);
        }
        continue;
      }

      // 2) Cocok dengan kata yang sudah terinput pada ayat yang sedang berjalan (waqaf/pengulangan)
      const isRepeatOfAlreadySpoken = targetWords
        .slice(0, cursor)
        .some(w => wordsMatch(word, w));

      if (isRepeatOfAlreadySpoken) {
        spokenWordsRef.current.shift();
        continue;
      }

      // 3) Bukan lanjutan, bukan pengulangan → salah
      wrongStreakRef.current += 1;
      if (wrongStreakRef.current >= WRONG_STREAK_LIMIT) {
        setWrongPopup(buildWrongResult(targetWords, cursor, spokenWordsRef.current));
        return;
      }
      spokenWordsRef.current.shift();
    }
  }, []);

  const restartTimerRef  = useRef(null);
  const wrongPopupRef    = useRef(null);
  useEffect(() => { wrongPopupRef.current = wrongPopup; }, [wrongPopup]);
  const hafalanActiveRef = useRef(false);
  useEffect(() => { hafalanActiveRef.current = hafalanActive; }, [hafalanActive]);

  const cleanupRecognition = useCallback(() => {
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    const rec = recognitionRef.current;
    if (rec) {
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try { rec.abort?.(); } catch {}
      try { rec.stop?.(); } catch {}
      recognitionRef.current = null;
    }
    sessionFinalTextRef.current = '';
    if (wakeLockRef.current) {
      try { wakeLockRef.current.release(); } catch {}
      wakeLockRef.current = null;
    }
  }, []);

  const createAndStartRecognition = useCallback(() => {
    if (manualStopRef.current || !hafalanActiveRef.current) {
      setMicState('idle');
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicError('Speech Recognition tidak tersedia di browser ini.');
      setMicState('idle');
      manualStopRef.current = true;
      return;
    }

    cleanupRecognition();

    // Minta wakeLock di HP agar layar tidak mati saat menghafal
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      navigator.wakeLock.request('screen').then(wl => { wakeLockRef.current = wl; }).catch(() => {});
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = 'ar-SA';
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        if (wrongPopupRef.current) return;

        let fullSessionFinal = '';
        let interim = '';

        for (let i = 0; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result || !result[0]) continue;
          const t = result[0].transcript || '';

          if (result.isFinal) {
            fullSessionFinal += ' ' + t;
          } else {
            interim += t;
          }
        }

        fullSessionFinal = fullSessionFinal.trim();
        setInterimText(interim);

        if (interim.trim()) {
          previewOptimisticReveal(interim);
        }

        // Ekstraksi delta cerdas: hanya ambil kata baru, tidak mengulang kata lama (anti-duplikasi HP)
        if (fullSessionFinal) {
          const delta = getTranscriptDelta(sessionFinalTextRef.current, fullSessionFinal);
          sessionFinalTextRef.current = fullSessionFinal;

          if (delta.trim()) {
            const hasLatinChars = /[a-zA-Z]/.test(delta);
            const normalizedDelta = normalizeMuqattaahInText(delta);
            const newWords = normalizedDelta.split(' ').filter(Boolean);

            if (newWords.length === 0 && hasLatinChars) {
              setMicError('Mic mendeteksi karakter non-Arab. Pastikan pelafalan jelas dan bahasa mikrofon berbahasa Arab.');
            } else if (newWords.length > 0) {
              setMicError(null);
              spokenWordsRef.current = [...spokenWordsRef.current, ...newWords];
              evaluateBuffer();
            }
          }
        }
      };

      recognition.onerror = (event) => {
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          manualStopRef.current = true;
          setMicState('idle');
          setMicError(
            isSecureContextForMic
              ? 'Akses mikrofon ditolak. Klik ikon gembok/setelan izin mikrofon di bilah alamat browser untuk mengizinkan.'
              : 'Akses mikrofon diblokir otomatis karena halaman ini dibuka lewat koneksi tidak aman (bukan HTTPS/localhost).'
          );
        } else if (event.error === 'network') {
          setMicError('Koneksi internet untuk pengenalan suara terganggu. Periksa sambungan internet.');
        } else if (event.error === 'audio-capture') {
          manualStopRef.current = true;
          setMicState('idle');
          setMicError('Mikrofon tidak terdeteksi pada perangkat Anda.');
        } else if (event.error !== 'no-speech' && event.error !== 'aborted') {
          // Jangan tampilkan error mengganggu saat no-speech / aborted biasa di HP
        }
      };

      recognition.onend = () => {
        sessionFinalTextRef.current = '';
        if (!manualStopRef.current && hafalanActiveRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (!manualStopRef.current && hafalanActiveRef.current) {
              createAndStartRecognition();
            }
          }, 300);
        } else {
          setMicState('idle');
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setMicState('listening');
    } catch {
      if (!manualStopRef.current && hafalanActiveRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (!manualStopRef.current && hafalanActiveRef.current) {
            createAndStartRecognition();
          }
        }, 350);
      } else {
        setMicState('idle');
      }
    }
  }, [cleanupRecognition, evaluateBuffer, isSecureContextForMic, previewOptimisticReveal]);

  const startListening = () => {
    if (!speechSupported) {
      setMicError('Browser kamu belum mendukung rekam suara. Coba pakai Google Chrome atau Microsoft Edge terbaru.');
      return;
    }
    if (!isSecureContextForMic) {
      setMicError('Akses mic butuh koneksi aman (HTTPS) atau alamat "localhost". Membuka lewat IP jaringan lokal (http://192.168.x.x) diblokir browser.');
      return;
    }
    setMicError(null);
    setWrongPopup(null);
    setInterimText('');
    spokenWordsRef.current = [];
    wordCursorRef.current = 0;
    wrongStreakRef.current = 0;
    sessionFinalTextRef.current = '';
    setTargetWordCursor(0);
    manualStopRef.current = false;
    createAndStartRecognition();
  };

  const stopListening = () => {
    manualStopRef.current = true;
    cleanupRecognition();
    setMicState('idle');
  };

  const retrySameAyah = () => {
    spokenWordsRef.current = [];
    wordCursorRef.current = 0;
    wrongStreakRef.current = 0;
    sessionFinalTextRef.current = '';
    setTargetWordCursor(0);
    setWrongPopup(null);
    setInterimText('');
    setMicError(null);
    if (manualStopRef.current) {
      startListening();
    }
  };

  const skipRevealAnyway = () => {
    const target = targetAyahRef.current;
    if (!target) return;
    spokenWordsRef.current = [];
    wordCursorRef.current = 0;
    wrongStreakRef.current = 0;
    setTargetWordCursor(0);
    setRevealedAyat(prev => new Set(prev).add(target.number));
    setWrongPopup(null);
    setInterimText('');
    if (target.number >= 6236) {
      setHafalanActive(false);
      hafalanCursorRef.current = null;
      setHafalanCursor(null);
    } else {
      hafalanCursorRef.current = target.number + 1;
      setHafalanCursor(target.number + 1);
    }
    if (manualStopRef.current) {
      startListening();
    }
  };

  /* ── Susun render list: header + bismillah muncul persis di posisi ayat 1.
     Baris bismillah SELALU ditampilkan untuk surat yang butuh (selain Al-Fatihah &
     At-Taubah) — tidak lagi bergantung pada isi teks ayat 1, karena getAyahDisplayText
     sudah memotong bismillah dari teks ayat 1 itu sendiri (lihat definisinya di atas). ── */
  const renderItems = [];
  (pageData?.ayahs ?? []).forEach(ayah => {
    if (ayah.numberInSurah === 1 && ayah.surah) {
      renderItems.push({ type: 'header', surah: ayah.surah });
      if (needsBismillah(ayah.surah.number)) {
        renderItems.push({ type: 'bismillah', surahNumber: ayah.surah.number });
      }
    }
    renderItems.push({ type: 'ayah', ayah });
  });

  const showBook = !loading && !error && pageRange && pageNum;
  const dominantSurahName = pageData?.surahs && Object.values(pageData.surahs)[0]?.name;

  // Semua ayat di halaman ini sudah lolos/terlihat, tapi hafalan masih aktif → ayat berikutnya ada di halaman lain
  const targetOnOtherPage = hafalanActive && !pageLoading && !targetAyah && hafalanCursor != null;

  return (
    <div className="container">
      {/* ── Toolbar ── */}
      <div className="glass flex items-center justify-between gap-3 flex-wrap mb-7 p-4">
        <button
          id="back-btn"
          className="flex items-center gap-2 px-4 py-2 bg-white/4 border border-border rounded-custom-sm text-text text-sm font-medium hover:border-border-glow hover:text-text-heading transition-all"
          onClick={() => navigate(-1)}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M19 12H5M12 19l-7-7 7-7"/>
          </svg>
          Kembali
        </button>

        <span className="font-arabic text-lg text-accent-gold font-semibold">{label}</span>

        <span className="text-sm font-semibold text-accent">
          {currentPageNum && `Hal. ${currentPageNum}`}
        </span>

        {!hafalanActive ? (
          <button
            onClick={openHafalanPopup}
            className="px-5 py-2.5 bg-gradient-to-br from-accent to-accent-2 rounded-custom-sm text-white text-sm font-semibold hover:opacity-90 transition-all"
          >
            Mode Hafalan
          </button>
        ) : (
          <div className="flex gap-2">
            <button
              onClick={openHafalanPopup}
              className="px-4 py-2.5 bg-accent/10 border border-accent/25 rounded-custom-sm text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
            >
              Ganti Ayat
            </button>
            <button
              onClick={exitHafalan}
              className="px-4 py-2.5 bg-white/60 border border-border rounded-custom-sm text-text-muted text-sm font-semibold hover:text-text-heading transition-all"
            >
              Keluar Hafalan
            </button>
          </div>
        )}
      </div>

      {loading && <div className="spinner" />}
      {error   && <div className="error-box">⚠ {error}</div>}

      {showBook && (
        <>
          {/* ── Book (ornate frame) ── */}
          <div ref={bookRef} className="mushaf-frame-wrap max-w-3xl mx-auto mb-8" id="mushaf-book">
            <div className="page-medallion">{toArabicNumeral(currentPageNum)}</div>

            <div className="frame-outer">
              <CornerOrnament position="tl" />
              <CornerOrnament position="tr" />
              <CornerOrnament position="bl" />
              <CornerOrnament position="br" />

              <div className="frame-band">
                <div className="frame-inner rounded-lg overflow-hidden">
                  {/* Title bar */}
                  <div className="ornate-titlebar">
                    <span className="titlebar-line" />
                    <span className="font-arabic text-lg text-accent-gold">
                      {dominantSurahName || label}
                    </span>
                    <span className="titlebar-line" />
                  </div>

                  {/* Continuous ayah flow */}
                  <div className="mushaf-flow p-4 sm:p-8 min-h-[420px] sm:min-h-[560px]" dir="rtl">
                    {pageLoading && <div className="spinner" />}

                    {!pageLoading && renderItems.map((item) => {
                      if (item.type === 'header') {
                        return (
                          <div
                            key={`h-${item.surah.number}`}
                            className="surah-header w-full flex justify-center my-6 sm:my-7"
                          >
                            <div className="flex flex-col items-center gap-2 px-4 sm:px-6 py-3 sm:py-4 bg-accent-gold/5 rounded-custom border border-accent-gold/25 max-w-full">
                              <span className="font-arabic text-xl sm:text-2xl text-accent-gold font-bold text-center">
                                {item.surah.name}
                              </span>
                              <span className="text-[11px] sm:text-xs text-text-muted tracking-wide text-center px-2">
                                {item.surah.englishName} · {item.surah.numberOfAyahs} آية
                              </span>
                            </div>
                          </div>
                        );
                      }
                      if (item.type === 'bismillah') {
                        // Item ini HANYA dibuat untuk ayat pembuka surat (numberInSurah === 1,
                        // lihat renderItems di atas) — jadi lafad bismillah yang menyatu di
                        // dalam teks ayat An-Naml (27:30) tidak pernah lewat sini; ia tetap
                        // dirender apa adanya sebagai bagian dari alur ayat biasa/target hafalan.
                        return (
                          <div
                            key={`b-${item.surahNumber}`}
                            className="bismillah-lockup w-full flex items-center justify-center gap-3 mb-6 sm:mb-7"
                          >
                            <span className="bismillah-flourish" aria-hidden="true" />
                            <span className="font-arabic bismillah-text text-center">
                              {BISMILLAH}
                            </span>
                            <span className="bismillah-flourish" aria-hidden="true" />
                          </div>
                        );
                      }

                      const { ayah } = item;
                      const isCurrentTarget = hafalanActive && hafalanCursor != null && ayah.number === hafalanCursor;
                      const hidden = !isCurrentTarget && isHiddenAyah(ayah);

                      // Ayat yang sedang dibaca SEKARANG: kata yang sudah benar tampak langsung
                      // (live, per-kata), sisanya masih disamarkan sebagai titik-titik.
                      if (isCurrentTarget) {
                        const words = getAyahDisplayText(ayah).trim().split(/\s+/).filter(Boolean);
                        return (
                          <span
                            key={ayah.number}
                            className="ayah-run ayah-current-target font-arabic"
                            id={`ayah-${ayah.number}`}
                          >
                            {words.map((w, i) => (
                              <span
                                key={i}
                                className={i < targetWordCursor ? 'ayah-word-revealed' : 'ayah-word-hidden'}
                              >
                                {' '}{i < targetWordCursor ? w : '•'}
                              </span>
                            ))}
                            <span className="ayah-badge ayah-badge-hidden">
                              {toArabicNumeral(ayah.numberInSurah)}
                            </span>
                          </span>
                        );
                      }

                      if (hidden) {
                        return (
                          <span
                            key={ayah.number}
                            className="ayah-run ayah-hidden font-arabic"
                            id={`ayah-${ayah.number}`}
                          >
                            {hiddenPlaceholder(getAyahDisplayText(ayah))}
                            <span className="ayah-badge ayah-badge-hidden">
                              {toArabicNumeral(ayah.numberInSurah)}
                            </span>
                          </span>
                        );
                      }

                      return (
                        <span key={ayah.number} className="ayah-run font-arabic" id={`ayah-${ayah.number}`}>
                          {getAyahDisplayText(ayah)}
                          <span className="ayah-badge">
                            {toArabicNumeral(ayah.numberInSurah)}
                          </span>
                        </span>
                      );
                    })}
                  </div>

                  <div className="px-8 py-4">
                    <div className="h-px bg-gradient-to-r from-transparent via-accent-gold/25 to-transparent" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ── Pagination ── */}
          <div className="flex items-center justify-center gap-5 mb-4 flex-wrap" id="mushaf-pagination">
            <button
              id="prev-page-btn"
              className="flex items-center gap-2 px-5 py-2.5 bg-accent/10 border border-accent/25 rounded-custom-sm text-accent font-semibold text-sm hover:bg-accent/20 hover:border-accent/50 hover:-translate-y-0.5 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              onClick={prevPage}
              disabled={pageNum <= 1}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M15 18l-6-6 6-6"/>
              </svg>
              Sebelumnya
            </button>

            <div className="flex flex-wrap gap-1.5 justify-center max-w-md">
              {Array.from({ length: pageRange.end - pageRange.start + 1 }).map((_, i) => {
                const p = pageRange.start + i;
                return (
                  <button
                    key={p}
                    id={`page-dot-${p}`}
                    title={`Halaman ${p}`}
                    className={`h-2.5 rounded-full border-none cursor-pointer transition-all ${p === pageNum
                      ? 'w-5.5 bg-accent rounded shadow-[0_0_8px_rgba(184,134,59,0.5)]'
                      : 'w-2.5 bg-white/12 hover:bg-white/20'
                    }`}
                    onClick={() => goToPage(p)}
                  />
                );
              })}
            </div>

            <button
              id="next-page-btn"
              className="flex items-center gap-2 px-5 py-2.5 bg-accent/10 border border-accent/25 rounded-custom-sm text-accent font-semibold text-sm hover:bg-accent/20 hover:border-accent/50 hover:-translate-y-0.5 disabled:opacity-35 disabled:cursor-not-allowed transition-all"
              onClick={nextPage}
              disabled={pageNum >= MUSHAF_TOTAL_PAGES}
            >
              Selanjutnya
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <path d="M9 18l6-6-6-6"/>
              </svg>
            </button>
          </div>

          <p className="text-center text-xs text-text-muted/50 mb-6">
            Halaman {pageNum} dari {MUSHAF_TOTAL_PAGES} · tekan ← → untuk navigasi
          </p>
        </>
      )}

      {/* ── Bilah mic mengambang saat mode hafalan aktif ── */}
      {hafalanActive && showBook && (
        <div className="hafalan-bar glass">
          {targetOnOtherPage ? (
            <div className="flex items-center gap-3 flex-wrap justify-center">
              <span className="text-sm text-text-muted">
                Ayat hafalan berikutnya ada di halaman lain.
              </span>
              <button
                className="px-4 py-2 bg-accent/10 border border-accent/25 rounded-custom-sm text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
                onClick={nextPage}
              >
                Buka Halaman Selanjutnya →
              </button>
            </div>
          ) : targetAyah ? (
            <div className="flex items-center gap-4 flex-wrap justify-center">
              <button
                id="hafalan-mic-btn"
                onClick={micState === 'listening' ? stopListening : startListening}
                disabled={!speechSupported}
                className={`mic-btn ${micState === 'listening' ? 'mic-btn-active' : ''}`}
                title={micState === 'listening' ? 'Berhenti mendengarkan' : 'Mulai mendengarkan'}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="22" height="22">
                  <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8"/>
                </svg>
              </button>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-text-heading">
                  Ayat {targetAyah.numberInSurah} — lanjut otomatis, tidak perlu pencet mic lagi
                </span>
                <span className="text-xs text-text-muted min-h-[1rem]">
                  {micState === 'listening' && !micError && 'Mendengarkan… boleh berhenti sejenak untuk napas/waqaf'}
                  {micState === 'idle' && !micError && 'Tekan mic sekali, lalu baca terus sampai selesai'}
                  {micError && <span className="text-red-600">⚠ {micError}</span>}
                </span>
                {interimText && micState === 'listening' && (
                  <span className="font-arabic text-sm text-text-muted italic" dir="rtl">{interimText}</span>
                )}
              </div>
            </div>
          ) : (
            <span className="text-sm text-text-muted">🎉 Semua ayat pada rentang ini sudah selesai dihafal.</span>
          )}
        </div>
      )}

      {/* ── Popup pemilih surat/ayat hafalan ── */}
      {showHafalanPopup && (
        <HafalanPickerPopup
          allSurahs={allSurahs}
          surah={popupSurah}
          ayah={popupAyah}
          maxAyah={popupMaxAyah}
          error={popupError}
          loading={popupLoading}
          onSurahChange={(value) => { setPopupSurah(value); setPopupAyah(1); }}
          onAyahChange={setPopupAyah}
          onCancel={() => setShowHafalanPopup(false)}
          onConfirm={confirmHafalanStart}
        />
      )}

      {/* ── Popup hasil bacaan salah ── */}
      {wrongPopup && (
        <WrongAnswerPopup
          result={wrongPopup}
          onRetry={retrySameAyah}
          onSkip={skipRevealAnyway}
        />
      )}

      {/* Styles */}
      <style jsx>{`
        .mushaf-flow {
          text-align: justify;
          text-align-last: right;
        }
        .ayah-run {
          font-size: 1.6rem;
          line-height: 2.35;
          letter-spacing: 0;
          word-spacing: 0.15rem;
          color: #2e2718;
        }
        .ayah-badge {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 1.9rem;
          height: 1.9rem;
          margin: 0 0.35rem;
          font-size: 0.9rem;
          font-family: sans-serif;
          color: #a9772f;
          border: 1.5px solid rgba(169, 119, 47, 0.45);
          border-radius: 50%;
          vertical-align: 0.1em;
          background: rgba(169, 119, 47, 0.06);
          box-shadow: 0 0 0 3px rgba(169, 119, 47, 0.08), inset 0 0 0 1px rgba(169, 119, 47, 0.2);
        }
        .surah-header {
          break-inside: avoid;
        }

        /* ── Lafad bismillah pembuka surat: gaya sendiri, selalu di tengah ── */
        .bismillah-lockup {
          padding: 0.15rem 0;
        }
        .bismillah-flourish {
          flex: 1 1 auto;
          max-width: 64px;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(169, 119, 47, 0.55), transparent);
        }
        .bismillah-text {
          font-size: 1.4rem;
          line-height: 2;
          color: #a9772f;
          letter-spacing: 0.01em;
          text-shadow: 0 0 14px rgba(169, 119, 47, 0.2);
          white-space: nowrap;
        }
        @media (max-width: 768px) {
          .bismillah-text { font-size: 1.15rem; }
          .bismillah-flourish { max-width: 34px; }
        }

        /* ── Ayat tersembunyi utuh (belum giliran dibaca, mode hafalan) ── */
        .ayah-hidden {
          color: transparent;
          text-shadow: 0 0 9px rgba(169, 119, 47, 0.55);
          user-select: none;
          border-bottom: 1.5px dashed rgba(169, 119, 47, 0.35);
          padding-bottom: 2px;
        }
        .ayah-badge-hidden {
          opacity: 0.55;
        }

        /* ── Ayat yang SEDANG dibaca sekarang: reveal kata-per-kata secara live ── */
        .ayah-current-target {
          border-bottom: 1.5px dashed rgba(169, 119, 47, 0.7);
          padding-bottom: 2px;
        }
        .ayah-word-hidden {
          color: transparent;
          text-shadow: 0 0 9px rgba(169, 119, 47, 0.75);
          user-select: none;
          animation: hidden-pulse 1.6s ease-in-out infinite;
        }
        .ayah-word-revealed {
          color: #2e2718;
          text-shadow: none;
          animation: word-reveal-pop 0.35s ease;
        }
        @keyframes hidden-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.55; }
        }
        @keyframes word-reveal-pop {
          0% { opacity: 0.15; }
          100% { opacity: 1; }
        }

        /* ── Bilah hafalan mengambang ── */
        .hafalan-bar {
          position: sticky;
          bottom: 1rem;
          max-width: 42rem;
          margin: 0 auto 2rem;
          padding: 1rem 1.25rem;
          border-radius: 16px;
          display: flex;
          justify-content: center;
        }
        .mic-btn {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          border: none;
          flex-shrink: 0;
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
        .mic-btn-active { animation: mic-pulse 1.4s ease-in-out infinite; }
        @keyframes mic-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(169,119,47,0.45); }
          70%  { box-shadow: 0 0 0 16px rgba(169,119,47,0); }
          100% { box-shadow: 0 0 0 0 rgba(169,119,47,0); }
        }

        /* ── Popup pemilih surat/ayat & popup koreksi jawaban sekarang berada di
           komponen terpisah: components/PopupOverlay.jsx, HafalanPickerPopup.jsx,
           dan WrongAnswerPopup.jsx (masing-masing punya style jsx sendiri). ── */

        /* ── Ornate frame (putih tulang) ── */
        .mushaf-frame-wrap {
          position: relative;
        }
        .page-medallion {
          position: absolute;
          top: -22px;
          left: 50%;
          transform: translateX(-50%);
          width: 46px;
          height: 46px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 30%, rgba(184, 134, 59, 0.22), #f5f0e3 70%);
          border: 1.5px solid rgba(169, 119, 47, 0.6);
          box-shadow: 0 0 0 4px #f7f3ea, 0 4px 14px rgba(58, 49, 40, 0.18);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: sans-serif;
          color: #a9772f;
          font-size: 1.05rem;
          font-weight: 700;
          z-index: 3;
        }
        .frame-outer {
          position: relative;
          border: 1.5px solid rgba(169, 119, 47, 0.45);
          border-radius: 6px;
          padding: 4px;
          box-shadow: 0 24px 80px rgba(58, 49, 40, 0.16);
          background: #f5f0e3;
        }
        .frame-band {
          border: 1px solid rgba(169, 119, 47, 0.3);
          border-radius: 3px;
          padding: 14px;
          background-color: #f7f3ea;
          background-image:
            repeating-linear-gradient(45deg, rgba(169, 119, 47, 0.06) 0px, rgba(169, 119, 47, 0.06) 1px, transparent 1px, transparent 9px),
            repeating-linear-gradient(-45deg, rgba(169, 119, 47, 0.06) 0px, rgba(169, 119, 47, 0.06) 1px, transparent 1px, transparent 9px);
        }
        .frame-inner {
          border: 1px solid rgba(169, 119, 47, 0.4);
          background: linear-gradient(to bottom right, #faf7ef, #f3ede0);
          position: relative;
        }
        .ornate-titlebar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          border-bottom: 1px solid rgba(169, 119, 47, 0.18);
          background: rgba(169, 119, 47, 0.04);
        }
        .titlebar-line {
          flex: 1;
          max-width: 90px;
          height: 1px;
          background: linear-gradient(to right, transparent, rgba(169, 119, 47, 0.5), transparent);
        }
        .corner-ornament {
          position: absolute;
          width: 34px;
          height: 34px;
          z-index: 2;
          pointer-events: none;
        }
        .corner-tl { top: -3px; left: -3px; }
        .corner-tr { top: -3px; right: -3px; transform: scaleX(-1); }
        .corner-bl { bottom: -3px; left: -3px; transform: scaleY(-1); }
        .corner-br { bottom: -3px; right: -3px; transform: scale(-1, -1); }

        @media (max-width: 768px) {
          .frame-band { padding: 8px; }
          #mushaf-book { padding: 0; }
          .ayah-run { font-size: 1.4rem; line-height: 2.3; word-spacing: 0.1rem; }
          .ayah-badge { width: 1.7rem; height: 1.7rem; font-size: 0.78rem; margin: 0 0.25rem; }
          .page-medallion { width: 38px; height: 38px; font-size: 0.9rem; top: -18px; }
          .ornate-titlebar { padding: 0.75rem 1rem; }
          .corner-ornament { width: 24px; height: 24px; }
        }
      `}</style>
    </div>
  );
}

/* ── Corner ornament (kaligrafi manuskrip: bracket ganda + roset kecil) ── */
function CornerOrnament({ position }) {
  return (
    <svg
      className={`corner-ornament corner-${position}`}
      viewBox="0 0 34 34"
      fill="none"
    >
      <path d="M2 26 L2 2 L26 2" stroke="rgba(169,119,47,0.75)" strokeWidth="1.4" />
      <path d="M8 30 L8 8 L30 8" stroke="rgba(169,119,47,0.4)" strokeWidth="0.8" />
      <g transform="translate(8,8)">
        <circle r="2.4" fill="rgba(169,119,47,0.85)" />
        <g stroke="rgba(169,119,47,0.6)" strokeWidth="0.9">
          <ellipse cx="0" cy="0" rx="6" ry="2" transform="rotate(0)" />
          <ellipse cx="0" cy="0" rx="6" ry="2" transform="rotate(45)" />
          <ellipse cx="0" cy="0" rx="6" ry="2" transform="rotate(90)" />
          <ellipse cx="0" cy="0" rx="6" ry="2" transform="rotate(135)" />
        </g>
      </g>
    </svg>
  );
}

/* ── Helpers ─────────────────────────────────────────────────── */
const BISMILLAH = 'بِسۡمِ ٱللَّهِ ٱلرَّحۡمَٰنِ ٱلرَّحِيمِ';

// Al-Fatihah (1): ayat 1 memang bismillah itu sendiri, tidak perlu duplikat.
// At-Taubah (9): tidak diawali bismillah sama sekali.
function needsBismillah(surahNumber) {
  return surahNumber !== 1 && surahNumber !== 9;
}

function toArabicNumeral(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// Placeholder bertitik sepanjang jumlah kata ayat asli, biar tetap "terasa"
// posisinya di alur mushaf tanpa membocorkan teksnya. Dipakai untuk ayat yang
// BELUM giliran dibaca sama sekali (bukan ayat target yang sedang live).
function hiddenPlaceholder(text) {
  const wordCount = text.trim().split(/\s+/).length;
  return Array.from({ length: wordCount }, () => '•').join(' ');
}