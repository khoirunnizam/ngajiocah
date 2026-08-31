// src/utils/arabicCompare.js
//
// Utilitas untuk mode Hafalan: menormalisasi teks Arab (menghilangkan
// harakat/tashkeel, menyamakan variasi huruf) dan membandingkan dua
// kalimat kata-per-kata (word diff) supaya bisa ditandai mana yang
// cocok dan mana yang beda antara hasil rekaman suara vs ayat asli.

/**
 * Bersihkan teks Arab: hilangkan tanda baca Quran (tashkeel, tanda waqaf,
 * tatweel), samakan variasi huruf (alef, ya, ta marbuta, hamza) supaya
 * perbandingan tidak gagal hanya karena beda gaya penulisan/ejaan hasil
 * speech-to-text.
 */
export function normalizeArabic(str = '') {
  return str
    // ── Pengecualian: lafal "الله/لله" dan bentuk berimbuhan (بالله, تالله, dst).
    // Alif kecil (dagger alif, U+0670) di sini murni tanda vokal panjang pada
    // huruf lam kedua — BUKAN representasi huruf alif tersendiri yang dielisi
    // dari rasm (beda dengan kasus مَٰلِكِ di bawah). Ejaan kata ini, baik di
    // mushaf maupun tulisan Arab pada umumnya, TIDAK PERNAH menyisipkan huruf
    // alif terpisah ("للاه") — selalu "لله"/"الله". Maka di sini alif kecil
    // dibuang saja seperti harakat biasa, DIJALANKAN SEBELUM aturan umum di
    // bawah yang mengubah alif kecil jadi huruf alif utuh.
    .replace(/ل\u0651?\u0670(?=ه)/g, (m) => m.replace(/\u0670/, ''))

    // Alif kecil di atas huruf (dagger alif / alif khanjariyah, U+0670) DIUBAH
    // JADI huruf alif biasa ('ا'), BUKAN dihapus, untuk kasus umum lainnya —
    // dagger alif mewakili SATU HURUF PENUH (bunyi "aa" panjang) yang cuma
    // ditulis ringkas dalam rasm utsmani — misalnya "مَٰلِكِ" (Al-Fatihah 1:4)
    // ditulis tanpa alif penuh, memakai alif kecil di atas huruf ل.
    // Kalau dihapus begitu saja, kata rasm "ملك" (3 huruf setelah normalisasi)
    // TIDAK AKAN PERNAH cocok dengan ejaan biasa hasil speech-to-text "مالك"
    // (4 huruf), padahal bunyi & maknanya identik. Harus diproses SETELAH
    // pengecualian الله di atas, dan SEBELUM baris penghapusan harakat di
    // bawah, supaya tidak ikut terbuang di sana.
    .replace(/\u0670/g, 'ا')
    // harakat, tanwin, sukun, tanda quran (waqaf dll), lainnya — ini murni
    // penanda bunyi pendek/berhenti (bukan huruf tersendiri), aman dihapus
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED\u08D4-\u08FF]/g, '')
    // tatweel (garis sambung)
    .replace(/\u0640/g, '')
    // samakan bentuk alef & hamza di atas/bawah alef
    .replace(/[إأآٱا]/g, 'ا')
    // alef maksura -> ya
    .replace(/ى/g, 'ي')
    // ta marbuta -> ha (biar "الرحمة" vs "الرحمه" dianggap sama)
    .replace(/ة/g, 'ه')
    // hamza di atas wawu/ya -> huruf dasarnya
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // buang selain huruf Arab & spasi (angka, tanda baca, dsb)
    .replace(/[^\u0621-\u064A\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function toWords(str) {
  const n = normalizeArabic(str);
  return n ? n.split(' ') : [];
}

/**
 * Word-level diff berbasis LCS antara array kata "benar" (a) dan
 * array kata "ucapan user" (b). Mengembalikan array langkah dengan
 * type: 'match' | 'missing' (ada di teks benar, tidak terucap/tidak
 * terdengar sama) | 'extra' (terucap tapi tidak ada di teks benar / salah).
 */
export function diffWords(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));

  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
    }
  }

  const steps = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      steps.push({ type: 'match', word: a[i] });
      i++; j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      steps.push({ type: 'missing', word: a[i] });
      i++;
    } else {
      steps.push({ type: 'extra', word: b[j] });
      j++;
    }
  }
  while (i < n) { steps.push({ type: 'missing', word: a[i] }); i++; }
  while (j < m) { steps.push({ type: 'extra', word: b[j] }); j++; }

  return steps;
}

/**
 * Bandingkan hasil ucapan (recognizedText) dengan ayat asli (correctText).
 * Return: { isCorrect, score, correctSteps, userSteps }
 * - correctSteps: langkah diff untuk ditampilkan di baris "ayat yang benar"
 * - userSteps: langkah diff untuk ditampilkan di baris "bacaan kamu"
 * - score: rasio kata yang match terhadap total kata di ayat asli
 */
export function compareRecitation(correctText, recognizedText, threshold = 0.75) {
  const correctWords = toWords(correctText);
  const userWords = toWords(recognizedText);

  if (correctWords.length === 0) {
    return { isCorrect: false, score: 0, correctSteps: [], userSteps: [] };
  }

  const steps = diffWords(correctWords, userWords);
  const matchCount = steps.filter(s => s.type === 'match').length;
  const score = matchCount / correctWords.length;

  // Susun ulang jadi dua "baris" terpisah supaya gampang dirender:
  const correctSteps = steps
    .filter(s => s.type === 'match' || s.type === 'missing')
    .map(s => ({ word: s.word, ok: s.type === 'match' }));

  const userSteps = steps
    .filter(s => s.type === 'match' || s.type === 'extra')
    .map(s => ({ word: s.word, ok: s.type === 'match' }));

  return {
    isCorrect: score >= threshold,
    score,
    correctSteps,
    userSteps,
  };
}