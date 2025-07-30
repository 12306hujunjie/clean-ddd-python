/**
 * Utility Functions - Common helper functions and utilities
 * Provides reusable functions for the DDD learning website
 */

/**
 * Debounce function calls
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(this, args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(this, args);
    };
}

/**
 * Throttle function calls
 */
function throttle(func, limit) {
    let inThrottle;
    return function(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

/**
 * Format date to readable string
 */
function formatDate(date, options = {}) {
    const defaultOptions = {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        ...options
    };
    
    return new Date(date).toLocaleDateString('zh-CN', defaultOptions);
}

/**
 * Format duration in milliseconds to readable string
 */
function formatDuration(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
    return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

/**
 * Escape HTML entities
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Generate unique ID
 */
function generateId(prefix = 'id') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Deep clone object
 */
function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;
    if (obj instanceof Date) return new Date(obj.getTime());
    if (obj instanceof Array) return obj.map(item => deepClone(item));
    
    const cloned = {};
    Object.keys(obj).forEach(key => {
        cloned[key] = deepClone(obj[key]);
    });
    return cloned;
}

/**
 * Check if element is in viewport
 */
function isInViewport(element, threshold = 0) {
    if (!element) return false;
    
    const rect = element.getBoundingClientRect();
    const windowHeight = window.innerHeight || document.documentElement.clientHeight;
    const windowWidth = window.innerWidth || document.documentElement.clientWidth;
    
    return (
        rect.top >= -threshold &&
        rect.left >= -threshold &&
        rect.bottom <= windowHeight + threshold &&
        rect.right <= windowWidth + threshold
    );
}

/**
 * Smooth scroll to element
 */
function scrollToElement(element, options = {}) {
    if (!element) return Promise.resolve();
    
    const defaultOptions = {
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest',
        ...options
    };
    
    return new Promise((resolve) => {
        element.scrollIntoView(defaultOptions);
        
        // Wait for scroll to complete
        setTimeout(resolve, 500);
    });
}

/**
 * Get scroll position
 */
function getScrollPosition() {
    return {
        x: window.pageXOffset || document.documentElement.scrollLeft,
        y: window.pageYOffset || document.documentElement.scrollTop
    };
}

/**
 * Set scroll position
 */
function setScrollPosition(x, y) {
    window.scrollTo(x, y);
}

/**
 * Animate number counter
 */
function animateCounter(element, target, duration = 2000, easing = 'easeOut') {
    if (!element) return Promise.resolve();
    
    const start = parseInt(element.textContent) || 0;
    const startTime = performance.now();
    
    const easingFunctions = {
        linear: t => t,
        easeIn: t => t * t,
        easeOut: t => 1 - Math.pow(1 - t, 3),
        easeInOut: t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
    };
    
    const easingFunction = easingFunctions[easing] || easingFunctions.easeOut;
    
    return new Promise((resolve) => {
        function updateCounter(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easingFunction(progress);
            
            const current = Math.floor(start + (target - start) * easedProgress);
            element.textContent = current.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toLocaleString();
                resolve(target);
            }
        }
        
        requestAnimationFrame(updateCounter);
    });
}

/**
 * Copy text to clipboard
 */
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            return successful;
        }
    } catch (error) {
        console.error('Failed to copy text:', error);
        return false;
    }
}

/**
 * Download content as file
 */
function downloadFile(content, filename, contentType = 'text/plain') {
    const blob = new Blob([content], { type: contentType });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
}

/**
 * Load script dynamically
 */
function loadScript(src, options = {}) {
    return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = options.async !== false;
        script.defer = options.defer === true;
        
        script.onload = () => resolve(script);
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                script.setAttribute(key, value);
            });
        }
        
        document.head.appendChild(script);
    });
}

/**
 * Load CSS dynamically
 */
