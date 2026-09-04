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
   KONFIGURASI HURUF MUQATTA'AH (FAWATIHUS SUWAR)
   Mencakup seluruh 14 kombinasi huruf muqatta'ah dalam 29 surat
============================================================ */

export const MUQATTAAH_ALIASES = {
  الم: [
    "الم", "ألم", "إلم", "الف لام ميم", "ألف لام ميم", "إلف لام ميم",
    "الف لام میم", "الفلاميم", "الفلامميم", "الفلام ميم", "الف لامميم",
    "الف لام مييم", "الف لا ميم", "ألف لا ميم", "الف لام مين", "ألف لام مين",
    "ال م", "ألف لام م", "الف لام م", "الفلامين", "ألفلامين"
  ],

  المص: [
    "المص", "ألمص", "الف لام ميم صاد", "ألف لام ميم صاد", "الفلامميم صاد",
    "الفلام ميم صاد", "الف لام ميم ص", "الف لام مين صاد", "ألف لام مين صاد",
    "ال مص", "الم صاد"
  ],

  الر: [
    "الر", "ألر", "الف لام را", "ألف لام را", "الف لام راء", "ألف لام راء",
    "الف لام ر", "ألف لام ر", "الفلامرا", "الف لامرا", "الفلا مرا", "الرا", "ال ر"
  ],

  المر: [
    "المر", "ألمر", "الف لام ميم را", "ألف لام ميم را", "الف لام ميم راء",
    "ألف لام ميم راء", "الف لام مين را", "ألف لام مين را", "الف لام ميم ر",
    "الفلامميمرا", "الفلام ميم را", "ال مر"
  ],

  كهيعص: [
    "كهيعص", "كاف ها يا عين صاد", "كاف ها ياء عين صاد", "كاف هاء يا عين صاد",
    "كاف هاء ياء عين صاد", "كاف ها يا ع صاد", "كاف ها ي عين صاد",
    "كاف ه يا عين صاد", "كاف ه ي عين صاد", "كاف هاء ياء عين ص", "ك ه ي ع ص"
  ],

  طه: [
    "طه", "طا ها", "طا هاء", "طاء ها", "طاء هاء", "طا ه", "طاء ه",
    "طاها", "ط ها", "ط ه"
  ],

  طسم: [
    "طسم", "طا سين ميم", "طاء سين ميم", "طا سين مييم", "طاء سين مييم",
    "طاسين ميم", "طا سين مين", "طاء سين مين", "طاسين مين", "طا س م", "ط سم"
  ],

  طس: [
    "طس", "طا سين", "طاء سين", "طاسين", "ط سين", "ط س"
  ],

  يس: [
    "يس", "يا سين", "ياء سين", "ياسين", "يا س", "ي سين", "ي س"
  ],

  ص: [
    "ص", "صاد", "صادن", "ص اد", "صا"
  ],

  حم: [
    "حم", "حا ميم", "حاء ميم", "حاميم", "حا مييم", "حاء مييم",
    "حا مين", "حاء مين", "ح م"
  ],

  عسق: [
    "عسق", "عين سين قاف", "عين سين قافن", "عين سين ق", "عين سين قا",
    "ع سين قاف", "ع س ق"
  ],

  "حم عسق": [
    "حم عسق", "حا ميم عين سين قاف", "حاء ميم عين سين قاف",
    "حاميم عين سين قاف", "حا ميم عسق", "حم ع س ق"
  ],

  ق: [
    "ق", "قاف", "قافن", "ق اف", "قا"
  ],

  ن: [
    "ن", "نون", "نونن", "ن ون", "نو"
  ],
};

/*
 * Urutan kata per huruf untuk penanganan pembacaan Muqatta'ah secara bertahap (streaming/mad panjang)
 */
