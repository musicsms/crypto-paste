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
    <title>Crypto Paste</title>
    <link rel="stylesheet" href="/style.css">
</head>
<body>
    <div class="container">
        <header>
            <h1>🔐 Crypto Paste</h1>
            <p>Secure, temporary text sharing</p>
        </header>
        
        <main>
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
        </main>
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
* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    line-height: 1.6;
    color: #333;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 100vh;
}

.container {
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
}

header {
    text-align: center;
    margin-bottom: 40px;
    color: white;
}

header h1 {
    font-size: 2.5rem;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
}

header h1 a {
    color: white;
    text-decoration: none;
}

header p {
    font-size: 1.1rem;
    opacity: 0.9;
}

.paste-meta {
    display: flex;
    gap: 20px;
    justify-content: center;
    flex-wrap: wrap;
    margin-top: 10px;
    font-size: 0.9rem;
}

main {
    background: white;
    border-radius: 10px;
    padding: 30px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.2);
}

.form-group {
    margin-bottom: 20px;
}

.form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
}

label {
    display: block;
    margin-bottom: 5px;
    font-weight: 600;
    color: #555;
}

input, textarea, select {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-size: 14px;
    transition: border-color 0.3s;
}

input:focus, textarea:focus, select:focus {
    outline: none;
    border-color: #667eea;
}

textarea {
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    resize: vertical;
    min-height: 300px;
}

button {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    padding: 15px 30px;
    border-radius: 6px;
    font-size: 16px;
    cursor: pointer;
    transition: transform 0.2s;
    width: 100%;
}

button:hover {
    transform: translateY(-2px);
}

button:active {
    transform: translateY(0);
}

.loading {
    display: inline-block;
    animation: spin 1s linear infinite;
}

@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}

.result {
    text-align: center;
    padding: 20px;
    background: #f8f9fa;
    border-radius: 6px;
    border: 2px solid #28a745;
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