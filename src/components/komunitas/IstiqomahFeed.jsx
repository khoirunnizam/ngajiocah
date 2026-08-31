import { useEffect, useRef, useState } from "react";
import { Flame, Send, RefreshCw, Image as ImageIcon, Video, X, Heart } from "lucide-react";

export default function IstiqomahFeed({ endpoint }) {
  const [posts, setPosts] = useState([]);
  const [name, setName] = useState("");
  const [caption, setCaption] = useState("");
  const [media, setMedia] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (endpoint) loadPosts();
  }, [endpoint]);

  async function loadPosts() {
    if (!endpoint) return;

    try {
      setLoading(true);

      const response = await fetch(`${endpoint}?action=list_istiqomah`);

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.message || "Gagal mengambil postingan.");
      }

      setPosts((data.posts || []).slice(0, 20));
    } catch (error) {
      setMessage(error.message || "Gagal mengambil postingan.");
    } finally {
      setLoading(false);
    }
  }

  function handleMediaChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setMessage("Ukuran file maksimal 5 MB.");
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
      setMessage("File harus berupa foto atau video.");
      event.target.value = "";
      return;
    }

    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }

    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("image/") ? "image" : "video";

    setMedia(file);
    setPreview({ url, type });
    setMessage("");
  }

  function removeMedia() {
    if (preview?.url) {
      URL.revokeObjectURL(preview.url);
    }

    setMedia(null);
    setPreview(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error("Gagal membaca file."));

      reader.readAsDataURL(file);
    });
  }

  function getMediaUrl(url, type) {
    if (!url) return "";

    if (type === "image" && url.includes("drive.google.com/uc")) {
      const match = url.match(/[?&]id=([^&]+)/);

      if (match?.[1]) {
        return `https://drive.google.com/thumbnail?id=${match[1]}&sz=w1200`;
      }
    }

    return url;
  }

  async function submitPost() {
    if (!caption.trim() && !media) {
      setMessage("Isi caption atau pilih foto/video.");
      return;
    }

    if (!endpoint) {
      setMessage("Endpoint Google Apps Script belum tersedia.");
      return;
    }

    try {
      setLoading(true);
      setMessage("Menyiapkan postingan...");

      let mediaBase64 = "";
      let mediaMimeType = "";
      let mediaName = "";
      let mediaType = "";

      if (media) {
        mediaBase64 = await fileToBase64(media);
        mediaMimeType = media.type;
        mediaName = media.name;
        mediaType = media.type.startsWith("image/") ? "image" : "video";
      }

      const payload = {
        formType: "istiqomah",
        id: Date.now().toString(),
        name: name.trim() || "Hamba Allah",
        mediaType,
        mediaBase64,
        mediaMimeType,
        mediaName,
        caption: caption.trim(),
        createdAt: new Date().toISOString(),
      };

      setMessage("Mengirim postingan...");

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "text/plain;charset=utf-8",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!result.ok) {
        throw new Error(result.message || "Gagal menyimpan postingan.");
      }

      setName("");
      setCaption("");
      removeMedia();
      setMessage("Postingan berhasil dikirim.");

      await loadPosts();
    } catch (error) {
      setMessage(error.message || "Gagal mengirim postingan.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-16">
      <div>
        <h2 className="flex items-center gap-2 text-lg font-bold text-text-heading">
          <Flame size={18} className="text-accent" />
          Seru-seruan Komunitas
        </h2>

        <p className="mt-1 text-sm text-text-muted">Bagikan momen istiqomahmu bersama komunitas.</p>
      </div>

      <div className="glass p-4">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama kamu"
            disabled={loading}
            className="w-full rounded-custom-sm border border-border bg-white/60 px-4 py-3 text-sm text-text-heading outline-none"
          />

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Ceritakan momen istiqomahmu..."
            rows={4}
            disabled={loading}
            className="w-full resize-none rounded-custom-sm border border-border bg-white/60 px-4 py-3 text-sm text-text-heading outline-none"
          />

          {preview && (
            <div className="relative overflow-hidden rounded-custom-sm bg-black">
              {preview.type === "image" ? <img src={preview.url} alt="Preview" className="max-h-[500px] w-full object-contain" /> : <video src={preview.url} controls className="max-h-[500px] w-full" />}

              <button type="button" onClick={removeMedia} disabled={loading} className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full bg-black/60 text-white">
                <X size={17} />
              </button>
            </div>
          )}

          <input ref={fileInputRef} type="file" accept="image/*,video/*" onChange={handleMediaChange} className="hidden" />

          <button
            type="button"
            disabled={loading}
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 rounded-custom-sm border border-border bg-white/40 px-4 py-3 text-sm font-medium text-text-muted transition hover:bg-white/70 disabled:opacity-50"
          >
            <ImageIcon size={16} />
            <Video size={16} />
            Tambah Foto / Video
          </button>

          <button
            type="button"
            onClick={submitPost}
            disabled={loading || (!caption.trim() && !media)}
            className="flex items-center justify-center gap-2 rounded-custom-sm bg-gradient-to-br from-accent to-accent-2 px-4 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {loading ? (
              <>
                <RefreshCw size={15} className="animate-spin" />
                Mengirim...
              </>
            ) : (
              <>
                <Send size={15} />
                Kirim Postingan
              </>
            )}
          </button>
        </div>
      </div>

      {message && <p className="text-center text-sm text-text-muted">{message}</p>}

      <button
        type="button"
        onClick={loadPosts}
        disabled={loading}
        className="flex items-center justify-center gap-2 rounded-custom-sm border border-border bg-white/40 px-4 py-2 text-sm text-text-muted transition hover:bg-white/70 disabled:opacity-50"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
        Refresh
      </button>

      <div className="flex flex-col gap-4">
        {posts.map((post) => {
          const mediaUrl = getMediaUrl(post.mediaUrl, post.mediaType);

          return (
            <article key={post.id} className="glass overflow-hidden">
              <div className="p-4 pb-2">
                <p className="text-sm font-semibold text-text-heading">{post.name || "Hamba Allah"}</p>

                {post.createdAt && <p className="mt-0.5 text-xs text-text-muted">{new Date(post.createdAt).toLocaleString("id-ID")}</p>}
              </div>

              {post.caption && <p className="whitespace-pre-wrap px-4 pb-3 text-sm leading-relaxed text-text">{post.caption}</p>}

              {post.mediaType === "image" && mediaUrl && (
                <div className="w-full bg-black/5">
                  <img src={mediaUrl} alt={post.caption || "Foto postingan"} loading="lazy" className="block max-h-[600px] w-full object-contain" />
                </div>
              )}

              {post.mediaType === "video" && mediaUrl && (
                <div className="w-full bg-black">
                  <video src={mediaUrl} controls preload="metadata" className="block max-h-[600px] w-full" />
                </div>
              )}

              <div className="flex items-center gap-5 p-4">
                <button type="button" className="flex items-center gap-1.5 text-sm text-text-muted transition hover:text-accent">
                  <Heart size={18} />
                  Suka
                </button>
              </div>
            </article>
          );
        })}

        {!loading && posts.length === 0 && <p className="py-10 text-center text-sm text-text-muted">Belum ada postingan.</p>}
      </div>
    </div>
  );
}
