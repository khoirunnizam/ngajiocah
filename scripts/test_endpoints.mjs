async function test() {
  const tests = [
    'https://api.myquran.com/v2/quran/ayat/1/1-7',
    'https://api.myquran.com/v2/quran/ayat/1/1-999',
    'https://api.myquran.com/v2/quran/ayat/surat/1',
    'https://api.myquran.com/v2/quran/ayat/1',
    'https://api.myquran.com/v2/quran/ayat/page/1',
    'https://api.myquran.com/v2/quran/ayat/juz/1'
  ];

  for (const url of tests) {
    try {
      const res = await fetch(url);
      const json = await res.json();
      console.log(`URL: ${url} -> status: ${res.status}, json.status: ${json.status}, count: ${Array.isArray(json.data) ? json.data.length : 'object'}`);
    } catch (e) {
      console.log(`URL: ${url} -> ERROR: ${e.message}`);
    }
  }
}
test();
