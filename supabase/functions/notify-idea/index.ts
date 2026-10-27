import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

const base64url = (input: string | ArrayBuffer) => {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : new Uint8Array(input);
  let binary = '';
  bytes.forEach(b => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

// Exchanges the Firebase service account for a short-lived FCM access token.
async function getAccessToken(serviceAccount: { client_email: string; private_key: string; token_uri: string }) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))}.${base64url(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  }))}`;

  const pem = serviceAccount.private_key
    .replace(/\\n/g, '\n')
    .replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '')
    .replace(/\s/g, '');
  const der = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey('pkcs8', der, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));

  const res = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${unsigned}.${base64url(signature)}`,
  });
  if (!res.ok) throw new Error(`FCM auth failed: ${await res.text()}`);
  return (await res.json()).access_token as string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authorization = req.headers.get('Authorization');
    if (!authorization) return json({ error: 'Missing authorization' }, 401);

    const { idea_id } = await req.json();
    if (!idea_id) return json({ error: 'idea_id is required' }, 400);

    const url = Deno.env.get('SUPABASE_URL')!;
    // The user's own client: row level security decides whether they can see the idea at all.
    const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: authorization } } });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) return json({ error: 'Invalid session' }, 401);

    const { data: idea } = await userClient
      .from('sheet_ideas').select('id, character_id, category, content, created_at').eq('id', idea_id).maybeSingle();
    if (!idea) return json({ error: 'Idea not found' }, 404);
    // Only fresh ideas notify, so an old id cannot be replayed to spam the masters.
    if (Date.now() - new Date(idea.created_at).getTime() > 2 * 60 * 1000) return json({ sent: 0, reason: 'stale' });

    const { data: sheet } = await userClient
      .from('sheet_characters').select('name, data').eq('id', idea.character_id).maybeSingle();
    const habName = sheet?.data?.poder?.[`habilidad${idea.category.slice(-1)}Nombre`] || idea.category;

    const serviceAccountJson = Deno.env.get('FCM_SERVICE_ACCOUNT');
    if (!serviceAccountJson) return json({ error: 'FCM_SERVICE_ACCOUNT not configured' }, 500);
    const serviceAccount = JSON.parse(serviceAccountJson);

    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { data: masters } = await admin.from('profiles').select('user_id').eq('role', 'master');
    const masterIds = (masters ?? []).map(m => m.user_id);
    if (masterIds.length === 0) return json({ sent: 0 });
    const { data: tokens } = await admin.from('push_tokens').select('id, token').in('user_id', masterIds);
    if (!tokens || tokens.length === 0) return json({ sent: 0 });

    const accessToken = await getAccessToken(serviceAccount);
    const content = String(idea.content);
    let sent = 0;
    const dead: string[] = [];

    for (const t of tokens) {
      const res = await fetch(`https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: {
            token: t.token,
            notification: {
              title: `Nueva idea de ${sheet?.name ?? 'un jugador'}`,
              body: `${habName}: ${content.length > 120 ? `${content.slice(0, 117)}...` : content}`,
            },
            data: { type: 'idea', character_id: String(idea.character_id), idea_id: String(idea.id) },
            android: { priority: 'HIGH' },
            apns: { headers: { 'apns-priority': '10' }, payload: { aps: { sound: 'default' } } },
          },
        }),
      });
      if (res.ok) sent++;
      else if (res.status === 404) dead.push(t.id); // token no longer registered
    }

    if (dead.length > 0) await admin.from('push_tokens').delete().in('id', dead);
    return json({ sent, removed: dead.length });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
