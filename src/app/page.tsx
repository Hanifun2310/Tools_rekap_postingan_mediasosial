'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  Employee, 
  SocialPost, 
  UnmappedAccount, 
  ComplianceMetrics, 
  DivisionGroup, 
  EmployeeComplianceRow 
} from '@/types/database';
import { ledgerDataStore } from '@/lib/data-service';
import { Header } from '@/components/layout/Header';
import { PostSyncPanel } from '@/components/dashboard/PostSyncPanel';
import { UnmappedAccountsPanel } from '@/components/dashboard/UnmappedAccountsPanel';
import { ComplianceMatrix } from '@/components/dashboard/ComplianceMatrix';
import { WhatsAppReportModal } from '@/components/dashboard/WhatsAppReportModal';
import { MonthlyPurgeModal } from '@/components/dashboard/MonthlyPurgeModal';
import { EmployeeManagementModal } from '@/components/dashboard/EmployeeManagementModal';

export default function DashboardPage() {
  const [posts, setPosts] = useState<SocialPost[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [activePost, setActivePost] = useState<SocialPost | null>(null);
  const [metrics, setMetrics] = useState<ComplianceMetrics>({
    totalEmployees: 0,
    totalCompliant: 0,
    totalNonCompliant: 0,
    compliancePercentage: 0,
    totalCommentsFetched: 0,
    unmappedCount: 0,
  });
  const [divisionGroups, setDivisionGroups] = useState<DivisionGroup[]>([]);
  const [unmappedAccounts, setUnmappedAccounts] = useState<UnmappedAccount[]>([]);
  const [allRows, setAllRows] = useState<EmployeeComplianceRow[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdatedTime, setLastUpdatedTime] = useState<string>('');

  // Modals
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [isPurgeModalOpen, setIsPurgeModalOpen] = useState(false);
  const [isEmployeeModalOpen, setIsEmployeeModalOpen] = useState(false);

  // Refresh entire dashboard view
  const refreshDashboard = useCallback(async () => {
    setIsLoading(true);
    try {
      const [fetchedPosts, fetchedEmployees] = await Promise.all([
        ledgerDataStore.fetchPosts(),
        ledgerDataStore.fetchEmployees(),
      ]);

      setPosts(fetchedPosts);
      setEmployees(fetchedEmployees);

      const store = ledgerDataStore.getStore();
      const currentActive = fetchedPosts.find((p) => p.id === store.activePostId) || fetchedPosts[0] || null;
      setActivePost(currentActive);

      if (currentActive) {
        // Ensure engagements for this post are loaded
        await ledgerDataStore.fetchEngagements(currentActive.id);
        const comp = ledgerDataStore.getComplianceData(currentActive.id);
        setMetrics(comp.metrics);
        setDivisionGroups(comp.divisionGroups);
        setUnmappedAccounts(comp.unmappedAccounts);
        setAllRows(comp.allRows);
      } else {
        setMetrics({
          totalEmployees: fetchedEmployees.length,
          totalCompliant: 0,
          totalNonCompliant: fetchedEmployees.length,
          compliancePercentage: 0,
          totalCommentsFetched: 0,
          unmappedCount: 0,
        });
        setDivisionGroups([]);
        setUnmappedAccounts([]);
        setAllRows(fetchedEmployees.map(emp => ({
          employee: emp,
          is_compliant: false,
          engagement: null,
        })));
      }

      setLastUpdatedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Handle switching active post
  const handleSelectPost = async (post: SocialPost) => {
    ledgerDataStore.setActivePostId(post.id);
    setActivePost(post);
    await ledgerDataStore.fetchEngagements(post.id);
    const comp = ledgerDataStore.getComplianceData(post.id);
    setMetrics(comp.metrics);
    setDivisionGroups(comp.divisionGroups);
    setUnmappedAccounts(comp.unmappedAccounts);
    setAllRows(comp.allRows);
    setLastUpdatedTime(new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' WIB');
  };

  // Sync Post
  const handleSyncPost = async (url: string, title?: string) => {
    await ledgerDataStore.syncPost(url, title);
    await refreshDashboard();
  };

  // Manual Ingest Comments from Drawer
  const handleIngestCommentsManual = async (
    postId: string, 
    comments: Array<{ ig_username: string; comment_text?: string }>
  ) => {
    await ledgerDataStore.ingestCommentsBatch(postId, comments);
    await refreshDashboard();
  };

  // 1-Click Bind Unmapped Account
  const handleBindAccount = async (unmappedUsername: string, employeeId: string) => {
    if (!activePost) return;
    await ledgerDataStore.bindAccount(activePost.id, unmappedUsername, employeeId, activePost.platform);
    await refreshDashboard();
  };

  // Manual toggle override
  const handleToggleManualStatus = async (employeeId: string, currentStatus: boolean) => {
    if (!activePost) return;
    await ledgerDataStore.manualToggleCompliance(activePost.id, employeeId, currentStatus);
    const comp = ledgerDataStore.getComplianceData(activePost.id);
    setMetrics(comp.metrics);
    setDivisionGroups(comp.divisionGroups);
    setUnmappedAccounts(comp.unmappedAccounts);
    setAllRows(comp.allRows);
  };

  // Export & Purge
  const handleExportCsv = () => {
    if (!activePost) return '';
    return ledgerDataStore.generateMonthlyCsv(activePost.id);
  };

  const handlePurgeLogs = async () => {
    const res = await ledgerDataStore.purgeMonthlyLogs();
    await refreshDashboard();
    return res;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F4EF] text-[#1E1B18]">
      {/* Editorial Header */}
      <Header 
        employeesCount={employees.length}
        onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
        lastUpdatedTime={lastUpdatedTime} 
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        {/* Panel 1: Post Ingestion & Background Sync */}
        <PostSyncPanel
          posts={posts}
          activePost={activePost}
          onSelectPost={handleSelectPost}
          onSyncPost={handleSyncPost}
          onIngestCommentsManual={handleIngestCommentsManual}
          isLoading={isLoading}
        />

        {/* Panel 2: Unmapped Accounts 1-Click Bind */}
        <UnmappedAccountsPanel
          unmappedAccounts={unmappedAccounts}
          employees={employees}
          platform={activePost?.platform || 'instagram'}
          onBindAccount={handleBindAccount}
          isLoading={isLoading}
        />

        {/* Panel 3: Compliance Matrix & Division Breakdown */}
        <ComplianceMatrix
          metrics={metrics}
          divisionGroups={divisionGroups}
          allRows={allRows}
          activePost={activePost}
          onOpenWhatsAppModal={() => setIsWhatsAppModalOpen(true)}
          onOpenPurgeModal={() => setIsPurgeModalOpen(true)}
          onOpenEmployeeModal={() => setIsEmployeeModalOpen(true)}
          onToggleManualStatus={handleToggleManualStatus}
        />
      </main>

      {/* WhatsApp Report Generator Modal */}
      <WhatsAppReportModal
        isOpen={isWhatsAppModalOpen}
        onClose={() => setIsWhatsAppModalOpen(false)}
        activePost={activePost}
        divisionGroups={divisionGroups}
        metrics={metrics}
      />

      {/* Monthly Purge & CSV Export Modal */}
      <MonthlyPurgeModal
        isOpen={isPurgeModalOpen}
        onClose={() => setIsPurgeModalOpen(false)}
        activePost={activePost}
        onExportCsv={handleExportCsv}
        onPurgeLogs={handlePurgeLogs}
        onResetSeed={() => refreshDashboard()}
      />

      {/* Employee Management Modal (Tambah Manual & Import CSV/Excel) */}
      <EmployeeManagementModal
        isOpen={isEmployeeModalOpen}
        onClose={() => setIsEmployeeModalOpen(false)}
        employees={employees}
        onEmployeesUpdated={refreshDashboard}
      />

      {/* Editorial Footer */}
      <footer className="mt-auto border-t border-[#E5DFD5] bg-[#FFFFFF] py-6 px-4 sm:px-8 text-xs text-[#6E665E]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#C85A32]" />
            <span className="font-serif font-bold text-[#1E1B18]">
              Tactile Editorial Ledger
            </span>
            <span>— Sistem Rekapitulasi Kepatuhan Media Sosial Internal</span>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-[#9B9187]">
            <span>Next.js App Router</span>
            <span>•</span>
            <span>Tailwind CSS</span>
            <span>•</span>
            <span className="text-[#2A6F4E] font-medium">Supabase Database Terhubung</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
