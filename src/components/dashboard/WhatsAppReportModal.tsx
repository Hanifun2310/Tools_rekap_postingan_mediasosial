'use client';

import React, { useState, useMemo } from 'react';
import { DivisionGroup, SocialPost, ComplianceMetrics } from '@/types/database';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  MessageSquare,
  AlertCircle,
  Filter,
  CheckSquare,
  Square
} from 'lucide-react';

interface WhatsAppReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePost: SocialPost | null;
  divisionGroups: DivisionGroup[];
  metrics: ComplianceMetrics;
}

export const WhatsAppReportModal: React.FC<WhatsAppReportModalProps> = ({
  isOpen,
  onClose,
  activePost,
  divisionGroups,
  metrics,
}) => {
  const [selectedDivisions, setSelectedDivisions] = useState<string[]>(() =>
    divisionGroups.map((g) => g.division)
  );
  const [includeUsernames, setIncludeUsernames] = useState(true);
  const [includeCallToAction, setIncludeCallToAction] = useState(true);
  const [copied, setCopied] = useState(false);

  const [dateStr, setDateStr] = useState<string>('');

  // Sync selected divisions if groups change
  React.useEffect(() => {
    setSelectedDivisions(divisionGroups.map((g) => g.division));
    setDateStr(
      new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, [divisionGroups]);

  const toggleDivision = (division: string) => {
    setSelectedDivisions((prev) =>
      prev.includes(division)
        ? prev.filter((d) => d !== division)
        : [...prev, division]
    );
  };

  const toggleAllDivisions = () => {
    if (selectedDivisions.length === divisionGroups.length) {
      setSelectedDivisions([]);
    } else {
      setSelectedDivisions(divisionGroups.map((g) => g.division));
    }
  };

  // Generate WhatsApp formatted text
  const reportText = useMemo(() => {
    const postTitle = activePost?.title_or_caption || 'Postingan Resmi Perusahaan';
    const postUrl = activePost?.post_url || 'https://instagram.com';

    let text = `📢 *PENGINGAT KEWAJIBAN INTERAKSI SOSMED*\n`;
    text += `*Periode:* ${dateStr}\n`;
    text += `*Postingan:* ${postTitle}\n`;
    text += `*Tautan:* ${postUrl}\n`;
    text += `*Tingkat Kepatuhan Saat Ini:* ${metrics.compliancePercentage}% (${metrics.totalCompliant}/${metrics.totalEmployees} Karyawan)\n`;
    text += `-------------------------------------------\n\n`;

    const filteredGroups = divisionGroups.filter((g) => selectedDivisions.includes(g.division));
    let totalNonCompliantInSelection = 0;

    for (const group of filteredGroups) {
      const nonCompliantEmployees = group.employees.filter((e) => !e.is_compliant);
      totalNonCompliantInSelection += nonCompliantEmployees.length;

      if (nonCompliantEmployees.length > 0) {
        text += `*📌 DIVISI ${group.division.toUpperCase()}* (${nonCompliantEmployees.length} Belum Interaksi):\n`;
        nonCompliantEmployees.forEach((row, idx) => {
          const registeredHandle = activePost?.platform === 'facebook' 
            ? row.employee.fb_username 
            : row.employee.ig_username;
          
          const handleStr = includeUsernames
            ? registeredHandle ? ` (@${registeredHandle})` : ` _(Belum registrasi username)_`
            : '';
          
          text += `${idx + 1}. ${row.employee.full_name}${handleStr}\n`;
        });
        text += `\n`;
      }
    }

    if (totalNonCompliantInSelection === 0) {
      text += `🎉 *Luar biasa! Seluruh karyawan di divisi terpilih sudah menyelesaikan interaksi.* Terima kasih atas komitmennya!\n\n`;
    }

    if (includeCallToAction && totalNonCompliantInSelection > 0) {
      text += `Mohon rekan-rekan yang namanya tercantum di atas untuk segera meninggalkan *Like & Komentar* pada postingan tersebut:\n`;
      text += `👉 ${postUrl}\n\n`;
      text += `_(Cukup berikan 1 komentar positif/emoji untuk tervalidasi otomatis di sistem)_\n`;
      text += `Terima kasih atas kerja sama dan dukungannya! 🙏✨`;
    }

    return text.trim();
  }, [
    activePost,
    divisionGroups,
    selectedDivisions,
    metrics,
    includeUsernames,
    includeCallToAction,
  ]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      alert('Gagal menyalin otomatis. Silakan salin teks secara manual.');
    }
  };

  const whatsappShareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(reportText)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="ledger-card rounded-md w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl border border-[#DDD5C9]"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Masthead Header */}
        <div className="px-6 py-4 border-b border-[#E5DFD5] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#25D366]/15 flex items-center justify-center text-[#25D366] border border-[#25D366]/30">
              <Share2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#1E1B18]">
                Generator Pesan WhatsApp (Pengingat Belum Komen)
              </h3>
              <p className="text-[11px] text-[#6E665E]">
                Format pesan otomatis per divisi siap salin ke grup WhatsApp kantor
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 bg-white">
          {/* Options & Filter Section */}
          <div className="p-3.5 bg-[#FAF8F5] border border-[#E5DFD5] rounded text-xs space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-semibold text-[#1E1B18] uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-[#C85A32]" />
                Pilih Divisi yang Ditampilkan:
              </span>
              <button
                type="button"
                onClick={toggleAllDivisions}
                className="text-[11px] text-[#C85A32] hover:underline font-medium cursor-pointer"
              >
                {selectedDivisions.length === divisionGroups.length ? 'Batalkan Semua' : 'Pilih Semua'}
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {divisionGroups.map((g) => {
                const isSelected = selectedDivisions.includes(g.division);
                const nonComp = g.employees.filter((e) => !e.is_compliant).length;
                return (
                  <button
                    key={g.division}
                    type="button"
                    onClick={() => toggleDivision(g.division)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-xs transition-colors cursor-pointer border ${
                      isSelected
                        ? 'bg-[#1E1B18] text-white border-[#1E1B18]'
                        : 'bg-white text-[#6E665E] border-[#E5DFD5] hover:border-[#DDD5C9]'
                    }`}
                  >
                    <span>{g.division}</span>
                    <span className={`text-[10px] px-1 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-[#EFECE6] text-[#B85D19]'
                    }`}>
                      {nonComp} belum
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Customization checkboxes */}
            <div className="pt-2 border-t border-[#E5DFD5] flex items-center gap-4 flex-wrap text-xs text-[#1E1B18]">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeUsernames}
                  onChange={(e) => setIncludeUsernames(e.target.checked)}
                  className="rounded text-[#C85A32] focus:ring-0"
                />
                <span>Sertakan @username akun</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeCallToAction}
                  onChange={(e) => setIncludeCallToAction(e.target.checked)}
                  className="rounded text-[#C85A32] focus:ring-0"
                />
                <span>Sertakan instruksi penutup & link postingan</span>
              </label>
            </div>
          </div>

          {/* WhatsApp Text Preview Window */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-semibold text-[#6E665E] uppercase tracking-wider ledger-stamp flex items-center gap-1">
                <MessageSquare className="w-3.5 h-3.5 text-[#25D366]" />
                Pratinjau Format Pesan (Siap Paste):
              </span>
              <span className="text-[11px] text-[#9B9187] font-mono">
                {reportText.length} karakter
              </span>
            </div>

            <textarea
              readOnly
              value={reportText}
              rows={11}
              className="w-full p-3.5 text-xs font-mono bg-[#FAF8F5] border border-[#E5DFD5] rounded text-[#1E1B18] focus:outline-none focus:border-[#25D366] leading-relaxed resize-none selection:bg-[#25D366]/20"
            />
          </div>
        </div>

        {/* Modal Action Footer */}
        <div className="px-6 py-4 border-t border-[#E5DFD5] bg-[#FAF8F5] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#6E665E] flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#25D366]" />
            <span>Format telah disesuaikan dengan aturan WhatsApp (*tebal*, _miring_).</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 border border-[#E5DFD5] hover:bg-white text-xs text-[#6E665E] rounded font-medium cursor-pointer"
            >
              Tutup
            </button>

            <a
              href={whatsappShareUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="tactile-btn inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-white hover:bg-[#FAF8F5] border border-[#25D366] text-[#25D366] text-xs font-medium rounded shadow-sm cursor-pointer whitespace-nowrap"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Buka di WA</span>
            </a>

            <button
              type="button"
              onClick={handleCopy}
              className="tactile-btn w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2 bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-medium uppercase tracking-wider rounded shadow-sm cursor-pointer whitespace-nowrap"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4" />
                  <span>Berhasil Disalin! 📋</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Salin ke Clipboard</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
