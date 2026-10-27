'use client';

import React, { useState, useMemo } from 'react';
import { 
  ComplianceMetrics, 
  DivisionGroup, 
  EmployeeComplianceRow, 
  PlatformType,
  SocialPost 
} from '@/types/database';
import { 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  Search, 
  MessageSquare, 
  Copy, 
  Check, 
  Share2, 
  Download, 
  Sparkles,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet
} from 'lucide-react';

interface ComplianceMatrixProps {
  metrics: ComplianceMetrics;
  divisionGroups: DivisionGroup[];
  allRows: EmployeeComplianceRow[];
  activePost: SocialPost | null;
  onOpenWhatsAppModal: () => void;
  onOpenPurgeModal: () => void;
  onOpenEmployeeModal?: () => void;
  onToggleManualStatus?: (employeeId: string, currentStatus: boolean) => void;
}

type StatusFilter = 'ALL' | 'COMPLIANT' | 'NON_COMPLIANT';

export const ComplianceMatrix: React.FC<ComplianceMatrixProps> = ({
  metrics,
  divisionGroups,
  allRows,
  activePost,
  onOpenWhatsAppModal,
  onOpenPurgeModal,
  onOpenEmployeeModal,
  onToggleManualStatus,
}) => {
  const [selectedDivision, setSelectedDivision] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [copiedHandle, setCopiedHandle] = useState<string | null>(null);

  const platform: PlatformType = activePost?.platform || 'instagram';

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedHandle(id);
    setTimeout(() => setCopiedHandle(null), 2000);
  };

  // Filtered rows for flat view
  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      // Division filter
      if (selectedDivision !== 'ALL' && row.employee.division !== selectedDivision) {
        return false;
      }
      // Status filter
      if (statusFilter === 'COMPLIANT' && !row.is_compliant) return false;
      if (statusFilter === 'NON_COMPLIANT' && row.is_compliant) return false;
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const nameMatch = row.employee.full_name.toLowerCase().includes(q);
        const codeMatch = row.employee.employee_code?.toLowerCase().includes(q);
        const igMatch = row.employee.ig_username?.toLowerCase().includes(q);
        const fbMatch = row.employee.fb_username?.toLowerCase().includes(q);
        return nameMatch || codeMatch || igMatch || fbMatch;
      }
      return true;
    });
  }, [allRows, selectedDivision, statusFilter, searchQuery]);

  // Filtered division groups for grouped view
  const filteredDivisions = useMemo(() => {
    return divisionGroups
      .filter((grp) => selectedDivision === 'ALL' || grp.division === selectedDivision)
      .map((grp) => {
        const filteredEmployees = grp.employees.filter((row) => {
          if (statusFilter === 'COMPLIANT' && !row.is_compliant) return false;
          if (statusFilter === 'NON_COMPLIANT' && row.is_compliant) return false;
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const nameMatch = row.employee.full_name.toLowerCase().includes(q);
            const codeMatch = row.employee.employee_code?.toLowerCase().includes(q);
            const igMatch = row.employee.ig_username?.toLowerCase().includes(q);
            const fbMatch = row.employee.fb_username?.toLowerCase().includes(q);
            return nameMatch || codeMatch || igMatch || fbMatch;
          }
          return true;
        });

        return {
          ...grp,
          employees: filteredEmployees,
        };
      })
      .filter((grp) => grp.employees.length > 0);
  }, [divisionGroups, selectedDivision, statusFilter, searchQuery]);

  // All unique division names for filter dropdown
  const divisionList = useMemo(() => {
    const set = new Set<string>();
    divisionGroups.forEach((g) => set.add(g.division));
    return Array.from(set).sort();
  }, [divisionGroups]);

  return (
    <div className="space-y-6">
      {/* 1. EDITORIAL METRICS STRIP */}
      <div className="ledger-card rounded-md p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 mb-6 border-b border-[#E5DFD5] gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#1E1B18]" />
            <h2 className="text-xs font-semibold tracking-widest text-[#6E665E] uppercase ledger-stamp">
              Matriks Kepatuhan Interaksi Karyawan
            </h2>
          </div>
          <div className="text-xs text-[#6E665E]">
            Status: <span className="text-[#2A6F4E] font-medium">1 Komentar (Teks/Emoji) = Valid</span>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E5DFD5]">
          {/* Total Karyawan */}
          <div className="px-2 pt-2 sm:pt-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#6E665E] block mb-1">
              Total Personil
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-[#1E1B18]">
                {metrics.totalEmployees}
              </span>
              <span className="text-xs text-[#6E665E]">Karyawan</span>
            </div>
            <span className="text-[11px] text-[#9B9187] mt-1 block">Master Database Aktif</span>
          </div>

          {/* Valid (Sudah Komen) */}
          <div className="px-2 pt-2 sm:pt-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#2A6F4E] block mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Sudah Interaksi
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-[#2A6F4E]">
                {metrics.totalCompliant}
              </span>
              <span className="text-xs text-[#2A6F4E] font-medium">
                ({metrics.totalEmployees > 0 ? Math.round((metrics.totalCompliant / metrics.totalEmployees) * 100) : 0}%)
              </span>
            </div>
            <span className="text-[11px] text-[#2A6F4E] mt-1 block">Tercatat Komentar/Like</span>
          </div>

          {/* Belum Komen */}
          <div className="px-2 pt-2 sm:pt-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#B85D19] block mb-1 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" /> Belum Interaksi
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-[#B85D19]">
                {metrics.totalNonCompliant}
              </span>
              <span className="text-xs text-[#B85D19]">Karyawan</span>
            </div>
            <span className="text-[11px] text-[#B85D19] mt-1 block">Perlu Diberikan Reminder</span>
          </div>

          {/* Tingkat Kepatuhan */}
          <div className="px-2 pt-2 sm:pt-0">
            <span className="text-[11px] font-medium uppercase tracking-wider text-[#C85A32] block mb-1">
              Tingkat Kepatuhan
            </span>
            <div className="flex items-baseline gap-2">
              <span className="font-serif text-3xl font-bold text-[#C85A32]">
                {metrics.compliancePercentage}%
              </span>
            </div>
            {/* Tactile Progress bar */}
            <div className="w-full bg-[#EFECE6] h-2 rounded-full mt-2 overflow-hidden border border-[#E5DFD5]">
              <div
                className="bg-[#C85A32] h-full transition-all duration-500 rounded-full"
                style={{ width: `${Math.min(100, metrics.compliancePercentage)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Action Button Bar */}
        <div className="mt-6 pt-5 border-t border-[#E5DFD5] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#6E665E]">
            <span className="font-mono text-[11px] bg-[#EFECE6] px-2 py-0.5 rounded border border-[#E5DFD5]">
              Log: {metrics.totalCommentsFetched} Interaksi Ditemukan
            </span>
            {metrics.unmappedCount > 0 && (
              <span className="font-mono text-[11px] bg-[#FDF1E6] text-[#B85D19] px-2 py-0.5 rounded border border-[#F7D8BD]">
                {metrics.unmappedCount} Akun Karantina
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              type="button"
              onClick={onOpenWhatsAppModal}
              className="tactile-btn inline-flex items-center gap-2 px-3.5 py-2 bg-[#25D366] hover:bg-[#20BA5A] text-white text-xs font-medium rounded shadow-sm cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Salin Rekap Belum Komen ke WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={onOpenPurgeModal}
              className="tactile-btn inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-[#FAF8F5] text-[#1E1B18] border border-[#E5DFD5] text-xs font-medium rounded cursor-pointer"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-[#C85A32]" />
              <span>Tutup Buku & Export</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. LEDGER FILTER CONTROLS */}
      <div className="ledger-card rounded-md p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-[#9B9187]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama karyawan, kode, atau @username..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] text-[#1E1B18]"
            />
          </div>

          {/* Right: Division filter, Status filter, & View Mode */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Division dropdown */}
            <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#E5DFD5] rounded px-2 py-1.5">
              <span className="text-[11px] text-[#6E665E] uppercase tracking-wider font-semibold">Divisi:</span>
              <select
                value={selectedDivision}
                onChange={(e) => setSelectedDivision(e.target.value)}
                className="text-xs bg-transparent text-[#1E1B18] focus:outline-none cursor-pointer"
              >
                <option value="ALL">Semua Divisi ({divisionList.length})</option>
                {divisionList.map((div) => (
                  <option key={div} value={div}>
                    {div}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter pills */}
            <div className="flex items-center rounded border border-[#E5DFD5] overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('ALL')}
                className={`px-3 py-1.5 transition-colors cursor-pointer ${
                  statusFilter === 'ALL'
                    ? 'bg-[#1E1B18] text-white font-medium'
                    : 'bg-white text-[#6E665E] hover:bg-[#FAF8F5]'
                }`}
              >
                Semua
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('COMPLIANT')}
                className={`px-3 py-1.5 transition-colors cursor-pointer border-l border-[#E5DFD5] ${
                  statusFilter === 'COMPLIANT'
                    ? 'bg-[#2A6F4E] text-white font-medium'
                    : 'bg-white text-[#2A6F4E] hover:bg-[#E6F2EC]'
                }`}
              >
                Sudah ({metrics.totalCompliant})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('NON_COMPLIANT')}
                className={`px-3 py-1.5 transition-colors cursor-pointer border-l border-[#E5DFD5] ${
                  statusFilter === 'NON_COMPLIANT'
                    ? 'bg-[#B85D19] text-white font-medium'
                    : 'bg-white text-[#B85D19] hover:bg-[#FDF1E6]'
                }`}
              >
                Belum ({metrics.totalNonCompliant})
              </button>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-[#E5DFD5] rounded bg-white overflow-hidden text-xs">
              <button
                type="button"
                onClick={() => setViewMode('grouped')}
                className={`px-2.5 py-1.5 transition-colors cursor-pointer ${
                  viewMode === 'grouped'
                    ? 'bg-[#EFECE6] text-[#1E1B18] font-semibold'
                    : 'text-[#6E665E] hover:bg-[#FAF8F5]'
                }`}
              >
                Per Divisi
              </button>
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className={`px-2.5 py-1.5 transition-colors cursor-pointer border-l border-[#E5DFD5] ${
                  viewMode === 'flat'
                    ? 'bg-[#EFECE6] text-[#1E1B18] font-semibold'
                    : 'text-[#6E665E] hover:bg-[#FAF8F5]'
                }`}
              >
                Daftar Lengkap
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 3. COMPLIANCE DATA TABLE / GROUPS */}
      {viewMode === 'grouped' ? (
        /* Grouped by Division */
        <div className="space-y-4">
          {filteredDivisions.length > 0 ? (
            filteredDivisions.map((group) => {
              const allDone = group.nonCompliant === 0;
              return (
                <div key={group.division} className="ledger-card rounded-md overflow-hidden">
                  {/* Division Header */}
                  <div className="px-5 py-3.5 bg-[#FAF8F5] border-b border-[#E5DFD5] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <span className={`w-2 h-2 rounded-full ${allDone ? 'bg-[#2A6F4E]' : 'bg-[#C85A32]'}`} />
                      <h3 className="font-serif text-base font-bold text-[#1E1B18] tracking-wide">
                        DIVISI {group.division.toUpperCase()}
                      </h3>
                      <span className="text-[11px] text-[#6E665E]">
                        ({group.total} Karyawan)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs">
                      <span className="inline-flex items-center gap-1 font-mono text-[#2A6F4E] bg-[#E6F2EC] px-2 py-0.5 rounded border border-[#BEE0CF]">
                        {group.compliant} Selesai
                      </span>
                      {group.nonCompliant > 0 && (
                        <span className="inline-flex items-center gap-1 font-mono text-[#B85D19] bg-[#FDF1E6] px-2 py-0.5 rounded border border-[#F7D8BD]">
                          {group.nonCompliant} Belum
                        </span>
                      )}
                      <span className="font-serif text-xs font-semibold text-[#1E1B18]">
                        {group.percentage}%
                      </span>
                    </div>
                  </div>

                  {/* Division Employee Table */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-[#E5DFD5] bg-white text-[11px] font-semibold text-[#6E665E] uppercase tracking-wider">
                          <th className="py-2.5 px-4 w-20">Kode</th>
                          <th className="py-2.5 px-4">Nama Lengkap</th>
                          <th className="py-2.5 px-4">Akun Terdaftar</th>
                          <th className="py-2.5 px-4">Status Kepatuhan</th>
                          <th className="py-2.5 px-4">Interaksi Tercatat</th>
                          <th className="py-2.5 px-4 text-right">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5DFD5] bg-white">
                        {group.employees.map((row) => (
                          <TableRow
                            key={row.employee.id}
                            row={row}
                            platform={platform}
                            copiedHandle={copiedHandle}
                            onCopy={copyToClipboard}
                            onToggleManual={onToggleManualStatus}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="ledger-card p-10 text-center rounded flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-[#FAF8F5] flex items-center justify-center text-[#6E665E] mb-3 border border-[#E5DFD5]">
                <Users className="w-6 h-6 text-[#C85A32]" />
              </div>
              <h4 className="font-serif text-base font-semibold text-[#1E1B18] mb-1">
                {allRows.length === 0 ? 'Belum Ada Data Master Karyawan' : 'Tidak Ada Karyawan yang Sesuai Filter'}
              </h4>
              <p className="text-xs text-[#6E665E] max-w-md leading-relaxed mb-4">
                {allRows.length === 0 
                  ? 'Tabel karyawan di database Supabase Anda masih kosong. Masukkan daftar karyawan kantor Anda agar sistem dapat memvalidasi interaksi Like & Komentar.'
                  : 'Coba sesuaikan kata kunci pencarian, filter divisi, atau status kepatuhan Anda.'}
              </p>
              {allRows.length === 0 && onOpenEmployeeModal && (
                <button
                  type="button"
                  onClick={onOpenEmployeeModal}
                  className="tactile-btn inline-flex items-center gap-1.5 px-4 py-2 bg-[#C85A32] hover:bg-[#AF4A24] text-white text-xs font-medium uppercase tracking-wider rounded cursor-pointer shadow-sm"
                >
                  <Users className="w-4 h-4" />
                  <span>Tambah / Import Karyawan Sekarang</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Flat Table View */
        <div className="ledger-card rounded-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5DFD5] bg-[#FAF8F5] text-[11px] font-semibold text-[#6E665E] uppercase tracking-wider">
                  <th className="py-3 px-4 w-20">Kode</th>
                  <th className="py-3 px-4">Nama Karyawan</th>
                  <th className="py-3 px-4">Divisi</th>
                  <th className="py-3 px-4">Akun Terdaftar</th>
                  <th className="py-3 px-4">Status Kepatuhan</th>
                  <th className="py-3 px-4">Interaksi Tercatat</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5DFD5] bg-white">
                {filteredRows.length > 0 ? (
                  filteredRows.map((row) => (
                    <TableRow
                      key={row.employee.id}
                      row={row}
                      platform={platform}
                      showDivisionColumn
                      copiedHandle={copiedHandle}
                      onCopy={copyToClipboard}
                      onToggleManual={onToggleManualStatus}
                    />
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="p-10 text-center text-xs text-[#6E665E]">
                      <div className="flex flex-col items-center justify-center">
                        <Users className="w-6 h-6 text-[#9B9187] mb-2" />
                        <p className="font-semibold text-[#1E1B18] mb-1">
                          {allRows.length === 0 ? 'Belum Ada Data Master Karyawan' : 'Tidak ada karyawan yang sesuai dengan pencarian atau filter.'}
                        </p>
                        {allRows.length === 0 && onOpenEmployeeModal && (
                          <button
                            type="button"
                            onClick={onOpenEmployeeModal}
                            className="mt-3 text-xs text-[#C85A32] hover:underline font-semibold cursor-pointer"
                          >
                            + Buka Menu Kelola Karyawan
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

interface TableRowProps {
  row: EmployeeComplianceRow;
  platform: PlatformType;
  showDivisionColumn?: boolean;
  copiedHandle: string | null;
  onCopy: (text: string, id: string) => void;
  onToggleManual?: (employeeId: string, currentStatus: boolean) => void;
}

const TableRow: React.FC<TableRowProps> = ({
  row,
  platform,
  showDivisionColumn,
  copiedHandle,
  onCopy,
  onToggleManual,
}) => {
  const registeredUsername = platform === 'facebook' ? row.employee.fb_username : row.employee.ig_username;

  return (
    <tr className={`hover:bg-[#FAF8F5] transition-colors ${row.is_compliant ? '' : 'bg-[#FFFDFB]'}`}>
      {/* Kode */}
      <td className="py-3 px-4 font-mono text-[11px] text-[#6E665E]">
        {row.employee.employee_code || '-'}
      </td>

      {/* Nama Lengkap */}
      <td className="py-3 px-4 font-medium text-[#1E1B18]">
        {row.employee.full_name}
      </td>

      {/* Divisi (optional if flat) */}
      {showDivisionColumn && (
        <td className="py-3 px-4 text-[#6E665E]">
          <span className="bg-[#EFECE6] px-2 py-0.5 rounded text-[11px]">
            {row.employee.division}
          </span>
        </td>
      )}

      {/* Akun Terdaftar */}
      <td className="py-3 px-4">
        {registeredUsername ? (
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-xs text-[#1E1B18] bg-[#FAF8F5] px-1.5 py-0.5 rounded border border-[#E5DFD5]">
              @{registeredUsername}
            </span>
            <button
              type="button"
              onClick={() => onCopy(registeredUsername, row.employee.id)}
              className="text-[#9B9187] hover:text-[#1E1B18] p-1 cursor-pointer transition-colors"
              title="Salin username"
            >
              {copiedHandle === row.employee.id ? (
                <Check className="w-3 h-3 text-[#2A6F4E]" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        ) : (
          <span className="text-[11px] text-[#B85D19] italic flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> Belum terdaftar
          </span>
        )}
      </td>

      {/* Status Kepatuhan Badge */}
      <td className="py-3 px-4">
        {row.is_compliant ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-[#2A6F4E] bg-[#E6F2EC] border border-[#BEE0CF] rounded">
            <CheckCircle2 className="w-3 h-3" />
            Valid (Like & Komen)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#B85D19] bg-[#FDF1E6] border border-[#F7D8BD] rounded">
            <AlertCircle className="w-3 h-3" />
            Belum Komen
          </span>
        )}
      </td>

      {/* Interaksi Tercatat */}
      <td className="py-3 px-4 max-w-xs">
        {row.engagement ? (
          <div className="space-y-0.5">
            <div className="text-xs text-[#1E1B18] truncate flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-[#C85A32] shrink-0" />
              <span className="italic truncate" title={row.engagement.comment_text || ''}>
                &ldquo;{row.engagement.comment_text || '(Emoji/Stiker)'}&rdquo;
              </span>
            </div>
            {row.engagement.commented_at && (
              <span className="text-[10px] text-[#9B9187] block font-mono">
                {new Date(row.engagement.commented_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
              </span>
            )}
          </div>
        ) : (
          <span className="text-[11px] text-[#9B9187] italic">Belum ada komentar</span>
        )}
      </td>

      {/* Aksi Cepat */}
      <td className="py-3 px-4 text-right">
        {onToggleManual && (
          <button
            type="button"
            onClick={() => onToggleManual(row.employee.id, row.is_compliant)}
            className="text-[11px] px-2 py-1 text-[#6E665E] hover:text-[#1E1B18] border border-[#E5DFD5] hover:border-[#1E1B18] rounded bg-white transition-colors cursor-pointer"
            title="Ubah status kepatuhan secara manual"
          >
            {row.is_compliant ? 'Tandai Belum' : 'Verifikasi Manual'}
          </button>
        )}
      </td>
    </tr>
  );
};
