/**
 * Crypto Paste - Cloudflare Workers API
 * Handles paste creation, retrieval, and serving frontend
 */

// HTML templates for frontend
const MAIN_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Crypto Paste - Secure Text Sharing</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1 class="slide-in-left">🔐 Crypto Paste</h1>
            <p class="slide-in-right">Secure, temporary text sharing</p>
        </header>
        
        <main class="fade-in">
            <form id="pasteForm">
                <div class="form-group">
                    <label for="title">Title (optional)</label>
                    <input type="text" id="title" name="title" placeholder="Untitled paste">
                </div>
                
                <div class="form-group">
                    <label for="content">Content</label>
                    <textarea id="content" name="content" rows="20" placeholder="Paste your content here..." required></textarea>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label for="language">Language</label>
                        <select id="language" name="language">
                            <option value="text">Plain Text</option>
                            <option value="javascript">JavaScript</option>
                            <option value="python">Python</option>
                            <option value="html">HTML</option>
                            <option value="css">CSS</option>
                            <option value="json">JSON</option>
                            <option value="markdown">Markdown</option>
                            <option value="bash">Bash</option>
                            <option value="sql">SQL</option>
                            <option value="java">Java</option>
                            <option value="cpp">C++</option>
                            <option value="typescript">TypeScript</option>
                        </select>
                    </div>
                    
                    <div class="form-group">
                        <label for="expiry">Expires in</label>
                        <select id="expiry" name="expiry">
                            <option value="10m">10 minutes</option>
                            <option value="1h">1 hour</option>
                            <option value="1d" selected>1 day</option>
                            <option value="1w">1 week</option>
                            <option value="1M">1 month</option>
                            <option value="never">Never</option>
                        </select>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="password">Password (optional)</label>
                    <input type="password" id="password" name="password" placeholder="Leave empty for public paste">
                </div>
                
                <button type="submit" id="submitBtn">
                    <span id="submitText">Create Paste</span>
                    <span id="submitLoading" class="loading" style="display: none;">Creating...</span>
                </button>
            </form>
            
            <div id="result" class="result" style="display: none;">
                <h3>Paste Created Successfully!</h3>
                <div class="url-container">
                    <input type="text" id="pasteUrl" readonly>
                    <button id="copyBtn">Copy</button>
                </div>
                <p><a href="#" id="viewLink">View Paste</a> | <a href="/">Create Another</a></p>
            </div>
            
            <div id="recentPastes" class="recent-pastes" style="display: none;">
                <h3>Recent Pastes</h3>
                <ul id="recentList"></ul>
            </div>
        </main>
        
        <footer>
            <p>Built with Cloudflare Workers</p>
            <button id="themeToggle">🌙 Dark Mode</button>
        </footer>
    </div>
    
    <script src="/script.js"></script>
</body>
</html>
`;

const VIEW_HTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{TITLE}} - Crypto Paste</title>
    <link rel="stylesheet" href="/style.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/themes/prism.min.css">
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/components/prism-core.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/prism/1.29.0/plugins/autoloader/prism-autoloader.min.js"></script>
</head>
<body>
    <div class="container">
        <header>
            <h1><a href="/">🔐 Crypto Paste</a></h1>
            <div class="paste-meta">
                <span>{{TITLE}}</span>
                <span>Language: {{LANGUAGE}}</span>
                <span>Views: {{VIEWS}}</span>
                {{EXPIRES_INFO}}
            </div>
        </header>
        
        <main>
            <div class="paste-actions">
                <button id="copyBtn">Copy to Clipboard</button>
                <button id="downloadBtn">Download</button>
                <a href="/">Create New Paste</a>
            </div>
            
            <div class="paste-content">
                <pre><code class="language-{{LANGUAGE}}">{{CONTENT}}</code></pre>
            </div>
        </main>
    </div>
    
    <script>
        document.getElementById('copyBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(document.querySelector('code').textContent);
            document.getElementById('copyBtn').textContent = 'Copied!';
            setTimeout(() => {
                document.getElementById('copyBtn').textContent = 'Copy to Clipboard';
            }, 2000);
        });
        
        document.getElementById('downloadBtn').addEventListener('click', () => {
            const content = document.querySelector('code').textContent;
            const blob = new Blob([content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = '{{TITLE}}.txt';
            a.click();
            URL.revokeObjectURL(url);
        });
    </script>
</body>
</html>
`;

