-- ===================================================================
-- SCHEMA: Rekap Like & Komen Sosmed (IG & FB Compliance Ledger)
-- Standard: Zero-Cost Serverless PostgreSQL (Supabase)
-- ===================================================================

-- 1. Master Karyawan
CREATE TABLE IF NOT EXISTS employees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  employee_code TEXT,
  full_name TEXT NOT NULL,
  division TEXT NOT NULL,
  ig_username TEXT UNIQUE,
  fb_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_employees_ig ON employees(ig_username);
CREATE INDEX IF NOT EXISTS idx_employees_division ON employees(division);

-- 2. Postingan Sosial Media
CREATE TABLE IF NOT EXISTS social_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'facebook')),
  post_url TEXT NOT NULL UNIQUE,
  post_shortcode TEXT,
  title_or_caption TEXT,
  total_comments_fetched INT DEFAULT 0,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. Log Interaksi (Dibersihkan Setiap Akhir Bulan via Monthly Purge)
CREATE TABLE IF NOT EXISTS engagements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES social_posts(id) ON DELETE CASCADE,
  ig_username TEXT NOT NULL,
  comment_text TEXT,
  is_valid BOOLEAN DEFAULT TRUE,
  commented_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  UNIQUE(post_id, ig_username)
);

CREATE INDEX IF NOT EXISTS idx_engagements_post_user ON engagements(post_id, ig_username);

-- ===================================================================
-- SEED DATA (Sampel Karyawan, Postingan, dan Komentar Interaksi)
-- ===================================================================

INSERT INTO employees (employee_code, full_name, division, ig_username, fb_username)
VALUES
  ('EMP-001', 'Budi Santoso', 'Operasional', 'budi_santoso', 'budi.santoso.fb'),
  ('EMP-002', 'Siti Rahmawati', 'Operasional', 'siti_rahma', NULL),
  ('EMP-003', 'Wahyu Hidayat', 'Operasional', NULL, NULL), -- sengaja NULL untuk simulasi 1-Click Bind
  ('EMP-004', 'Ahmad Fauzi', 'Operasional', 'ahmad_fauzi_ops', 'ahmad.fauzi'),
  ('EMP-005', 'Dewi Lestari', 'Marketing', 'dewi_marketing', 'dewi.lestari'),
  ('EMP-006', 'Rian Pratama', 'Marketing', 'rian_pratama', NULL),
  ('EMP-007', 'Citra Kirana', 'Marketing', NULL, NULL), -- simulasi unmapped
  ('EMP-008', 'Kevin Sanjaya', 'IT & Dev', 'kevin_san', 'kevin.sanjaya.dev'),
  ('EMP-009', 'Anisa Tri Wulandari', 'IT & Dev', 'anisa_tri', NULL),
  ('EMP-010', 'Eko Prasetyo', 'IT & Dev', NULL, NULL), -- simulasi unmapped
  ('EMP-011', 'Fajar Nugroho', 'IT & Dev', 'fajar_nug', NULL),
  ('EMP-012', 'Mega Silvia', 'HR & GA', 'mega_silvia_hr', 'mega.silvia'),
  ('EMP-013', 'Hendra Kusuma', 'HR & GA', 'hendra_k', NULL),
  ('EMP-014', 'Putri Ayu', 'HR & GA', 'putri_ayu_hr', NULL),
  ('EMP-015', 'Rudi Hermanto', 'Finance', 'rudi_hermanto', 'rudi.h.fin'),
  ('EMP-016', 'Tania Safitri', 'Finance', 'tania_safitri', NULL),
  ('EMP-017', 'Dimas Anggara', 'Finance', 'dimas_ang', NULL),
  ('EMP-018', 'Bayu Saputra', 'Operasional', NULL, NULL), -- simulasi unmapped
  ('EMP-019', 'Nadia Maharani', 'Marketing', 'nadia_mhr', NULL),
  ('EMP-020', 'Rizky Ramadhan', 'IT & Dev', 'rizky_ramadhan', NULL)
ON CONFLICT (ig_username) DO NOTHING;

-- Postingan Perdana
INSERT INTO social_posts (id, platform, post_url, post_shortcode, title_or_caption, total_comments_fetched, last_synced_at)
VALUES
  (
    'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
    'instagram',
    'https://www.instagram.com/p/DA_post2026corp/',
    'DA_post2026corp',
    'Peluncuran Inisiatif Strategis Perusahaan Q4 2026: Sinergi Menuju Transformasi Digital!',
    12,
    timezone('utc'::text, now())
  )
ON CONFLICT (post_url) DO NOTHING;

-- Komentar yang ditarik untuk postingan di atas
INSERT INTO engagements (post_id, ig_username, comment_text, is_valid, commented_at)
VALUES
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'budi_santoso', '🔥 Sukses selalu untuk perusahaan kita!', TRUE, timezone('utc'::text, now() - interval '2 hours')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'siti_rahma', 'Keren banget programnya! Semangat tim 💪', TRUE, timezone('utc'::text, now() - interval '1 hour')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'dewi_marketing', '❤️🙏 Gas pol terus!', TRUE, timezone('utc'::text, now() - interval '45 minutes')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'rian_pratama', 'Mantap! Siap dukung penuh', TRUE, timezone('utc'::text, now() - interval '30 minutes')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'kevin_san', '🚀 Great milestone!', TRUE, timezone('utc'::text, now() - interval '25 minutes')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'mega_silvia_hr', 'Semoga berkah dan lancar semuanya', TRUE, timezone('utc'::text, now() - interval '15 minutes')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'rudi_hermanto', '🔥', TRUE, timezone('utc'::text, now() - interval '10 minutes')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'nadia_mhr', 'Bangga menjadi bagian dari tim!', TRUE, timezone('utc'::text, now() - interval '5 minutes')),

  -- Akun Komen Belum Terpetakan (Unmapped / Quarantine)
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'wahyu_hidayat_ops', '🔥 Siap dukung penuh operasional 24/7!', TRUE, timezone('utc'::text, now() - interval '50 minutes')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'citra_creative_lab', 'Kontennya kece parah! Congrats all ✨', TRUE, timezone('utc'::text, now() - interval '40 minutes')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'eko_tech_ninja', 'Deploy smoothly 🚀 salam dari balik layar dev!', TRUE, timezone('utc'::text, now() - interval '35 minutes')),
  ('a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', 'bayu_logistic', 'Gudang ready supply chain aman mantap!', TRUE, timezone('utc'::text, now() - interval '20 minutes'))
ON CONFLICT (post_id, ig_username) DO NOTHING;