export const MUQATTAAH_SEQUENCES = {
  الم: [
    ["الف", "لام", "ميم"],
    ["الف", "لا", "ميم"],
    ["الف", "لام", "مين"],
    ["الف", "لام", "مييم"],
    ["الم"]
  ],
  المص: [
    ["الف", "لام", "ميم", "صاد"],
    ["الف", "لام", "ميم", "ص"],
    ["المص"]
  ],
  الر: [
    ["الف", "لام", "را"],
    ["الف", "لام", "راء"],
    ["الف", "لام", "ر"],
    ["الر"]
  ],
  المر: [
    ["الف", "لام", "ميم", "را"],
    ["الف", "لام", "ميم", "راء"],
    ["المر"]
  ],
  كهيعص: [
    ["كاف", "ها", "يا", "عين", "صاد"],
    ["كاف", "هاء", "يا", "عين", "صاد"],
    ["كاف", "ها", "ياء", "عين", "صاد"],
    ["كاف", "هاء", "ياء", "عين", "صاد"],
    ["كاف", "ه", "ي", "عين", "صاد"],
    ["كهيعص"]
  ],
  طه: [
    ["طا", "ها"],
    ["طا", "هاء"],
    ["طاء", "ها"],
    ["طاء", "هاء"],
    ["ط", "ه"],
    ["طه"]
  ],
  طسم: [
    ["طا", "سين", "ميم"],
    ["طاء", "سين", "ميم"],
    ["طا", "سين", "مين"],
    ["طسم"]
  ],
  طس: [
    ["طا", "سين"],
    ["طاء", "سين"],
    ["طس"]
  ],
  يس: [
    ["يا", "سين"],
    ["ياء", "سين"],
    ["يس"]
  ],
  حم: [
    ["حا", "ميم"],
    ["حاء", "ميم"],
    ["حا", "مين"],
    ["حم"]
  ],
  عسق: [
    ["عين", "سين", "قاف"],
    ["عين", "سين", "ق"],
    ["عسق"]
  ],
  "حم عسق": [
    ["حا", "ميم", "عين", "سين", "قاف"],
    ["حاء", "ميم", "عين", "سين", "قاف"],
    ["حم", "عسق"]
  ],
  ص: [["صاد"], ["ص"]],
  ق: [["قاف"], ["ق"]],
  ن: [["نون"], ["ن"]],
};

/* ============================================================
   BASIC ARABIC NORMALIZATION
============================================================ */

/**
 * Normalisasi dasar teks Arab.
 * Menghilangkan harakat, tanda waqaf, dan menyelaraskan ejaan Rasm Utsmani
 * dengan output standar Speech Recognition (mis. ذٰلِكَ -> ذلك, عَلَىٰ -> علي).
 */
