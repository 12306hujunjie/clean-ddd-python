/**
 * Python Clean DDD Website - Main JavaScript Controller
 * Coordinates all interactive features and manages application state
 */

class DDDWebsiteApp {
    constructor() {
        this.currentSection = 'home';
        this.theme = 'light';
        this.isLoaded = false;
        this.components = new Map();
        
        // Initialize app when DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }

    /**
     * Initialize the application
     */
    async init() {
        try {
            console.log('🚀 Initializing Python Clean DDD Website...');
            
            // Show loading screen
            this.showLoadingScreen();
            
            // Initialize core components
            await this.initializeComponents();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Initialize theme
            this.initializeTheme();
            
            // Load initial content
            await this.loadInitialContent();
            
            // Hide loading screen
            this.hideLoadingScreen();
            
            // Mark as loaded
            this.isLoaded = true;
            
            console.log('✅ Website initialized successfully!');
            
        } catch (error) {
            console.error('❌ Failed to initialize website:', error);
            this.showErrorMessage('Failed to load the website. Please refresh the page.');
        }
    }

    /**
     * Initialize all website components
     */
    async initializeComponents() {
        const componentModules = [
            'navigation',
            'knowledge-map', 
            'learning-path',
            'code-examples',
            'theme',
            'utils'
        ];

        for (const module of componentModules) {
            try {
                // Dynamic import would be used in a proper module system
                // For now, we'll initialize components directly
                console.log(`Initializing ${module} component...`);
                
                switch (module) {
                    case 'navigation':
                        this.components.set('navigation', new NavigationManager());
                        break;
                    case 'knowledge-map':
                        this.components.set('knowledgeMap', new KnowledgeMapManager());
                        break;
                    case 'learning-path':
                        this.components.set('learningPath', new LearningPathManager());
                        break;
                    case 'code-examples':
                        this.components.set('codeExamples', new CodeExamplesManager());
                        break;
                    case 'theme':
                        this.components.set('theme', new ThemeManager());
                        break;
                }
                
            } catch (error) {
                console.warn(`⚠️ Failed to initialize ${module}:`, error);
            }
        }
    }

    /**
     * Setup global event listeners
     */
    setupEventListeners() {
        // Handle navigation
        document.addEventListener('click', this.handleGlobalClick.bind(this));
        
        // Handle keyboard navigation
        document.addEventListener('keydown', this.handleKeyboard.bind(this));
        
        // Handle scroll events
        window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 16));
        
