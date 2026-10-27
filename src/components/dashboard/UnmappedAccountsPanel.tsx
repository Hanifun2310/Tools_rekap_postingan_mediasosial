'use client';

import React, { useState } from 'react';
import { UnmappedAccount, Employee, PlatformType } from '@/types/database';
import { 
  AlertTriangle, 
  UserCheck, 
  CheckCircle, 
  MessageSquare, 
  Search, 
  Sparkles,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface UnmappedAccountsPanelProps {
  unmappedAccounts: UnmappedAccount[];
  employees: Employee[];
  platform: PlatformType;
  onBindAccount: (unmappedUsername: string, employeeId: string) => Promise<void>;
  isLoading: boolean;
}

export const UnmappedAccountsPanel: React.FC<UnmappedAccountsPanelProps> = ({
  unmappedAccounts,
  employees,
  platform,
  onBindAccount,
  isLoading,
}) => {
  const [selectedEmployees, setSelectedEmployees] = useState<Record<string, string>>({});
  const [bindingKey, setBindingKey] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const handleSelectEmployee = (username: string, employeeId: string) => {
    setSelectedEmployees((prev) => ({
      ...prev,
      [username]: employeeId,
    }));
  };

  const handleBind = async (username: string) => {
    const employeeId = selectedEmployees[username];
    if (!employeeId) return;

    try {
      setBindingKey(username);
      await onBindAccount(username, employeeId);
      const emp = employees.find((e) => e.id === employeeId);
      setSuccessToast(`Akun @${username} berhasil dihubungkan permanen ke "${emp?.full_name}"!`);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch {
      alert('Gagal menghubungkan akun. Silakan coba kembali.');
    } finally {
      setBindingKey(null);
    }
  };

  const filteredAccounts = unmappedAccounts.filter((acc) => {
    if (!searchFilter.trim()) return true;
    const q = searchFilter.toLowerCase();
    return (
      acc.ig_username.toLowerCase().includes(q) ||
      (acc.comment_text && acc.comment_text.toLowerCase().includes(q))
    );
  });

  return (
    <div className="ledger-card rounded-md p-6 mb-6">
      {/* Header Ledger Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-5 border-b border-[#E5DFD5] gap-2">
        <div className="flex items-center gap-2.5">
          <span className={`w-2.5 h-2.5 rounded-full ${unmappedAccounts.length > 0 ? 'bg-[#B85D19]' : 'bg-[#2A6F4E]'}`} />
          <h2 className="text-xs font-semibold tracking-widest text-[#6E665E] uppercase ledger-stamp">
            Karantina Akun Belum Terpetakan (1-Click Bind)
          </h2>
        </div>

        <div className="flex items-center gap-2">
          {unmappedAccounts.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-medium bg-[#FDF1E6] text-[#B85D19] border border-[#F7D8BD] rounded">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{unmappedAccounts.length} Akun Perlu Dihubungkan</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-xs font-medium bg-[#E6F2EC] text-[#2A6F4E] border border-[#BEE0CF] rounded">
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Semua Komentator Terpetakan</span>
            </span>
          )}
        </div>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="mb-4 p-3 bg-[#E6F2EC] border border-[#BEE0CF] text-[#2A6F4E] text-xs rounded flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-xs underline cursor-pointer text-[#2A6F4E]"
          >
            Tutup
          </button>
        </div>
      )}

      {/* Description / Business Rule Context */}
      <p className="text-xs text-[#6E665E] mb-4 leading-relaxed">
        Daftar di bawah memuat akun yang berkomentar pada postingan namun <span className="font-semibold text-[#1E1B18]">@username</span>-nya belum terdaftar di database karyawan (atau karyawan mengganti username Instagram/Facebook miliknya). Pilih karyawan yang sesuai lalu klik <strong className="text-[#C85A32]">Hubungkan</strong> untuk memperbarui data permanen & menandai kehadiran secara otomatis.
      </p>

      {/* Filter if multiple */}
      {unmappedAccounts.length > 3 && (
        <div className="mb-4 relative">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[#9B9187]" />
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Cari akun komentator atau cuplikan isi komen..."
            className="w-full pl-8 pr-3 py-1.5 text-xs font-mono bg-[#FAF8F5] border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] text-[#1E1B18]"
          />
        </div>
      )}

      {/* List of Quarantine Accounts */}
      {filteredAccounts.length > 0 ? (
        <div className="divide-y divide-[#E5DFD5] border border-[#E5DFD5] rounded bg-[#FAF8F5] overflow-hidden">
          {filteredAccounts.map((item) => {
            const isBindingThis = bindingKey === item.ig_username;
            const chosenEmpId = selectedEmployees[item.ig_username] || '';
            const chosenEmp = employees.find((e) => e.id === chosenEmpId);

            return (
              <div
                key={item.ig_username}
                className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white hover:bg-[#FDFBF7] transition-colors"
              >
                {/* Left: Comment details */}
                <div className="space-y-1.5 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-[#1E1B18] bg-[#EFECE6] px-2 py-0.5 rounded border border-[#DDD5C9]">
                      @{item.ig_username}
                    </span>
                    <span className="text-[10px] text-[#9B9187] uppercase tracking-wider">
                      {item.platform}
                    </span>
                    <span className="text-[11px] text-[#9B9187]">
                      • {new Date(item.commented_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB
                    </span>
                  </div>

                  <div className="flex items-start gap-2 text-xs text-[#1E1B18] bg-[#F7F4EF] p-2 rounded border border-[#E5DFD5]">
                    <MessageSquare className="w-3.5 h-3.5 text-[#C85A32] shrink-0 mt-0.5" />
                    <span className="italic break-words">
                      &ldquo;{item.comment_text}&rdquo;
                    </span>
                  </div>
                </div>

                {/* Right: 1-Click Bind Selector & Action */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:w-96 shrink-0">
                  <div className="relative flex-1">
                    <select
                      value={chosenEmpId}
                      onChange={(e) => handleSelectEmployee(item.ig_username, e.target.value)}
                      disabled={isBindingThis || isLoading}
                      className="w-full text-xs py-2 px-2.5 bg-white border border-[#E5DFD5] rounded focus:outline-none focus:border-[#C85A32] text-[#1E1B18] font-sans truncate cursor-pointer"
                    >
                      <option value="">-- Pilih Nama Karyawan --</option>
                      {employees.map((emp) => {
                        const existingHandle = platform === 'facebook' ? emp.fb_username : emp.ig_username;
                        return (
                          <option key={emp.id} value={emp.id}>
                            {emp.full_name} ({emp.division}) {existingHandle ? `[saat ini: @${existingHandle}]` : '[belum ada IG]'}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleBind(item.ig_username)}
                    disabled={!chosenEmpId || isBindingThis || isLoading}
                    className="tactile-btn inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs font-medium uppercase tracking-wider bg-[#2A6F4E] hover:bg-[#21573D] text-white rounded cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap shadow-sm"
                  >
                    <UserCheck className="w-3.5 h-3.5" />
                    <span>{isBindingThis ? 'Menghubungkan...' : 'Hubungkan'}</span>
                  </button>
                </div>

                {/* Micro note if overwriting existing handle (Edge Case 4) */}
                {chosenEmp && (platform === 'facebook' ? chosenEmp.fb_username : chosenEmp.ig_username) && (
                  <div className="lg:hidden text-[11px] text-[#B85D19] flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" />
                    <span>
                      Akan memperbarui username lama (@{platform === 'facebook' ? chosenEmp.fb_username : chosenEmp.ig_username}) ke @{item.ig_username}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center bg-[#FAF8F5] border border-[#E5DFD5] rounded flex flex-col items-center justify-center">
          <div className="w-10 h-10 rounded-full bg-[#E6F2EC] flex items-center justify-center text-[#2A6F4E] mb-2 border border-[#BEE0CF]">
            <CheckCircle className="w-5 h-5" />
          </div>
          <h4 className="font-serif text-sm font-semibold text-[#1E1B18] mb-0.5">
            Semua Komentar Telah Cocok dengan Karyawan
          </h4>
          <p className="text-xs text-[#6E665E] max-w-md">
            Tidak ada akun karantina yang belum terhubung. Setiap komentar pada postingan ini berhasil dicocokkan dengan data master karyawan.
          </p>
        </div>
      )}
    </div>
  );
};
