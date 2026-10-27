import { 
  Employee, 
  SocialPost, 
  Engagement, 
  UnmappedAccount, 
  EmployeeComplianceRow, 
  ComplianceMetrics, 
  DivisionGroup, 
  PlatformType 
} from '@/types/database';
import { supabase, isSupabaseConfigured } from './supabase';

/**
 * Sanitasi username sesuai aturan PRD:
 * "Semua input username wajib melewati fungsi sanitasi username.trim().replace(/^@/, '').toLowerCase() sebelum disimpan atau dicocokkan."
 */
export function sanitizeUsername(username: string | null | undefined): string {
  if (!username) return '';
  return username.trim().replace(/^@+/, '').toLowerCase();
}

/**
 * Parse social media post URLs (Instagram & Facebook)
 */
export function parseSocialUrl(rawUrl: string): { platform: PlatformType; shortcode: string; cleanUrl: string } {
  const trimmed = rawUrl.trim();
  let platform: PlatformType = 'instagram';
  let shortcode = '';

  if (trimmed.includes('facebook.com') || trimmed.includes('fb.watch') || trimmed.includes('fb.me')) {
    platform = 'facebook';
    const fbMatch = trimmed.match(/(?:posts|videos|reel|watch)\/([a-zA-Z0-9_\-\.]+)/i) || trimmed.match(/fbid=([0-9]+)/);
    shortcode = fbMatch ? fbMatch[1] : `fb_${Date.now().toString(36)}`;
  } else {
    // Default to Instagram
    platform = 'instagram';
    const igMatch = trimmed.match(/(?:p|reel|tv)\/([a-zA-Z0-9_\-]+)/i);
    shortcode = igMatch ? igMatch[1] : trimmed.replace(/[^a-zA-Z0-9]/g, '').slice(-11) || `ig_${Date.now().toString(36)}`;
  }

  const cleanUrl = trimmed.split('?')[0];
  return { platform, shortcode, cleanUrl };
}

// Client-side cache/store manager with direct Supabase database integration
class LedgerDataStore {
  private employees: Employee[] = [];
  private posts: SocialPost[] = [];
  private engagements: Engagement[] = [];
  private activePostId: string = '';

  public getStore() {
    return {
      employees: this.employees,
      posts: this.posts,
      engagements: this.engagements,
      activePostId: this.activePostId,
    };
  }

  public setActivePostId(id: string) {
    this.activePostId = id;
  }