export function normalizeArabic(str = "") {
  let s = String(str || "");

  // 1. Dagger alif pada lafaz Allah (اللّٰه -> الله)
  s = s.replace(/ل\u0651?\u0670(?=ه)/g, "ل");

  // 2. Alif maksura + dagger alif (عَلَىٰ, إِلَىٰ, حَتَّىٰ, بَلَىٰ, مُوسَىٰ, etc.) -> jadikan ى biasa tanpa dagger alif
  s = s.replace(/ى[\u0670\u065C\u06DF]?/g, "ى");

  // 3. Waw dengan dagger alif pada rasm Utsmani (الصَّلَوٰة -> الصلاة, الزَّكَوٰة -> الزكاة, الحَيَوٰة -> الحياة, الرِّبَوٰا -> الربا)
  s = s.replace(/و[\u0670\u065C]?[\u0627\u0671]?\u06DF?/g, (m) => (m.includes("\u0670") ? "ا" : m));

  // 4. Kata tunjuk / partikel khusus yang di Rasm Utsmani memakai dagger alif tapi di bahasa Arab standar / STT tanpa alif:
  // ذَٰلِكَ, ذَٰلِكُمْ -> ذلك, ذلكم
  s = s.replace(/ذ[\u064B-\u065F]*\u0670[\u064B-\u065F]*ل/g, "ذل");
  // هَٰذَا, هَٰذِهِ, هَٰؤُلَاءِ -> هذا, هذه, هؤلاء
  s = s.replace(/ه[\u064B-\u065F]*\u0670[\u064B-\u065F]*(?=[ذهؤ])/g, "ه");
  // أُو۟لَٰٓئِكَ -> اولئك
  s = s.replace(/ل[\u064B-\u065F]*\u0670[\u064B-\u065F\u0653\u0654]*(?=[\u0626ئ])/g, "ل");
  // لَٰكِن, لَٰكِنَّ -> لكن
  s = s.replace(/ل[\u064B-\u065F]*\u0670[\u064B-\u065F]*ك/g, "لك");
  // إِلَٰه -> اله
  s = s.replace(/ل[\u064B-\u065F]*\u0670[\u064B-\u065F]*ه/g, "له");
  // الرَّحْمَٰن -> الرحمن
  s = s.replace(/م[\u064B-\u065F]*\u0670[\u064B-\u065F]*ن/g, "من");

  // 5. Dagger alif umum lainnya (كِتَٰب -> كتاب, صَٰلِح -> صالح, etc.)
  s = s.replace(/\u0670/g, "ا");

  // 6. Buang semua harakat dan tanda baca Qur'an (fathah, kasrah, dhammah, sukun, syaddah, tanwin, tanda waqaf rasm)
  s = s.replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u08D4-\u08FF]/g, "");

  // 7. Tatweel (kashida)
  s = s.replace(/\u0640/g, "");

  // 8. Variasi alif dan hamzah di awal/tengah (إ أ آ ٱ ا -> ا)
  s = s.replace(/[إأآٱا]/g, "ا");

  // 9. Alif maksura dan ya (ى -> ي)
  s = s.replace(/ى/g, "ي");

  // 10. Ta marbuta (ة -> ه)
  s = s.replace(/ة/g, "ه");

  // 11. Hamzah waw / ya / standalone hamzah
  s = s.replace(/ؤ/g, "و");
  s = s.replace(/ئ/g, "ي");

  // 12. Variasi huruf keyboard / STT (Persian/Urdu variants)
  s = s.replace(/ک/g, "ك");
  s = s.replace(/ی/g, "ي");
  s = s.replace(/ے/g, "ي");

  // 13. Buang karakter selain Arab dan spasi
  s = s.replace(/[^\u0621-\u064A\s]/g, "");

  // 14. Normalisasi whitespace
  s = s.replace(/\s+/g, " ").trim();

  // 15. Penyelarasan kata-kata yang kerap memiliki selisih alif antara tulisan klasik vs STT modern:
  const words = s.split(" ").filter(Boolean);
  const fixedWords = words.map((w) => {
    if (w.startsWith("ذال") && w.length >= 4) return w.replace(/^ذال/, "ذل"); // ذالك -> ذلك, ذالكم -> ذلكم
    if (w === "هاذا") return "هذا";
    if (w === "هاذه") return "هذه";
    if (w === "هاولاء") return "هولاء";
    if (w === "اولائك") return "اولئك";
    if (w.startsWith("لاكن")) return w.replace(/^لاكن/, "لكن"); // لاكن -> لكن, لاكنه -> لكنه
    if (w.startsWith("الاه")) return w.replace(/^الاه/, "اله"); // الاه -> اله, الاهنا -> الهنا
    if (w === "الرحمان") return "الرحمن";
    return w;
  });

  return fixedWords.join(" ");
}

/* ============================================================
   NORMALIZE MUQATTA'AH (FAWATIHUS SUWAR IN TEXT)
============================================================ */

/**
 * Mengubah bentuk bacaan ejaan huruf muqatta'ah di dalam kalimat
 * menjadi bentuk canonical rasm Utsmani Al-Qur'an.
 *
 * Contoh:
 * "الف لام ميم" -> "الم"
 * "كاف ها يا عين صاد" -> "كهيعص"
 * "صاد والقران ذي الذكر" -> "ص والقران ذي الذكر"
 * "قاف والقران المجيد" -> "ق والقران المجيد"
 * "نون والقلم وما يسطرون" -> "ن والقلم وما يسطرون"
 */
