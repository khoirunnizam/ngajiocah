import { useState } from "react";
import { useNavigate } from "react-router-dom";

const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbzUZjiAGityqEnDhCkRXs8miLCSR_vLmDIfCKnwC5pawMrVfmVaXT7i-ovxRGtAR2Jw/exec";

export default function AduanPage() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nama: "",
    pesan: "",
  });

  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // 'success' | 'error' | null

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    try {
      const formPayload = new URLSearchParams();
      formPayload.append("nama", formData.nama);
      formPayload.append("pesan", formData.pesan);

      await fetch(SHEET_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: formPayload.toString(),
      });

      setStatus("success");
      setFormData({ nama: "", pesan: "" });
    } catch (error) {
      console.error("Error submitting form:", error);
      setStatus("error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container px-4 sm:px-6">
      {/* Hero Section */}
      <div className="container px-4 sm:px-6">
        {/* Hero Section */}
        <div className="relative text-center pt-10 pb-6 md:pt-16 md:pb-10 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-b from-accent/10 via-transparent to-transparent pointer-events-none" />

          <span className="badge badge-gold inline-block mb-3 px-3 py-1 text-xs sm:text-sm font-medium">Komunitas & Apresiasi</span>

          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-text-heading tracking-tight mb-3 bg-gradient-to-br from-text-heading to-accent bg-clip-text text-transparent">Saran & Masukan</h1>
        </div>

        {/* Pesan Personal Card */}
        <div className="max-w-3xl mx-auto mb-10">
          <div className="glass p-6 sm:p-8 border border-border/80 relative overflow-hidden shadow-sm">
            {/* Ornamen Latar */}
            <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-accent/5 rounded-full blur-2xl pointer-events-none" />

            {/* Header Salam */}
            <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border/60">
              <span className="text-2xl">👋</span>
              <h2 className="text-lg sm:text-xl font-bold text-text-heading">Halo Semuanya!</h2>
            </div>

            {/* Isi Cerita */}
            <div className="space-y-4 text-sm sm:text-base text-text-muted leading-relaxed">
              <p>
                Aplikasi ini berawal dari kebutuhan pribadi saya sebagai seorang mahasiswa di <span className="text-accent font-semibold">UIN Sayyid Ali Rahmatullah Tulungagung (UIN SATU)</span> yang ingin memiliki <span className="text-accent font-semibold">tool simpel untuk muraja'ah dan menghafal Al-Qur'an</span> di sela-sela kesibukan kuliah.
              </p>

              <p>
                Daripada hanya digunakan sendiri, saya memutuskan untuk mengembangkannya lebih lanjut agar bisa diakses dan digunakan oleh siapa saja. Harapannya, aplikasi ini bisa menjadi sarana yang bermanfaat bagi kita semua dalam menjaga hafalan Al-Qur'an.
              </p>

              {/* Box Highlight Permintaan Feedback */}
              <div className="p-4 bg-accent/10 border border-accent/25 rounded-custom-sm text-text-heading my-2">
                <p className="text-xs sm:text-sm font-medium text-text-heading">
                  💡 <strong className="text-accent font-semibold">Bantu Sempurnakan:</strong> Karena aplikasi ini masih dalam tahap pengembangan mandiri, jika Anda sempat mencobanya, saya akan sangat berterima kasih atas saran, masukan, maupun laporan jika menemukan <span className="underline decoration-accent/50">error atau kendala teknis</span>.
                </p>
              </div>

              <p className="pt-1 text-xs sm:text-sm font-medium text-text-heading"> Setiap masukan dari Anda akan sangat berharga untuk pengembangan aplikasi ini ke depannya. Terima kasih banyak, semoga bermanfaat! 🙏✨</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-2xl mx-auto pb-12">
        {/* Tombol Kembali */}
        <button type="button" onClick={() => navigate("/")} className="inline-flex items-center gap-2 text-sm font-medium text-text-muted hover:text-accent mb-6 transition-all active:scale-95 cursor-pointer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali ke Beranda
        </button>

        {/* Card Form bertema Glass */}
        <div className="glass p-6 sm:p-8 border border-border">
          {/* Header Card */}
          <div className="flex items-center gap-3.5 mb-6 border-b border-border pb-4">
            <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-accent/20 to-accent-2/20 border border-accent/30 text-accent flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-text-heading">Kirimkan Masukan</h2>
              <p className="text-xs sm:text-sm text-text-muted">Suara Anda sangat berharga bagi pengembangan aplikasi ini.</p>
            </div>
          </div>

          {/* Alert Success */}
          {status === "success" && (
            <div className="mb-6 p-4 bg-accent/10 border border-accent/30 text-text-heading rounded-custom-sm flex items-start gap-3">
              <span className="badge badge-gold font-bold flex-shrink-0">✓</span>
              <div>
                <p className="font-semibold text-sm text-accent">Saran Berhasil Terkirim!</p>
                <p className="text-xs text-text-muted mt-0.5">Terima kasih atas saran dan kontribusi yang Anda berikan.</p>
              </div>
            </div>
          )}

          {/* Alert Error */}
          {status === "error" && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 text-text-heading rounded-custom-sm flex items-start gap-3">
              <span className="badge bg-red-500/20 text-red-500 border border-red-500/30 font-bold flex-shrink-0">⚠</span>
              <div>
                <p className="font-semibold text-sm text-red-500">Gagal Mengirimkan Saran</p>
                <p className="text-xs text-text-muted mt-0.5">Terjadi kesalahan koneksi. Silakan coba beberapa saat lagi.</p>
              </div>
            </div>
          )}

          {/* Form Utama */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="nama" className="block text-sm font-medium text-text-heading mb-1.5">
                Nama <span className="text-text-muted text-xs font-normal">(Boleh dikosongkan / Anonim)</span>
              </label>
              <input
                type="text"
                id="nama"
                name="nama"
                value={formData.nama}
                onChange={handleChange}
                placeholder="Masukkan nama Anda (kosongkan jika anonim)"
                className="w-full px-4 py-3 bg-white/60 border border-border rounded-custom-sm text-text-heading text-base sm:text-sm outline-none placeholder:text-text-muted focus:border-border-glow focus:ring-3 focus:ring-accent/12 transition-all"
              />
            </div>

            <div>
              <label htmlFor="pesan" className="block text-sm font-medium text-text-heading mb-1.5">
                Isi Saran
              </label>
              <textarea
                id="pesan"
                name="pesan"
                rows="5"
                required
                value={formData.pesan}
                onChange={handleChange}
                placeholder="Tuliskan saran, masukan, atau kritik membangun Anda di sini..."
                className="w-full px-4 py-3 bg-white/60 border border-border rounded-custom-sm text-text-heading text-base sm:text-sm outline-none placeholder:text-text-muted focus:border-border-glow focus:ring-3 focus:ring-accent/12 transition-all resize-none"
              ></textarea>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center gap-2 w-full py-3 bg-gradient-to-br from-accent to-accent-2 border-none rounded-custom-sm text-white text-sm font-semibold hover:opacity-90 hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-md"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Mengirim...</span>
                </>
              ) : (
                <>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                  <span>Kirim Saran</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
