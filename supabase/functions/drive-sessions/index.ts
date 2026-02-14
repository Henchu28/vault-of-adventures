const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface GoogleTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

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

  // Import the private key for signing
  const pemContents = serviceAccount.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\n/g, '');

  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

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

  const tokenData: GoogleTokenResponse = await tokenRes.json();
  return tokenData.access_token;
}

// Base64url encode (no padding)
function base64url(input: string): string {
  return btoa(input).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { folderId } = await req.json();

    if (!folderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'folderId is required' }),
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
      // Handle double-encoded JSON (string within string)
      while (typeof parsed === 'string') {
        parsed = JSON.parse(parsed);
      }
      serviceAccount = parsed;
    } catch (parseErr) {
      console.error('Failed to parse service account JSON:', parseErr);
      console.error('Raw value type:', typeof serviceAccountJson, 'length:', serviceAccountJson.length, 'first 100 chars:', serviceAccountJson.substring(0, 100));
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid service account JSON format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!serviceAccount.private_key) {
      console.error('Service account keys present:', Object.keys(serviceAccount));
      console.error('Type after parse:', typeof serviceAccount);
      return new Response(
        JSON.stringify({ success: false, error: 'Service account JSON missing private_key field. Keys found: ' + Object.keys(serviceAccount).join(', ') }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const accessToken = await getAccessToken(serviceAccount);

    // List .docx files in folder
    const query = `'${folderId}' in parents and mimeType='application/vnd.google-apps.document' or ('${folderId}' in parents and mimeType='application/vnd.openxmlformats-officedocument.wordprocessingml.document')`;
    const listUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,mimeType)&orderBy=name`;

    const listRes = await fetch(listUrl, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!listRes.ok) {
      const err = await listRes.text();
      console.error('Drive list error:', err);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to list files: ${listRes.status}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const listData = await listRes.json();
    const files = listData.files || [];

    console.log(`Found ${files.length} files in folder ${folderId}`);

    // Sort files: extract session number and sort numerically
    const sortedFiles = files.sort((a: any, b: any) => {
      const numA = parseSessionNumber(a.name);
      const numB = parseSessionNumber(b.name);
      return numA - numB;
    });

    // Fetch content for each file (exported as plain text)
    const sessions = await Promise.all(
      sortedFiles.map(async (file: any) => {
        try {
          let contentUrl: string;
          if (file.mimeType === 'application/vnd.google-apps.document') {
            // Google Docs: export as HTML
            contentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/html`;
          } else {
            // .docx: export as HTML via Google Drive
            contentUrl = `https://www.googleapis.com/drive/v3/files/${file.id}/export?mimeType=text/html`;
          }

          const contentRes = await fetch(contentUrl, {
            headers: { Authorization: `Bearer ${accessToken}` },
          });

          if (!contentRes.ok) {
            console.error(`Failed to export file ${file.name}: ${contentRes.status}`);
            return { name: file.name, content: 'Error loading content', sessionNumber: parseSessionNumber(file.name) };
          }

          const content = await contentRes.text();
          return { name: file.name, content, sessionNumber: parseSessionNumber(file.name) };
        } catch (err) {
          console.error(`Error processing file ${file.name}:`, err);
          return { name: file.name, content: 'Error loading content', sessionNumber: parseSessionNumber(file.name) };
        }
      })
    );

    return new Response(
      JSON.stringify({ success: true, sessions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in drive-sessions:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

function parseSessionNumber(name: string): number {
  // Match patterns like "SESIÓN 0.5", "SESIÓN 1", "Sesión 12", etc.
  const match = name.match(/sesi[oó]n\s+([\d.]+)/i);
  if (match) return parseFloat(match[1]);
  // Try just a number
  const numMatch = name.match(/([\d.]+)/);
  if (numMatch) return parseFloat(numMatch[1]);
  return 999;
}