function loadCSS(href, options = {}) {
    return new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        
        link.onload = () => resolve(link);
        link.onerror = () => reject(new Error(`Failed to load CSS: ${href}`));
        
        if (options.attributes) {
            Object.entries(options.attributes).forEach(([key, value]) => {
                link.setAttribute(key, value);
            });
        }
        
        document.head.appendChild(link);
    });
}

/**
 * Get device information
 */
function getDeviceInfo() {
    const userAgent = navigator.userAgent;
    
    return {
        isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
        isTablet: /iPad|Android(?=.*Mobile)/i.test(userAgent),
        isDesktop: !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
        isIOS: /iPad|iPhone|iPod/.test(userAgent),
        isAndroid: /Android/.test(userAgent),
        isSafari: /Safari/.test(userAgent) && !/Chrome/.test(userAgent),
        isChrome: /Chrome/.test(userAgent),
        isFirefox: /Firefox/.test(userAgent),
        isEdge: /Edge/.test(userAgent),
        touchSupport: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight
    };
}

/**
 * Get browser capabilities
 */
function getBrowserCapabilities() {
    return {
        localStorage: typeof Storage !== 'undefined',
        sessionStorage: typeof Storage !== 'undefined',
        webWorkers: typeof Worker !== 'undefined',
        serviceWorkers: 'serviceWorker' in navigator,
        geolocation: 'geolocation' in navigator,
        notifications: 'Notification' in window,
        webGL: (() => {
            try {
                const canvas = document.createElement('canvas');
                return !!(canvas.getContext('webgl') || canvas.getContext('experimental-webgl'));
            } catch (e) {
                return false;
            }
        })(),
        webRTC: !!(navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia),
        intersectionObserver: 'IntersectionObserver' in window,
        mutationObserver: 'MutationObserver' in window,
        resizeObserver: 'ResizeObserver' in window
    };
}

/**
 * Format file size
 */
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Generate random color
 */
function generateRandomColor(format = 'hex') {
    const r = Math.floor(Math.random() * 256);
    const g = Math.floor(Math.random() * 256);
    const b = Math.floor(Math.random() * 256);
    
    switch (format) {
        case 'hex':
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        case 'rgb':
            return `rgb(${r}, ${g}, ${b})`;
        case 'rgba':
            return `rgba(${r}, ${g}, ${b}, 1)`;
        case 'hsl':
            const [h, s, l] = rgbToHsl(r, g, b);
            return `hsl(${h}, ${s}%, ${l}%)`;
        default:
            return { r, g, b };
    }
}

/**
 * Convert RGB to HSL
 */
function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

/**
 * Validate email address
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Validate URL
 */
function validateURL(url) {
    try {
        new URL(url);
        return true;
    } catch {
        return false;
    }
}

/**
 * Truncate text
 */
function truncateText(text, maxLength, suffix = '...') {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - suffix.length) + suffix;
}

/**
 * Capitalize first letter
 */
function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

/**
 * Convert to title case
 */
function toTitleCase(text) {
    return text.replace(/\w\S*/g, txt => 
        txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
}

/**
 * Generate slug from text
 */
function generateSlug(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
}

/**
 * Parse query string
 */
function parseQueryString(query = window.location.search) {
    const params = new URLSearchParams(query);
    const result = {};
    
    for (const [key, value] = params.entries()) {
        result[key] = value;
    }
    
    return result;
}

/**
 * Build query string
 */
function buildQueryString(params) {
    const searchParams = new URLSearchParams();
    
    Object.entries(params).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
            searchParams.append(key, value);
        }
    });
    
    return searchParams.toString();
}

/**
 * Storage utilities
 */
const storage = {
    set(key, value, expiry = null) {
        const item = {
            value: value,
            expiry: expiry ? Date.now() + expiry : null
        };
        
        try {
            localStorage.setItem(key, JSON.stringify(item));
            return true;
        } catch (error) {
            console.error('Failed to set storage item:', error);
            return false;
        }
    },
    
    get(key) {
        try {
            const item = localStorage.getItem(key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            
            // Check expiry
            if (parsed.expiry && Date.now() > parsed.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return parsed.value;
        } catch (error) {
            console.error('Failed to get storage item:', error);
            return null;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error('Failed to remove storage item:', error);
            return false;
        }
    },
    
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Failed to clear storage:', error);
            return false;
        }
    },
    
    size() {
        return localStorage.length;
    },
    
    keys() {
        return Object.keys(localStorage);
    }
};

