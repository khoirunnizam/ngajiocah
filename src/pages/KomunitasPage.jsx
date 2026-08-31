import { useState } from "react";
import { Link } from "react-router-dom";

import { ArrowLeft, Flame, ClipboardList } from "lucide-react";

import IstiqomahFeed from "../components/komunitas/IstiqomahFeed";
import AduanForm from "../components/komunitas/AduanForm";

const SHEET_ENDPOINT = "https://script.google.com/macros/s/AKfycbwfI3d_b-IWrUeRpxl7U6764TkWu6dbg-ZNj-Xr_E0i73j6AdTJdaBGQ1bcAPqD5Qppjg/exec";

export default function KomunitasPage() {
  const [tab, setTab] = useState("istiqomah");

  return (
    <div className="container mx-auto max-w-3xl px-4 sm:px-6">
      {/* HEADER */}

      <div className="glass my-6 flex items-center justify-between gap-3 p-4">
        <Link to="/" className="flex items-center gap-2 rounded-custom-sm border border-border bg-white/4 px-4 py-2 text-sm text-text hover:text-text-heading">
          <ArrowLeft size={16} />
          Kembali
        </Link>

        <h1 className="text-lg font-bold text-text-heading">Komunitas</h1>

        <div className="w-[80px]" />
      </div>

      {/* TAB */}

      <div className="mb-6 flex gap-2">
        <button
          type="button"
          onClick={() => setTab("istiqomah")}
          className={`
                        flex-1
                        flex
                        items-center
                        justify-center
                        gap-2
                        rounded-custom-sm
                        border
                        px-4
                        py-3
                        text-sm
                        font-semibold
                        transition-all

                        ${tab === "istiqomah" ? "border-transparent bg-gradient-to-br from-accent to-accent-2 text-white" : "border-border bg-white/4 text-text-muted"}
                    `}
        >
          <Flame size={16} />
          Seru-seruan
        </button>

        <button
          type="button"
          onClick={() => setTab("aduan")}
          className={`
                        flex-1
                        flex
                        items-center
                        justify-center
                        gap-2
                        rounded-custom-sm
                        border
                        px-4
                        py-3
                        text-sm
                        font-semibold
                        transition-all

                        ${tab === "aduan" ? "border-transparent bg-gradient-to-br from-accent to-accent-2 text-white" : "border-border bg-white/4 text-text-muted"}
                    `}
        >
          <ClipboardList size={16} />
          Aduan & Masukan
        </button>
      </div>

      {/* CONTENT */}

      {tab === "istiqomah" && <IstiqomahFeed endpoint={SHEET_ENDPOINT} />}

      {tab === "aduan" && <AduanForm endpoint={SHEET_ENDPOINT} />}
    </div>
  );
}