  /**
   * Fetch all employees directly from Supabase
   */
  public async fetchEmployees(): Promise<Employee[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .order('full_name', { ascending: true });
        
        if (error) {
          console.error('Error fetching employees from Supabase:', error);
          return [];
        }

        this.employees = data || [];
        return this.employees;
      } catch (err) {
        console.error('Supabase fetch failed:', err);
        return [];
      }
    }

    return this.employees;
  }

  /**
   * Fetch all posts directly from Supabase
   */
  public async fetchPosts(): Promise<SocialPost[]> {
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('social_posts')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching posts from Supabase:', error);
          return [];
        }

        this.posts = data || [];
        if (this.posts.length > 0 && !this.activePostId) {
          this.activePostId = this.posts[0].id;
        } else if (this.posts.length === 0) {
          this.activePostId = '';
        }

        return this.posts;
      } catch (err) {
        console.error('Supabase fetch posts failed:', err);
        return [];
      }
    }

    return this.posts;
  }

  /**
   * Fetch engagements for a specific post
   */
  public async fetchEngagements(postId: string): Promise<Engagement[]> {
    if (!postId) return [];

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('engagements')
          .select('*')
          .eq('post_id', postId);

        if (error) {
          console.error('Error fetching engagements from Supabase:', error);
          return [];
        }

        // Merge or replace engagements for this post
        const otherEngagements = this.engagements.filter((e) => e.post_id !== postId);
        this.engagements = [...otherEngagements, ...(data || [])];
        return data || [];
      } catch (err) {
        console.error('Supabase fetch engagements failed:', err);
        return [];
      }
    }

    return this.engagements.filter((e) => e.post_id === postId);
  }

  /**
   * Tambah Karyawan Baru (Manual)
   */
  public async addEmployee(payload: {
    employee_code?: string | null;
    full_name: string;
    division: string;
    ig_username?: string | null;
    fb_username?: string | null;
  }): Promise<{ data: Employee | null; error: string | null }> {
    const cleanIg = payload.ig_username ? sanitizeUsername(payload.ig_username) : null;
    const cleanFb = payload.fb_username ? sanitizeUsername(payload.fb_username) : null;

    if (!payload.full_name.trim() || !payload.division.trim()) {
      return { data: null, error: 'Nama lengkap dan divisi wajib diisi.' };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .insert({
            employee_code: payload.employee_code?.trim() || null,
            full_name: payload.full_name.trim(),
            division: payload.division.trim(),
            ig_username: cleanIg,
            fb_username: cleanFb,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            return { data: null, error: `Username @${cleanIg} sudah digunakan oleh karyawan lain!` };
          }
          return { data: null, error: error.message };
        }

        if (data) {
          this.employees.push(data);
          this.employees.sort((a, b) => a.full_name.localeCompare(b.full_name));
        }

        return { data, error: null };
      } catch (err: any) {
        return { data: null, error: err?.message || 'Gagal menyimpan ke database Supabase.' };
      }
    }

    // Local fallback
    const newEmp: Employee = {
      id: `emp_${Date.now()}`,
      employee_code: payload.employee_code?.trim() || null,
      full_name: payload.full_name.trim(),
      division: payload.division.trim(),
      ig_username: cleanIg,
      fb_username: cleanFb,
      created_at: new Date().toISOString(),
    };
    this.employees.push(newEmp);
    return { data: newEmp, error: null };
  }

  /**
   * Import Karyawan Massal (Batch Import CSV / Excel)
   */
  public async addEmployeesBatch(items: Array<{
    employee_code?: string | null;
    full_name: string;
    division: string;
    ig_username?: string | null;
    fb_username?: string | null;
  }>): Promise<{ insertedCount: number; errors: string[] }> {
    const errors: string[] = [];
    const validRows = items
      .filter((i) => i.full_name && i.full_name.trim())
      .map((item, idx) => ({
        employee_code: item.employee_code?.trim() || `EMP-${String(this.employees.length + idx + 1).padStart(3, '0')}`,
        full_name: item.full_name.trim(),
        division: item.division?.trim() || 'Umum',
        ig_username: item.ig_username ? sanitizeUsername(item.ig_username) : null,
        fb_username: item.fb_username ? sanitizeUsername(item.fb_username) : null,
      }));

    if (validRows.length === 0) {
      return { insertedCount: 0, errors: ['Tidak ada data valid untuk diimport.'] };
    }

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('employees')
          .insert(validRows)
          .select();

        if (error) {
          errors.push(error.message);
          return { insertedCount: 0, errors };
        }

        if (data) {
          await this.fetchEmployees();
          return { insertedCount: data.length, errors: [] };
        }
      } catch (err: any) {
        errors.push(err?.message || 'Gagal batch insert ke database.');
        return { insertedCount: 0, errors };
      }
    }

    // Local fallback
    for (const r of validRows) {
      this.employees.push({
        id: `emp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        ...r,
        created_at: new Date().toISOString(),
      });
    }

    return { insertedCount: validRows.length, errors: [] };
  }

  /**
   * Hapus Karyawan dari Database
   */
  public async deleteEmployee(employeeId: string): Promise<boolean> {
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('employees')
          .delete()
          .eq('id', employeeId);

        if (error) {
          console.error('Error deleting employee:', error);
          return false;
        }

        this.employees = this.employees.filter((e) => e.id !== employeeId);
        return true;
      } catch (err) {
        console.error('Delete employee failed:', err);
        return false;
      }
    }

    this.employees = this.employees.filter((e) => e.id !== employeeId);
    return true;
  }

  /**
   * Sync a post URL (Ingesti Link Postingan & Background Sync)
   */
  public async syncPost(rawUrl: string, manualTitle?: string): Promise<{ post: SocialPost; newCommentsCount: number }> {
    const { platform, shortcode, cleanUrl } = parseSocialUrl(rawUrl);
    const nowIso = new Date().toISOString();

    // Call server-side API route (handles Apify scraping & Supabase persistence)
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch('/api/sync-post', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url: cleanUrl, title: manualTitle }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Gagal sinkronisasi data (${res.status})`);
        }

        const data = await res.json();
        await this.fetchPosts();
        if (data.postId) {
          this.activePostId = data.postId;
          await this.fetchEngagements(data.postId);
        }

        const post = this.posts.find((p) => p.id === data.postId) || this.posts[0];
        return { post, newCommentsCount: data.newFetchedCount || 0 };
      } catch (err: any) {
        console.error('API /api/sync-post failed, falling back to direct DB sync:', err);
        // Fallback to direct client-side DB sync below if API route fails
      }
    }

    let post: SocialPost;

    if (isSupabaseConfigured) {
      // Check existing post
      const { data: existing } = await supabase
        .from('social_posts')
        .select('*')
        .eq('post_url', cleanUrl)
        .maybeSingle();

      if (!existing) {
        const { data: created, error } = await supabase
          .from('social_posts')
          .insert({
            platform,
            post_url: cleanUrl,
            post_shortcode: shortcode,
            title_or_caption: manualTitle || `Postingan ${platform === 'instagram' ? 'Instagram' : 'Facebook'} [${shortcode}]`,
            total_comments_fetched: 0,
            last_synced_at: nowIso,
          })
          .select()
          .single();

        if (error || !created) {
          throw new Error(error?.message || 'Gagal menyimpan postingan baru ke Supabase.');
        }
        post = created;
        this.posts.unshift(post);
      } else {
        const { data: updated } = await supabase
          .from('social_posts')
          .update({
            last_synced_at: nowIso,
            ...(manualTitle ? { title_or_caption: manualTitle } : {}),
          })
          .eq('id', existing.id)
          .select()
          .single();

        post = updated || existing;
      }

      this.activePostId = post.id;

      // Re-fetch engagements and update count
      const { data: allEngs } = await supabase.from('engagements').select('*').eq('post_id', post.id);
      const totalCount = allEngs?.length || 0;

      await supabase.from('social_posts').update({ total_comments_fetched: totalCount }).eq('id', post.id);
      post.total_comments_fetched = totalCount;

      await this.fetchPosts();
      await this.fetchEngagements(post.id);

      return { post, newCommentsCount: totalCount };
    }

    // Local fallback
    let existingPost = this.posts.find((p) => p.post_url === cleanUrl || (p.post_shortcode && p.post_shortcode === shortcode));
    if (!existingPost) {
      existingPost = {
        id: `post_${Date.now()}`,
        platform,
        post_url: cleanUrl,
        post_shortcode: shortcode,
        title_or_caption: manualTitle || `Postingan ${platform === 'instagram' ? 'Instagram' : 'Facebook'} [${shortcode}]`,
        total_comments_fetched: 0,
        last_synced_at: nowIso,
        created_at: nowIso,
      };
      this.posts.unshift(existingPost);
    }
    this.activePostId = existingPost.id;
    return { post: existingPost, newCommentsCount: 0 };
  }

  /**
   * Ingest Komentar Manual / Real dari Teks (Copy-paste komentar Instagram / Facebook)
   */
  public async ingestCommentsBatch(
    postId: string, 
    items: Array<{ ig_username: string; comment_text?: string }>
  ): Promise<{ insertedCount: number }> {
    const nowIso = new Date().toISOString();
    const cleanRows = items
      .filter((i) => i.ig_username && i.ig_username.trim())
      .map((i) => ({
        post_id: postId,
        ig_username: sanitizeUsername(i.ig_username),
        comment_text: i.comment_text?.trim() || '👍 Hadir / Like',
        is_valid: true,
        commented_at: nowIso,
      }));

    if (cleanRows.length === 0) return { insertedCount: 0 };

    if (isSupabaseConfigured) {
      await supabase.from('engagements').upsert(cleanRows, { onConflict: 'post_id,ig_username' });
      const { data: allEngs } = await supabase.from('engagements').select('*').eq('post_id', postId);
      const totalCount = allEngs?.length || 0;
      await supabase.from('social_posts').update({ total_comments_fetched: totalCount }).eq('id', postId);

      await this.fetchPosts();
      await this.fetchEngagements(postId);
      return { insertedCount: cleanRows.length };
    }

    // Local fallback
    for (const r of cleanRows) {
      const idx = this.engagements.findIndex((e) => e.post_id === postId && e.ig_username === r.ig_username);
      if (idx >= 0) {
        this.engagements[idx] = { ...this.engagements[idx], ...r };
      } else {
        this.engagements.push({
          id: `eng_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          ...r,
        });
      }
    }
    return { insertedCount: cleanRows.length };
  }

  /**
   * 1-Click Bind Unmapped Account (Karantina Akun & Pembaruan Permanen)
   */
  public async bindAccount(
    postId: string,
    unmappedUsername: string,
    employeeId: string,
    platform: PlatformType = 'instagram'
  ): Promise<boolean> {
    const cleanUsername = sanitizeUsername(unmappedUsername);

    if (isSupabaseConfigured) {
      try {
        const updateField = platform === 'facebook' 
          ? { fb_username: cleanUsername } 
          : { ig_username: cleanUsername };

        // 1. Permanently update employee handle in Supabase
        const { error: empErr } = await supabase
          .from('employees')
          .update(updateField)
          .eq('id', employeeId);

        if (empErr) {
          console.error('Supabase update employee username failed:', empErr);
          return false;
        }

        // 2. Mark engagement record valid
        await supabase
          .from('engagements')
          .update({ is_valid: true })
          .eq('post_id', postId)
          .eq('ig_username', cleanUsername);

        // 3. Refresh cache
        await this.fetchEmployees();
        await this.fetchEngagements(postId);

        return true;
      } catch (err) {
        console.error('Supabase bind update failed:', err);
        return false;
      }
    }

    // Local fallback
    const empIndex = this.employees.findIndex((e) => e.id === employeeId);
    if (empIndex !== -1) {
      if (platform === 'facebook') {
        this.employees[empIndex].fb_username = cleanUsername;
      } else {
        this.employees[empIndex].ig_username = cleanUsername;
      }
    }

    const eng = this.engagements.find((e) => e.post_id === postId && sanitizeUsername(e.ig_username) === cleanUsername);
    if (eng) {
      eng.is_valid = true;
    }

    return true;
  }

  /**
   * Manual override toggle for admin
   */
  public async manualToggleCompliance(postId: string, employeeId: string, currentStatus: boolean): Promise<boolean> {
    const emp = this.employees.find((e) => e.id === employeeId);
    if (!emp) return false;

    const username = sanitizeUsername(emp.ig_username || emp.fb_username) || `manual_${emp.employee_code?.toLowerCase() || employeeId.slice(0, 8)}`;

    if (isSupabaseConfigured) {
      try {
        if (currentStatus) {
          // Remove engagement
          await supabase
            .from('engagements')
            .delete()
            .eq('post_id', postId)
            .eq('ig_username', username);
        } else {
          // Add verified engagement
          await supabase
            .from('engagements')
            .upsert({
              post_id: postId,
              ig_username: username,
              comment_text: '✅ Terverifikasi Manual oleh Admin',
              is_valid: true,
              commented_at: new Date().toISOString(),
            }, { onConflict: 'post_id,ig_username' });
        }

        await this.fetchEngagements(postId);
        return true;
      } catch (err) {
        console.error('Toggle manual status failed in Supabase:', err);
        return false;
      }
    }

    // Local fallback
    if (currentStatus) {
      this.engagements = this.engagements.filter(
        (e) => !(e.post_id === postId && sanitizeUsername(e.ig_username) === username)
      );
    } else {
      this.engagements.push({
        id: `eng_manual_${Date.now()}`,
        post_id: postId,
        ig_username: username,
        comment_text: '✅ Terverifikasi Manual oleh Admin',
        is_valid: true,
        commented_at: new Date().toISOString(),
      });
    }

    return true;
  }

  /**
   * Compute compliance matrix and unmapped quarantine list
   */
  public getComplianceData(postId?: string): {
    metrics: ComplianceMetrics;
    divisionGroups: DivisionGroup[];
    unmappedAccounts: UnmappedAccount[];
    allRows: EmployeeComplianceRow[];
  } {
    const currentPost = this.posts.find((p) => p.id === postId) || this.posts[0] || null;
    const postPlatform = currentPost?.platform || 'instagram';

    const engagementsForPost = currentPost ? this.engagements.filter((e) => e.post_id === currentPost.id) : [];

    // Map comments by sanitized username
    const engagementMap = new Map<string, Engagement>();
    engagementsForPost.forEach((eng) => {
      const cleanName = sanitizeUsername(eng.ig_username);
      if (!engagementMap.has(cleanName)) {
        engagementMap.set(cleanName, eng);
      }
    });

    const allRows: EmployeeComplianceRow[] = [];
    let compliantCount = 0;

    for (const emp of this.employees) {
      const registeredUsername = postPlatform === 'facebook' 
        ? sanitizeUsername(emp.fb_username) 
        : sanitizeUsername(emp.ig_username);

      let matchedEngagement: Engagement | null = null;
      let isCompliant = false;

      if (registeredUsername && engagementMap.has(registeredUsername)) {
        matchedEngagement = engagementMap.get(registeredUsername)!;
        isCompliant = true;
      }

      if (isCompliant) {
        compliantCount++;
      }

      allRows.push({
        employee: emp,
        is_compliant: isCompliant,
        engagement: matchedEngagement,
      });
    }

    // Unmapped accounts
    const unmappedAccounts: UnmappedAccount[] = [];
    if (currentPost) {
      engagementMap.forEach((eng, cleanName) => {
        const isKnown = this.employees.some((emp) => {
          const u = postPlatform === 'facebook' ? sanitizeUsername(emp.fb_username) : sanitizeUsername(emp.ig_username);
          return u === cleanName;
        });

        if (!isKnown) {
          unmappedAccounts.push({
            ig_username: cleanName,
            comment_text: eng.comment_text || '(Tidak ada teks)',
            commented_at: eng.commented_at || new Date().toISOString(),
            platform: postPlatform,
            post_id: currentPost.id,
          });
        }
      });
    }

    // Group rows by division
    const divisionMap = new Map<string, EmployeeComplianceRow[]>();
    for (const row of allRows) {
      const div = row.employee.division || 'Umum';
      if (!divisionMap.has(div)) {
        divisionMap.set(div, []);
      }
      divisionMap.get(div)!.push(row);
    }

    const divisionGroups: DivisionGroup[] = [];
    divisionMap.forEach((rows, division) => {
      const total = rows.length;
      const comp = rows.filter((r) => r.is_compliant).length;
      const nonComp = total - comp;
      const percentage = total > 0 ? Math.round((comp / total) * 100) : 0;

      rows.sort((a, b) => {
        if (a.is_compliant === b.is_compliant) {
          return a.employee.full_name.localeCompare(b.employee.full_name);
        }
        return a.is_compliant ? 1 : -1;
      });

      divisionGroups.push({
        division,
        total,
        compliant: comp,
        nonCompliant: nonComp,
        percentage,
        employees: rows,
      });
    });

    divisionGroups.sort((a, b) => a.division.localeCompare(b.division));

    const totalEmployees = this.employees.length;
    const totalCompliant = compliantCount;
    const totalNonCompliant = totalEmployees - totalCompliant;
    const compliancePercentage = totalEmployees > 0 ? Math.round((totalCompliant / totalEmployees) * 100) : 0;

    const metrics: ComplianceMetrics = {
      totalEmployees,
      totalCompliant,
      totalNonCompliant,
      compliancePercentage,
      totalCommentsFetched: engagementsForPost.length,
      unmappedCount: unmappedAccounts.length,
    };

    return {
      metrics,
      divisionGroups,
      unmappedAccounts,
      allRows,
    };
  }

  /**
   * Generate CSV for Monthly Export
   */
  public generateMonthlyCsv(postId: string): string {
    const { allRows } = this.getComplianceData(postId);
    const post = this.posts.find((p) => p.id === postId) || this.posts[0];

    let csv = `KODE_KARYAWAN,NAMA_KARYAWAN,DIVISI,USERNAME_IG,USERNAME_FB,STATUS_KEPATUHAN,KOMENTAR,WAKTU_KOMEN,POST_URL\n`;

    for (const r of allRows) {
      const code = r.employee.employee_code || '-';
      const name = `"${r.employee.full_name.replace(/"/g, '""')}"`;
      const div = `"${r.employee.division.replace(/"/g, '""')}"`;
      const ig = r.employee.ig_username ? `@${r.employee.ig_username}` : '-';
      const fb = r.employee.fb_username ? `@${r.employee.fb_username}` : '-';
      const status = r.is_compliant ? 'VALID (SUDAH INTERAKSI)' : 'BELUM KOMEN';
      const comment = r.engagement?.comment_text ? `"${r.engagement.comment_text.replace(/"/g, '""')}"` : '-';
      const time = r.engagement?.commented_at || '-';
      const pUrl = post ? post.post_url : '-';

      csv += `${code},${name},${div},${ig},${fb},${status},${comment},${time},${pUrl}\n`;
    }

    return csv;
  }

  /**
   * Purge monthly logs (deletes engagements and social_posts, keeps employees)
   */
  public async purgeMonthlyLogs(): Promise<{ deletedPosts: number; deletedEngagements: number }> {
    const postCount = this.posts.length;
    const engCount = this.engagements.length;

    if (isSupabaseConfigured) {
      try {
        await supabase.from('engagements').delete().not('id', 'is', null);
        await supabase.from('social_posts').delete().not('id', 'is', null);
      } catch (err) {
        console.error('Supabase purge failed:', err);
      }
    }

    this.posts = [];
    this.engagements = [];
    this.activePostId = '';

    return { deletedPosts: postCount, deletedEngagements: engCount };
  }
}

export const ledgerDataStore = new LedgerDataStore();
