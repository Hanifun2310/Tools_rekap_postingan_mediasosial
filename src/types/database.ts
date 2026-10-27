export type PlatformType = 'instagram' | 'facebook';

export interface Employee {
  id: string;
  employee_code?: string | null;
  full_name: string;
  division: string;
  ig_username?: string | null;
  fb_username?: string | null;
  created_at?: string;
}

export interface SocialPost {
  id: string;
  platform: PlatformType;
  post_url: string;
  post_shortcode?: string | null;
  title_or_caption?: string | null;
  total_comments_fetched: number;
  last_synced_at?: string;
  created_at?: string;
}

export interface Engagement {
  id: string;
  post_id: string;
  ig_username: string; // or fb_username
  comment_text?: string | null;
  is_valid: boolean;
  commented_at?: string;
}

export interface UnmappedAccount {
  ig_username: string;
  comment_text: string | null;
  commented_at: string;
  platform: PlatformType;
  post_id: string;
}

export interface EmployeeComplianceRow {
  employee: Employee;
  is_compliant: boolean;
  engagement?: Engagement | null;
}

export interface ComplianceMetrics {
  totalEmployees: number;
  totalCompliant: number;
  totalNonCompliant: number;
  compliancePercentage: number;
  totalCommentsFetched: number;
  unmappedCount: number;
}

export interface DivisionGroup {
  division: string;
  total: number;
  compliant: number;
  nonCompliant: number;
  percentage: number;
  employees: EmployeeComplianceRow[];
}
