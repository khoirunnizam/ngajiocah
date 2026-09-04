/* eslint-disable no-empty */
import { useState, useEffect, useRef, useCallback } from "react";

import { useNavigate } from "react-router-dom";

import { getAllSurahs, getSurah, EDITIONS } from "../services/quranApi";

import { compareRecitation } from "../utils/arabicCompare";

/* =========================================================
   KONFIGURASI
========================================================= */

const EXCELLENT_THRESHOLD = 0.9;
const PASS_THRESHOLD = 0.75;

/* =========================================================
   COMPONENT
========================================================= */

export default function HafalanPage() {
  const navigate = useNavigate();

  /* =======================================================
     SETUP
  ======================================================= */

  const [surahs, setSurahs] = useState([]);
  const [loadingSurahs, setLoadingSurahs] = useState(true);

  const [selectedSurah, setSelectedSurah] = useState(1);

  const [startAyah, setStartAyah] = useState(1);

  /* =======================================================
     SESSION
  ======================================================= */

  const [stage, setStage] = useState("setup");

  const [surahMeta, setSurahMeta] = useState(null);

  const [cursor, setCursor] = useState(0);

  const [revealed, setRevealed] = useState([]);

  const [loadingSurah, setLoadingSurah] = useState(false);

  const [loadError, setLoadError] = useState(null);

  /* =======================================================
     VOICE
  ======================================================= */

  const [micState, setMicState] = useState("idle");
  const [interimText, setInterimText] = useState("");
  const [micError, setMicError] = useState(null);

  const recognitionRef = useRef(null);
  const restartTimerRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const manualStopRef = useRef(true);
  const accumulatedTranscriptRef = useRef("");
  const currentAyahRef = useRef(null);

  const speechSupported = typeof window !== "undefined" && !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const isSecureContextForMic =
    typeof window !== "undefined" &&
    (window.isSecureContext ??
      (window.location.protocol === "https:" ||
        window.location.hostname === "localhost" ||
        window.location.hostname === "127.0.0.1"));

  /* =======================================================
     RESULT
  ======================================================= */

  const [popup, setPopup] = useState(null);

  /* =======================================================
     LOAD SURAH LIST
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    getAllSurahs()
      .then((data) => {
        if (mounted) {
          setSurahs(data);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError("Gagal memuat daftar surah.");
        }
      })
      .finally(() => {
        if (mounted) {
          setLoadingSurahs(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     CLEANUP MIC
  ======================================================= */

  const stopRecognitionSafely = useCallback(() => {
    manualStopRef.current = true;
    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }

    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.abort?.();
        recognition.stop?.();
      } catch {}
      recognitionRef.current = null;
    }

    setMicState("idle");
  }, []);

  useEffect(() => {
    return () => {
      stopRecognitionSafely();
    };
  }, [stopRecognitionSafely]);

  /* =======================================================
     CURRENT SURAH
  ======================================================= */

  const currentSurahInfo = surahs.find((s) => s.number === Number(selectedSurah));
  const maxAyah = currentSurahInfo?.numberOfAyahs ?? 999;
  const currentAyah = surahMeta?.ayahs?.[cursor] ?? null;

  useEffect(() => {
    currentAyahRef.current = currentAyah;
  }, [currentAyah]);

  /* =======================================================
     MOVE NEXT AYAH
  ======================================================= */

  const moveNextAyah = useCallback(() => {
    stopRecognitionSafely();

    setInterimText("");
    setMicError(null);

    if (!surahMeta) return;

    const lastAyah = cursor >= surahMeta.ayahs.length - 1;

    if (lastAyah) {
      setStage("finished");
      return;
    }

    setCursor((prev) => prev + 1);
  }, [cursor, surahMeta, stopRecognitionSafely]);

  /* =======================================================
     START SESSION
  ======================================================= */

  const startSession = async () => {
    stopRecognitionSafely();

    setLoadError(null);
    setPopup(null);
    setInterimText("");
    setMicError(null);

    setLoadingSurah(true);

    try {
      const data = await getSurah(Number(selectedSurah), EDITIONS.ARABIC_UTHMANI);

      const clampedStart = Math.min(Math.max(1, Number(startAyah) || 1), data.ayahs.length);

      setSurahMeta(data);
      setCursor(clampedStart - 1);
      setRevealed([]);
      setStage("session");
    } catch {
      setLoadError("Gagal memuat surat. Coba lagi.");
    } finally {
      setLoadingSurah(false);
    }
  };

  /* =======================================================
     BACK TO SETUP
  ======================================================= */

  const backToSetup = () => {
    stopRecognitionSafely();

    setInterimText("");
    setMicError(null);
    setPopup(null);
    setStage("setup");
  };

  /* =======================================================
     REVEAL AYAH
  ======================================================= */

  const revealCurrentAyah = useCallback(() => {
    if (!currentAyah) return;

    setRevealed((prev) => {
      const alreadyExists = prev.some((a) => a.number === currentAyah.number);

      if (alreadyExists) {
        return prev;
      }

      return [...prev, currentAyah];
    });
  }, [currentAyah]);

  /* =======================================================
     EXCELLENT
  ======================================================= */

  const handleExcellent = useCallback(() => {
    revealCurrentAyah();

    setPopup(null);
    setInterimText("");

    moveNextAyah();
  }, [revealCurrentAyah, moveNextAyah]);

  /* =======================================================
     GOOD / YELLOW
  ======================================================= */

  const handleGood = useCallback((result) => {
    setPopup({
      ...result,
      type: "good",
    });
  }, []);

  /* =======================================================
     WRONG / RED
  ======================================================= */

  const handleWrong = useCallback((result) => {
    setPopup({
      ...result,
      type: "wrong",
    });
  }, []);

  /* =======================================================
     EVALUATE
  ======================================================= */

  const evaluate = useCallback(
    (recognizedText) => {
      const ayah = currentAyahRef.current || currentAyah;
      if (!ayah) return;

      const cleanText = String(recognizedText || "").trim();

      if (!cleanText) {
        handleWrong({
          isCorrect: false,
          score: 0,
          status: "wrong",
          correctSteps: [],
          userSteps: [],
          message: "Tidak ada bacaan yang terdeteksi.",
        });

        return;
      }

      const result = compareRecitation(ayah.text, cleanText, PASS_THRESHOLD);

      if (result.score >= EXCELLENT_THRESHOLD) {
        handleExcellent();
        return;
      }

      if (result.score >= PASS_THRESHOLD) {
        handleGood(result);
        return;
      }

      handleWrong(result);
    },
    [currentAyah, handleExcellent, handleGood, handleWrong]
  );

  /* =======================================================
     CREATE AND START RECOGNITION
  ======================================================= */

  const createAndStartRecognition = useCallback(() => {
    if (manualStopRef.current) {
      setMicState("idle");
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setMicError("Speech Recognition tidak tersedia di browser ini.");
      setMicState("idle");
      manualStopRef.current = true;
      return;
    }

    if (restartTimerRef.current) {
      clearTimeout(restartTimerRef.current);
      restartTimerRef.current = null;
    }

    const oldRec = recognitionRef.current;
    if (oldRec) {
      try {
        oldRec.onresult = null;
        oldRec.onerror = null;
        oldRec.onend = null;
        oldRec.abort?.();
        oldRec.stop?.();
      } catch {}
      recognitionRef.current = null;
    }

    try {
      const recognition = new SpeechRecognitionCtor();
      recognition.lang = "ar-SA";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event) => {
        let currentFinalChunk = "";
        let interim = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0]?.transcript || "";
          if (event.results[i].isFinal) {
            currentFinalChunk += " " + transcript;
          } else {
            interim += transcript;
          }
        }

        if (currentFinalChunk.trim()) {
          accumulatedTranscriptRef.current = (accumulatedTranscriptRef.current + " " + currentFinalChunk).trim();
        }

        const fullSpokenSoFar = (accumulatedTranscriptRef.current + " " + interim).trim();
        setInterimText(fullSpokenSoFar);

        // Instant check if recitation is already excellent
        const ayah = currentAyahRef.current || currentAyah;
        if (ayah && fullSpokenSoFar) {
          const quickRes = compareRecitation(ayah.text, fullSpokenSoFar, PASS_THRESHOLD);
          if (quickRes.score >= EXCELLENT_THRESHOLD) {
            stopRecognitionSafely();
            setMicState("checking");
            window.setTimeout(() => {
              evaluate(fullSpokenSoFar);
              setMicState("idle");
            }, 100);
            return;
          }
        }

        // Reset silence timer for automatic evaluation after speech pause (2.0s)
        if (silenceTimerRef.current) {
          clearTimeout(silenceTimerRef.current);
          silenceTimerRef.current = null;
        }

        if (fullSpokenSoFar) {
          silenceTimerRef.current = setTimeout(() => {
            if (!manualStopRef.current && accumulatedTranscriptRef.current.trim()) {
              const textToCheck = accumulatedTranscriptRef.current.trim();
              stopRecognitionSafely();
              setMicState("checking");
              window.setTimeout(() => {
                evaluate(textToCheck);
                setMicState("idle");
              }, 120);
            }
          }, 2000);
        }
      };

      recognition.onerror = (event) => {
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          manualStopRef.current = true;
          setMicState("idle");
          setMicError(
            isSecureContextForMic
              ? "Akses mikrofon ditolak. Klik ikon gembok/setelan izin mikrofon di bilah alamat browser untuk mengizinkan."
              : "Akses mikrofon diblokir oleh browser karena situs tidak dibuka lewat HTTPS atau localhost."
          );
        } else if (event.error === "network") {
          setMicError("Koneksi internet untuk pengenalan suara terganggu. Periksa sambungan internet.");
          manualStopRef.current = true;
          setMicState("idle");
        } else if (event.error === "audio-capture") {
          setMicError("Mikrofon tidak ditemukan atau sedang digunakan aplikasi lain.");
          manualStopRef.current = true;
          setMicState("idle");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          setMicError("Terjadi gangguan saat merekam suara, menyambung ulang…");
        }
      };

      recognition.onend = () => {
        if (!manualStopRef.current) {
          restartTimerRef.current = setTimeout(() => {
            if (!manualStopRef.current) {
              createAndStartRecognition();
            }
          }, 60);
        } else {
          setMicState("idle");
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
      setMicState("listening");
    } catch {
      if (!manualStopRef.current) {
        restartTimerRef.current = setTimeout(() => {
          if (!manualStopRef.current) {
            createAndStartRecognition();
          }
        }, 200);
      } else {
        setMicState("idle");
      }
    }
  }, [currentAyah, evaluate, isSecureContextForMic, stopRecognitionSafely]);

  /* =======================================================
     START LISTENING
  ======================================================= */

  const startListening = () => {
    if (!speechSupported) {
      setMicError("Browser kamu belum mendukung rekam suara. Gunakan Google Chrome atau Microsoft Edge terbaru.");
      return;
    }
    if (!isSecureContextForMic) {
      setMicError("Akses mic butuh koneksi aman (HTTPS) atau alamat 'localhost'. Membuka lewat IP jaringan lokal (http://192.168.x.x) diblokir browser.");
      return;
    }

    stopRecognitionSafely();
    setMicError(null);
    setPopup(null);
    setInterimText("");
    accumulatedTranscriptRef.current = "";
    manualStopRef.current = false;
    createAndStartRecognition();
  };

  /* =======================================================
     STOP LISTENING / FINISH CHECK
  ======================================================= */

  const stopListening = () => {
    const textToCheck = (accumulatedTranscriptRef.current + " " + interimText).trim();
    stopRecognitionSafely();

    if (textToCheck) {
      setMicState("checking");
      window.setTimeout(() => {
        evaluate(textToCheck);
        setMicState("idle");
      }, 100);
    } else {
      setMicState("idle");
    }
  };

  /* =======================================================
     RETRY
  ======================================================= */

  const retrySameAyah = () => {
    setPopup(null);
    setInterimText("");
    setMicError(null);
    accumulatedTranscriptRef.current = "";
    startListening();
  };

  /* =======================================================
     ACCEPT GOOD RESULT
  ======================================================= */

  const acceptGoodResult = () => {
    revealCurrentAyah();

    setPopup(null);
    setInterimText("");

    moveNextAyah();
  };

  /* =======================================================
     SKIP
  ======================================================= */

  const skipRevealAnyway = () => {
    revealCurrentAyah();

    setPopup(null);
    setInterimText("");

    moveNextAyah();
  };

  /* =======================================================
     NEXT SURAH
  ======================================================= */

  const goToNextSurah = async () => {
    const nextNumber = Number(selectedSurah) + 1;

    if (nextNumber > 114) return;

    stopRecognitionSafely();

    setSelectedSurah(nextNumber);

    setStartAyah(1);
    setPopup(null);
    setInterimText("");
    setMicError(null);

    setLoadingSurah(true);

    try {
      const data = await getSurah(nextNumber, EDITIONS.ARABIC_UTHMANI);

      setSurahMeta(data);
      setCursor(0);
      setRevealed([]);
      setStage("session");
    } catch {
      setLoadError("Gagal memuat surat berikutnya.");

      setStage("setup");
    } finally {
      setLoadingSurah(false);
    }
  };

  /* =======================================================
     FORMAT SCORE
  ======================================================= */

  const formatScore = (score) => `${Math.round((score || 0) * 100)}%`;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="container px-4 sm:px-6 max-w-3xl mx-auto">
      {/* ===================================================
          TOOLBAR
      =================================================== */}

      <div className="glass flex items-center justify-between gap-3 flex-wrap my-6 p-4">
        <button
          id="hafalan-back-btn"
          className="
            flex items-center gap-2
            px-4 py-2
            bg-white/4
            border border-border
            rounded-custom-sm
            text-text
            text-sm font-medium
            hover:border-border-glow
            hover:text-text-heading
            transition-all
          "
          onClick={() => (stage === "setup" ? navigate(-1) : backToSetup())}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>

          {stage === "setup" ? "Kembali" : "Ganti Surat/Ayat"}
        </button>

        <h1 className="text-lg font-bold text-text-heading">Mode Hafalan</h1>
      </div>

      {/* ===================================================
          BROWSER WARNING
      =================================================== */}

      {!speechSupported && <div className="error-box mb-4">⚠ Browser ini tidak mendukung pengenalan suara. Gunakan Chrome atau Edge terbaru.</div>}

      {/* ===================================================
          SETUP
      =================================================== */}

      {stage === "setup" && (
        <div className="glass p-5 sm:p-7 flex flex-col gap-5">
          {loadingSurahs && <div className="spinner" />}

          {loadError && <div className="error-box">⚠ {loadError}</div>}

          {!loadingSurahs && !loadError && (
            <>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-semibold text-text-heading">Mulai dari surat</label>

                <select
                  id="hafalan-surah-select"
                  className="
                      w-full px-4 py-3
                      bg-white/60
                      border border-border
                      rounded-custom-sm
                      text-text-heading
                      text-sm outline-none
                      focus:border-border-glow
                      focus:ring-3
                      focus:ring-accent/12
                      transition-all
                    "
                  value={selectedSurah}
                  onChange={(e) => {
                    setSelectedSurah(e.target.value);
                    setStartAyah(1);
                  }}
                >
                  {surahs.map((s) => (
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
                  className="
                      w-full px-4 py-3
                      bg-white/60
                      border border-border
                      rounded-custom-sm
                      text-text-heading
                      text-sm outline-none
                      focus:border-border-glow
                      focus:ring-3
                      focus:ring-accent/12
                      transition-all
                    "
                />

                <p className="text-xs text-text-muted">Surat ini punya {maxAyah} ayat.</p>
              </div>

              <button
                id="hafalan-start-btn"
                className="
                    flex items-center
                    justify-center gap-2
                    px-5 py-3.5
                    bg-gradient-to-br
                    from-accent to-accent-2
                    border-none
                    rounded-custom-sm
                    text-white
                    text-sm font-semibold
                    hover:opacity-90
                    hover:-translate-y-0.5
                    active:scale-95
                    disabled:opacity-50
                    transition-all
                  "
                onClick={startSession}
                disabled={loadingSurah}
              >
                {loadingSurah ? "Memuat…" : "Mulai Hafalan"}
              </button>
            </>
          )}
        </div>
      )}

      {/* ===================================================
          SESSION
      =================================================== */}

      {stage === "session" && surahMeta && (
        <div className="flex flex-col gap-5 pb-16">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <span
              className="
                font-arabic
                text-lg
                text-accent-gold
                font-semibold
              "
            >
              {surahMeta.name} — {surahMeta.englishName}
            </span>

            <span
              className="
                text-sm
                font-semibold
                text-accent
              "
            >
              Ayat {currentAyah?.numberInSurah} dari {surahMeta.ayahs.length}
            </span>
          </div>

          {/* PROGRESS */}

          <div className="w-full">
            <div
              className="
                flex justify-between
                text-xs
                text-text-muted
                mb-2
              "
            >
              <span>Kemajuan hafalan</span>

              <span>
                {Math.min(cursor + 1, surahMeta.ayahs.length)} / {surahMeta.ayahs.length}
              </span>
            </div>

            <div
              className="
                h-2
                rounded-full
                bg-black/5
                overflow-hidden
              "
            >
              <div
                className="
                    h-full
                    rounded-full
                    bg-gradient-to-r
                    from-accent
                    to-accent-2
                    transition-all
                    duration-300
                  "
                style={{
                  width: `${((cursor + 1) / surahMeta.ayahs.length) * 100}%`,
                }}
              />
            </div>
          </div>

          {/* REVEALED */}

          {revealed.length > 0 && (
            <div
              className="
                  hafalan-reveal-box
                  p-5 sm:p-7
                "
              dir="rtl"
            >
              {revealed.map((a) => (
                <span
                  key={a.number}
                  className="
                      ayah-run
                      font-arabic
                    "
                >
                  {a.text}

                  <span className="ayah-badge">{toArabicNumeral(a.numberInSurah)}</span>
                </span>
              ))}
            </div>
          )}

          {/* CURRENT AYAH */}

          <div
            className="
                hafalan-hidden-box
                p-6 sm:p-8
                flex flex-col
                items-center
                gap-4
                text-center
              "
          >
            <div
              className="
                flex items-center gap-2
                text-text-muted
                text-sm
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
                <rect x="3" y="11" width="18" height="10" rx="2" />

                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Ayat {currentAyah?.numberInSurah} tersembunyi — baca dari hafalanmu
            </div>

            <div className="flex flex-col items-center gap-3 w-full">
              <button
                id="hafalan-mic-btn"
                onClick={micState === "listening" ? stopListening : startListening}
                disabled={!speechSupported || micState === "checking"}
                className={`
                    mic-btn
                    ${micState === "listening" ? "mic-btn-active" : ""}
                  `}
                title={micState === "listening" ? "Selesai membaca & periksa" : "Mulai merekam"}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
                  <path d="M12 2a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                  <path d="M19 10v1a7 7 0 0 1-14 0v-1M12 18v4M8 22h8" />
                </svg>
              </button>

              {micState === "listening" && (
                <button
                  type="button"
                  onClick={stopListening}
                  className="px-4 py-1.5 bg-accent text-white text-xs font-semibold rounded-full shadow-sm hover:opacity-90 transition-all"
                >
                  ✓ Selesai Membaca (Periksa)
                </button>
              )}
            </div>

            <p
              className="
                text-xs
                text-text-muted
                min-h-[1rem]
              "
            >
              {micState === "listening" && "Mendengarkan… baca ayat (boleh berhenti sejenak untuk napas)"}
              {micState === "checking" && "Memeriksa bacaan…"}
              {micState === "idle" && !micError && "Tekan tombol mic untuk mulai melafalkan"}
            </p>

            {interimText && (micState === "listening" || micState === "checking") && (
              <div
                className="
                  w-full max-w-lg p-3 bg-white/70 border border-accent/20 rounded-lg shadow-sm
                "
              >
                <p className="text-[11px] text-text-muted mb-1 text-left">Suara terdeteksi:</p>
                <p
                  className="
                    font-arabic
                    text-lg
                    text-text-heading
                    leading-relaxed
                  "
                  dir="rtl"
                >
                  {interimText}
                </p>
              </div>
            )}

            {micError && (
              <p
                className="
                  text-xs
                  text-red-600
                  max-w-md
                "
              >
                ⚠ {micError}
              </p>
            )}
          </div>
        </div>
      )}

      {/* ===================================================
          FINISHED
      =================================================== */}

      {stage === "finished" && surahMeta && (
        <div
          className="
            glass
            p-7
            flex flex-col
            items-center
            gap-4
            text-center
          "
        >
          <span className="text-3xl">🎉</span>

          <h2
            className="
              text-lg
              font-bold
              text-text-heading
            "
          >
            Selesai!
          </h2>

          <p
            className="
              text-sm
              text-text-muted
              max-w-md
            "
          >
            Kamu telah menyelesaikan hafalan <strong>{surahMeta.englishName}</strong>.
          </p>

          <div
            className="
              flex flex-wrap
              gap-3
              justify-center
              mt-2
            "
          >
            <button
              className="
                  px-5 py-2.5
                  bg-accent/10
                  border border-accent/25
                  rounded-custom-sm
                  text-accent
                  font-semibold
                  text-sm
                  hover:bg-accent/20
                  transition-all
                "
              onClick={backToSetup}
            >
              Pilih Surat Lain
            </button>

            {Number(selectedSurah) < 114 && (
              <button
                className="
                    px-5 py-2.5
                    bg-gradient-to-br
                    from-accent
                    to-accent-2
                    border-none
                    rounded-custom-sm
                    text-white
                    font-semibold
                    text-sm
                    hover:opacity-90
                    transition-all
                  "
                onClick={goToNextSurah}
              >
                Lanjut ke Surat Berikutnya
              </button>
            )}
          </div>
        </div>
      )}

      {/* ===================================================
          RESULT POPUP
      =================================================== */}

      {popup && (
        <div
          className="
            hafalan-popup-overlay
          "
          onClick={retrySameAyah}
        >
          <div
            className="
              hafalan-popup-card
            "
            onClick={(e) => e.stopPropagation()}
          >
            {/* RESULT HEADER */}

            <div className="mb-5">
              <div
                className="
                flex items-center
                justify-between
                gap-3
              "
              >
                <div
                  className="
                  flex items-center
                  gap-3
                "
                >
                  <div
                    className={`
                      result-icon
                      ${popup.type === "good" ? "result-good" : "result-wrong"}
                    `}
                  >
                    {popup.type === "good" ? "✓" : "✕"}
                  </div>

                  <div>
                    <h3
                      className="
                      text-base
                      font-bold
                      text-text-heading
                    "
                    >
                      {popup.type === "good" ? "Bacaan cukup baik" : "Belum tepat"}
                    </h3>

                    <p
                      className="
                      text-xs
                      text-text-muted
                      mt-0.5
                    "
                    >
                      {popup.message}
                    </p>
                  </div>
                </div>

                <div
                  className={`
                    score-badge
                    ${popup.type === "good" ? "score-good" : "score-wrong"}
                  `}
                >
                  {formatScore(popup.score)}
                </div>
              </div>
            </div>

            {/* CORRECT */}

            <div>
              <p
                className="
                text-xs
                font-semibold
                text-text-muted
                mb-2
              "
              >
                Ayat yang benar:
              </p>

              {popup.correctSteps?.length > 0 ? (
                <p
                  className="
                    font-arabic
                    text-lg
                    leading-relaxed
                  "
                  dir="rtl"
                >
                  {popup.correctSteps.map((step, i) => (
                    <span key={`${step.word}-${i}`} className={step.ok ? "word-correct" : "word-wrong"}>
                      {step.word}{" "}
                    </span>
                  ))}
                </p>
              ) : (
                <p
                  className="
                  text-sm
                  text-text-muted
                "
                >
                  Ayat referensi tidak tersedia.
                </p>
              )}
            </div>

            <div
              className="
              h-px
              bg-border
              my-5
            "
            />

            {/* USER */}

            <div>
              <p
                className="
                text-xs
                font-semibold
                text-text-muted
                mb-2
              "
              >
                Bacaan kamu:
              </p>

              {popup.userSteps?.length > 0 ? (
                <p
                  className="
                    font-arabic
                    text-lg
                    leading-relaxed
                  "
                  dir="rtl"
                >
                  {popup.userSteps.map((step, i) => (
                    <span key={`${step.word}-${i}`} className={step.ok ? "word-correct" : "word-wrong"}>
                      {step.word}{" "}
                    </span>
                  ))}
                </p>
              ) : (
                <p
                  className="
                  text-sm
                  text-text-muted
                  italic
                "
                >
                  Tidak ada bacaan yang terdeteksi.
                </p>
              )}
            </div>

            {/* ACTIONS */}

            <div
              className="
              flex flex-col
              sm:flex-row
              gap-3
              mt-6
            "
            >
              <button
                className="
                  flex-1
                  px-4 py-3
                  bg-accent/10
                  border border-accent/25
                  rounded-custom-sm
                  text-accent
                  font-semibold
                  text-sm
                  hover:bg-accent/20
                  transition-all
                "
                onClick={retrySameAyah}
              >
                Coba Lagi
              </button>

              {popup.type === "good" && (
                <button
                  className="
                    flex-1
                    px-4 py-3
                    bg-gradient-to-br
                    from-accent
                    to-accent-2
                    border-none
                    rounded-custom-sm
                    text-white
                    font-semibold
                    text-sm
                    hover:opacity-90
                    transition-all
                  "
                  onClick={acceptGoodResult}
                >
                  Lanjut
                </button>
              )}

              {popup.type === "wrong" && (
                <button
                  className="
                    flex-1
                    px-4 py-3
                    bg-white/60
                    border border-border
                    rounded-custom-sm
                    text-text-muted
                    font-semibold
                    text-sm
                    hover:text-text-heading
                    transition-all
                  "
                  onClick={skipRevealAnyway}
                >
                  Tampilkan Ayat
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================
          STYLES
      =================================================== */}

      <style>{`
        .hafalan-reveal-box {
          text-align: justify;
          text-align-last: right;
          background: #f7f3ea;
          border: 1px solid rgba(169, 119, 47, 0.25);
          border-radius: 14px;
        }

        .hafalan-hidden-box {
          background: repeating-linear-gradient(135deg, rgba(169, 119, 47, 0.05) 0px, rgba(169, 119, 47, 0.05) 10px, transparent 10px, transparent 20px), #faf7ef;

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

          transition:
            transform 0.15s ease,
            box-shadow 0.15s ease;

          box-shadow: 0 4px 16px rgba(169, 119, 47, 0.35);
        }

        .mic-btn:active {
          transform: scale(0.94);
        }

        .mic-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .mic-btn-active {
          animation: mic-pulse 1.4s ease-in-out infinite;
        }

        @keyframes mic-pulse {
          0% {
            box-shadow: 0 0 0 0 rgba(169, 119, 47, 0.45);
          }

          70% {
            box-shadow: 0 0 0 16px rgba(169, 119, 47, 0);
          }

          100% {
            box-shadow: 0 0 0 0 rgba(169, 119, 47, 0);
          }
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

          max-width: 500px;
          width: 100%;

          max-height: 85vh;

          overflow-y: auto;

          box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
        }

        .result-icon {
          width: 38px;
          height: 38px;

          flex: 0 0 auto;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          font-size: 1.1rem;
          font-weight: 800;
        }

        .result-good {
          color: #8a6200;
          background: #fff4c2;
          border: 1px solid #e5c65c;
        }

        .result-wrong {
          color: #a52d2d;
          background: #ffe5e5;
          border: 1px solid #e0a0a0;
        }

        .score-badge {
          padding: 0.35rem 0.6rem;

          border-radius: 999px;

          font-size: 0.75rem;
          font-weight: 800;
        }

        .score-good {
          color: #765500;
          background: #fff4c2;
        }

        .score-wrong {
          color: #a52d2d;
          background: #ffe5e5;
        }

        .word-correct {
          color: #151515;
        }

        .word-wrong {
          color: #c53535;
          font-weight: 700;

          text-decoration: underline;

          text-decoration-color: rgba(197, 53, 53, 0.4);

          text-underline-offset: 4px;
        }
      `}</style>
    </div>
  );
}

/* =========================================================
   ARABIC NUMERAL
========================================================= */

function toArabicNumeral(n) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}
