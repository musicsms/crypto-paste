/**
 * View page JavaScript for Crypto Paste
 * Handles decryption and display of encrypted pastes
 */

document.addEventListener('DOMContentLoaded', function() {
    // Encryption utilities
    const CryptoUtils = {
        // Import key from base64 string
        importKey: async (keyString) => {
            const keyData = new Uint8Array(
                atob(keyString).split('').map(char => char.charCodeAt(0))
            );
            
            return await crypto.subtle.importKey(
                'raw',
                keyData,
                {
                    name: 'AES-GCM',
                    length: 256
                },
                false,
                ['decrypt']
            );
        },

        // Decrypt data with AES-GCM
        decrypt: async (encryptedData, key) => {
            try {
                // Convert from base64
                const combined = new Uint8Array(
                    atob(encryptedData).split('').map(char => char.charCodeAt(0))
                );
                
                // Extract IV and encrypted data
                const iv = combined.slice(0, 12);
                const data = combined.slice(12);
                
                const decryptedData = await crypto.subtle.decrypt(
                    {
                        name: 'AES-GCM',
                        iv: iv
                    },
                    key,
                    data
                );
                
                return new TextDecoder().decode(decryptedData);
            } catch (error) {
                console.error('Decryption failed:', error);
                throw new Error('Failed to decrypt content');
            }
        }
    };

    // Get paste ID from URL
    function getPasteId() {
        const path = window.location.pathname;
        const match = path.match(/\/([a-zA-Z0-9]+)$/);
        return match ? match[1] : null;
    }

    // Get encryption key from URL fragment
    function getEncryptionKey() {
        const hash = window.location.hash;
        const keyMatch = hash.match(/key=([^&]+)/);
        return keyMatch ? decodeURIComponent(keyMatch[1]) : null;
    }

    // Load and decrypt paste content
    async function loadPaste() {
        const pasteId = getPasteId();
        if (!pasteId) {
            showError('Invalid paste URL');
            return;
        }

        try {
            // Fetch paste data
            const response = await fetch(`/api/paste/${pasteId}`);
            if (!response.ok) {
                const errorData = await response.json();
                if (errorData.requiresPassword) {
                    // Handle password protected pastes
                    showPasswordPrompt(pasteId);
                    return;
                }
                throw new Error(errorData.error || 'Paste not found or expired');
            }

            const pasteData = await response.json();
            
            // Check if paste is encrypted
            if (pasteData.encrypted) {
                const keyString = getEncryptionKey();
                if (!keyString) {
                    showError('Encryption key not found in URL. This paste is encrypted and requires the original URL with the decryption key.');
                    return;
                }

                try {
                    // Import and use the encryption key
                    const key = await CryptoUtils.importKey(keyString);
                    const decryptedContent = await CryptoUtils.decrypt(pasteData.content, key);
                    pasteData.content = decryptedContent;
                } catch (decryptError) {
                    showError('Failed to decrypt content. The encryption key may be invalid or corrupted.');
                    return;
                }
            }

            // Update UI with paste data
            updatePasteDisplay(pasteData);
            
        } catch (error) {
            console.error('Error loading paste:', error);
            showError(error.message || 'Failed to load paste');
        }
    }

    // Show password prompt for protected pastes
    function showPasswordPrompt(pasteId) {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="password-container" style="text-align: center; padding: 2rem;">
                <h2>🔒 Password Required</h2>
                <p>This paste is password protected</p>
                <form id="passwordForm" style="margin-top: 1rem;">
                    <input type="password" id="passwordInput" placeholder="Enter password" required style="padding: 0.5rem; margin-right: 0.5rem;">
                    <button type="submit" style="padding: 0.5rem 1rem;">View Paste</button>
                </form>
            </div>
        `;

        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const password = document.getElementById('passwordInput').value;
            const url = new URL(window.location);
            url.searchParams.set('password', password);
            window.location.href = url.toString();
        });
    }

    // Update the display with paste content
    function updatePasteDisplay(pasteData) {
        // Update title
        document.title = `${pasteData.title} - Crypto Paste`;
        
        // Update meta information
        const titleElement = document.querySelector('.paste-title h2');
        if (titleElement) {
            titleElement.textContent = pasteData.title || 'Untitled';
        }

        const languageElement = document.querySelector('.language-badge');
        if (languageElement) {
            languageElement.textContent = pasteData.language || 'text';
        }

        // Update content
        const codeBlock = document.getElementById('codeBlock');
        if (codeBlock) {
            codeBlock.textContent = pasteData.content;
            codeBlock.className = `language-${pasteData.language || 'text'}`;
            
            // Re-highlight with Prism.js
            if (window.Prism) {
                Prism.highlightElement(codeBlock);
            }
        }

        // Update stats
        updateStats();
        
        // Update meta items
        const metaItems = document.querySelectorAll('.meta-text');
        if (metaItems.length >= 3) {
            metaItems[0].textContent = pasteData.title || 'Untitled';
            metaItems[1].textContent = pasteData.language || 'text';
            metaItems[2].textContent = `${pasteData.views || 0} views`;
            
            // Format expiry info
            const expirySpan = document.querySelector('.paste-meta .meta-item:nth-child(4) span:last-child');
            if (expirySpan && pasteData.expiresAt) {
                const expiresDate = new Date(pasteData.expiresAt);
                const now = new Date();
                const diff = expiresDate - now;
                
                if (diff > 0) {
                    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
                    
                    let expiryText = 'Expires in ';
                    if (days > 0) expiryText += `${days}d `;
                    if (hours > 0) expiryText += `${hours}h `;
                    if (minutes > 0) expiryText += `${minutes}m`;
                    
                    expirySpan.textContent = expiryText.trim();
                } else {
                    expirySpan.textContent = 'Expired';
                }
            } else if (expirySpan) {
                expirySpan.textContent = 'Never expires';
            }
        }

        // Setup copy functionality
        setupCopyFunctionality(pasteData);

        // Setup download functionality
        setupDownloadFunctionality(pasteData);
    }

    // Setup copy buttons
    function setupCopyFunctionality(pasteData) {
        const copyBtn = document.getElementById('copyBtn');
        const copyUrlBtn = document.getElementById('copyUrlBtn');
        const inlineCopyBtn = document.getElementById('inlineCopyBtn');

        // Copy code content
        async function copyCode() {
            try {
                await navigator.clipboard.writeText(pasteData.content);
                showToast('Code copied to clipboard!', 'success');
                showSuccessAnimation();
            } catch (error) {
                console.error('Copy failed:', error);
                showToast('Failed to copy code', 'error');
            }
        }

        // Copy URL
        async function copyUrl() {
            try {
                await navigator.clipboard.writeText(window.location.href);
                showToast('URL copied to clipboard!', 'success');
            } catch (error) {
                console.error('Copy failed:', error);
                showToast('Failed to copy URL', 'error');
            }
        }

        if (copyBtn) copyBtn.addEventListener('click', copyCode);
        if (copyUrlBtn) copyUrlBtn.addEventListener('click', copyUrl);
        if (inlineCopyBtn) inlineCopyBtn.addEventListener('click', copyCode);
    }

    // Setup download functionality
    function setupDownloadFunctionality(pasteData) {
        const downloadBtn = document.getElementById('downloadBtn');
        const rawBtn = document.getElementById('rawBtn');

        function downloadFile() {
            const blob = new Blob([pasteData.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${pasteData.title || 'paste'}.${getFileExtension(pasteData.language)}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            showToast('File downloaded!', 'success');
        }

        function showRaw() {
            const newWindow = window.open('', '_blank');
            newWindow.document.write(`<pre>${pasteData.content}</pre>`);
            newWindow.document.title = `${pasteData.title} - Raw`;
        }

        if (downloadBtn) downloadBtn.addEventListener('click', downloadFile);
        if (rawBtn) rawBtn.addEventListener('click', showRaw);
    }

    // Get file extension based on language
    function getFileExtension(language) {
        const extensions = {
            javascript: 'js',
            python: 'py',
            html: 'html',
            css: 'css',
            json: 'json',
            markdown: 'md',
            bash: 'sh',
            sql: 'sql',
            java: 'java',
            cpp: 'cpp',
            typescript: 'ts'
        };
        return extensions[language] || 'txt';
    }

    // Update statistics
    function updateStats() {
        const content = document.getElementById('codeBlock')?.textContent || '';
        const lines = content.split('\n').length;
        const chars = content.length;
        const bytes = new Blob([content]).size;
        
        const lineCount = document.getElementById('lineCount');
        const charCount = document.getElementById('charCount');
        const sizeCount = document.getElementById('sizeCount');
        
        if (lineCount) lineCount.textContent = lines + ' lines';
        if (charCount) charCount.textContent = chars + ' chars';
        if (sizeCount) sizeCount.textContent = formatBytes(bytes);
    }

    function formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Show error message
    function showError(message) {
        const container = document.querySelector('.container');
        container.innerHTML = `
            <div class="error-container" style="text-align: center; padding: 2rem;">
                <h2>❌ Error</h2>
                <p style="margin: 1rem 0;">${message}</p>
                <a href="/" class="action-btn primary">Create New Paste</a>
            </div>
        `;
    }

    // Show toast notification
    function showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        
        if (toast && toastMessage) {
            toastMessage.textContent = message;
            toast.className = 'toast ' + type + ' show';
            
            setTimeout(() => {
                toast.className = 'toast ' + type;
            }, 3000);
        }
    }

    // Show success animation
    function showSuccessAnimation() {
        const animation = document.getElementById('successAnimation');
        if (animation) {
            animation.classList.add('show');
            setTimeout(() => {
                animation.classList.remove('show');
            }, 2000);
        }
    }

    // Theme management
    function setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const themeToggle2 = document.getElementById('themeToggle2');
        
        // Load saved theme or detect preference
        const savedTheme = localStorage.getItem('crypto-paste-theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        setTheme(theme);
        
        function setTheme(theme) {
            document.documentElement.setAttribute('data-theme', theme);
            document.body.setAttribute('data-theme', theme);
            localStorage.setItem('crypto-paste-theme', theme);
            
            // Update theme toggle buttons
            const themeIcon = document.querySelector('.theme-icon');
            if (themeIcon) {
                themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
            }
            
            if (themeToggle2) {
                themeToggle2.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
            }
        }
        
        function toggleTheme() {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            setTheme(newTheme);
        }
        
        if (themeToggle) themeToggle.addEventListener('click', toggleTheme);
        if (themeToggle2) themeToggle2.addEventListener('click', toggleTheme);
    }

    // Initialize
    setupTheme();
    loadPaste();
});