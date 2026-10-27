import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Sanitize username helper
function sanitizeUsername(username: string): string {
  if (!username) return '';
  return username.trim().replace(/^@+/, '').toLowerCase();
}

function extractShortcode(url: string): string {
  try {
    const clean = url.trim();
    const igMatch = clean.match(/instagram\.com\/(?:p|reel|tv)\/([^/?#&]+)/i);
    if (igMatch) return igMatch[1];

    const fbMatch = clean.match(/facebook\.com\/(?:[^/]+\/posts|permalink\.php\?story_fbid=)([^/?#&]+)/i);
    if (fbMatch) return fbMatch[1];

    const urlObj = new URL(clean);
    const pathParts = urlObj.pathname.split('/').filter(Boolean);
    return pathParts[pathParts.length - 1] || 'post_' + Date.now();
  } catch {
    return 'post_' + Date.now();
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { url, title } = body;

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL postingan wajib disertakan.' }, { status: 400 });
    }

    const cleanUrl = url.trim();
    const platform = cleanUrl.toLowerCase().includes('facebook.com') || cleanUrl.toLowerCase().includes('fb.watch')
      ? 'facebook'
      : 'instagram';

    const shortcode = extractShortcode(cleanUrl);
    const apifyToken = process.env.APIFY_API_TOKEN;

    if (!apifyToken) {
      return NextResponse.json({ 
        error: 'APIFY_API_TOKEN belum disetel di .env.local' 
      }, { status: 500 });
    }

    // 1. Inisialisasi Supabase Server Client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 2. Tarik komentar dari Apify
    let rawComments: Array<{ ownerUsername: string; text: string; timestamp?: string }> = [];

    if (platform === 'instagram') {
      const apifyUrl = `https://api.apify.com/v2/acts/apify~instagram-comment-scraper/run-sync-get-dataset-items?token=${apifyToken}`;
      
      const apifyRes = await fetch(apifyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          directUrls: [cleanUrl],
          resultsLimit: 300,
        }),
      });

      if (!apifyRes.ok) {
        const errText = await apifyRes.text();
        console.error('Apify scraping failed:', errText);
        return NextResponse.json({ 
          error: `Apify error (${apifyRes.status}): Gagal menarik komentar dari Instagram.` 
        }, { status: 502 });
      }

      const items = await apifyRes.json();
      if (Array.isArray(items)) {
        rawComments = items.map((item: any) => ({
          ownerUsername: item.ownerUsername || item.owner?.username || '',
          text: item.text || '',
          timestamp: item.timestamp || item.created_at || new Date().toISOString(),
        }));
      }
    } else {
      // Facebook fallback or scraper
      console.warn('Scraper Facebook via Apify belum dikonfigurasi khusus, menggunakan penanganan standar.');
    }

    // 3. Normalisasi Komentar
    const nowIso = new Date().toISOString();
    const seenUsers = new Set<string>();
    const cleanedEngagements: Array<{
      ig_username: string;
      comment_text: string;
      commented_at: string;
      is_valid: boolean;
    }> = [];

    for (const c of rawComments) {
      const u = sanitizeUsername(c.ownerUsername);
      if (u && !seenUsers.has(u)) {
        seenUsers.add(u);
        cleanedEngagements.push({
          ig_username: u,
          comment_text: c.text?.trim() || '👍 Hadir / Like',
          commented_at: c.timestamp ? new Date(c.timestamp).toISOString() : nowIso,
          is_valid: true,
        });
      }
    }

    // 4. Simpan / Dapatkan data postingan di social_posts
    let postId: string = '';
    const { data: existingPost } = await supabase
      .from('social_posts')
      .select('*')
      .eq('post_url', cleanUrl)
      .single();

    if (existingPost) {
      postId = existingPost.id;
      await supabase
        .from('social_posts')
        .update({
          total_comments_fetched: cleanedEngagements.length,
          last_synced_at: nowIso,
          title_or_caption: title || existingPost.title_or_caption,
        })
        .eq('id', postId);
    } else {
      const { data: newPost, error: insertPostErr } = await supabase
        .from('social_posts')
        .insert({
          platform,
          post_url: cleanUrl,
          post_shortcode: shortcode,
          title_or_caption: title || `Postingan ${platform === 'instagram' ? 'Instagram' : 'Facebook'} [${shortcode}]`,
          total_comments_fetched: cleanedEngagements.length,
          last_synced_at: nowIso,
        })
        .select()
        .single();

      if (insertPostErr || !newPost) {
        console.error('Insert social_posts failed:', insertPostErr);
        return NextResponse.json({ error: 'Gagal menyimpan data postingan ke Supabase.' }, { status: 500 });
      }
      postId = newPost.id;
    }

    // 5. Simpan komentar ke tabel engagements
    if (cleanedEngagements.length > 0) {
      const rowsToInsert = cleanedEngagements.map((eng) => ({
        post_id: postId,
        ig_username: eng.ig_username,
        comment_text: eng.comment_text,
        commented_at: eng.commented_at,
        is_valid: true,
      }));

      const { error: engErr } = await supabase
        .from('engagements')
        .upsert(rowsToInsert, { onConflict: 'post_id,ig_username' });

      if (engErr) {
        console.error('Upsert engagements failed:', engErr);
      }
    }

    // 6. Ambil total komentar aktual dari DB
    const { data: allEngs } = await supabase
      .from('engagements')
      .select('*')
      .eq('post_id', postId);

    const totalDbCount = allEngs?.length || cleanedEngagements.length;

    await supabase
      .from('social_posts')
      .update({ total_comments_fetched: totalDbCount })
      .eq('id', postId);

    return NextResponse.json({
      success: true,
      postId,
      platform,
      totalComments: totalDbCount,
      newFetchedCount: cleanedEngagements.length,
    });
  } catch (err: any) {
    console.error('Unhandled sync-post error:', err);
    return NextResponse.json({ error: err.message || 'Terjadi kesalahan internal pada server.' }, { status: 500 });
  }
}
