// src/utils/arabicCompare.js

/*
 * ============================================================
 * ARABIC COMPARE
 * ============================================================
 *
 * Perbandingan hasil Speech-to-Text dengan teks Al-Qur'an.
 *
 * Referensi teks:
 * - Rasm Utsmani
 *
 * Catatan:
 * Sistem ini menilai kemiripan TEKS hasil STT.
 * Bukan penilaian tajwid/makhraj secara langsung.
 */

/* ============================================================
   KONFIGURASI HURUF MUQATTA'AH
============================================================ */

/*
 * Semua variasi yang mungkin keluar dari Speech Recognition
 * diarahkan ke satu bentuk canonical.
 *
 * Contoh:
 *
 * "الم"
 * "ألم"
 * "الف لام ميم"
 * "ألف لام ميم"
 *
 * semuanya menjadi:
 *
 * "الم"
 */

const MUQATTAAH_ALIASES = {
  الم: ["الم", "ألم", "الف لام ميم", "ألف لام ميم", "الف لام میم", "الف لام ميم", "الفلاميم", "الفلامميم", "الفلام ميم", "الف لامميم"],

  المص: ["المص", "ألمص", "الف لام ميم صاد", "ألف لام ميم صاد", "الفلامميم صاد", "الفلام ميم صاد"],

  الر: ["الر", "الف لام را", "ألف لام را", "الف لام راء", "ألف لام راء", "الف لام ر", "ألف لام ر", "الفلامرا"],

  المر: ["المر", "الف لام ميم را", "ألف لام ميم را", "الف لام ميم راء", "ألف لام ميم راء", "الفلامميمرا"],

  كهيعص: ["كهيعص", "كاف ها يا عين صاد", "كاف ها ياء عين صاد", "كاف هاء يا عين صاد", "كاف هاء ياء عين صاد"],

  طه: ["طه", "طا ها", "طا هاء", "طاء ها", "طاء هاء"],

  طسم: ["طسم", "طا سين ميم", "طاء سين ميم", "طا سين ميم"],

  طس: ["طس", "طا سين", "طاء سين"],

  يس: ["يس", "يا سين", "ياء سين"],

  حم: ["حم", "حا ميم", "حاء ميم"],

  "حم عسق": ["حم عسق", "حا ميم عين سين قاف", "حاء ميم عين سين قاف"],

  ق: ["ق", "قاف"],

  ن: ["ن", "نون"],
};

/* ============================================================
   BASIC ARABIC NORMALIZATION
============================================================ */

/**
 * Normalisasi dasar teks Arab.
 *
 * Fungsi ini digunakan sebelum proses perbandingan.
 */
export function normalizeArabic(str = "") {
  return (
    String(str)
      /*
       * Dagger alif pada lafaz Allah (اللّٰه -> الله).
       */
      .replace(/ل\u0651?\u0670(?=ه)/g, (m) => m.replace(/\u0670/, ""))

      /*
       * Waw dengan dagger alif pada rasm Utsmani (الصَّلَوٰة -> الصلاة, الزَّكَوٰة -> الزكاة, الحَيَوٰة -> الحياة, الرِّبَوٰا -> الربا).
       */
      .replace(/و[\u0670\u065C]?[\u0627\u0671]?\u06DF?/g, (m) => (m.includes("\u0670") ? "ا" : m))

      /*
       * Alif maksura + dagger alif.
       *
       * عَلَىٰ -> علي
       */
      .replace(/ى\u0670/g, "ي")

      /*
       * Dagger alif umum (الرَّحْمَٰن -> الرحمان -> الرحمن).
       */
      .replace(/\u0670/g, "ا")

      /*
       * Harakat dan tanda baca Qur'an (fathah, kasrah, dhammah, sukun, syaddah, tanwin, tanda waqaf rasm).
       */
      .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u08D4-\u08FF]/g, "")

      /*
       * Tatweel (kashida).
       */
      .replace(/\u0640/g, "")

      /*
       * Variasi alif dan hamzah di awal/tengah.
       *
       * إ أ آ ٱ ا -> ا
       */
      .replace(/[إأآٱا]/g, "ا")

      /*
       * Alif maksura.
       */
      .replace(/ى/g, "ي")

      /*
       * Ta marbuta (ة -> ه).
       */
      .replace(/ة/g, "ه")

      /*
       * Hamzah waw / ya / standalone hamzah.
       */
      .replace(/ؤ/g, "و")
      .replace(/ئ/g, "ي")

      /*
       * Beberapa variasi huruf keyboard/STT (Persian/Urdu variants).
       */
      .replace(/ک/g, "ك")
      .replace(/ی/g, "ي")
      .replace(/ے/g, "ي")

      /*
       * Buang karakter selain Arab dan spasi.
       */
      .replace(/[^\u0621-\u064A\s]/g, "")

      /*
       * Normalisasi whitespace.
       */
      .replace(/\s+/g, " ")
      .trim()
  );
}