        // Handle resize events
        window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250));
        
        // Handle visibility changes
        document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this));
        
        // Handle online/offline status
        window.addEventListener('online', this.handleOnline.bind(this));
        window.addEventListener('offline', this.handleOffline.bind(this));
    }

    /**
     * Handle global click events
     */
    handleGlobalClick(event) {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        
        const action = target.dataset.action;
        const params = target.dataset.params ? JSON.parse(target.dataset.params) : {};
        
        this.executeAction(action, params, event);
    }

    /**
     * Execute application actions
     */
    executeAction(action, params = {}, event = null) {
        console.log(`🎯 Executing action: ${action}`, params);
        
        switch (action) {
            case 'navigate':
                this.navigateToSection(params.section || params.to);
                break;
                
            case 'start-learning':
                this.startLearningFlow();
                break;
                
            case 'view-docs':
                this.openDocumentation();
                break;
                
            case 'toggle-theme':
                this.components.get('theme')?.toggleTheme();
                break;
                
            case 'run-code':
                this.components.get('codeExamples')?.runCode(params.code);
                break;
                
            case 'copy-code':
                this.copyToClipboard(params.code || this.getSelectedCode());
                break;
                
            case 'download-code':
                this.downloadCode(params.code, params.filename);
                break;
                
            case 'filter-content':
                this.filterContent(params.type, params.value);
                break;
                
            case 'search':
                this.performSearch(params.query);
                break;
                
            default:
                console.warn(`Unknown action: ${action}`);
        }
    }

    /**
     * Navigate to a specific section
     */
    navigateToSection(sectionId) {
        if (!sectionId || sectionId === this.currentSection) return;
        
        // Hide current section
        const currentElement = document.getElementById(this.currentSection);
        if (currentElement) {
            currentElement.classList.remove('active');
        }
        
        // Show new section
        const newElement = document.getElementById(sectionId);
        if (newElement) {
            newElement.classList.add('active');
            this.currentSection = sectionId;
            
            // Update URL without reload
            this.updateURL(sectionId);
            
            // Update navigation state
            this.components.get('navigation')?.updateActiveSection(sectionId);
            
            // Trigger section-specific initialization
            this.initializeSection(sectionId);
            
            // Analytics tracking
            this.trackPageView(sectionId);
        }
    }

    /**
     * Initialize section-specific functionality
     */
    initializeSection(sectionId) {
        switch (sectionId) {
            case 'knowledge-map':
                this.components.get('knowledgeMap')?.initialize();
                break;
                
            case 'learning-path':
                this.components.get('learningPath')?.initialize();
                break;
                
            case 'examples':
                this.components.get('codeExamples')?.initialize();
                break;
        }
    }

    /**
     * Start the learning flow
     */
    startLearningFlow() {
        // Determine user's experience level
        this.showModal('learning-assessment', {
            title: 'Choose Your Learning Path',
            content: this.generateLearningAssessment(),
            onComplete: (level) => {
                this.navigateToSection('learning-path');
                this.components.get('learningPath')?.setUserLevel(level);
            }
        });
    }

    /**
     * Open documentation
     */
    openDocumentation() {
        this.navigateToSection('knowledge-map');
        this.components.get('knowledgeMap')?.focusOnConcept('introduction');
    }

    /**
     * Initialize theme system
     */
    initializeTheme() {
        const themeManager = this.components.get('theme');
        if (themeManager) {
            this.theme = themeManager.getCurrentTheme();
            document.documentElement.setAttribute('data-theme', this.theme);
        }
    }

    /**
     * Load initial content and data
     */
    async loadInitialContent() {
        try {
            // Load DDD concepts data
            const conceptsData = await this.loadDDDConcepts();
            this.components.get('knowledgeMap')?.setConceptsData(conceptsData);
            
            // Load learning path data
            const learningPathData = await this.loadLearningPaths();
            this.components.get('learningPath')?.setPathData(learningPathData);
            
            // Load code examples
            const examplesData = await this.loadCodeExamples();
            this.components.get('codeExamples')?.setExamplesData(examplesData);
            
            // Initialize statistics
            this.initializeStatistics();
            
        } catch (error) {
            console.error('Failed to load initial content:', error);
        }
    }

    /**
     * Load DDD concepts data
     */
    async loadDDDConcepts() {
        // In a real implementation, this would fetch from an API
        return {
            concepts: [
                {
                    id: 'value-object',
                    name: 'Value Object',
                    difficulty: 'beginner',
                    category: 'tactical',
                    description: 'Immutable objects that represent descriptive aspects of the domain',
                    examples: ['Money', 'Email', 'Address']
                },
                {
                    id: 'entity',
                    name: 'Entity',
                    difficulty: 'beginner', 
                    category: 'tactical',
                    description: 'Objects with unique identity that persist through time',
                    examples: ['User', 'Order', 'Product']
                },
                {
                    id: 'aggregate',
                    name: 'Aggregate',
                    difficulty: 'intermediate',
                    category: 'tactical',
                    description: 'Consistency boundary for a group of related entities',
                    examples: ['OrderAggregate', 'UserProfile', 'ShoppingCart']
                },
                {
                    id: 'bounded-context',
                    name: 'Bounded Context',
                    difficulty: 'advanced',
                    category: 'strategic',
                    description: 'Explicit boundary where a domain model applies',
                    examples: ['Sales Context', 'Inventory Context', 'Shipping Context']
                }
            ],
            relationships: [
                { from: 'value-object', to: 'entity', type: 'used-by' },
                { from: 'entity', to: 'aggregate', type: 'contained-in' },
                { from: 'aggregate', to: 'bounded-context', type: 'belongs-to' }
            ]
        };
    }

    /**
     * Load learning paths data
     */
    async loadLearningPaths() {
        return {
            beginner: {
                name: 'Developer Fast Track',
                duration: '3-4 months',
                modules: 8,
                projects: 3,
                steps: [
                    { id: 1, title: '30-second DDD Overview', duration: '5 min', completed: false },
                    { id: 2, title: 'Core Concepts', duration: '45 min', completed: false },
                    { id: 3, title: 'First Value Object', duration: '30 min', completed: false },
                    { id: 4, title: 'Building Entities', duration: '60 min', completed: false }
                ]
            },
            intermediate: {
                name: 'Architecture Journey',
                duration: '2-3 months',
                modules: 6,
                projects: 2,
                steps: [
                    { id: 1, title: 'Strategic Design', duration: '90 min', completed: false },
                    { id: 2, title: 'Context Mapping', duration: '120 min', completed: false },
                    { id: 3, title: 'Event Storming', duration: '180 min', completed: false }
                ]
            },
            expert: {
                name: 'Mastery Path',
                duration: '1-2 months',
                modules: 4,
                projects: 1,
                steps: [
                    { id: 1, title: 'Advanced Patterns', duration: '240 min', completed: false },
                    { id: 2, title: 'Enterprise Integration', duration: '300 min', completed: false }
                ]
            }
        };
    }

    /**
     * Load code examples data
     */
    async loadCodeExamples() {
        return {
            'domain-modeling': {
                title: 'Domain Modeling',
                description: 'Basic domain modeling with Value Objects and Entities',
                files: {
                    main: `# Domain Modeling Example
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional
import uuid

@dataclass(frozen=True)
class Money:
    """Value Object representing monetary amounts"""
    amount: Decimal
    currency: str
    
    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")
        if not self.currency:
            raise ValueError("Currency is required")
    
    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Cannot add different currencies")
        return Money(self.amount + other.amount, self.currency)

class User:
    """Entity representing a user in the system"""
    
    def __init__(self, user_id: str, email: str, name: str):
        self._id = user_id or str(uuid.uuid4())
        self._email = email
        self._name = name
        self._balance = Money(Decimal('0'), 'USD')
    
    @property
    def id(self) -> str:
        return self._id
    
    @property 
    def email(self) -> str:
        return self._email
    
    def add_funds(self, amount: Money) -> None:
        self._balance = self._balance.add(amount)
    
    def get_balance(self) -> Money:
        return self._balance

# Usage example
if __name__ == "__main__":
    user = User("123", "john@example.com", "John Doe")
    user.add_funds(Money(Decimal('100.50'), 'USD'))
    print(f"User balance: {user.get_balance().amount} {user.get_balance().currency}")
`,
                    models: `# Domain Models
# Additional model definitions would go here
`,
                    tests: `# Unit Tests
import unittest
from decimal import Decimal

class TestMoney(unittest.TestCase):
    def test_money_creation(self):
        money = Money(Decimal('10.50'), 'USD')
        self.assertEqual(money.amount, Decimal('10.50'))
        self.assertEqual(money.currency, 'USD')
    
    def test_money_addition(self):
        money1 = Money(Decimal('10.50'), 'USD')
        money2 = Money(Decimal('5.25'), 'USD')
        result = money1.add(money2)
        self.assertEqual(result.amount, Decimal('15.75'))

if __name__ == '__main__':
    unittest.main()
`
                }
            }
        };
    }

    /**
     * Initialize statistics counters
     */
    initializeStatistics() {
        const stats = [
            { element: '[data-target="15"]', target: 15, label: 'Core Concepts' },
            { element: '[data-target="50"]', target: 50, label: 'Code Examples' },
            { element: '[data-target="8"]', target: 8, label: 'Real Projects' },
            { element: '[data-target="100"]', target: 100, label: 'Best Practices' }
        ];

        stats.forEach(stat => {
            const element = document.querySelector(stat.element);
            if (element) {
                this.animateCounter(element, stat.target);
            }
        });
    }

    /**
     * Animate counter from 0 to target
     */
    animateCounter(element, target, duration = 2000) {
        const start = 0;
        const startTime = performance.now();
        
        const updateCounter = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(start + (target - start) * easeOut);
            
            element.textContent = current.toString();
            
            if (progress < 1) {
                requestAnimationFrame(updateCounter);
            } else {
                element.textContent = target.toString();
            }
        };
        
        requestAnimationFrame(updateCounter);
    }

    /**
     * Show loading screen
     */
    showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
        }
    }

    /**
     * Hide loading screen
     */
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                }, 300);
            }, 1000); // Show loading for at least 1 second
        }
    }

    /**
     * Show error message
     */
    showErrorMessage(message) {
        // Create and show error toast
        const toast = document.createElement('div');
        toast.className = 'toast toast-error';
        toast.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 5000);
        
        // Manual close
        toast.querySelector('.toast-close').addEventListener('click', () => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        });
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showToast('Code copied to clipboard!', 'success');
        } catch (error) {
            console.error('Failed to copy:', error);
            this.showToast('Failed to copy code', 'error');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info-circle'}"></i>
            <span>${message}</span>
        `;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, 3000);
    }

    /**
     * Utility: Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Utility: Debounce function calls
     */
    debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    /**
     * Handle keyboard events
     */
    handleKeyboard(event) {
        // Handle escape key
        if (event.key === 'Escape') {
            this.closeModals();
        }
        
        // Handle navigation shortcuts
        if (event.ctrlKey || event.metaKey) {
            switch (event.key) {
                case 'k':
                    event.preventDefault();
                    this.focusSearch();
                    break;
            }
        }
    }

    /**
     * Handle scroll events
     */
    handleScroll() {
        const scrollTop = window.pageYOffset;
        
        // Show/hide back to top button
        const backToTop = document.getElementById('back-to-top');
        if (backToTop) {
            backToTop.style.display = scrollTop > 300 ? 'block' : 'none';
        }
        
        // Update header background
        const header = document.getElementById('header');
        if (header) {
            header.classList.toggle('scrolled', scrollTop > 50);
        }
    }

    /**
     * Handle window resize
     */
    handleResize() {
        // Update responsive components
        this.components.forEach(component => {
            if (typeof component.handleResize === 'function') {
                component.handleResize();
            }
        });
    }

    /**
     * Handle visibility change
     */
    handleVisibilityChange() {
        if (document.visibilityState === 'visible') {
            // Resume animations and updates
            this.resumeApplication();
        } else {
            // Pause non-essential operations
            this.pauseApplication();
        }
    }

    /**
     * Handle online status
     */
    handleOnline() {
        this.showToast('Back online!', 'success');
    }

    /**
     * Handle offline status
     */
    handleOffline() {
        this.showToast('You are offline. Some features may not work.', 'warning');
    }

    /**
     * Update URL without page reload
     */
    updateURL(section) {
        const url = new URL(window.location);
        url.hash = section;
        window.history.replaceState({}, '', url);
    }

    /**
     * Track page views (placeholder for analytics)
     */
    trackPageView(section) {
        console.log(`📊 Page view: ${section}`);
        // Integration with analytics service would go here
    }

    /**
     * Pause application
     */
    pauseApplication() {
        // Pause animations, stop timers, etc.
        console.log('⏸️ Application paused');
    }

    /**
     * Resume application
     */
    resumeApplication() {
        // Resume animations, restart timers, etc.
        console.log('▶️ Application resumed');
    }
}

/**
 * Navigation Manager - Handles navigation and routing
 */
class NavigationManager {
    constructor() {
        this.currentSection = 'home';
        this.navLinks = document.querySelectorAll('.nav-link');
        this.sections = document.querySelectorAll('.section');
        
        this.setupNavigation();
    }

    setupNavigation() {
        // Handle nav link clicks
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.dataset.section;
                if (section) {
                    this.navigateToSection(section);
                }
            });
        });

        // Handle mobile menu toggle
        const navToggle = document.getElementById('nav-toggle');
        const navMenu = document.getElementById('nav-menu');
        
        if (navToggle && navMenu) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });
        }

        // Handle back to top
        const backToTop = document.getElementById('back-to-top');
        if (backToTop) {
            backToTop.addEventListener('click', () => {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    navigateToSection(sectionId) {
        // Remove active class from all nav links
        this.navLinks.forEach(link => link.classList.remove('active'));
        
        // Add active class to current nav link
        const activeLink = document.querySelector(`[data-section="${sectionId}"]`);
        if (activeLink) {
            activeLink.classList.add('active');
        }

        // Hide all sections
        this.sections.forEach(section => section.classList.remove('active'));
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }

        // Close mobile menu
        const navMenu = document.getElementById('nav-menu');
        const navToggle = document.getElementById('nav-toggle');
        if (navMenu && navToggle) {
            navMenu.classList.remove('active');
            navToggle.classList.remove('active');
        }
    }

    updateActiveSection(sectionId) {
        this.navigateToSection(sectionId);
    }
}

/**
 * Initialize the application when the script loads
 */
window.dddiWebsiteApp = new DDDWebsiteApp();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { DDDWebsiteApp, NavigationManager };
}