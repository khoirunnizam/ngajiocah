import fs from 'fs';
import path from 'path';

const BASE_URL = 'https://api.myquran.com/v2';
const OUTPUT_DIR = path.resolve('public/data');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, maxAttempts = 10) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      if (res.status === 429) {
        console.warn(`Rate limit (429) on ${url}, waiting 3s before retry ${attempt}...`);
        await sleep(3000);
        continue;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.status) throw new Error(`API status false: ${JSON.stringify(json)}`);
      return json.data;
    } catch (e) {
      if (attempt === maxAttempts) throw e;
      console.warn(`Error on ${url} (${e.message}), retry ${attempt} in 2s...`);
      await sleep(2000);
    }
  }
}

async function main() {
  fs.mkdirSync(path.join(OUTPUT_DIR, 'surah'), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'page'), { recursive: true });
  fs.mkdirSync(path.join(OUTPUT_DIR, 'juz'), { recursive: true });

  const surahAllPath = path.join(OUTPUT_DIR, 'surah-all.json');
  let surahs;
  if (!fs.existsSync(surahAllPath)) {
    console.log('Downloading surah list...');
    surahs = await fetchWithRetry(`${BASE_URL}/quran/surat/all`);
    fs.writeFileSync(surahAllPath, JSON.stringify(surahs, null, 2));
  } else {
    surahs = JSON.parse(fs.readFileSync(surahAllPath, 'utf8'));
    console.log(`Loaded existing surah-all.json (${surahs.length} surahs)`);
  }

  console.log('Downloading 604 pages (resumable)...');
  const allAyahs = [];
  const surahMap = {};
  const juzMap = {};
  for (let i = 1; i <= 114; i++) surahMap[i] = [];
  for (let j = 1; j <= 30; j++) juzMap[j] = [];

  for (let p = 1; p <= 604; p++) {
    const pageFile = path.join(OUTPUT_DIR, 'page', `${p}.json`);
    let pageAyahs;
    if (fs.existsSync(pageFile)) {
      try {
        pageAyahs = JSON.parse(fs.readFileSync(pageFile, 'utf8'));
      } catch {
        pageAyahs = null;
      }
    }

    if (!pageAyahs || !Array.isArray(pageAyahs) || pageAyahs.length === 0) {
      pageAyahs = await fetchWithRetry(`${BASE_URL}/quran/ayat/page/${p}`);
      const arr = Array.isArray(pageAyahs) ? pageAyahs : [pageAyahs];
      fs.writeFileSync(pageFile, JSON.stringify(arr));
      pageAyahs = arr;
      await sleep(150); // Polite 150ms delay
    }

    for (const a of pageAyahs) {
      allAyahs.push(a);
      const sNum = Number(a.surah);
      const jNum = Number(a.juz);
      if (surahMap[sNum]) surahMap[sNum].push(a);
      if (juzMap[jNum]) juzMap[jNum].push(a);
    }

    if (p % 30 === 0 || p === 604 || p === 1) {
      console.log(`Progress: Page ${p}/604 (${allAyahs.length} ayahs)...`);
    }
  }

  console.log(`\nAll 604 pages ready! Total Ayahs collected: ${allAyahs.length}/6236`);

  console.log('Generating 114 surah JSON files...');
  for (let i = 1; i <= 114; i++) {
    surahMap[i].sort((a, b) => Number(a.ayah) - Number(b.ayah));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'surah', `${i}.json`), JSON.stringify(surahMap[i]));
  }

  console.log('Generating 30 juz JSON files...');
  for (let j = 1; j <= 30; j++) {
    juzMap[j].sort((a, b) => Number(a.id) - Number(b.id));
    fs.writeFileSync(path.join(OUTPUT_DIR, 'juz', `${j}.json`), JSON.stringify(juzMap[j]));
  }

  console.log('ALL Quran JSON data successfully downloaded and generated locally!');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
