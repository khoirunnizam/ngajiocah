import { useState } from "react";

import { ClipboardList, Send } from "lucide-react";

export default function AduanForm({ endpoint }) {
  const [name, setName] = useState("");

  const [contact, setContact] = useState("");

  const [message, setMessage] = useState("");

  const [loading, setLoading] = useState(false);

  const [status, setStatus] = useState("");

  async function submitFeedback() {
    if (!message.trim()) {
      return;
    }

    try {
      setLoading(true);

      setStatus("");

      await fetch(endpoint, {
        method: "POST",

        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },

        body: JSON.stringify({
          formType: "feedback",

          id: Date.now().toString(),

          type: "masukan",

          name: name.trim() || "Hamba Allah",

          contact: contact.trim(),

          message: message.trim(),
        }),
      });

      setName("");

      setContact("");

      setMessage("");

      setStatus("Aduan berhasil dikirim. Terima kasih!");
    } catch (error) {
      console.error(error);

      setStatus("Gagal mengirim aduan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text-heading">
          <ClipboardList size={18} className="text-accent" />
          Aduan & Masukan
        </h2>

        <p className="mt-1 text-sm text-text-muted">Sampaikan kritik, saran, atau laporan kepada kami.</p>
      </div>

      <div className="glass p-4">
        <div className="flex flex-col gap-4">
          <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama kamu" className="w-full rounded-custom-sm border border-border bg-white/60 px-4 py-3 text-sm text-text-heading outline-none" />

          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Kontak (opsional)"
            className="w-full rounded-custom-sm border border-border bg-white/60 px-4 py-3 text-sm text-text-heading outline-none"
          />

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Tuliskan aduan atau masukan..."
            rows={6}
            className="w-full resize-none rounded-custom-sm border border-border bg-white/60 px-4 py-3 text-sm text-text-heading outline-none"
          />

          <button
            type="button"
            onClick={submitFeedback}
            disabled={loading || !message.trim()}
            className="flex items-center justify-center gap-2 rounded-custom-sm bg-gradient-to-br from-accent to-accent-2 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            <Send size={15} />

            {loading ? "Mengirim..." : "Kirim Aduan"}
          </button>

          {status && <p className="text-center text-sm text-text-muted">{status}</p>}
        </div>
      </div>
    </div>
  );
}