/**
 * Event emitter utility
 */
class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
        
        // Return unsubscribe function
        return () => this.off(event, callback);
    }
    
    off(event, callback) {
        if (!this.events[event]) return;
        
        this.events[event] = this.events[event].filter(cb => cb !== callback);
        
        if (this.events[event].length === 0) {
            delete this.events[event];
        }
    }
    
    emit(event, ...args) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                console.error(`Error in event callback for ${event}:`, error);
            }
        });
    }
    
    once(event, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(event, onceCallback);
        };
        
        this.on(event, onceCallback);
    }
    
    removeAllListeners(event) {
        if (event) {
            delete this.events[event];
        } else {
            this.events = {};
        }
    }
    
    listenerCount(event) {
        return this.events[event] ? this.events[event].length : 0;
    }
}

/**
 * Simple analytics tracker
 */
const analytics = {
    track(event, properties = {}) {
        console.log('📊 Analytics:', event, properties);
        
        // In a real implementation, this would send data to an analytics service
        // analytics.track('page_view', { page: '/learning-path', user_level: 'beginner' });
        
        // Store locally for now
        try {
            const events = JSON.parse(localStorage.getItem('ddd-analytics') || '[]');
            events.push({
                event,
                properties,
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent
            });
            
            // Keep only last 100 events
            if (events.length > 100) {
                events.splice(0, events.length - 100);
            }
            
            localStorage.setItem('ddd-analytics', JSON.stringify(events));
        } catch (error) {
            console.error('Failed to store analytics event:', error);
        }
    },
    
    getEvents() {
        try {
            return JSON.parse(localStorage.getItem('ddd-analytics') || '[]');
        } catch (error) {
            console.error('Failed to get analytics events:', error);
            return [];
        }
    },
    
    clearEvents() {
        try {
            localStorage.removeItem('ddd-analytics');
            return true;
        } catch (error) {
            console.error('Failed to clear analytics events:', error);
            return false;
        }
    }
};

// Export utilities
if (typeof window !== 'undefined') {
    // Browser environment
    window.DDDUtils = {
        debounce,
        throttle,
        formatDate,
        formatDuration,
        escapeHtml,
        generateId,
        deepClone,
        isInViewport,
        scrollToElement,
        getScrollPosition,
        setScrollPosition,
        animateCounter,
        copyToClipboard,
        downloadFile,
        loadScript,
        loadCSS,
        getDeviceInfo,
        getBrowserCapabilities,
        formatFileSize,
        generateRandomColor,
        rgbToHsl,
        validateEmail,
        validateURL,
        truncateText,
        capitalize,
        toTitleCase,
        generateSlug,
        parseQueryString,
        buildQueryString,
        storage,
        EventEmitter,
        analytics
    };
}

if (typeof module !== 'undefined' && module.exports) {
    // Node.js environment
    module.exports = {
        debounce,
        throttle,
        formatDate,
        formatDuration,
        escapeHtml,
        generateId,
        deepClone,
        isInViewport,
        scrollToElement,
        getScrollPosition,
        setScrollPosition,
        animateCounter,
        copyToClipboard,
        downloadFile,
        loadScript,
        loadCSS,
        getDeviceInfo,
        getBrowserCapabilities,
        formatFileSize,
        generateRandomColor,
        rgbToHsl,
        validateEmail,
        validateURL,
        truncateText,
        capitalize,
        toTitleCase,
        generateSlug,
        parseQueryString,
        buildQueryString,
        storage,
        EventEmitter,
        analytics
    };
}