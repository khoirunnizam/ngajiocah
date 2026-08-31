import PopupOverlay from './PopupOverlay';

// Popup koreksi: muncul begitu kata yang diucapkan tidak cocok dengan ayat target.
// Menampilkan perbandingan "ayat yang benar" vs "bacaan kamu (hasil pengenalan suara)".
// `result` = { correctSteps: [{word, ok}], userSteps: [{word, ok}] } dari buildWrongResult().
export default function WrongAnswerPopup({ result, onRetry, onSkip }) {
  return (
    <PopupOverlay onClose={onRetry}>
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">✗</span>
        <h3 className="text-base font-bold text-text-heading">Belum tepat, coba lagi</h3>
      </div>

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs font-semibold text-text-muted mb-2">Ayat yang benar:</p>
          <p className="font-arabic text-lg leading-relaxed" dir="rtl">
            {result.correctSteps.map((s, i) => (
              <span key={i} className={s.ok ? '' : 'diff-wrong'}>
                {' '}
                {s.word}
              </span>
            ))}
          </p>
        </div>

        <div className="h-px bg-border" />

        <div>
          <p className="text-xs font-semibold text-text-muted mb-2">Bacaan kamu (hasil pengenalan suara):</p>
          {result.userSteps.length > 0 ? (
            <p className="font-arabic text-lg leading-relaxed" dir="rtl">
              {result.userSteps.map((s, i) => (
                <span key={i} className={s.ok ? '' : 'diff-wrong'}>
                  {' '}
                  {s.word}
                </span>
              ))}
            </p>
          ) : (
            <p className="text-sm text-text-muted italic">Tidak ada suara terdeteksi.</p>
          )}
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          className="flex-1 px-4 py-2.5 bg-accent/10 border border-accent/25 rounded-custom-sm text-accent text-sm font-semibold hover:bg-accent/20 transition-all"
          onClick={onRetry}
        >
          Coba Lagi
        </button>
        <button
          className="flex-1 px-4 py-2.5 bg-white/60 border border-border rounded-custom-sm text-text-muted font-semibold text-sm hover:text-text-heading transition-all"
          onClick={onSkip}
        >
          Lewati & Tampilkan
        </button>
      </div>

      <style jsx>{`
        .diff-wrong {
          color: #b02e2e;
          font-weight: 700;
          text-decoration: underline;
          text-decoration-color: rgba(176, 46, 46, 0.4);
          text-underline-offset: 3px;
        }
      `}</style>
    </PopupOverlay>
  );
}