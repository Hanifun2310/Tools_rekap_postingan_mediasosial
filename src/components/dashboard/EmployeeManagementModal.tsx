'use client';

import React, { useState, useMemo } from 'react';
import { Employee } from '@/types/database';
import { ledgerDataStore, sanitizeUsername } from '@/lib/data-service';
import { 
  X, 
  UserPlus, 
  Upload, 
  Users, 
  Trash2, 
  Download, 
  Search, 
  CheckCircle2, 
  AlertCircle, 
  FileSpreadsheet, 
  Sparkles,
  RefreshCw,
  Plus
} from 'lucide-react';

interface EmployeeManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  employees: Employee[];
  onEmployeesUpdated: () => Promise<void>;
}

type TabType = 'manual' | 'import' | 'list';

const DEFAULT_DIVISIONS = [
  'Operasional',
  'Marketing',
  'IT & Dev',
  'HR & GA',
  'Finance',
  'Creative & Design',
  'Sales & BD',
  'Logistik'
];

export const EmployeeManagementModal: React.FC<EmployeeManagementModalProps> = ({
  isOpen,
  onClose,
  employees,
  onEmployeesUpdated,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('manual');

  // Manual Form State
  const [fullName, setFullName] = useState('');
  const [division, setDivision] = useState(DEFAULT_DIVISIONS[0]);
  const [customDivision, setCustomDivision] = useState('');
  const [isCustomDivision, setIsCustomDivision] = useState(false);
  const [employeeCode, setEmployeeCode] = useState('');
  const [igUsername, setIgUsername] = useState('');
  const [fbUsername, setFbUsername] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [manualMessage, setManualMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Import State
  const [csvText, setCsvText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Search Filter for List Tab
  const [listSearch, setListSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Parse CSV text (supports comma, semicolon, or Excel tab separated) - HOOK CALLED UNCONDITIONALLY
  const parsedRows = useMemo(() => {
    if (!csvText.trim()) return [];

    const lines = csvText.trim().split(/\r?\n/);
    if (lines.length === 0) return [];

    const firstLine = lines[0].toLowerCase();
    const isHeader = firstLine.includes('nama') || firstLine.includes('name') || firstLine.includes('divisi');

    const dataLines = isHeader ? lines.slice(1) : lines;

    return dataLines
      .map((line, idx) => {
        // Detect delimiter
        let delimiter = ',';
        if (line.includes('\t')) delimiter = '\t';
        else if (line.includes(';')) delimiter = ';';

        const parts = line.split(delimiter).map((p) => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length === 0 || !parts[0]) return null;

        return {
          id: `preview_${idx}`,
          full_name: parts[0] || '',
          division: parts[1] || 'Umum',
          ig_username: parts[2] ? sanitizeUsername(parts[2]) : '',
          fb_username: parts[3] ? sanitizeUsername(parts[3]) : '',
          employee_code: parts[4] || `EMP-${String(employees.length + idx + 1).padStart(3, '0')}`,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item && item.full_name));
  }, [csvText, employees.length]);

  // Filtered employee list - HOOK CALLED UNCONDITIONALLY
  const filteredEmployees = useMemo(() => {
    if (!listSearch.trim()) return employees;
    const q = listSearch.toLowerCase();
    return employees.filter((emp) =>
      emp.full_name.toLowerCase().includes(q) ||
      emp.division.toLowerCase().includes(q) ||
      (emp.employee_code && emp.employee_code.toLowerCase().includes(q)) ||
      (emp.ig_username && emp.ig_username.toLowerCase().includes(q))
    );
  }, [employees, listSearch]);

  // Manual Submit
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalDivision = isCustomDivision ? customDivision.trim() : division.trim();
    
    if (!fullName.trim()) {
      setManualMessage({ type: 'error', text: 'Nama lengkap karyawan wajib diisi.' });
      return;
    }
    if (!finalDivision) {
      setManualMessage({ type: 'error', text: 'Divisi wajib diisi.' });
      return;
    }

    try {
      setIsSubmitting(true);
      setManualMessage(null);

      const res = await ledgerDataStore.addEmployee({
        full_name: fullName.trim(),
        division: finalDivision,
        employee_code: employeeCode.trim() || undefined,
        ig_username: igUsername.trim() || undefined,
        fb_username: fbUsername.trim() || undefined,
      });

      if (res.error) {
        setManualMessage({ type: 'error', text: res.error });
        return;
      }

      setManualMessage({ type: 'success', text: `Karyawan "${fullName.trim()}" berhasil disimpan ke database Supabase!` });
      setFullName('');
      setEmployeeCode('');
      setIgUsername('');
      setFbUsername('');
      await onEmployeesUpdated();

      setTimeout(() => setManualMessage(null), 4000);
    } catch (err: any) {
      setManualMessage({ type: 'error', text: err?.message || 'Gagal menyimpan data.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setCsvText(content);
        setImportMessage({ type: 'success', text: `File "${file.name}" berhasil dibaca!` });
      }
    };
    reader.readAsText(file);
  };

  // Submit Import Batch
  const handleBatchImport = async () => {
    if (parsedRows.length === 0) {
      setImportMessage({ type: 'error', text: 'Tidak ada data valid untuk diimport.' });
      return;
    }

    try {
      setIsImporting(true);
      setImportMessage(null);

      const res = await ledgerDataStore.addEmployeesBatch(parsedRows);

      if (res.errors.length > 0 && res.insertedCount === 0) {
        setImportMessage({ type: 'error', text: `Gagal import: ${res.errors.join(', ')}` });
        return;
      }

      setImportMessage({ 
        type: 'success', 
        text: `Sukses mengimport ${res.insertedCount} karyawan ke tabel Supabase!` 
      });
      setCsvText('');
      await onEmployeesUpdated();

      // Switch to list tab to see results
      setTimeout(() => {
        setActiveTab('list');
      }, 1500);
    } catch (err: any) {
      setImportMessage({ type: 'error', text: err?.message || 'Gagal memproses import data.' });
    } finally {
      setIsImporting(false);
    }
  };

  // Sample CSV Template Downloader
  const handleDownloadTemplate = () => {
    const sample = `nama_karyawan,divisi,username_ig,username_fb,kode_karyawan\nBudi Santoso,Operasional,budi_santoso,budi.santoso,EMP-001\nSiti Rahmawati,Operasional,siti_rahma,,EMP-002\nKevin Sanjaya,IT & Dev,kevin_san,kevin.dev,EMP-003\nDewi Lestari,Marketing,dewi_marketing,,EMP-004`;
    const blob = new Blob([`\uFEFF${sample}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Template_Import_Karyawan.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Fill sample text directly
  const handleFillSampleText = () => {
    setCsvText(`nama_karyawan,divisi,username_ig,username_fb,kode_karyawan
Budi Santoso,Operasional,budi_santoso,budi.santoso,EMP-001
Siti Rahmawati,Operasional,siti_rahma,,EMP-002
Kevin Sanjaya,IT & Dev,kevin_san,kevin.dev,EMP-003
Dewi Lestari,Marketing,dewi_marketing,,EMP-004
Wahyu Hidayat,Operasional,,,EMP-005`);
  };

  // Delete Single Employee
  const handleDeleteEmployee = async (id: string, name: string) => {
    if (!confirm(`Hapus karyawan "${name}" dari database Supabase?`)) return;

    try {
      setDeletingId(id);
      const success = await ledgerDataStore.deleteEmployee(id);
      if (success) {
        await onEmployeesUpdated();
      } else {
        alert('Gagal menghapus karyawan.');
      }
    } finally {
      setDeletingId(null);
    }
  };

  // Only return null after all hooks have been executed
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1E1B18]/60 backdrop-blur-xs animate-fadeIn">
      <div 
        className="ledger-card rounded-md w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl border border-[#DDD5C9]"
        role="dialog"
        aria-modal="true"
      >
        {/* Header Masthead */}
        <div className="px-6 py-4 border-b border-[#E5DFD5] bg-[#FAF8F5] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#C85A32]/10 flex items-center justify-center text-[#C85A32] border border-[#C85A32]/25">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#1E1B18]">
                Kelola Database Karyawan (Master Karyawan)
              </h3>
              <p className="text-[11px] text-[#6E665E]">
                Tabel Supabase: <code className="bg-[#EFECE6] px-1 py-0.2 rounded font-mono text-[#1E1B18]">employees</code> • Total {employees.length} Karyawan Terdaftar
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

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-[#E5DFD5] bg-white flex items-center gap-6 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`py-3 font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'manual'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6E665E] hover:text-[#1E1B18]'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Tambah Manual</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('import')}
            className={`py-3 font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'import'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6E665E] hover:text-[#1E1B18]'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Import CSV / Excel</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`py-3 font-semibold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'list'
                ? 'border-[#C85A32] text-[#C85A32]'
                : 'border-transparent text-[#6E665E] hover:text-[#1E1B18]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Daftar Karyawan ({employees.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 bg-white">
          {/* TAB 1: TAMBAH MANUAL */}
          {activeTab === 'manual' && (
            <form onSubmit={handleManualSubmit} className="space-y-4 max-w-2xl mx-auto">
              <div className="p-3 bg-[#FAF8F5] border border-[#E5DFD5] rounded text-xs text-[#6E665E] mb-2">
                Masukkan data karyawan yang wajib mengikuti interaksi Instagram/Facebook kantor. Data langsung tersimpan secara permanen ke database Supabase Anda.
              </div>

              {manualMessage && (
                <div className={`p-3 rounded text-xs flex items-center gap-2 border ${
                  manualMessage.type === 'success'
                    ? 'bg-[#E6F2EC] border-[#BEE0CF] text-[#2A6F4E]'
                    : 'bg-[#FCF4F0] border-[#F3CEBE] text-[#C85A32]'
                }`}>
                  {manualMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{manualMessage.text}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-[#1E1B18] mb-1">
                    Nama Lengkap Karyawan <span className="text-[#C85A32]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Contoh: Budi Santoso"
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18]"
                  />
                </div>

                {/* Divisi */}
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B18] mb-1 flex items-center justify-between">
                    <span>Divisi <span className="text-[#C85A32]">*</span></span>
                    <button
                      type="button"
                      onClick={() => setIsCustomDivision(!isCustomDivision)}
                      className="text-[11px] text-[#C85A32] hover:underline cursor-pointer"
                    >
                      {isCustomDivision ? 'Pilih dari daftar' : '+ Tulis Divisi Kustom'}
                    </button>
                  </label>

                  {isCustomDivision ? (
                    <input
                      type="text"
                      required
                      value={customDivision}
                      onChange={(e) => setCustomDivision(e.target.value)}
                      placeholder="Ketik nama divisi baru..."
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18]"
                    />
                  ) : (
                    <select
                      value={division}
                      onChange={(e) => setDivision(e.target.value)}
                      className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18] cursor-pointer"
                    >
                      {DEFAULT_DIVISIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Kode Karyawan */}
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B18] mb-1">
                    Kode Karyawan / NIK <span className="text-[#9B9187] font-normal">(Opsional)</span>
                  </label>
                  <input
                    type="text"
                    value={employeeCode}
                    onChange={(e) => setEmployeeCode(e.target.value)}
                    placeholder="Contoh: EMP-001"
                    className="w-full px-3 py-2 text-xs font-mono bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18]"
                  />
                </div>

                {/* Username Instagram */}
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B18] mb-1">
                    Username Instagram <span className="text-[#9B9187] font-normal">(@ dihilangkan otomatis)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[#9B9187] font-mono text-xs">@</span>
                    <input
                      type="text"
                      value={igUsername}
                      onChange={(e) => setIgUsername(e.target.value)}
                      placeholder="budi_santoso"
                      className="w-full pl-7 pr-3 py-2 text-xs font-mono bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18]"
                    />
                  </div>
                </div>

                {/* Username Facebook */}
                <div>
                  <label className="block text-xs font-semibold text-[#1E1B18] mb-1">
                    Username Facebook <span className="text-[#9B9187] font-normal">(Opsional)</span>
                  </label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center text-[#9B9187] font-mono text-xs">@</span>
                    <input
                      type="text"
                      value={fbUsername}
                      onChange={(e) => setFbUsername(e.target.value)}
                      placeholder="budi.santoso.fb"
                      className="w-full pl-7 pr-3 py-2 text-xs font-mono bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18]"
                    />
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-3 flex justify-end">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="tactile-btn inline-flex items-center gap-2 px-5 py-2.5 bg-[#C85A32] hover:bg-[#AF4A24] text-white text-xs font-medium uppercase tracking-wider rounded cursor-pointer disabled:opacity-50"
                >
                  <Plus className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
                  <span>{isSubmitting ? 'Menyimpan ke Supabase...' : 'Simpan Karyawan'}</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: IMPORT CSV / EXCEL */}
          {activeTab === 'import' && (
            <div className="space-y-4">
              <div className="p-3 bg-[#FAF8F5] border border-[#E5DFD5] rounded flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="text-[#6E665E]">
                  <strong>Format Kolom yang Didukung:</strong> <code className="bg-[#EFECE6] px-1 py-0.5 rounded font-mono text-[#1E1B18]">nama, divisi, username_ig, username_fb, kode</code>
                  <br />
                  <span className="text-[11px] text-[#9B9187]">Mendukung file .csv, atau copy-paste kolom langsung dari Google Sheets / Excel!</span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="tactile-btn inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-[#FAF8F5] border border-[#E5DFD5] text-[#1E1B18] text-xs rounded font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-[#C85A32]" />
                    <span>Unduh Template CSV</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFillSampleText}
                    className="text-xs text-[#C85A32] hover:underline cursor-pointer"
                  >
                    Coba Data Contoh
                  </button>
                </div>
              </div>

              {importMessage && (
                <div className={`p-3 rounded text-xs flex items-center gap-2 border ${
                  importMessage.type === 'success'
                    ? 'bg-[#E6F2EC] border-[#BEE0CF] text-[#2A6F4E]'
                    : 'bg-[#FCF4F0] border-[#F3CEBE] text-[#C85A32]'
                }`}>
                  {importMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
                  <span>{importMessage.text}</span>
                </div>
              )}

              {/* Upload file or paste area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-[#1E1B18]">
                    Tempel Baris CSV / Spreadsheet di Sini:
                  </label>
                  <label className="text-xs text-[#C85A32] hover:underline cursor-pointer flex items-center gap-1">
                    <Upload className="w-3 h-3" />
                    <span>Atau Upload File CSV</span>
                    <input
                      type="file"
                      accept=".csv,.txt"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                </div>

                <textarea
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`nama_karyawan,divisi,username_ig,username_fb,kode_karyawan\nBudi Santoso,Operasional,budi_santoso,,EMP-001\nKevin Sanjaya,IT & Dev,kevin_san,kevin.dev,EMP-002`}
                  rows={6}
                  className="w-full p-3 text-xs font-mono bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] focus:bg-white text-[#1E1B18] leading-relaxed"
                />
              </div>

              {/* Live Preview Table */}
              {parsedRows.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#1E1B18] uppercase tracking-wider flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-[#2A6F4E]" />
                      Pratinjau Data Valid ({parsedRows.length} Karyawan):
                    </span>
                    <span className="text-[11px] text-[#2A6F4E] font-medium">Siap diimport ke Supabase</span>
                  </div>

                  <div className="max-h-48 overflow-y-auto border border-[#E5DFD5] rounded">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-[#FAF8F5] border-b border-[#E5DFD5] text-[11px] font-semibold text-[#6E665E]">
                          <th className="py-2 px-3">Kode</th>
                          <th className="py-2 px-3">Nama Lengkap</th>
                          <th className="py-2 px-3">Divisi</th>
                          <th className="py-2 px-3">IG Username</th>
                          <th className="py-2 px-3">FB Username</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E5DFD5] bg-white">
                        {parsedRows.map((r, i) => (
                          <tr key={i} className="hover:bg-[#FAF8F5]">
                            <td className="py-1.5 px-3 font-mono text-[11px] text-[#6E665E]">{r.employee_code}</td>
                            <td className="py-1.5 px-3 font-medium text-[#1E1B18]">{r.full_name}</td>
                            <td className="py-1.5 px-3 text-[#6E665E]">{r.division}</td>
                            <td className="py-1.5 px-3 font-mono text-[11px] text-[#1E1B18]">
                              {r.ig_username ? `@${r.ig_username}` : '-'}
                            </td>
                            <td className="py-1.5 px-3 font-mono text-[11px] text-[#1E1B18]">
                              {r.fb_username ? `@${r.fb_username}` : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="button"
                      onClick={handleBatchImport}
                      disabled={isImporting}
                      className="tactile-btn inline-flex items-center gap-2 px-5 py-2.5 bg-[#2A6F4E] hover:bg-[#21573D] text-white text-xs font-medium uppercase tracking-wider rounded cursor-pointer disabled:opacity-50"
                    >
                      <Upload className={`w-4 h-4 ${isImporting ? 'animate-spin' : ''}`} />
                      <span>{isImporting ? 'Mengimport Data...' : `Proses Import (${parsedRows.length} Karyawan)`}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: DAFTAR KARYAWAN */}
          {activeTab === 'list' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9B9187]" />
                  <input
                    type="text"
                    value={listSearch}
                    onChange={(e) => setListSearch(e.target.value)}
                    placeholder="Cari nama karyawan, divisi, atau username..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] text-[#1E1B18]"
                  />
                </div>

                <div className="text-xs text-[#6E665E] shrink-0">
                  Menampilkan <strong className="text-[#1E1B18]">{filteredEmployees.length}</strong> dari {employees.length} personil
                </div>
              </div>

              {filteredEmployees.length > 0 ? (
                <div className="border border-[#E5DFD5] rounded overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F5] border-b border-[#E5DFD5] text-[11px] font-semibold text-[#6E665E] uppercase tracking-wider">
                        <th className="py-2.5 px-3 w-20">Kode</th>
                        <th className="py-2.5 px-3">Nama Lengkap</th>
                        <th className="py-2.5 px-3">Divisi</th>
                        <th className="py-2.5 px-3">Instagram</th>
                        <th className="py-2.5 px-3">Facebook</th>
                        <th className="py-2.5 px-3 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E5DFD5] bg-white">
                      {filteredEmployees.map((emp) => {
                        const isDeleting = deletingId === emp.id;
                        return (
                          <tr key={emp.id} className="hover:bg-[#FAF8F5] transition-colors">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-[#6E665E]">
                              {emp.employee_code || '-'}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-[#1E1B18]">
                              {emp.full_name}
                            </td>
                            <td className="py-2.5 px-3 text-[#6E665E]">
                              <span className="bg-[#EFECE6] px-2 py-0.5 rounded text-[11px]">
                                {emp.division}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {emp.ig_username ? (
                                <span className="text-[#1E1B18]">@{emp.ig_username}</span>
                              ) : (
                                <span className="text-[#9B9187] italic">Belum ada</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px]">
                              {emp.fb_username ? (
                                <span className="text-[#1E1B18]">@{emp.fb_username}</span>
                              ) : (
                                <span className="text-[#9B9187] italic">-</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right">
                              <button
                                type="button"
                                onClick={() => handleDeleteEmployee(emp.id, emp.full_name)}
                                disabled={isDeleting}
                                className="text-[#B85D19] hover:text-[#C85A32] p-1 rounded cursor-pointer transition-colors"
                                title="Hapus karyawan ini dari database"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="p-8 text-center bg-[#FAF8F5] border border-dashed border-[#DDD5C9] rounded text-xs text-[#6E665E]">
                  {employees.length === 0 ? (
                    <div>
                      <Users className="w-8 h-8 text-[#9B9187] mx-auto mb-2" />
                      <p className="font-semibold text-[#1E1B18] mb-1">Database Karyawan Masih Kosong</p>
                      <p className="text-[11px]">Gunakan tab <strong>Tambah Manual</strong> atau <strong>Import CSV / Excel</strong> untuk memasukkan daftar personil kantor Anda.</p>
                    </div>
                  ) : (
                    'Tidak ada karyawan yang cocok dengan pencarian.'
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#E5DFD5] bg-[#FAF8F5] flex items-center justify-between">
          <div className="text-[11px] text-[#6E665E]">
            Data otomatis tersinkronisasi ke tabel Supabase PostgreSQL
          </div>
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
