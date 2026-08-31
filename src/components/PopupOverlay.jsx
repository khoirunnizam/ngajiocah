// Wrapper umum untuk semua popup modal di halaman mushaf: overlay gelap + kartu
// putih di tengah. Klik di luar kartu memanggil onClose; klik di dalam kartu
// tidak menutup (stopPropagation).
export default function PopupOverlay({ onClose, children }) {
    return (
      <div className="popup-overlay" onClick={onClose}>
        <div className="popup-card" onClick={(e) => e.stopPropagation()}>
          {children}
        </div>
  
        <style jsx>{`
          .popup-overlay {
            position: fixed;
            inset: 0;
            background: rgba(36, 31, 24, 0.55);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 1rem;
            z-index: 50;
          }
          .popup-card {
            background: #fffdf8;
            border-radius: 16px;
            padding: 1.75rem;
            max-width: 480px;
            width: 100%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: 0 24px 60px rgba(0, 0, 0, 0.3);
          }
        `}</style>
      </div>
    );
  }