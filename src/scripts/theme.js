/**
 * Theme Manager - Advanced Theme System
 * Handles theme switching, system preferences, and persistence
 */

class ThemeManager {
  constructor () {
    this.currentTheme = 'light'
    this.systemPreference = 'light'
    this.availableThemes = ['light', 'dark', 'high-contrast', 'sepia']
    this.preferenceKey = 'ddd-website-theme'

    // Auto-detect system preference
    this.detectSystemPreference()

    // Initialize theme
    this.initializeTheme()

    // Setup event listeners
    this.setupEventListeners()
  }

  /**
     * Initialize theme system
     */
  initializeTheme () {
    console.log('🎨 Initializing Theme Manager...')

    // Load user preference or use system default
    const savedTheme = this.loadThemePreference()
    const initialTheme = savedTheme || this.systemPreference

    this.setTheme(initialTheme)
    this.updateThemeToggleButton()

    console.log(`✅ Theme initialized: ${this.currentTheme}`)
  }

  /**
     * Setup event listeners
     */
  setupEventListeners () {
    // Theme toggle button
    const themeToggle = document.getElementById('theme-toggle')
    if (themeToggle) {
      themeToggle.addEventListener('click', () => {
        this.toggleTheme()
      })
    }

    // Listen for system theme changes
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      darkModeQuery.addEventListener('change', (e) => {
        this.systemPreference = e.matches ? 'dark' : 'light'

        // If user hasn't set a preference, follow system
        if (!this.hasUserPreference()) {
          this.setTheme(this.systemPreference)
        }
      })

      // Listen for high contrast preference
      const highContrastQuery = window.matchMedia('(prefers-contrast: high)')
      highContrastQuery.addEventListener('change', (e) => {
        if (e.matches && !this.hasUserPreference()) {
          this.setTheme('high-contrast')
        }
      })
    }