export function normalizeMuqattaahInText(text = "") {
  let normalized = normalizeArabic(text);
  if (!normalized) return "";

  // Multi-word replacements in priority order (longest patterns first)
  const phraseReplacements = [
    // حم عسق
    { canonical: "حم عسق", pattern: /(?:^|\s)(?:حا|حاء)\s+(?:ميم|مين|مييم)\s+(?:عين|ع)\s+(?:سين|س)\s+(?:قاف|ق)(?=\s|$)/g },
    // كهيعص
    { canonical: "كهيعص", pattern: /(?:^|\s)كاف\s+(?:ها|هاء|ه)\s+(?:يا|ياء|ي)\s+(?:عين|ع)\s+(?:صاد|ص)(?=\s|$)/g },
    // المص
    { canonical: "المص", pattern: /(?:^|\s)(?:الف|ال)\s+(?:لام|لا)\s+(?:ميم|مين|مييم)\s+(?:صاد|ص)(?=\s|$)/g },
    // المر
    { canonical: "المر", pattern: /(?:^|\s)(?:الف|ال)\s+(?:لام|لا)\s+(?:ميم|مين|مييم)\s+(?:را|راء|ر)(?=\s|$)/g },
    // طسم
    { canonical: "طسم", pattern: /(?:^|\s)(?:طا|طاء)\s+(?:سين|س)\s+(?:ميم|مين|مييم)(?=\s|$)/g },
    // عسق
    { canonical: "عسق", pattern: /(?:^|\s)(?:عين|ع)\s+(?:سين|س)\s+(?:قاف|ق)(?=\s|$)/g },
    // الم
    { canonical: "الم", pattern: /(?:^|\s)(?:الف|ال)\s+(?:لام|لا)\s+(?:ميم|مين|مييم)(?=\s|$)/g },
    // الر
    { canonical: "الر", pattern: /(?:^|\s)(?:الف|ال)\s+(?:لام|لا)\s+(?:را|راء|ر)(?=\s|$)/g },
    // طس
    { canonical: "طس", pattern: /(?:^|\s)(?:طا|طاء)\s+(?:سين|س)(?=\s|$)/g },
    // طه
    { canonical: "طه", pattern: /(?:^|\s)(?:طا|طاء)\s+(?:ها|هاء|ه)(?=\s|$)/g },
    // يس
    { canonical: "يس", pattern: /(?:^|\s)(?:يا|ياء|ي)\s+(?:سين|س)(?=\s|$)/g },
    // حم
    { canonical: "حم", pattern: /(?:^|\s)(?:حا|حاء)\s+(?:ميم|مين|مييم)(?=\s|$)/g },
  ];

  for (const { canonical, pattern } of phraseReplacements) {
    normalized = normalized.replace(pattern, (match) => {
      const leadingSpace = match.startsWith(" ") ? " " : "";
      return leadingSpace + canonical;
    });
  }

  // Single fused words
  const singleWordMap = {
    ياسين: "يس",
    طاها: "طه",
    حاميم: "حم",
    طاسين: "طس",
    طاسينميم: "طسم",
    الفلاميم: "الم",
    الفلامميم: "الم",
    الفلامرا: "الر",
    الفلامميمرا: "المر",
  };

  const words = normalized.split(/\s+/).filter(Boolean);
  const mappedWords = words.map((w, idx) => {
    if (singleWordMap[w]) return singleWordMap[w];
    // Surat yang diawali huruf tunggal Fawatih (Shad, Qaf, Nun)
    if (idx === 0) {
      if (w === "صاد" || w === "صادن") return "ص";
      if (w === "قاف" || w === "قافن") return "ق";
      if (w === "نون" || w === "نونن") return "ن";
    }
    return w;
  });

  return mappedWords.join(" ");
}

/* ============================================================
   GET MUQATTA'AH CANONICAL
============================================================ */

/**
 * Mengembalikan bentuk canonical huruf muqatta'ah bila teks berupa muqatta'ah murni.
 */
