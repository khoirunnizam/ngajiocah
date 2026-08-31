# Migrasi ke Tailwind CSS

## 📋 Perubahan yang Telah Dilakukan

### 1. **Instalasi dan Konfigurasi**
- ✅ Ditambahkan Tailwind CSS, PostCSS, dan Autoprefixer ke `package.json`
- ✅ Dibuat file `tailwind.config.js` dengan konfigurasi custom untuk proyek
- ✅ Dibuat file `postcss.config.js` untuk mengintegrasikan Tailwind
- ✅ Diupdate `src/index.css` untuk mengimpor Tailwind dan menghapus CSS lama

### 2. **Komponen yang Dikonversi**

#### **Header.jsx** → Tailwind
- Header sticky dengan backdrop blur
- Logo dengan gradient text
- Navigation dengan state active menggunakan Tailwind classes
- **File dihapus:** `Header.module.css`

#### **Footer.jsx** → Tailwind
- Layout footer dengan flexbox
- Styling link dan gradient text
- **File dihapus:** `Footer.module.css`

#### **HomePage.jsx** → Tailwind
- Hero section dengan background gradient
- Search box dengan glass effect
- Filter toggle buttons
- Grid layout untuk surah/juz cards
- Responsive design untuk mobile
- **File dihapus:** `HomePage.module.css`

#### **MushafPage.jsx** → Tailwind
- Toolbar dengan glass effect
- Mushaf book dengan styling Quran
- Arabic text dengan font Amiri
- Pagination dengan dot navigation
- Responsive styling
- **File dihapus:** `MushafPage.module.css`

#### **Layout.jsx** → Tailwind
- Layout utama dengan flexbox
- Custom scrollbar styling
- Page spacing utility

### 3. **Custom Tailwind Configuration**

#### **Custom Colors** (sesuai dengan design tokens lama):
```javascript
bg: '#0d0f1a',
'bg-card': '#131627',
'bg-glass': 'rgba(19,22,39,0.8)',
border: 'rgba(255,255,255,0.07)',
'accent': '#4f8cff',
'accent-2': '#a78bfa',
'accent-gold': '#f0c060',
'text-heading': '#eef1fc',
'text-muted': '#6b7a99',
```

#### **Custom Utilities:**
- `rounded-custom` (14px) dan `rounded-custom-sm` (8px)
- Font families: `font-sans` (Outfit) dan `font-arabic` (Amiri)
- Backdrop blur utilities
- Custom spacing dan sizing

#### **Plugins:**
- `dir-rtl` utility untuk Arabic text
- `bg-glass` utility untuk glass effect
- `scrollbar-custom` utility untuk custom scrollbar

### 4. **Cleanup**
- ✅ Dihapus semua file `.module.css` yang sudah tidak digunakan
- ✅ Diupdate semua import di komponen untuk menghapus CSS module imports
- ✅ Dioptimalkan struktur file dan kode

## 🎨 Keuntungan Migrasi ke Tailwind

### **Keuntungan:**
1. **Consistency** - Warna, spacing, dan typography konsisten di seluruh aplikasi
2. **Performance** - CSS bundle size lebih kecil dengan PurgeCSS
3. **Developer Experience** - Tidak perlu berpindah antara file CSS dan JSX
4. **Responsive Design** - Utility classes memudahkan responsive design
5. **Maintainability** - Design system terpusat di `tailwind.config.js`

### **Pola yang Digunakan:**
1. **Glass Effect** - Menggunakan utility `bg-glass` yang didefinisikan di config
2. **Gradient Text** - Menggunakan `bg-gradient-to-br` dengan `bg-clip-text text-transparent`
3. **Border Animation** - Menggunakan `transition-all` dengan hover states
4. **Responsive Grid** - Menggunakan `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`

## 🔧 Cara Menjalankan Proyek

### Instalasi Dependencies:
```bash
# Setelah package.json diupdate, jalankan:
npm install
```

### Development:
```bash
npm run dev
```

### Build:
```bash
npm run build
```

## 📱 Responsive Breakpoints

- **Mobile (< 640px)**: Grid 1 kolom, search form vertikal
- **Tablet (640px - 1024px)**: Grid 2 kolom
- **Desktop (> 1024px)**: Grid 3 kolom

## 🎯 Tips Pengembangan

1. Gunakan utility classes yang sudah didefinisikan di config
2. Untuk warna custom, gunakan prefix yang sudah ada (bg-, text-, border-)
3. Gunakan responsive prefixes (sm:, md:, lg:) untuk mobile-first design
4. Untuk efek glass, gunakan class `glass` atau `bg-glass`

## 🔄 Perubahan yang Mungkin Diperlukan

Jika ada masalah build:
1. Pastikan Tailwind dependencies sudah terinstall: `npm install`
2. Periksa jika ada import CSS module yang tersisa
3. Jalankan build dengan `npm run build` untuk melihat error