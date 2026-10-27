'use client';

import React from 'react';
import { isSupabaseConfigured } from '@/lib/supabase';
import { 
  Users, 
  UserPlus, 
  Calendar, 
  ShieldCheck, 
  Database,
  RotateCcw
} from 'lucide-react';

interface HeaderProps {
  employeesCount: number;
  onOpenEmployeeModal: () => void;
  onResetSeed?: () => void;
  lastUpdatedTime?: string;
}

export const Header: React.FC<HeaderProps> = ({ 
  employeesCount, 
  onOpenEmployeeModal, 
  onResetSeed, 
  lastUpdatedTime 
}) => {
  const [currentDate, setCurrentDate] = React.useState<string>('Memuat tanggal...');

  React.useEffect(() => {
    setCurrentDate(
      new Date().toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    );
  }, []);

  return (
    <header className="border-b border-[#E5DFD5] bg-[#FFFFFF] shadow-xs">
      {/* Top Ledger Strip */}
      <div className="border-b border-[#EFECE6] bg-[#FAF8F5] px-4 sm:px-8 py-2 text-[11px] text-[#6E665E] flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <span className="font-mono text-[#1E1B18] font-medium tracking-tight">
            LEDGER NO: SM-2026-Q4-01
          </span>
          <span className="text-[#DDD5C9]">|</span>
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3 text-[#C85A32]" />
            {currentDate}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full ${isSupabaseConfigured ? 'bg-[#2A6F4E] ring-2 ring-[#BEE0CF]' : 'bg-[#C85A32]'}`} />
            <span className={`font-mono text-[11px] font-medium ${isSupabaseConfigured ? 'text-[#2A6F4E]' : 'text-[#6E665E]'}`}>
              {isSupabaseConfigured ? 'Database Online / Terhubung' : 'Mode Offline / Local Ledger'}
            </span>
          </div>

          {!isSupabaseConfigured && onResetSeed && (
            <>
              <span className="text-[#DDD5C9]">|</span>
              <button
                type="button"
                onClick={onResetSeed}
                className="text-[11px] text-[#6E665E] hover:text-[#C85A32] flex items-center gap-1 transition-colors cursor-pointer"
                title="Muat ulang data simulasi awal"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset Demo Seed</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Editorial Masthead */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-5">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1.5 flex-wrap">
              <span className="text-[10px] uppercase font-bold tracking-widest text-[#C85A32] bg-[#FCF4F0] px-2 py-0.5 rounded border border-[#F3CEBE] ledger-stamp">
                Internal Corporate Ledger
              </span>
              <span className="text-xs text-[#9B9187] font-mono">
                Standard: 1 Komen = Valid
              </span>
            </div>

            <h1 className="font-serif text-2xl sm:text-3xl lg:text-4xl font-extrabold text-[#1E1B18] tracking-tight leading-tight">
              Lembar Rekap Kepatuhan Sosmed Karyawan
            </h1>

            <p className="text-xs sm:text-sm text-[#6E665E] mt-1 max-w-2xl leading-relaxed">
              Pelacakan interaksi (Like & Komentar) postingan resmi Instagram & Facebook secara otomatis, karantina akun belum terpetakan dengan 1-Click Bind, dan generator laporan WhatsApp per divisi.
            </p>
          </div>

          {/* Action Button: Kelola Karyawan & Status Badges */}
          <div className="shrink-0 flex flex-col sm:flex-row md:flex-col items-start md:items-end gap-2.5">
            <button
              type="button"
              onClick={onOpenEmployeeModal}
              className="tactile-btn inline-flex items-center gap-2 px-4 py-2.5 bg-[#1E1B18] hover:bg-[#332F2A] text-white text-xs font-medium uppercase tracking-wider rounded cursor-pointer shadow-sm"
            >
              <UserPlus className="w-4 h-4 text-[#C85A32]" />
              <span>Kelola Karyawan</span>
              <span className="bg-[#FFFFFF]/20 text-white text-[10px] font-mono px-1.5 py-0.5 rounded">
                {employeesCount} Personil
              </span>
            </button>

            <div className="flex items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono bg-[#EFECE6] px-2 py-0.5 rounded text-[#1E1B18] border border-[#DDD5C9]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#2A6F4E]" />
                Zero-Cost Serverless
              </span>
              {lastUpdatedTime && (
                <span className="text-[10px] text-[#9B9187] font-mono">
                  {lastUpdatedTime}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
