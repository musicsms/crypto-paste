/**
 * Frontend JavaScript for Crypto Paste
 * Handles form submission, API calls, UI interactions, and localStorage
 */

document.addEventListener('DOMContentLoaded', function() {
    // DOM elements
    const form = document.getElementById('pasteForm');
    const submitBtn = document.getElementById('submitBtn');
    const submitText = document.getElementById('submitText');
    const submitLoading = document.getElementById('submitLoading');
    const result = document.getElementById('result');
    const pasteUrl = document.getElementById('pasteUrl');
    const copyBtn = document.getElementById('copyBtn');
    const viewLink = document.getElementById('viewLink');
    const contentTextarea = document.getElementById('content');
    const titleInput = document.getElementById('title');
    const themeToggle = document.getElementById('themeToggle');
    const recentPastes = document.getElementById('recentPastes');
    const recentList = document.getElementById('recentList');
    
    // Configuration
    const API_BASE = window.location.origin;
    const STORAGE_KEYS = {
        DRAFT: 'crypto-paste-draft',
        RECENT: 'crypto-paste-recent',
        THEME: 'crypto-paste-theme'
    };
    
    // Initialize app
    init();
    
    function init() {
        loadTheme();
        loadDraft();
        loadRecentPastes();
        setupEventListeners();
        setupKeyboardShortcuts();
    }
    
    // Theme management
    function loadTheme() {
        const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const theme = savedTheme || (prefersDark ? 'dark' : 'light');
        
        setTheme(theme);
    }
    
    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
        
        // Update all theme toggle buttons consistently
        const themeButtons = document.querySelectorAll('#themeToggle, #themeToggle2');
        themeButtons.forEach(btn => {
            if (btn) {
                // Update text for text-based toggles
                if (btn.textContent.includes('Mode')) {
                    btn.textContent = theme === 'dark' ? '☀️ Light Mode' : '🌙 Dark Mode';
                }
                // Update icon for icon-based toggles
                const themeIcon = btn.querySelector('.theme-icon');
                if (themeIcon) {
                    themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
                }
            }
        });
    }
    
    function toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
    }
    
    // Draft management
    function saveDraft() {
        if (!titleInput || !contentTextarea) return;
        
        const draft = {
            title: titleInput.value.trim(),
            content: contentTextarea.value.trim(),
            language: document.getElementById('language')?.value || 'text',
            expiry: document.getElementById('expiry')?.value || '1d',
            timestamp: Date.now()
        };
        
        // Only save if there's content
        if (draft.content) {
            localStorage.setItem(STORAGE_KEYS.DRAFT, JSON.stringify(draft));
        } else {
            localStorage.removeItem(STORAGE_KEYS.DRAFT);
        }
    }
    
    function loadDraft() {
        if (!titleInput || !contentTextarea) return;
        
        const draftStr = localStorage.getItem(STORAGE_KEYS.DRAFT);
        if (!draftStr) return;
        
        try {
            const draft = JSON.parse(draftStr);
            
            // Only load if less than 24 hours old
            if (Date.now() - draft.timestamp < 86400000) {
                titleInput.value = draft.title || '';
                contentTextarea.value = draft.content || '';
                
                const languageSelect = document.getElementById('language');
                const expirySelect = document.getElementById('expiry');
                
                if (draft.language && languageSelect) {
                    languageSelect.value = draft.language;
                }
                if (draft.expiry && expirySelect) {
                    expirySelect.value = draft.expiry;
                }
                
                // Show visual indicator
                if (draft.content) {
                    showNotification('Draft loaded from previous session', 'info');
                }
            } else {
                // Remove old draft
                localStorage.removeItem(STORAGE_KEYS.DRAFT);
            }
        } catch (error) {
            console.error('Error loading draft:', error);
            localStorage.removeItem(STORAGE_KEYS.DRAFT);
        }
    }
    
    function clearDraft() {
        localStorage.removeItem(STORAGE_KEYS.DRAFT);
    }
    
    // Recent pastes management
    function saveRecentPaste(pasteData) {
        let recent = getRecentPastes();
        
        // Remove if already exists (to avoid duplicates)
        recent = recent.filter(p => p.id !== pasteData.id);
        
        // Add to beginning
        recent.unshift({
            id: pasteData.id,
            title: pasteData.title || 'Untitled',
            url: pasteData.url,
            createdAt: Date.now(),
            language: pasteData.language || 'text'
        });
        
        // Keep only last 10
        recent = recent.slice(0, 10);
        
        localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recent));
        loadRecentPastes();
    }
    
    function getRecentPastes() {
        try {
            const recent = localStorage.getItem(STORAGE_KEYS.RECENT);
            return recent ? JSON.parse(recent) : [];
        } catch (error) {
            console.error('Error loading recent pastes:', error);
            return [];
        }
    }
    
    function loadRecentPastes() {
        if (!recentPastes || !recentList) return;
        
        const recent = getRecentPastes();
        
        if (recent.length === 0) {
            recentPastes.style.display = 'none';
            return;
        }
        
        recentList.innerHTML = '';
        recent.forEach(paste => {
            const li = document.createElement('li');
            li.innerHTML = `
                <div>
                    <a href="${paste.url}" target="_blank">${escapeHtml(paste.title)}</a>
                    <div class="paste-info">${paste.language} • ${formatDate(paste.createdAt)}</div>
                </div>
                <button onclick="removeRecentPaste('${paste.id}')" title="Remove">×</button>
            `;
            recentList.appendChild(li);
        });
        
        recentPastes.style.display = 'block';
    }
    
    function removeRecentPaste(id) {
        let recent = getRecentPastes();
        recent = recent.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recent));
        loadRecentPastes();
    }
    
    // Make removeRecentPaste globally available
    window.removeRecentPaste = removeRecentPaste;
    
    // Event listeners
    function setupEventListeners() {
        // Form submission
        if (form) {
            form.addEventListener('submit', handleFormSubmit);
        }
        
        // Auto-save draft
        if (contentTextarea) {
            contentTextarea.addEventListener('input', debounce(saveDraft, 1000));
        }
        if (titleInput) {
            titleInput.addEventListener('input', debounce(saveDraft, 1000));
        }
        
        // Copy functionality
        if (copyBtn) {
            copyBtn.addEventListener('click', handleCopy);
        }
        
        // Theme toggle
        if (themeToggle) {
            themeToggle.addEventListener('click', toggleTheme);
        }
        
        // System theme change detection
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem(STORAGE_KEYS.THEME)) {
                setTheme(e.matches ? 'dark' : 'light');
            }
        });
    }
    
    function setupKeyboardShortcuts() {
        document.addEventListener('keydown', function(e) {
            // Ctrl+S / Cmd+S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                if (form && submitBtn && !submitBtn.disabled) {
                    form.dispatchEvent(new Event('submit'));
                }
            }
            
            // Ctrl+N / Cmd+N for new paste
            if ((e.ctrlKey || e.metaKey) && e.key === 'n') {
                e.preventDefault();
                window.location.href = '/';
            }
            
            // Escape to clear form
            if (e.key === 'Escape' && contentTextarea === document.activeElement) {
                if (confirm('Clear all content?')) {
                    form.reset();
                    clearDraft();
                    contentTextarea.focus();
                }
            }
        });
    }
    
    // Form submission handler
    async function handleFormSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());
        
        // Validation
        if (!data.content.trim()) {
            showNotification('Please enter some content', 'error');
            contentTextarea.focus();
            return;
        }
        
        if (data.content.length > 1000000) {
            showNotification('Content is too large (max 1MB)', 'error');
            return;
        }
        
        // UI feedback
        setSubmitState(true);
        
        try {
            const response = await fetch(`${API_BASE}/api/paste`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(data)
            });
            
            const responseData = await response.json();
            
            if (response.ok) {
                // Success
                handleCreateSuccess(responseData, data);
            } else {
                handleCreateError(responseData.error || 'Failed to create paste');
            }
        } catch (error) {
            console.error('Network error:', error);
            handleCreateError('Network error. Please check your connection and try again.');
        }
        
        setSubmitState(false);
    }
    
    function handleCreateSuccess(responseData, formData) {
        // Update UI
        pasteUrl.value = responseData.url;
        viewLink.href = responseData.url;
        result.style.display = 'block';
        form.style.display = 'none';
        
        // Save to recent pastes
        saveRecentPaste({
            id: responseData.id,
            title: formData.title,
            url: responseData.url,
            language: formData.language
        });
        
        // Clear draft
        clearDraft();
        
        // Show success notification
        showNotification('Paste created successfully!', 'success');
        
        // Focus copy button
        copyBtn.focus();
        
        // Auto-copy URL
        if (navigator.clipboard) {
            copyToClipboard(responseData.url);
        }
    }
    
    function handleCreateError(errorMessage) {
        showNotification(errorMessage, 'error');
        if (contentTextarea) {
            contentTextarea.focus();
        }
    }
    
    function setSubmitState(isSubmitting) {
        if (submitBtn) {
            submitBtn.disabled = isSubmitting;
        }
        if (submitText) {
            submitText.style.display = isSubmitting ? 'none' : 'inline';
        }
        if (submitLoading) {
            submitLoading.style.display = isSubmitting ? 'inline' : 'none';
        }
    }
    
    // Copy functionality
    async function handleCopy() {
        const url = pasteUrl.value;
        const success = await copyToClipboard(url);
        
        if (success) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copied!';
            copyBtn.classList.add('success');
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.classList.remove('success');
            }, 2000);
        }
    }
    
    async function copyToClipboard(text) {
        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(text);
                return true;
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'absolute';
                textArea.style.left = '-999999px';
                
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                
                try {
                    const successful = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    return successful;
                } catch (err) {
                    document.body.removeChild(textArea);
                    return false;
                }
            }
        } catch (error) {
            console.error('Copy failed:', error);
            return false;
        }
    }
    
    // Notification system
    function showNotification(message, type = 'info') {
        // Remove existing notifications
        const existing = document.querySelector('.notification');
        if (existing) {
            existing.remove();
        }
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Style the notification
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '15px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            maxWidth: '400px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });
        
        // Set background color based on type
        switch (type) {
            case 'success':
                notification.style.background = '#28a745';
                break;
            case 'error':
                notification.style.background = '#dc3545';
                break;
            case 'warning':
                notification.style.background = '#ffc107';
                notification.style.color = '#000';
                break;
            default:
                notification.style.background = '#17a2b8';
        }
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 4000);
    }
    
    // Utility functions
    function debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    function formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        
        // Less than 1 hour
        if (diff < 3600000) {
            const minutes = Math.floor(diff / 60000);
            return minutes === 0 ? 'Just now' : `${minutes}m ago`;
        }
        
        // Less than 1 day
        if (diff < 86400000) {
            const hours = Math.floor(diff / 3600000);
            return `${hours}h ago`;
        }
        
        // Less than 1 week
        if (diff < 604800000) {
            const days = Math.floor(diff / 86400000);
            return `${days}d ago`;
        }
        
        // Fallback to date string
        return date.toLocaleDateString();
    }
    
    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Character counter enhancement
    if (contentTextarea) {
        const charCounter = document.createElement('div');
        charCounter.className = 'char-counter';
        charCounter.style.cssText = `
            text-align: right;
            font-size: 0.85rem;
            color: #666;
            margin-top: 5px;
        `;
        
        contentTextarea.parentNode.appendChild(charCounter);
        
        function updateCharCount() {
            const count = contentTextarea.value.length;
            charCounter.textContent = `${count.toLocaleString()} characters`;
            
            if (count > 900000) {
                charCounter.style.color = '#dc3545';
            } else if (count > 500000) {
                charCounter.style.color = '#ffc107';
            } else {
                charCounter.style.color = '#666';
            }
        }
        
        contentTextarea.addEventListener('input', updateCharCount);
        updateCharCount();
    }
    
    // Initialize tooltips for keyboard shortcuts
    if (submitBtn) {
        submitBtn.title = 'Create Paste (Ctrl+S)';
    }
    
    // Add visual feedback for form validation
    if (form) {
        const inputs = form.querySelectorAll('input, textarea, select');
        inputs.forEach(input => {
            input.addEventListener('blur', function() {
                if (this.hasAttribute('required') && !this.value.trim()) {
                    this.style.borderColor = '#dc3545';
                } else {
                    this.style.borderColor = '';
                }
            });
            
            input.addEventListener('input', function() {
                this.style.borderColor = '';
            });
        });
    }
});

// Service Worker registration (optional for PWA features)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Only register if we have a service worker file
        fetch('/sw.js').then(response => {
            if (response.ok) {
                navigator.serviceWorker.register('/sw.js')
                    .then(registration => {
                        console.log('SW registered:', registration);
                    })
                    .catch(registrationError => {
                        console.log('SW registration failed:', registrationError);
                    });
            }
        }).catch(() => {
            // Service worker file doesn't exist, skip registration
        });
    });
} 