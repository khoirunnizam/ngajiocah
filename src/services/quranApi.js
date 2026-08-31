/**
 * Quran API Service
 * Membaca data Al-Quran lokal dari myQuran.com API v2 (/data/...)
 * Sangat cepat, bebas hambatan CORS, dan bisa berjalan offline.
 */

export const EDITIONS = {
  ARABIC_UTHMANI: 'quran-uthmani',
  INDONESIAN: 'id.indonesian',
};

// ─── Cache in-memory metadata surah (114 surah) ──────────────────────────────
let surahCachePromise = null;

// ─── Internal fetch helper (Local JSON) ───────────────────────────────────────
async function localFetch(relPath) {
  const base = import.meta.env?.BASE_URL || '/';
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanPath = relPath.startsWith('/') ? relPath.slice(1) : relPath;
  const res = await fetch(`${cleanBase}${cleanPath}`);
  if (!res.ok) throw new Error(`Gagal memuat ${relPath} (${res.status})`);
  return await res.json();
}

// ─── Normalisasi surah raw → SurahMeta ───────────────────────────────────────
function normalizeSurah(raw) {
  return {
    number        : Number(raw.number),
    name          : raw.name_short,
    nameLong      : raw.name_long,
    nameId        : raw.name_id,
    nameEn        : raw.name_en,
    englishName   : raw.name_id || raw.name_en,
    translationId : raw.translation_id,
    translationEn : raw.translation_en,
    englishNameTranslation: raw.translation_id || raw.translation_en,
    numberOfAyahs : Number(raw.number_of_verses),
    revelationType: raw.revelation_id || raw.revelation_en,
  };
}

// ─── Normalisasi ayat raw → AyahData ─────────────────────────────────────────
function normalizeAyah(raw) {
  return {
    id            : Number(raw.id),
    number        : Number(raw.id),
    surahNumber   : Number(raw.surah),
    numberInSurah : Number(raw.ayah),
    page          : Number(raw.page),
    juz           : Number(raw.juz),
    arab          : raw.arab ?? '',
    text          : raw.arab ?? '',
    translation   : raw.text  ?? '',
    latin         : raw.latin ?? '',
    surah         : null,
  };
}

// ─── SURAH ────────────────────────────────────────────────────────────────────

/** Ambil daftar 114 surah (cached). */
export async function getAllSurahs() {
  if (!surahCachePromise) {
    surahCachePromise = localFetch('data/surah-all.json')
      .then(data => data.map(normalizeSurah));
  }
  return surahCachePromise;
}

/** Ambil metadata satu surah (tanpa ayat). */
export async function getSurahMeta(surahNumber) {
  const all   = await getAllSurahs();
  const found = all.find(s => s.number === Number(surahNumber));
  if (found) return found;
  return null;
}

/**
 * Ambil semua ayat satu surah lengkap.
 * @returns {Promise<{ meta: SurahMeta, ayahs: AyahData[] }>}
 */
export async function getSurah(surahNumber) {
  const num = Number(surahNumber);
  const [meta, rawAyahs] = await Promise.all([
    getSurahMeta(num),
    localFetch(`data/surah/${num}.json`),
  ]);
  const ayahs = (Array.isArray(rawAyahs) ? rawAyahs : [rawAyahs])
    .map(raw => ({ ...normalizeAyah(raw), surah: meta }));
  return { ...meta, meta, ayahs };
}

// ─── HALAMAN ──────────────────────────────────────────────────────────────────

/**
 * Ambil semua ayat dalam satu halaman mushaf (1-604).
 * @returns {Promise<{ number: number, ayahs: AyahData[], surahs: Record<number,SurahMeta> }>}
 */
export async function getPage(pageNumber) {
  const pNum = Number(pageNumber);
  const rawAyahs = await localFetch(`data/page/${pNum}.json`);
  const ayahList = Array.isArray(rawAyahs) ? rawAyahs : [];

  const surahNums = [...new Set(ayahList.map(a => Number(a.surah)))];
  const allMeta   = await getAllSurahs();
  const surahMap  = Object.fromEntries(
    surahNums.map(n => [n, allMeta.find(s => s.number === n) ?? null])
  );

  const ayahs = ayahList.map(raw => ({
    ...normalizeAyah(raw),
    surah: surahMap[Number(raw.surah)] ?? null,
  }));

  return { number: pNum, ayahs, surahs: surahMap };
}

// ─── JUZ ──────────────────────────────────────────────────────────────────────

/**
 * Ambil semua ayat dalam satu juz (1-30).
 * @returns {Promise<{ number: number, ayahs: AyahData[] }>}
 */
export async function getJuz(juzNumber) {
  const jNum = Number(juzNumber);
  const rawAyahs = await localFetch(`data/juz/${jNum}.json`);
  const ayahList = Array.isArray(rawAyahs) ? rawAyahs : [];
  const allMeta  = await getAllSurahs();
  const ayahs    = ayahList.map(raw => {
    const surahMeta = allMeta.find(s => s.number === Number(raw.surah)) ?? null;
    return { ...normalizeAyah(raw), surah: surahMeta };
  });
  return { number: jNum, ayahs };
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────

/** Kelompokkan ayat berdasarkan nomor halaman. */
export function groupByPage(ayahs) {
  return ayahs.reduce((acc, ayah) => {
    const p = ayah.page;
    if (!acc[p]) acc[p] = [];
    acc[p].push(ayah);
    return acc;
  }, {});
}

export default { getAllSurahs, getSurahMeta, getSurah, getPage, getJuz, groupByPage, EDITIONS };