export function getMuqattaahCanonical(text = "") {
  const normalized = normalizeArabic(text);
  if (!normalized) return null;

  for (const [canonical, aliases] of Object.entries(MUQATTAAH_ALIASES)) {
    if (normalizeArabic(canonical) === normalized) {
      return canonical;
    }
    for (const alias of aliases) {
      if (normalizeArabic(alias) === normalized) {
        return canonical;
      }
    }
  }

  // Cek via normalizeMuqattaahInText
  const inText = normalizeMuqattaahInText(text);
  if (inText && MUQATTAAH_ALIASES[inText]) {
    return inText;
  }

  return null;
}

/**
 * Cek apakah dua kata/token adalah variasi dari huruf muqatta'ah yang sama.
 */
export function isMuqattaahWordMatch(a = "", b = "") {
  if (!a || !b) return false;
  const normA = normalizeArabic(a);
  const normB = normalizeArabic(b);
  if (normA === normB) return true;

  const canonA = getMuqattaahCanonical(a);
  const canonB = getMuqattaahCanonical(b);
  if (canonA && canonB && canonA === canonB) return true;
  if (canonA && normB === normalizeArabic(canonA)) return true;
  if (canonB && normA === normalizeArabic(canonB)) return true;

  return false;
}

/**
 * Memeriksa apakah antrean kata yang diucapkan (`spokenWords`) cocok
 * atau sedang dalam proses membaca urutan huruf Muqatta'ah (`targetWord`).
 *
 * Mengembalikan:
 * - { status: "full", consumedCount: n } -> semua huruf muqatta'ah selesai dibaca
 * - { status: "partial", neededCount: m } -> user baru membaca sebagian huruf (mis. baru "الف" untuk "الم"), JANGAN disalahkan
 * - { status: "none" } -> tidak ada kecocokan sama sekali
 */
export function matchMuqattaahSequence(spokenWords = [], targetWord = "") {
  if (!spokenWords || !spokenWords.length || !targetWord) return { status: "none" };

  const canonical = getMuqattaahCanonical(targetWord) || targetWord;
  const sequences = MUQATTAAH_SEQUENCES[canonical];
  if (!sequences) {
    return { status: "none" };
  }

  const cleanSpoken = spokenWords.map((w) => normalizeArabic(w)).filter(Boolean);
  if (!cleanSpoken.length) return { status: "none" };

  // Cek apakah ada sequence yang cocok penuh atau parsial
  for (const seq of sequences) {
    const cleanSeq = seq.map((w) => normalizeArabic(w));

    // Cek kecocokan penuh
    if (cleanSpoken.length >= cleanSeq.length) {
      let isFullMatch = true;
      for (let i = 0; i < cleanSeq.length; i++) {
        if (cleanSpoken[i] !== cleanSeq[i] && !isMuqattaahWordMatch(cleanSpoken[i], cleanSeq[i])) {
          isFullMatch = false;
          break;
        }
      }
      if (isFullMatch) {
        return { status: "full", consumedCount: cleanSeq.length, canonical };
      }
    }

    // Cek kecocokan parsial (misal spokenWords baru ["الف"] dan seq adalah ["الف", "لام", "ميم"])
    if (cleanSpoken.length < cleanSeq.length) {
      let isPartialMatch = true;
      for (let i = 0; i < cleanSpoken.length; i++) {
        if (cleanSpoken[i] !== cleanSeq[i] && !isMuqattaahWordMatch(cleanSpoken[i], cleanSeq[i])) {
          isPartialMatch = false;
          break;
        }
      }
      if (isPartialMatch) {
        return { status: "partial", neededCount: cleanSeq.length - cleanSpoken.length, canonical };
      }
    }
  }

  return { status: "none" };
}

/* ============================================================
   SMART TRANSCRIPT DELTA EXTRACTION
   Mencegah penggandaan / pengulangan teks hasil Speech Recognition
   pada browser HP (Android Chrome / iOS Safari)
============================================================ */

/**
 * Mengambil hanya potongan teks BARU dari hasil speech recognition
 * tanpa mengulang kata-kata yang sudah ada sebelumnya.
 */
