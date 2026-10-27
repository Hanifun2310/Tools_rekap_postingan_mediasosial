'use client';

import React, { useState } from 'react';
import { SocialPost } from '@/types/database';
import { 
  X, 
  Download, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  FileSpreadsheet, 
  Database, 
  ShieldCheck 
} from 'lucide-react';

interface MonthlyPurgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePost: SocialPost | null;
  onExportCsv: () => string;
  onPurgeLogs: () => Promise<{ deletedPosts: number; deletedEngagements: number }> | { deletedPosts: number; deletedEngagements: number };
  onResetSeed: () => void;
}

export const MonthlyPurgeModal: React.FC<MonthlyPurgeModalProps> = ({
  isOpen,
  onClose,
  activePost,
  onExportCsv,
  onPurgeLogs,
  onResetSeed,
}) => {
  const [downloaded, setDownloaded] = useState(false);
  const [purgedResult, setPurgedResult] = useState<{ deletedPosts: number; deletedEngagements: number } | null>(null);
  const [confirmInput, setConfirmInput] = useState('');
  const [isPurging, setIsPurging] = useState(false);

  if (!isOpen) return null;

  const handleDownloadCsv = () => {
    const csvContent = onExportCsv();
    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const monthYear = new Date().toISOString().slice(0, 7); // e.g. 2026-10
    link.href = url;
    link.setAttribute('download', `Rekap_Kepatuhan_Sosmed_${monthYear}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setDownloaded(true);
  };

  const handlePurge = async () => {
    if (confirmInput.toUpperCase() !== 'BERSIHKAN') {
      alert('Ketik kata "BERSIHKAN" untuk konfirmasi penghapusan log.');
      return;
    }

    try {
      setIsPurging(true);
      const res = await onPurgeLogs();
      setPurgedResult(res);
    } finally {
      setIsPurging(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="ledger-card rounded-md w-full max-w-xl flex flex-col shadow-2xl border border-[#DDD5C9]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5DFD5] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C85A32]/10 flex items-center justify-center text-[#C85A32] border border-[#C85A32]/20">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#1E1B18]">
                Tutup Buku Bulanan & Pemeliharaan Kuota
              </h3>
              <p className="text-[11px] text-[#6E665E]">
                Unduh Rekap Bulanan (CSV) & Bersihkan Log Interaksi (Zero-Cost Operation)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-[#9B9187] hover:text-[#1E1B18] p-1 rounded-sm cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 bg-white text-xs text-[#1E1B18]">
          {purgedResult ? (
            <div className="p-4 bg-[#E6F2EC] border border-[#BEE0CF] rounded space-y-2 text-[#2A6F4E]">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span>Pembersihan Log Berhasil Dijalankan!</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Log interaksi telah dikosongkan ({purgedResult.deletedEngagements} komentar dan {purgedResult.deletedPosts} riwayat postingan dihapus). Data master karyawan tetap aman tersimpan. Kuota database Anda kini kembali 100% optimal.
              </p>
              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onResetSeed();
                    setPurgedResult(null);
                    setDownloaded(false);
                    onClose();
                  }}
                  className="px-3 py-1.5 bg-[#2A6F4E] text-white rounded text-[11px] font-medium cursor-pointer"
                >
                  Muat Ulang Data Simulasi (Seed Demo)
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-3 py-1.5 bg-white border border-[#BEE0CF] text-[#2A6F4E] rounded text-[11px] cursor-pointer"
                >
                  Selesai
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Step 1: Export CSV */}
              <div className="p-4 bg-[#FAF8F5] border border-[#E5DFD5] rounded space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-[#1E1B18] uppercase tracking-wider flex items-center gap-1.5">
                    <Download className="w-3.5 h-3.5 text-[#C85A32]" />
                    Langkah 1: Unduh Arsip CSV / Excel
                  </span>
                  {downloaded && (
                    <span className="text-[10px] text-[#2A6F4E] font-medium flex items-center gap-1 bg-[#E6F2EC] px-2 py-0.5 rounded border border-[#BEE0CF]">
                      <CheckCircle2 className="w-3 h-3" /> Berhasil Diunduh
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-[#6E665E] leading-relaxed">
                  Unduh seluruh rekaman matriks kehadiran karyawan bulan ini ke dalam format spreadsheet (.csv) untuk arsip HR dan bukti kepatuhan.
                </p>

                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="tactile-btn inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#1E1B18] hover:bg-[#332F2A] text-white text-xs font-medium rounded cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File CSV Matriks Bulanan</span>
                </button>
              </div>

              {/* Step 2: Purge Notice */}
              <div className="p-4 bg-[#FFFDFB] border border-[#F7D8BD] rounded space-y-3">
                <div className="flex items-center gap-2 text-[#B85D19]">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span className="font-semibold text-xs uppercase tracking-wider">
                    Langkah 2: Bersihkan Log Interaksi (Purge)
                  </span>
                </div>

                <p className="text-[11px] text-[#6E665E] leading-relaxed">
                  Sesuai klausul <strong>Zero-Cost Operation</strong> di PRD, tabel <code className="bg-[#EFECE6] px-1 py-0.5 rounded font-mono text-[#1E1B18]">engagements</code> dan <code className="bg-[#EFECE6] px-1 py-0.5 rounded font-mono text-[#1E1B18]">social_posts</code> akan dihapus untuk menjaga pemakaian database Supabase di bawah 50 MB. 
                  <br />
                  <span className="inline-flex items-center gap-1 text-[#2A6F4E] font-medium mt-1">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Data Master Karyawan (Tabel `employees`) TIDAK AKAN DIHAPUS.
                  </span>
                </p>

                <div className="space-y-1.5 pt-1">
                  <label className="text-[11px] text-[#6E665E] block">
                    Ketik <strong className="text-[#C85A32]">BERSIHKAN</strong> untuk mengonfirmasi:
                  </label>
                  <input
                    type="text"
                    value={confirmInput}
                    onChange={(e) => setConfirmInput(e.target.value)}
                    placeholder="Ketik BERSIHKAN di sini"
                    className="w-full px-3 py-1.5 text-xs font-mono bg-white border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] text-[#1E1B18]"
                  />
                </div>

                <button
                  type="button"
                  onClick={handlePurge}
                  disabled={confirmInput.toUpperCase() !== 'BERSIHKAN'}
                  className="tactile-btn w-full inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#C85A32] hover:bg-[#AF4A24] text-white text-xs font-medium uppercase tracking-wider rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Eksekusi Bersihkan Log (Purge)</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E5DFD5] bg-[#FAF8F5] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs text-[#6E665E] hover:text-[#1E1B18] font-medium cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