    // Listen for external theme change events
    document.addEventListener('theme-change-request', (e) => {
      if (e.detail && e.detail.theme) {
        this.setTheme(e.detail.theme)
      }
    })

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + Shift + T for theme toggle
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
        e.preventDefault()
        this.toggleTheme()
      }
    })
  }

  /**
     * Detect system color scheme preference
     */
  detectSystemPreference () {
    if (window.matchMedia) {
      // Check for dark mode preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        this.systemPreference = 'dark'
      }

      // Check for high contrast preference
      else if (window.matchMedia('(prefers-contrast: high)').matches) {
        this.systemPreference = 'high-contrast'
      }

      // Default to light
      else {
        this.systemPreference = 'light'
      }
    }

    console.log(`🔍 System preference detected: ${this.systemPreference}`)
  }

  /**
     * Set theme
     */
  setTheme (theme) {
    if (!this.availableThemes.includes(theme)) {
      console.warn(`Unknown theme: ${theme}, falling back to light`)
      theme = 'light'
    }

    const previousTheme = this.currentTheme
    this.currentTheme = theme

    // Apply theme to document
    document.documentElement.setAttribute('data-theme', theme)

    // Update meta theme-color for mobile browsers
    this.updateMetaThemeColor(theme)

    // Save preference
    this.saveThemePreference(theme)

    // Update theme toggle button
    this.updateThemeToggleButton()

    // Trigger theme change event
    this.dispatchThemeChangeEvent(previousTheme, theme)

    // Apply transition class for smooth changes
    this.applyThemeTransition()

    console.log(`🎨 Theme changed: ${previousTheme} → ${theme}`)
  }

  /**
     * Toggle between themes
     */
  toggleTheme () {
    const themeOrder = ['light', 'dark', 'high-contrast', 'sepia']
    const currentIndex = themeOrder.indexOf(this.currentTheme)
    const nextIndex = (currentIndex + 1) % themeOrder.length
    const nextTheme = themeOrder[nextIndex]

    this.setTheme(nextTheme)

    // Show toast notification
    this.showThemeToast(nextTheme)
  }

  /**
     * Get current theme
     */
  getCurrentTheme () {
    return this.currentTheme
  }

  /**
     * Get available themes
     */
  getAvailableThemes () {
    return [...this.availableThemes]
  }

  /**
     * Check if user has set a theme preference
     */
  hasUserPreference () {
    return localStorage.getItem(this.preferenceKey) !== null
  }

  /**
     * Load theme preference from storage
     */
  loadThemePreference () {
    try {
      return localStorage.getItem(this.preferenceKey)
    } catch (error) {
      console.warn('Failed to load theme preference:', error)
      return null
    }
  }

  /**
     * Save theme preference to storage
     */
  saveThemePreference (theme) {
    try {
      localStorage.setItem(this.preferenceKey, theme)
    } catch (error) {
      console.warn('Failed to save theme preference:', error)
    }
  }

  /**
     * Update meta theme-color for mobile browsers
     */
  updateMetaThemeColor (theme) {
    const themeColors = {
      light: '#ffffff',
      dark: '#1f2937',
      'high-contrast': '#000000',
      sepia: '#f7f3e4'
    }

    let metaThemeColor = document.querySelector('meta[name="theme-color"]')
    if (!metaThemeColor) {
      metaThemeColor = document.createElement('meta')
      metaThemeColor.name = 'theme-color'
      document.head.appendChild(metaThemeColor)
    }

    metaThemeColor.content = themeColors[theme] || themeColors.light
  }

  /**
     * Update theme toggle button appearance
     */
  updateThemeToggleButton () {
    const themeToggle = document.getElementById('theme-toggle')
    if (!themeToggle) return

    const themeIcons = {
      light: 'fa-sun',
      dark: 'fa-moon',
      'high-contrast': 'fa-adjust',
      sepia: 'fa-eye'
    }

    const themeNames = {
      light: '浅色主题',
      dark: '深色主题',
      'high-contrast': '高对比度',
      sepia: '护眼模式'
    }

    const icon = themeToggle.querySelector('i')
    if (icon) {
      // Remove all theme icon classes
      Object.values(themeIcons).forEach(iconClass => {
        icon.classList.remove(iconClass)
      })

      // Add current theme icon
      icon.classList.add(themeIcons[this.currentTheme])
    }

    // Update tooltip
    themeToggle.title = `当前: ${themeNames[this.currentTheme]} (点击切换)`
    themeToggle.setAttribute('aria-label', `切换主题，当前: ${themeNames[this.currentTheme]}`)
  }

  /**
     * Apply smooth transition during theme changes
     */
  applyThemeTransition () {
    document.documentElement.classList.add('theme-transition')

    // Remove transition class after animation
    setTimeout(() => {
      document.documentElement.classList.remove('theme-transition')
    }, 300)
  }

  /**
     * Dispatch theme change event
     */
  dispatchThemeChangeEvent (previousTheme, newTheme) {
    const event = new CustomEvent('theme-changed', {
      detail: {
        previousTheme,
        newTheme,
        timestamp: new Date().toISOString()
      }
    })

    document.dispatchEvent(event)
  }

  /**
     * Show theme change toast
     */
  showThemeToast (theme) {
    const themeNames = {
      light: '浅色主题',
      dark: '深色主题',
      'high-contrast': '高对比度主题',
      sepia: '护眼模式'
    }

    const message = `已切换到${themeNames[theme]}`
    this.createToast(message, 'theme')
  }

  /**
     * Create and show toast notification
     */
  createToast (message, type = 'info', duration = 2000) {
    // Remove existing theme toasts
    document.querySelectorAll('.toast.toast-theme').forEach(toast => {
      toast.remove()
    })

    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`

    toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-palette"></i>
                <span>${message}</span>
            </div>
        `

    // Position toast
    toast.style.position = 'fixed'
    toast.style.top = '20px'
    toast.style.right = '20px'
    toast.style.zIndex = '10000'
    toast.style.padding = '12px 16px'
    toast.style.backgroundColor = 'var(--bg-primary)'
    toast.style.color = 'var(--text-primary)'
    toast.style.border = '1px solid var(--border-color)'
    toast.style.borderRadius = 'var(--border-radius-lg)'
    toast.style.boxShadow = 'var(--shadow-lg)'
    toast.style.transform = 'translateX(100%)'
    toast.style.transition = 'transform var(--transition-normal)'

    document.body.appendChild(toast)

    // Animate in
    requestAnimationFrame(() => {
      toast.style.transform = 'translateX(0)'
    })

    // Auto remove
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)'
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, duration)
  }

  /**
     * Create theme selector component
     */
  createThemeSelector (container) {
    if (!container) return

    const themeNames = {
      light: '浅色',
      dark: '深色',
      'high-contrast': '高对比度',
      sepia: '护眼模式'
    }

    const selector = document.createElement('div')
    selector.className = 'theme-selector'
    selector.innerHTML = `
            <div class="theme-selector-header">
                <h4>选择主题</h4>
            </div>
            <div class="theme-options">
                ${this.availableThemes.map(theme => `
                    <button 
                        class="theme-option ${theme === this.currentTheme ? 'active' : ''}"
                        data-theme="${theme}"
                        aria-label="切换到${themeNames[theme]}主题"
                    >
                        <div class="theme-preview theme-preview-${theme}"></div>
                        <span class="theme-name">${themeNames[theme]}</span>
                        ${theme === this.currentTheme ? '<i class="fas fa-check"></i>' : ''}
                    </button>
                `).join('')}
            </div>
        `

    // Add event listeners
    selector.querySelectorAll('.theme-option').forEach(option => {
      option.addEventListener('click', () => {
        const theme = option.dataset.theme
        this.setTheme(theme)

        // Update active state
        selector.querySelectorAll('.theme-option').forEach(opt => {
          opt.classList.toggle('active', opt.dataset.theme === theme)

          // Update check icon
          const icon = opt.querySelector('.fas')
          if (opt.dataset.theme === theme) {
            if (!icon) {
              opt.innerHTML += '<i class="fas fa-check"></i>'
            }
          } else if (icon) {
            icon.remove()
          }
        })
      })
    })

    container.appendChild(selector)
    return selector
  }

  /**
     * Get theme-specific CSS custom properties
     */
  getThemeProperties (theme) {
    const properties = {
      light: {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f9fafb',
        '--text-primary': '#111827',
        '--text-secondary': '#6b7280'
      },
      dark: {
        '--bg-primary': '#1f2937',
        '--bg-secondary': '#374151',
        '--text-primary': '#f9fafb',
        '--text-secondary': '#d1d5db'
      },
      'high-contrast': {
        '--bg-primary': '#ffffff',
        '--bg-secondary': '#f0f0f0',
        '--text-primary': '#000000',
        '--text-secondary': '#333333'
      },
      sepia: {
        '--bg-primary': '#f7f3e4',
        '--bg-secondary': '#f0ebcd',
        '--text-primary': '#3e2723',
        '--text-secondary': '#5d4037'
      }
    }

    return properties[theme] || properties.light
  }

  /**
     * Apply theme programmatically (for testing or specific use cases)
     */
  applyThemeProperties (theme, element = document.documentElement) {
    const properties = this.getThemeProperties(theme)

    Object.entries(properties).forEach(([property, value]) => {
      element.style.setProperty(property, value)
    })
  }

  /**
     * Reset theme to system default
     */
  resetToSystemDefault () {
    localStorage.removeItem(this.preferenceKey)
    this.setTheme(this.systemPreference)
    this.showThemeToast('已重置为系统默认主题')
  }

  /**
     * Get theme statistics (for analytics)
     */
  getThemeStats () {
    return {
      currentTheme: this.currentTheme,
      systemPreference: this.systemPreference,
      hasUserPreference: this.hasUserPreference(),
      availableThemes: this.availableThemes,
      supportsDarkMode: window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches,
      supportsHighContrast: window.matchMedia && window.matchMedia('(prefers-contrast: high)').matches
    }
  }

  /**
     * Preload theme assets (if needed)
     */
  preloadThemeAssets (theme) {
    // Placeholder for preloading theme-specific assets
    // This could include images, fonts, or other resources
    console.log(`🔄 Preloading assets for theme: ${theme}`)
  }

  /**
     * Validate theme configuration
     */
  validateTheme (theme) {
    return this.availableThemes.includes(theme)
  }

  /**
     * Export theme preferences
     */
  exportPreferences () {
    return {
      currentTheme: this.currentTheme,
      systemPreference: this.systemPreference,
      hasUserPreference: this.hasUserPreference(),
      exportDate: new Date().toISOString()
    }
  }

  /**
     * Import theme preferences
     */
  importPreferences (preferences) {
    if (preferences.currentTheme && this.validateTheme(preferences.currentTheme)) {
      this.setTheme(preferences.currentTheme)
      return true
    }
    return false
  }
}