export function getTranscriptDelta(prevText = "", newText = "") {
  const cleanPrev = (prevText || "").trim();
  const cleanNew = (newText || "").trim();
  if (!cleanNew) return "";
  if (!cleanPrev) return cleanNew;
  if (cleanNew === cleanPrev) return "";

  // Jika newText adalah perpanjangan langsung dari prevText
  if (cleanNew.startsWith(cleanPrev)) {
    return cleanNew.slice(cleanPrev.length).trim();
  }

  // Cek tumpang tindih kata (overlap di ujung prev dan awal new)
  const prevWords = cleanPrev.split(/\s+/).filter(Boolean);
  const newWords = cleanNew.split(/\s+/).filter(Boolean);

  const maxOverlap = Math.min(prevWords.length, newWords.length);
  for (let overlap = maxOverlap; overlap > 0; overlap--) {
    let matches = true;
    for (let k = 0; k < overlap; k++) {
      if (prevWords[prevWords.length - overlap + k] !== newWords[k]) {
        matches = false;
        break;
      }
    }
    if (matches) {
      return newWords.slice(overlap).join(" ");
    }
  }

  // Jika seluruh newText sudah ada di dalam prevText (jitter/interim subset dari HP)
  if (cleanPrev.includes(cleanNew)) {
    return "";
  }

  return cleanNew;
}

/* ============================================================
   COMPARE MUQATTA'AH
============================================================ */

/**
 * Membandingkan ayat yang berupa huruf muqatta'ah.
 */
export function compareMuqattaah(correctText, recognizedText) {
  const correctCanonical = getMuqattaahCanonical(correctText);

  // Kalau ayat bukan muqatta'ah murni, biarkan comparator normal yang bekerja
  if (!correctCanonical) {
    return null;
  }

  const userCanonical = getMuqattaahCanonical(recognizedText);

  // STT kosong
  if (!userCanonical && !recognizedText.trim()) {
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
          word: userCanonical || correctCanonical,
          ok: true,
          type: "match",
        },
      ],
      matchCount: 1,
      totalWords: 1,
      message: "Bacaan sangat baik.",
    };
  }

  // Muqatta'ah berbeda
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
      if (correctWords[i] === userWords[j] || isMuqattaahWordMatch(correctWords[i], userWords[j])) {
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
    if (correctWords[i] === userWords[j] || isMuqattaahWordMatch(correctWords[i], userWords[j])) {
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

  while (i < n) {
    steps.push({
      type: "missing",
      correctWord: correctWords[i],
      userWord: null,
    });
    i++;
  }

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
 * Mengubah teks menjadi array kata yang telah dinormalisasi muqatta'ah.
 */
function toWords(str) {
  const normalized = normalizeMuqattaahInText(str);
  return normalized ? normalized.split(" ").filter(Boolean) : [];
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
   * 1. CEK MUQATTA'AH MURNI TERLEBIH DAHULU
   */
  const muqattaahResult = compareMuqattaah(correctText, recognizedText);
  if (muqattaahResult) {
    return muqattaahResult;
  }

  /*
   * 2. NORMAL WORD COMPARISON (dengan normalisasi muqatta'ah di awal ayat)
   */
  const correctWords = toWords(correctText);
  const userWords = toWords(recognizedText);

  // Ayat kosong
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

  // STT kosong
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
   * 3. LCS DIFF
   */
  const steps = diffWords(correctWords, userWords);

  /*
   * 4. HITUNG KATA YANG COCOK
   */
  const matchCount = steps.filter((step) => step.type === "match").length;

  /*
   * 5. HITUNG SCORE
   */
  const score = Math.min(1, matchCount / correctWords.length);

  /*
   * 6. TENTUKAN STATUS
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
   * 7. AYAT BENAR
   */
  const correctSteps = steps
    .filter((step) => step.type === "match" || step.type === "missing")
    .map((step) => ({
      word: step.correctWord,
      ok: step.type === "match",
      type: step.type,
    }));

  /*
   * 8. BACAAN USER
   */
  const userSteps = steps
    .filter((step) => step.type === "match" || step.type === "extra")
    .map((step) => ({
      word: step.userWord,
      ok: step.type === "match",
      type: step.type,
    }));

  /*
   * 9. RETURN HASIL
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

