async function test() {
  const urls = [
    'http://localhost:5173/data/surah-all.json',
    'http://localhost:5173/data/surah/1.json',
    'http://localhost:5173/data/page/1.json',
    'http://localhost:5173/data/juz/1.json'
  ];

  for (const url of urls) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      console.log(`FETCH ${url}: HTTP ${res.status} -> Length: ${json.length}`);
    } catch (e) {
      console.error(`FETCH ${url} ERROR: ${e.message}`);
    }
  }
}
test();
