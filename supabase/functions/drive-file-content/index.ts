const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = btoa(JSON.stringify({
    iss: serviceAccount.client_email,
    scope: 'https://www.googleapis.com/auth/drive.readonly',
    aud: serviceAccount.token_uri,
    exp: now + 3600,
    iat: now,
  }));

  const unsignedToken = `${header}.${claim}`;

  let pk = serviceAccount.private_key;
  pk = pk.replace(/\\n/g, '\n');
  const pemContents = pk
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/[\n\r\s]/g, '');

  const binaryString = atob(pemContents);
  const binaryKey = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    binaryKey[i] = binaryString.charCodeAt(i);
  }

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const jwt = `${header}.${claim}.${sig}`;

  const tokenRes = await fetch(serviceAccount.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const err = await tokenRes.text();
    throw new Error(`Failed to get access token: ${err}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// Map Google Workspace MIME types to export formats
const EXPORT_MIME_MAP: Record<string, { mime: string; label: string }> = {
  'application/vnd.google-apps.document': { mime: 'text/html', label: 'html' },
  'application/vnd.google-apps.spreadsheet': { mime: 'text/html', label: 'html' },
  'application/vnd.google-apps.presentation': { mime: 'text/html', label: 'html' },
  'application/vnd.google-apps.drawing': { mime: 'image/png', label: 'image' },
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileId, mimeType } = await req.json();

    if (!fileId) {
      return new Response(
        JSON.stringify({ success: false, error: 'fileId is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_KEY');
    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({ success: false, error: 'Google service account not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let serviceAccount;
    try {
      let parsed = JSON.parse(serviceAccountJson);
      while (typeof parsed === 'string') parsed = JSON.parse(parsed);
      serviceAccount = parsed;
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid service account JSON' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getAccessToken(serviceAccount);

    const exportConfig = EXPORT_MIME_MAP[mimeType];

    let content: string;
    let contentType: string;

    if (exportConfig) {
      // Google Workspace file → export
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}/export?mimeType=${encodeURIComponent(exportConfig.mime)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Export failed: ${res.status} ${err}`);
      }

      if (exportConfig.label === 'image') {
        // Return base64 for images
        const buf = await res.arrayBuffer();
        content = btoa(String.fromCharCode(...new Uint8Array(buf)));
        contentType = 'image';
      } else {
        content = await res.text();
        contentType = 'html';
      }
    } else if (mimeType?.startsWith('image/')) {
      // Regular image file → download
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      content = btoa(String.fromCharCode(...new Uint8Array(buf)));
      contentType = 'image';
    } else if (mimeType === 'application/pdf') {
      // PDF → return as base64
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      const buf = await res.arrayBuffer();
      content = btoa(String.fromCharCode(...new Uint8Array(buf)));
      contentType = 'pdf';
    } else {
      // Text-based files → download as text
      const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) throw new Error(`Download failed: ${res.status}`);
      content = await res.text();
      contentType = 'text';
    }

    return new Response(
      JSON.stringify({ success: true, content, contentType }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in drive-file-content:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
