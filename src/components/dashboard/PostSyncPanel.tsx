'use client';

import React, { useState } from 'react';
import { SocialPost, PlatformType } from '@/types/database';
import { parseSocialUrl, sanitizeUsername } from '@/lib/data-service';
import { 
  Link as LinkIcon, 
  RefreshCw, 
  CheckCircle2, 
  Clock, 
  Layers, 
  Sparkles,
  ExternalLink,
  MessageSquare,
  Plus,
  Send,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { InstagramIcon, FacebookIcon } from '@/components/common/SocialIcons';

interface PostSyncPanelProps {
  posts: SocialPost[];
  activePost: SocialPost | null;
  onSelectPost: (post: SocialPost) => void;
  onSyncPost: (url: string, title?: string) => Promise<void>;
  onIngestCommentsManual?: (postId: string, comments: Array<{ ig_username: string; comment_text?: string }>) => Promise<void>;
  isLoading: boolean;
}

export const PostSyncPanel: React.FC<PostSyncPanelProps> = ({
  posts,
  activePost,
  onSelectPost,
  onSyncPost,
  onIngestCommentsManual,
  isLoading,
}) => {
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [platformOverride, setPlatformOverride] = useState<PlatformType | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Manual comments ingestion drawer state
  const [showManualCommentBox, setShowManualCommentBox] = useState(false);
  const [manualCommentsText, setManualCommentsText] = useState('');
  const [isSavingComments, setIsSavingComments] = useState(false);

  // Auto-detect platform from URL input
  const detectedPlatform: PlatformType = platformOverride || (
    urlInput.toLowerCase().includes('facebook.com') || urlInput.toLowerCase().includes('fb.watch')
      ? 'facebook'
      : 'instagram'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) {
      setStatusMessage('Silakan masukkan tautan postingan Instagram atau Facebook.');
      return;
    }

    try {
      setIsSubmitting(true);
      setStatusMessage('Menghubungi API & memproses komentar...');
      await onSyncPost(urlInput.trim(), titleInput.trim() || undefined);
      setStatusMessage('Sinkronisasi selesai! Log interaksi & akun komentator berhasil diperbarui.');
      setUrlInput('');
      setTitleInput('');
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setStatusMessage('Gagal melakukan sinkronisasi. Periksa kembali format URL.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUseSample = (type: 'ig' | 'fb') => {
    if (type === 'ig') {
      setUrlInput('https://www.instagram.com/p/DA_post2026corp/');
      setTitleInput('Peluncuran Inisiatif Transformasi Digital & Efisiensi Operasional Q4 2026');
      setPlatformOverride('instagram');
    } else {
      setUrlInput('https://www.facebook.com/company/posts/1029384756');
      setTitleInput('Pengumuman Townhall Akbar & Penghargaan Karyawan Teladan Periode Oktober 2026');
      setPlatformOverride('facebook');
    }
  };

  const handlePasteCommentsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePost || !onIngestCommentsManual || !manualCommentsText.trim()) return;

    try {
      setIsSavingComments(true);
      const parsed: Array<{ ig_username: string; comment_text: string }> = [];
      const seen = new Set<string>();

      // IG UI noise words to ignore
      const IG_NOISE = new Set([
        'reply', 'balas', 'suka', 'like', 'likes', 'disukai', 'lihat terjemahan', 
        'terjemahkan', 'view replies', 'hide replies', 'verified', 'edited', 'diedit'
      ]);

      // If text contains @ mentions, also scan for all @handles
      const atMentionRegex = /@([a-zA-Z0-9._]{2,30})/g;
      const atMentions = [...manualCommentsText.matchAll(atMentionRegex)];

      if (atMentions.length > 0 && manualCommentsText.split(/\r?\n/).length <= atMentions.length + 3) {
        // Mostly handles format
        for (const m of atMentions) {
          const clean = sanitizeUsername(m[1]);
          if (clean && !seen.has(clean) && !IG_NOISE.has(clean)) {
            seen.add(clean);
            parsed.push({ ig_username: clean, comment_text: '👍 Hadir / Like' });
          }
        }
      } else {
        // Line-by-line parser
        const lines = manualCommentsText.split(/\r?\n/);
        for (let i = 0; i < lines.length; i++) {
          const trimmed = lines[i].trim();
          if (!trimmed) continue;

          // Check if line is IG noise or timestamp (e.g. "2d", "1w", "5h", "45m")
          if (/^\d+[smhdwj]$/i.test(trimmed)) continue;
          if (IG_NOISE.has(trimmed.toLowerCase())) continue;

          if (trimmed.includes(':')) {
            const [u, ...c] = trimmed.split(':');
            const cleanU = sanitizeUsername(u);
            if (cleanU && !seen.has(cleanU) && !IG_NOISE.has(cleanU)) {
              seen.add(cleanU);
              parsed.push({ ig_username: cleanU, comment_text: c.join(':').trim() || '👍 Hadir / Like' });
            }
          } else if (trimmed.includes(',')) {
            const parts = trimmed.split(',');
            for (const p of parts) {
              const cleanP = sanitizeUsername(p);
              if (cleanP && !seen.has(cleanP) && !IG_NOISE.has(cleanP)) {
                seen.add(cleanP);
                parsed.push({ ig_username: cleanP, comment_text: '👍 Hadir / Like' });
              }
            }
          } else {
            // Standalone handle or line
            const cleanU = sanitizeUsername(trimmed);
            // Must be valid IG username syntax: letters, numbers, periods, underscores, 2-30 chars
            if (cleanU && /^[a-zA-Z0-9._]{2,30}$/.test(cleanU) && !seen.has(cleanU) && !IG_NOISE.has(cleanU)) {
              seen.add(cleanU);
              parsed.push({ ig_username: cleanU, comment_text: '👍 Hadir / Like' });
            }
          }
        }
      }

      if (parsed.length === 0) {
        alert('Tidak ada username akun valid yang terdeteksi dari teks yang Anda tempel. Pastikan format mengandung username (misal @username atau baris username).');
        return;
      }

      await onIngestCommentsManual(activePost.id, parsed);
      setManualCommentsText('');
      setShowManualCommentBox(false);
      setStatusMessage(`Berhasil menambahkan ${parsed.length} akun komentator ke postingan!`);
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsSavingComments(false);
    }
  };

  const parsed = urlInput ? parseSocialUrl(urlInput) : null;

  return (
    <div className="ledger-card rounded-md p-6 mb-6">
      {/* Header Ledger Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#E5DFD5] gap-2">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-[#C85A32]" />
          <h2 className="text-xs font-semibold tracking-widest text-[#6E665E] uppercase ledger-stamp">
            Ingesti Link Postingan & Background Sync
          </h2>
        </div>
        <div className="flex items-center gap-2 text-xs text-[#6E665E]">
          <span className="inline-flex items-center gap-1 bg-[#EFECE6] px-2 py-0.5 rounded border border-[#E5DFD5]">
            <Clock className="w-3 h-3 text-[#C85A32]" />
            Aturan: 1 Komen = Valid
          </span>
          <span className="text-[#9B9187]">|</span>
          <span className="font-mono text-[11px] text-[#1E1B18]">Zero-Cost Serverless</span>
        </div>
      </div>

      {/* Main Ingestion Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-[#1E1B18] mb-1.5 flex items-center justify-between">
            <span>URL Postingan Resmi (Instagram / Facebook)</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#6E665E]">Contoh instan:</span>
              <button
                type="button"
                onClick={() => handleUseSample('ig')}
                className="text-[11px] text-[#C85A32] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <InstagramIcon className="w-3 h-3" /> IG Demo
              </button>
              <span className="text-[#DDD5C9]">•</span>
              <button
                type="button"
                onClick={() => handleUseSample('fb')}
                className="text-[11px] text-[#C85A32] hover:underline flex items-center gap-0.5 cursor-pointer"
              >
                <FacebookIcon className="w-3 h-3" /> FB Demo
              </button>
            </div>
          </label>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-[#9B9187]">
                <LinkIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="https://www.instagram.com/p/... atau https://facebook.com/..."
                className="w-full pl-9 pr-24 py-2.5 text-xs font-mono bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white transition-colors text-[#1E1B18]"
                disabled={isSubmitting || isLoading}
              />
              <div className="absolute inset-y-0 right-1.5 flex items-center">
                <span className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-medium tracking-wide uppercase rounded bg-[#EFECE6] text-[#6E665E] border border-[#DDD5C9]">
                  {detectedPlatform === 'instagram' ? (
                    <>
                      <InstagramIcon className="w-3 h-3 text-[#C85A32]" />
                      IG
                    </>
                  ) : (
                    <>
                      <FacebookIcon className="w-3 h-3 text-[#1877F2]" />
                      FB
                    </>
                  )}
                </span>
              </div>
            </div>

            {/* Sync Button */}
            <button
              type="submit"
              disabled={isSubmitting || isLoading}
              className="tactile-btn inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#C85A32] hover:bg-[#AF4A24] text-white text-xs font-medium tracking-wide uppercase rounded cursor-pointer shadow-sm disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSubmitting || isLoading ? 'animate-spin' : ''}`} />
              <span>{isSubmitting || isLoading ? 'Menarik Data...' : 'Tarik & Cocokkan Data'}</span>
            </button>
          </div>

          {parsed && parsed.shortcode && (
            <p className="mt-1.5 text-[11px] text-[#6E665E] font-mono flex items-center gap-1.5">
              <span>Platform Terdeteksi: <strong>{parsed.platform}</strong></span>
              <span>•</span>
              <span>ID/Shortcode: <code className="bg-[#EFECE6] px-1 py-0.5 rounded text-[#1E1B18]">{parsed.shortcode}</code></span>
            </p>
          )}
        </div>

        {/* Optional Title / Label Input */}
        <div className="pt-1">
          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="Label / Judul Postingan (Opsional, untuk mempermudah identifikasi laporan)"
            className="w-full px-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18]"
            disabled={isSubmitting || isLoading}
          />
        </div>

        {/* Feedback Message */}
        {statusMessage && (
          <div className="flex items-center gap-2 p-2.5 text-xs rounded bg-[#FCF4F0] border border-[#F3CEBE] text-[#C85A32]">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{statusMessage}</span>
          </div>
        )}
      </form>

      {/* Active Post Details & Recent Posts Carousel/List */}
      <div className="mt-6 pt-5 border-t border-[#E5DFD5]">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-[#6E665E] uppercase tracking-wider ledger-stamp flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-[#C85A32]" />
            Postingan Aktif Dalam Tinjauan:
          </span>
          <span className="text-[11px] text-[#9B9187]">
            {posts.length} Post Terdaftar
          </span>
        </div>

        {activePost ? (
          <div className="space-y-3">
            <div className="bg-[#FAF8F5] border border-[#E5DFD5] rounded p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase rounded ${
                    activePost.platform === 'instagram'
                      ? 'bg-[#FCF4F0] text-[#C85A32] border border-[#F3CEBE]'
                      : 'bg-[#EFF6FF] text-[#1D4ED8] border border-[#BFDBFE]'
                  }`}>
                    {activePost.platform === 'instagram' ? <InstagramIcon className="w-3 h-3" /> : <FacebookIcon className="w-3 h-3" />}
                    {activePost.platform}
                  </span>

                  <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-[#2A6F4E] bg-[#E6F2EC] border border-[#BEE0CF] rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    {activePost.total_comments_fetched} Komentar Tercatat
                  </span>

                  {activePost.last_synced_at && (
                    <span className="text-[11px] text-[#6E665E] flex items-center gap-1">
                      <Clock className="w-3 h-3 text-[#9B9187]" />
                      Terakhir Sinkron: {new Date(activePost.last_synced_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  )}
                </div>

                <h3 className="font-serif text-base text-[#1E1B18] font-semibold leading-snug line-clamp-2">
                  {activePost.title_or_caption || 'Postingan Perusahaan'}
                </h3>

                <div className="flex items-center gap-2">
                  <a
                    href={activePost.post_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] font-mono text-[#C85A32] hover:underline inline-flex items-center gap-1 truncate max-w-md"
                  >
                    <span className="truncate">{activePost.post_url}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                </div>
              </div>

              {/* Action Buttons: Tempel Komentar & Post Switcher */}
              <div className="flex flex-col items-start md:items-end gap-2 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-[#E5DFD5]">
                {onIngestCommentsManual && (
                  <button
                    type="button"
                    onClick={() => setShowManualCommentBox(!showManualCommentBox)}
                    className={`tactile-btn inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded shadow-xs cursor-pointer transition-all ${
                      activePost.total_comments_fetched === 0
                        ? 'bg-[#C85A32] hover:bg-[#AF4A24] text-white border border-[#B04C28]'
                        : 'bg-white hover:bg-[#FAF8F5] border border-[#E5DFD5] text-[#1E1B18]'
                    }`}
                  >
                    <MessageSquare className={`w-3.5 h-3.5 ${activePost.total_comments_fetched === 0 ? 'text-white' : 'text-[#C85A32]'}`} />
                    <span>{showManualCommentBox ? 'Tutup Input Komentar' : 'Tempel Komentar Real'}</span>
                    {showManualCommentBox ? <ChevronUp className="w-3 h-3 text-[#9B9187]" /> : <ChevronDown className="w-3 h-3 opacity-70" />}
                  </button>
                )}

                {posts.length > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] uppercase tracking-wider text-[#6E665E]">Ganti:</span>
                    {posts.map((p) => {
                      const isCurrent = p.id === activePost.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => onSelectPost(p)}
                          className={`text-[11px] font-mono px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            isCurrent
                              ? 'bg-[#1E1B18] text-white border-[#1E1B18]'
                              : 'bg-white text-[#6E665E] border-[#E5DFD5] hover:border-[#C85A32]'
                          }`}
                        >
                          {p.platform === 'instagram' ? 'IG' : 'FB'}: {p.post_shortcode?.slice(0, 8) || p.id.slice(0, 6)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Collapsible: Manual Comments Ingestion Form */}
            {showManualCommentBox && onIngestCommentsManual && (
              <form onSubmit={handlePasteCommentsSubmit} className="p-4 bg-white border border-[#E5DFD5] rounded shadow-xs space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1E1B18] flex items-center gap-1.5">
                    <MessageSquare className="w-3.5 h-3.5 text-[#C85A32]" />
                    Tempel Daftar Komentator Instagram / Facebook:
                  </label>
                  <span className="text-[11px] text-[#9B9187]">
                    Contoh format: <code className="bg-[#EFECE6] px-1 py-0.2 rounded font-mono text-[#1E1B18]">@username: komentar</code> atau <code className="bg-[#EFECE6] px-1 py-0.2 rounded font-mono text-[#1E1B18]">@user1, @user2</code>
                  </span>
                </div>

                <textarea
                  rows={4}
                  value={manualCommentsText}
                  onChange={(e) => setManualCommentsText(e.target.value)}
                  placeholder={`@budi_santoso: Mantap programnya! 🔥\n@wahyu_hidayat_ops: Siap dukung operasional 24/7\n@citra_creative_lab: Kontennya kece parah\n@eko_tech_ninja: Hadir!`}
                  className="w-full p-2.5 text-xs font-mono bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18] leading-relaxed"
                />

                <div className="flex items-center justify-between pt-1">
                  <p className="text-[11px] text-[#6E665E]">
                    Username yang belum terdaftar di database karyawan akan <strong>otomatis masuk ke Panel Karantina</strong>.
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setShowManualCommentBox(false)}
                      className="px-3 py-1.5 text-xs text-[#6E665E] hover:text-[#1E1B18] cursor-pointer"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingComments || !manualCommentsText.trim()}
                      className="tactile-btn inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#C85A32] hover:bg-[#AF4A24] text-white text-xs font-medium rounded shadow-xs cursor-pointer disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSavingComments ? 'Menyimpan...' : 'Simpan Komentar ke Postingan'}</span>
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-xs text-[#6E665E] bg-[#FAF8F5] border border-dashed border-[#DDD5C9] rounded">
            <p className="font-semibold text-[#1E1B18] mb-1">Belum Ada Postingan yang Disinkronkan</p>
            <p className="text-[11px] text-[#9B9187]">
              Masukkan tautan postingan Instagram atau Facebook resmi kantor pada formulir di atas, lalu tekan tombol <strong>&ldquo;Tarik & Cocokkan Data&rdquo;</strong>.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