/* ============================================================
   NORMALIZE MUQATTA'AH
============================================================ */

/**
 * Mengubah bentuk bacaan huruf muqatta'ah
 * menjadi bentuk canonical.
 *
 * Contoh:
 *
 * "الف لام ميم"
 *        ↓
 * "الم"
 */
function normalizeMuqattaah(str = "") {
  const normalized = normalizeArabic(str);

  if (!normalized) {
    return "";
  }

  for (const [canonical, aliases] of Object.entries(MUQATTAAH_ALIASES)) {
    /*
     * Cek bentuk canonical.
     */
    if (normalizeArabic(canonical) === normalized) {
      return canonical;
    }

    /*
     * Cek semua alias.
     */
    for (const alias of aliases) {
      if (normalizeArabic(alias) === normalized) {
        return canonical;
      }
    }
  }

  return normalized;
}

/* ============================================================
   GET MUQATTA'AH CANONICAL
============================================================ */

/**
 * Mengembalikan bentuk canonical huruf muqatta'ah.
 *
 * Contoh:
 *
 * getMuqattaahCanonical("الم")
 * -> "الم"
 *
 * getMuqattaahCanonical("الف لام ميم")
 * -> "الم"
 *
 * getMuqattaahCanonical("ألف لام ميم")
 * -> "الم"
 */
function getMuqattaahCanonical(text = "") {
  const normalized = normalizeArabic(text);

  if (!normalized) {
    return null;
  }

  for (const [canonical, aliases] of Object.entries(MUQATTAAH_ALIASES)) {
    /*
     * Canonical.
     */
    if (normalizeArabic(canonical) === normalized) {
      return canonical;
    }

    /*
     * Alias.
     */
    for (const alias of aliases) {
      if (normalizeArabic(alias) === normalized) {
        return canonical;
      }
    }
  }

  return null;
}

/* ============================================================
   COMPARE MUQATTA'AH
============================================================ */

/**
 * Membandingkan ayat yang berupa huruf muqatta'ah.
 */
function compareMuqattaah(correctText, recognizedText) {
  const correctCanonical = getMuqattaahCanonical(correctText);

  /*
   * Kalau ayat bukan muqatta'ah,
   * biarkan comparator normal yang bekerja.
   */
  if (!correctCanonical) {
    return null;
  }

  const userCanonical = getMuqattaahCanonical(recognizedText);

  /*
   * STT kosong.
   */
  if (!userCanonical) {
    return {
      isCorrect: false,
      score: 0,
      status: "wrong",

      correctSteps: [
        {
          word: correctCanonical,
          ok: false,
          type: "missing",
        },
      ],

      userSteps: [],

      matchCount: 0,
      totalWords: 1,

      message: "Bacaan belum terbaca. Coba ulangi dengan suara yang jelas.",
    };
  }

  /*
   * ========================================================
   * PERBANDINGAN CANONICAL
   * ========================================================
   *
   * Contoh:
   *
   * correct = "الم"
   * user    = "الف لام ميم"
   *
   * correctCanonical = "الم"
   * userCanonical    = "الم"
   *
   * hasil:
   * isCorrect = true
   */

  if (correctCanonical === userCanonical) {
    return {
      isCorrect: true,

      score: 1,

      status: "excellent",

      correctSteps: [
        {
          word: correctCanonical,
          ok: true,
          type: "match",
        },
      ],

      userSteps: [
        {
          word: userCanonical,
          ok: true,
          type: "match",
        },
      ],

      matchCount: 1,
      totalWords: 1,

      message: "Bacaan sangat baik.",
    };
  }

  /*
   * Muqatta'ah berbeda.
   */
  return {
    isCorrect: false,

    score: 0,

    status: "wrong",

    correctSteps: [
      {
        word: correctCanonical,
        ok: false,
        type: "missing",
      },
    ],

    userSteps: [
      {
        word: normalizeArabic(recognizedText),
        ok: false,
        type: "extra",
      },
    ],

    matchCount: 0,
    totalWords: 1,

    message: "Bacaan huruf pembuka belum sesuai.",
  };
}

/* ============================================================
   WORD DIFF - LCS
============================================================ */

/**
 * Membandingkan dua array kata menggunakan LCS.
 */