// CSS for theme transitions (injected if not present)
const themeTransitionCSS = `
.theme-transition * {
    transition: background-color var(--transition-normal),
                color var(--transition-normal),
                border-color var(--transition-normal),
                box-shadow var(--transition-normal) !important;
}

.theme-transition *:before,
.theme-transition *:after {
    transition: background-color var(--transition-normal),
                color var(--transition-normal),
                border-color var(--transition-normal),
                box-shadow var(--transition-normal) !important;
}

.theme-selector {
    background: var(--bg-primary);
    border: 1px solid var(--border-color);
    border-radius: var(--border-radius-lg);
    padding: var(--space-4);
    box-shadow: var(--shadow-lg);
}

.theme-selector-header h4 {
    margin: 0 0 var(--space-3) 0;
    color: var(--text-primary);
    font-size: var(--font-size-lg);
}

.theme-options {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: var(--space-3);
}

.theme-option {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: var(--space-2);
    padding: var(--space-3);
    background: var(--bg-secondary);
    border: 2px solid transparent;
    border-radius: var(--border-radius-md);
    cursor: pointer;
    transition: all var(--transition-fast);
    position: relative;
}

.theme-option:hover {
    border-color: var(--color-primary);
    transform: translateY(-2px);
}

.theme-option.active {
    border-color: var(--color-primary);
    background: var(--color-primary);
    color: white;
}

.theme-preview {
    width: 40px;
    height: 30px;
    border-radius: var(--border-radius-sm);
    position: relative;
    overflow: hidden;
}

.theme-preview-light {
    background: linear-gradient(135deg, #ffffff 50%, #f9fafb 50%);
    border: 1px solid #e5e7eb;
}

.theme-preview-dark {
    background: linear-gradient(135deg, #1f2937 50%, #374151 50%);
}

.theme-preview-high-contrast {
    background: linear-gradient(135deg, #ffffff 50%, #000000 50%);
}

.theme-preview-sepia {
    background: linear-gradient(135deg, #f7f3e4 50%, #f0ebcd 50%);
}

.theme-name {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
}

.theme-option .fas {
    position: absolute;
    top: 4px;
    right: 4px;
    font-size: 12px;
}

.toast-theme {
    background: var(--bg-primary) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-color) !important;
}

.toast-content {
    display: flex;
    align-items: center;
    gap: var(--space-2);
}
`

// Inject CSS if not already present
if (!document.querySelector('#theme-transition-styles')) {
  const style = document.createElement('style')
  style.id = 'theme-transition-styles'
  style.textContent = themeTransitionCSS
  document.head.appendChild(style)
}

// Export for use in main.js
if (typeof window !== 'undefined') {
  window.ThemeManager = ThemeManager
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ThemeManager
}