// Utility functions
function generatePasteId() {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 8; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}

function getExpiryTime(expiry) {
    const now = Date.now();
    switch (expiry) {
        case '10m': return now + 10 * 60 * 1000;
        case '1h': return now + 60 * 60 * 1000;
        case '1d': return now + 24 * 60 * 60 * 1000;
        case '1w': return now + 7 * 24 * 60 * 60 * 1000;
        case '1M': return now + 30 * 24 * 60 * 60 * 1000;
        case 'never': return null;
        default: return now + 24 * 60 * 60 * 1000;
    }
}

function formatExpiryInfo(expiresAt) {
    if (!expiresAt) return '';
    const now = Date.now();
    const diff = expiresAt - now;
    
    if (diff <= 0) return '<span class="expired">Expired</span>';
    
    const days = Math.floor(diff / (24 * 60 * 60 * 1000));
    const hours = Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((diff % (60 * 60 * 1000)) / (60 * 1000));
    
    if (days > 0) return `<span>Expires in ${days}d ${hours}h</span>`;
    if (hours > 0) return `<span>Expires in ${hours}h ${minutes}m</span>`;
    return `<span>Expires in ${minutes}m</span>`;
}

async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Rate limiting
async function checkRateLimit(request, env) {
    const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
    const key = `rate_limit:${ip}`;
    
    const current = await env.PASTEBIN_KV.get(key);
    const count = current ? parseInt(current) : 0;
    
    if (count >= 10) { // 10 requests per minute
        return false;
    }
    
    await env.PASTEBIN_KV.put(key, (count + 1).toString(), { expirationTtl: 60 });
    return true;
}

// Main request handler
export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);
        const path = url.pathname;
        
        // CORS headers
        const corsHeaders = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        };
        
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }
        
        try {
            // API Routes
            if (path === '/api/paste' && request.method === 'POST') {
                return await handleCreatePaste(request, env, corsHeaders);
            }
            
            if (path.startsWith('/api/paste/') && request.method === 'GET') {
                const pasteId = path.split('/')[3];
                return await handleGetPaste(request, env, pasteId, corsHeaders);
            }
            
            // Static assets
            if (path === '/style.css') {
                return new Response(CSS, {
                    headers: { 'Content-Type': 'text/css', ...corsHeaders }
                });
            }
            
            if (path === '/script.js') {
                return new Response(SCRIPT, {
                    headers: { 'Content-Type': 'application/javascript', ...corsHeaders }
                });
            }
            
            // Paste viewing
            if (path.length > 1 && !path.includes('.')) {
                const pasteId = path.slice(1);
                return await handleViewPaste(request, env, pasteId);
            }
            
            // Main page
            return new Response(MAIN_HTML, {
                headers: { 'Content-Type': 'text/html', ...corsHeaders }
            });
            
        } catch (error) {
            console.error('Worker error:', error);
            return new Response('Internal Server Error', { 
                status: 500,
                headers: corsHeaders 
            });
        }
    }
};