export function diffWords(correctWords, userWords) {
  const n = correctWords.length;
  const m = userWords.length;

  const dp = Array.from(
    {
      length: n + 1,
    },
    () => new Array(m + 1).fill(0),
  );

  /*
   * Bangun tabel LCS.
   */
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (correctWords[i] === userWords[j]) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const steps = [];

  let i = 0;
  let j = 0;

  /*
   * Ambil hasil diff.
   */
  while (i < n && j < m) {
    if (correctWords[i] === userWords[j]) {
      steps.push({
        type: "match",

        correctWord: correctWords[i],

        userWord: userWords[j],
      });

      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      steps.push({
        type: "missing",

        correctWord: correctWords[i],

        userWord: null,
      });

      i++;
    } else {
      steps.push({
        type: "extra",

        correctWord: null,

        userWord: userWords[j],
      });

      j++;
    }
  }

  /*
   * Sisa kata ayat yang belum terbaca.
   */
  while (i < n) {
    steps.push({
      type: "missing",

      correctWord: correctWords[i],

      userWord: null,
    });

    i++;
  }

  /*
   * Sisa kata dari user.
   */
  while (j < m) {
    steps.push({
      type: "extra",

      correctWord: null,

      userWord: userWords[j],
    });

    j++;
  }

  return steps;
}

/* ============================================================
   WORD TOKENIZER
============================================================ */

/**
 * Mengubah teks menjadi array kata.
 */
function toWords(str) {
  const normalized = normalizeArabic(str);

  return normalized ? normalized.split(" ") : [];
}

/* ============================================================
   MAIN COMPARE
============================================================ */

/**
 * Fungsi utama untuk membandingkan bacaan.
 *
 * @param {string} correctText
 * @param {string} recognizedText
 * @param {number} threshold
 *
 * @returns {{
 *   isCorrect: boolean,
 *   score: number,
 *   status: string,
 *   correctSteps: Array,
 *   userSteps: Array,
 *   matchCount: number,
 *   totalWords: number,
 *   message: string
 * }}
 */
export function compareRecitation(correctText, recognizedText, threshold = 0.75) {
  /*
   * ========================================================
   * 1. CEK MUQATTA'AH TERLEBIH DAHULU
   * ========================================================
   */

  const muqattaahResult = compareMuqattaah(correctText, recognizedText);

  /*
   * Kalau merupakan muqatta'ah,
   * langsung gunakan hasil tersebut.
   */
  if (muqattaahResult) {
    return muqattaahResult;
  }

  /*
   * ========================================================
   * 2. NORMAL WORD COMPARISON
   * ========================================================
   */

  const correctWords = toWords(correctText);

  const userWords = toWords(recognizedText);

  /*
   * Ayat kosong.
   */
  if (correctWords.length === 0) {
    return {
      isCorrect: false,
      score: 0,
      status: "error",

      correctSteps: [],

      userSteps: [],

      matchCount: 0,

      totalWords: 0,

      message: "Ayat referensi tidak tersedia.",
    };
  }

  /*
   * STT kosong.
   */
  if (userWords.length === 0) {
    return {
      isCorrect: false,

      score: 0,

      status: "wrong",

      correctSteps: correctWords.map((word) => ({
        word,
        ok: false,
        type: "missing",
      })),

      userSteps: [],

      matchCount: 0,

      totalWords: correctWords.length,

      message: "Bacaan belum terbaca. Coba ulangi dengan suara yang jelas.",
    };
  }

  /*
   * ========================================================
   * 3. LCS DIFF
   * ========================================================
   */

  const steps = diffWords(correctWords, userWords);

  /*
   * ========================================================
   * 4. HITUNG KATA YANG COCOK
   * ========================================================
   */

  const matchCount = steps.filter((step) => step.type === "match").length;

  /*
   * ========================================================
   * 5. HITUNG SCORE
   * ========================================================
   */

  const score = Math.min(1, matchCount / correctWords.length);

  /*
   * ========================================================
   * 6. TENTUKAN STATUS
   * ========================================================
   */

  let status;

  if (score >= 0.9) {
    status = "excellent";
  } else if (score >= threshold) {
    status = "good";
  } else {
    status = "wrong";
  }

  /*
   * ========================================================
   * 7. AYAT BENAR
   * ========================================================
   */

  const correctSteps = steps
    .filter((step) => step.type === "match" || step.type === "missing")
    .map((step) => ({
      word: step.correctWord,

      ok: step.type === "match",

      type: step.type,
    }));

  /*
   * ========================================================
   * 8. BACAAN USER
   * ========================================================
   */

  const userSteps = steps
    .filter((step) => step.type === "match" || step.type === "extra")
    .map((step) => ({
      word: step.userWord,

      ok: step.type === "match",

      type: step.type,
    }));

  /*
   * ========================================================
   * 9. RETURN HASIL
   * ========================================================
   */

  return {
    isCorrect: score >= threshold,

    score,

    status,

    correctSteps,

    userSteps,

    matchCount,

    totalWords: correctWords.length,

    message: status === "excellent" ? "Bacaan sangat baik." : status === "good" ? "Bacaan cukup sesuai." : "Bacaan belum cukup sesuai.",
  };
}