async function handleCreatePaste(request, env, corsHeaders) {
    // Rate limiting
    if (!(await checkRateLimit(request, env))) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    const data = await request.json();
    
    // Validation
    if (!data.content || data.content.trim().length === 0) {
        return new Response(JSON.stringify({ error: 'Content is required' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    if (data.content.length > 1000000) { // 1MB limit
        return new Response(JSON.stringify({ error: 'Content too large' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    // Generate paste data
    const pasteId = generatePasteId();
    const expiresAt = getExpiryTime(data.expiry || '1d');
    const createdAt = Date.now();
    
    const pasteData = {
        id: pasteId,
        title: data.title || 'Untitled',
        content: data.content,
        language: data.language || 'text',
        createdAt,
        expiresAt,
        views: 0,
        hasPassword: !!data.password
    };
    
    // Hash password if provided
    if (data.password) {
        pasteData.passwordHash = await hashPassword(data.password);
    }
    
    // Store in KV
    const ttl = expiresAt ? Math.floor((expiresAt - createdAt) / 1000) : undefined;
    await env.PASTEBIN_KV.put(
        `paste:${pasteId}`,
        JSON.stringify(pasteData),
        ttl ? { expirationTtl: ttl } : {}
    );
    
    return new Response(JSON.stringify({
        id: pasteId,
        url: `${new URL(request.url).origin}/${pasteId}`,
        expiresAt
    }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
}

async function handleGetPaste(request, env, pasteId, corsHeaders) {
    const pasteData = await env.PASTEBIN_KV.get(`paste:${pasteId}`);
    
    if (!pasteData) {
        return new Response(JSON.stringify({ error: 'Paste not found' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    const paste = JSON.parse(pasteData);
    
    // Check if expired
    if (paste.expiresAt && Date.now() > paste.expiresAt) {
        await env.PASTEBIN_KV.delete(`paste:${pasteId}`);
        return new Response(JSON.stringify({ error: 'Paste has expired' }), {
            status: 404,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    // Check password if required
    if (paste.hasPassword) {
        const url = new URL(request.url);
        const providedPassword = url.searchParams.get('password');
        
        if (!providedPassword || await hashPassword(providedPassword) !== paste.passwordHash) {
            return new Response(JSON.stringify({ error: 'Password required', requiresPassword: true }), {
                status: 401,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }
    
    // Increment view counter
    paste.views = (paste.views || 0) + 1;
    await env.PASTEBIN_KV.put(`paste:${pasteId}`, JSON.stringify(paste));
    
    // Return paste data (without sensitive info)
    const { passwordHash, ...publicPaste } = paste;
    return new Response(JSON.stringify(publicPaste), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
}

async function handleViewPaste(request, env, pasteId) {
    const pasteData = await env.PASTEBIN_KV.get(`paste:${pasteId}`);
    
    if (!pasteData) {
        return new Response('Paste not found', { status: 404 });
    }
    
    const paste = JSON.parse(pasteData);
    
    // Check if expired
    if (paste.expiresAt && Date.now() > paste.expiresAt) {
        await env.PASTEBIN_KV.delete(`paste:${pasteId}`);
        return new Response('Paste has expired', { status: 404 });
    }
    
    // Check password if required
    if (paste.hasPassword) {
        const url = new URL(request.url);
        const providedPassword = url.searchParams.get('password');
        
        if (!providedPassword || await hashPassword(providedPassword) !== paste.passwordHash) {
            return new Response(`
                <!DOCTYPE html>
                <html>
                <head><title>Password Required</title></head>
                <body>
                    <form method="get">
                        <h2>This paste is password protected</h2>
                        <input type="password" name="password" placeholder="Enter password" required>
                        <button type="submit">View Paste</button>
                    </form>
                </body>
                </html>
            `, { headers: { 'Content-Type': 'text/html' } });
        }
    }
    
    // Increment view counter
    paste.views = (paste.views || 0) + 1;
    await env.PASTEBIN_KV.put(`paste:${pasteId}`, JSON.stringify(paste));
    
    // Render paste view
    const html = VIEW_HTML
        .replace(/{{TITLE}}/g, paste.title || 'Untitled')
        .replace(/{{LANGUAGE}}/g, paste.language || 'text')
        .replace(/{{CONTENT}}/g, paste.content.replace(/</g, '&lt;').replace(/>/g, '&gt;'))
        .replace(/{{VIEWS}}/g, paste.views)
        .replace(/{{EXPIRES_INFO}}/g, formatExpiryInfo(paste.expiresAt));
    
    return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
    });
}

// CSS Styles
const CSS = `
/* CSS Variables for theming */
:root {
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --secondary-gradient: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    --accent-gradient: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    --success-gradient: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
    --glass-bg: rgba(255, 255, 255, 0.25);
    --glass-border: rgba(255, 255, 255, 0.18);
    --bg-color: #ffffff;
    --text-color: #2d3748;
    --text-light: #718096;
    --border-color: rgba(226, 232, 240, 0.8);
    --input-bg: rgba(255, 255, 255, 0.9);
    --card-bg: rgba(255, 255, 255, 0.95);
    --shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
    --shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
    --success-color: #48bb78;
    --error-color: #f56565;
    --warning-color: #ed8936;
    --info-color: #4299e1;
    --secondary-bg: rgba(247, 250, 252, 0.8);
    --header-text: #ffffff;
    --accent-color: #805ad5;
    --hover-transform: translateY(-2px);
}

[data-theme="dark"] {
    --glass-bg: rgba(45, 55, 72, 0.25);
    --glass-border: rgba(255, 255, 255, 0.1);
    --bg-color: #1a202c;
    --text-color: #e2e8f0;
    --text-light: #a0aec0;
    --border-color: rgba(74, 85, 104, 0.6);
    --input-bg: rgba(45, 55, 72, 0.8);
    --card-bg: rgba(45, 55, 72, 0.95);
    --shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.2);
    --shadow-lg: 0 25px 50px -12px rgba(0, 0, 0, 0.6);
    --secondary-bg: rgba(26, 32, 44, 0.8);
    --header-text: #ffffff;
    --success-color: #68d391;
    --error-color: #fc8181;
    --warning-color: #f6ad55;
    --info-color: #63b3ed;
}

/* Reset and base styles */
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
    line-height: 1.6;
    color: var(--text-color);
    background: var(--primary-gradient);
    background-attachment: fixed;
    min-height: 100vh;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-weight: 400;
    letter-spacing: -0.025em;
    overflow-x: hidden;
}

.container {
    max-width: 900px;
    margin: 0 auto;
    padding: 20px;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

header {
    text-align: center;
    margin-bottom: 40px;
    color: var(--header-text);
}

header h1 {
    font-size: 3.5rem;
    margin-bottom: 16px;
    text-shadow: 0 4px 20px rgba(0,0,0,0.3);
    font-weight: 700;
    letter-spacing: -0.02em;
    background: linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

header h1 a {
    color: var(--header-text);
    text-decoration: none;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    display: inline-block;
    background: linear-gradient(135deg, #ffffff 0%, rgba(255,255,255,0.8) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
}

header h1 a:hover {
    transform: scale(1.05) rotate(1deg);
    filter: drop-shadow(0 0 20px rgba(255,255,255,0.5));
}

header p {
    font-size: 1.3rem;
    opacity: 0.9;
    font-weight: 400;
    letter-spacing: 0.025em;
    text-shadow: 0 2px 10px rgba(0,0,0,0.2);
}

.paste-meta {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 15px;
    font-size: 0.9rem;
}

.paste-meta span {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    padding: 8px 16px;
    border-radius: 25px;
    backdrop-filter: blur(15px);
    -webkit-backdrop-filter: blur(15px);
    font-weight: 500;
    letter-spacing: 0.025em;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
}

.paste-meta span:hover {
    transform: translateY(-2px);
    background: rgba(255,255,255,0.35);
    box-shadow: 0 4px 15px rgba(0,0,0,0.15);
}

main {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 24px;
    padding: 48px;
    box-shadow: var(--shadow-lg);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    flex: 1;
    transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
    position: relative;
    overflow: hidden;
}

main::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
    pointer-events: none;
}

main:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg), 0 0 40px rgba(102, 126, 234, 0.15);
}

.form-group {
    margin-bottom: 32px;
    position: relative;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
}

label {
    display: block;
    margin-bottom: 12px;
    font-weight: 600;
    color: var(--text-color);
    font-size: 0.95rem;
    letter-spacing: 0.025em;
    position: relative;
    padding-left: 8px;
}

label::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 16px;
    background: var(--primary-gradient);
    border-radius: 2px;
    opacity: 0.7;
}

.form-group:focus-within label {
    color: #667eea;
    transform: translateY(-2px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.form-group:focus-within label::before {
    opacity: 1;
    transform: translateY(-50%) scaleY(1.2);
}

input, textarea, select {
    width: 100%;
    padding: 16px 20px;
    border: 2px solid var(--border-color);
    border-radius: 16px;
    font-size: 15px;
    background: var(--input-bg);
    color: var(--text-color);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    font-family: inherit;
    font-weight: 400;
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: transparent;
    background: var(--card-bg);
    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2), 0 8px 25px rgba(102, 126, 234, 0.15);
    transform: var(--hover-transform);
}

input:hover, textarea:hover, select:hover {
    border-color: rgba(102, 126, 234, 0.4);
    transform: translateY(-1px);
}

textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    resize: vertical;
    min-height: 300px;
}

select {
    cursor: pointer;
}

button {
    background: var(--primary-gradient);
    color: white;
    border: none;
    padding: 20px 40px;
    border-radius: 16px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    width: 100%;
    position: relative;
    overflow: hidden;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.2);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    letter-spacing: 0.025em;
}

button::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
    transition: left 0.5s;
}

button:hover::before {
    left: 100%;
}

button:hover {
    transform: translateY(-3px);
    box-shadow: 0 20px 40px rgba(102, 126, 234, 0.4);
    background: linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%);
}

button:active {
    transform: translateY(-1px);
    transition: transform 0.1s;
}

button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: 0 4px 15px rgba(102, 126, 234, 0.1);
}

button:disabled:hover {
    transform: none;
    background: var(--primary-gradient);
}

.loading {
    display: inline-block;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

@keyframes fadeIn {
    from { 
        opacity: 0; 
        transform: translateY(30px) scale(0.95); 
        filter: blur(10px);
    }
    to { 
        opacity: 1; 
        transform: translateY(0) scale(1); 
        filter: blur(0);
    }
}

@keyframes slideInFromLeft {
    from {
        opacity: 0;
        transform: translateX(-50px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes slideInFromRight {
    from {
        opacity: 0;
        transform: translateX(50px);
    }
    to {
        opacity: 1;
        transform: translateX(0);
    }
}

@keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
}

@keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
}

.fade-in {
    animation: fadeIn 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.slide-in-left {
    animation: slideInFromLeft 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.slide-in-right {
    animation: slideInFromRight 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

.float {
    animation: float 3s ease-in-out infinite;
}

/* Floating background elements */
body::before {
    content: '';
    position: fixed;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="40" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="80" r="1.5" fill="rgba(255,255,255,0.1)"/></svg>');
    animation: float 20s linear infinite;
    pointer-events: none;
    z-index: -1;
}

body::after {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 80% 20%, rgba(255, 119, 198, 0.1) 0%, transparent 50%),
                radial-gradient(circle at 40% 40%, rgba(120, 219, 255, 0.1) 0%, transparent 50%);
    pointer-events: none;
    z-index: -1;
}

.result {
    text-align: center;
    padding: 40px;
    background: var(--glass-bg);
    border: 1px solid rgba(72, 187, 120, 0.3);
    border-radius: 20px;
    margin-top: 30px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    box-shadow: 0 8px 32px rgba(72, 187, 120, 0.2);
    position: relative;
    overflow: hidden;
}

.result::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: var(--success-gradient);
}

.result h3 {
    color: var(--success-color);
    margin-bottom: 24px;
    font-size: 1.8rem;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.result h3::before {
    content: '🎉';
    font-size: 1.5rem;
    animation: float 2s ease-in-out infinite;
}

.url-container {
    display: flex;
    gap: 10px;
    margin: 15px 0;
}

.url-container input {
    flex: 1;
    margin-bottom: 0;
}

.url-container button {
    width: auto;
    padding: 12px 20px;
}

.paste-actions {
    display: flex;
    gap: 10px;
    margin-bottom: 20px;
    flex-wrap: wrap;
}

.paste-actions button,
.paste-actions a {
    padding: 10px 20px;
    background: #6c757d;
    color: white;
    text-decoration: none;
    border-radius: 4px;
    border: none;
    cursor: pointer;
    font-size: 14px;
}

.paste-content {
    background: #f8f9fa;
    border: 1px solid #e9ecef;
    border-radius: 6px;
    overflow-x: auto;
}

.paste-content pre {
    margin: 0;
    padding: 20px;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    font-size: 14px;
    line-height: 1.5;
}

.expired {
    color: #dc3545;
    font-weight: bold;
}

@media (max-width: 600px) {
    .container {
        padding: 10px;
    }
    
    .form-row {
        grid-template-columns: 1fr;
    }
    
    .paste-actions {
        flex-direction: column;
    }
    
    .url-container {
        flex-direction: column;
    }
}
`;

// Frontend JavaScript
const SCRIPT = `
document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('pasteForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitLoading = document.getElementById('submitLoading');
    const result = document.getElementById('result');
    const pasteUrl = document.getElementById('pasteUrl');
    const copyBtn = document.getElementById('copyBtn');
    const viewLink = document.getElementById('viewLink');
    
    // Auto-save to localStorage
    const contentTextarea = document.getElementById('content');
    const titleInput = document.getElementById('title');
    
    function saveToLocal() {
        localStorage.setItem('crypto-paste-draft', JSON.stringify({
            title: titleInput.value,
            content: contentTextarea.value,
            timestamp: Date.now()
        }));
    }
    
    function loadFromLocal() {
        const draft = localStorage.getItem('crypto-paste-draft');
        if (draft) {
            const data = JSON.parse(draft);
            // Only load if less than 1 hour old
            if (Date.now() - data.timestamp < 3600000) {
                titleInput.value = data.title || '';
                contentTextarea.value = data.content || '';
            }
        }
    }
    
    // Load saved draft
    loadFromLocal();
    
    // Save on input
    contentTextarea.addEventListener('input', saveToLocal);
    titleInput.addEventListener('input', saveToLocal);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 's') {
            e.preventDefault();
            form.dispatchEvent(new Event('submit'));
        }
    });
    
    form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validation
        if (!data.content.trim()) {
            alert('Please enter some content');
            return;
        }
        
        // UI feedback
        submitText.style.display = 'none';
        submitLoading.style.display = 'inline';
        submitBtn.disabled = true;
        
        try {
            const response = await fetch('/api/paste', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const responseData = await response.json();
            
            if (response.ok) {
                // Success
                pasteUrl.value = responseData.url;
                viewLink.href = responseData.url;
                result.style.display = 'block';
                form.style.display = 'none';
                
                // Clear draft
                localStorage.removeItem('crypto-paste-draft');
            } else {
                alert('Error: ' + responseData.error);
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Failed to create paste. Please try again.');
        }
        
        // Reset UI
        submitText.style.display = 'inline';
        submitLoading.style.display = 'none';
        submitBtn.disabled = false;
    });
    
    // Copy functionality
    copyBtn.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(pasteUrl.value);
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = originalText;
            }, 2000);
        } catch (error) {
            // Fallback for older browsers
            pasteUrl.select();
            document.execCommand('copy');
            copyBtn.textContent = 'Copied!';
            setTimeout(() => {
                copyBtn.textContent = 'Copy';
            }, 2000);
        }
    });
});
`; 