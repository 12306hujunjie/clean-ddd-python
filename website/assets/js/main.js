// Main JavaScript for DDD Website

class DDDWebsite {
    constructor() {
        this.init();
    }

    init() {
        this.setupNavigation();
        this.setupSmoothScrolling();
        this.setupLearningPathRecommendation();
        this.setupInteractiveElements();
        this.setupProgressTracking();
        this.setupAnimations();
    }

    // Navigation functionality
    setupNavigation() {
        const navToggle = document.querySelector('.nav-toggle');
        const navMenu = document.querySelector('.nav-menu');
        const navLinks = document.querySelectorAll('.nav-link');

        // Mobile menu toggle
        if (navToggle) {
            navToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                navToggle.classList.toggle('active');
            });
        }

        // Active link highlighting based on scroll position
        window.addEventListener('scroll', () => {
            let current = '';
            const sections = document.querySelectorAll('section[id]');
            
            sections.forEach(section => {
                const sectionTop = section.offsetTop;
                const sectionHeight = section.clientHeight;
                if (window.pageYOffset >= sectionTop - 200) {
                    current = section.getAttribute('id');
                }
            });

            navLinks.forEach(link => {
                link.classList.remove('active');
                if (link.getAttribute('href') === `#${current}`) {
                    link.classList.add('active');
                }
            });
        });

        // Close mobile menu when clicking on a link
        navLinks.forEach(link => {
            link.addEventListener('click', () => {
                navMenu.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }

    // Smooth scrolling for anchor links
    setupSmoothScrolling() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerOffset = 80;
                    const elementPosition = target.offsetTop;
                    const offsetPosition = elementPosition - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // Learning path recommendation system
    setupLearningPathRecommendation() {
        const getRecommendationBtn = document.querySelector('.get-recommendation');
        
        if (getRecommendationBtn) {
            getRecommendationBtn.addEventListener('click', () => {
                this.calculateRecommendation();
            });
        }
    }

    calculateRecommendation() {
        const dddLevel = document.querySelector('input[name="ddd-level"]:checked');
        const goal = document.querySelector('input[name="goal"]:checked');

        if (!dddLevel || !goal) {
            this.showNotification('请完成所有问题后再获取推荐', 'warning');
            return;
        }

        const recommendation = this.getPathRecommendation(dddLevel.value, goal.value);
        this.displayRecommendation(recommendation);
    }

    getPathRecommendation(level, goal) {
        const recommendations = {
            'beginner-learn': {
                title: '新手学习路径',
                description: '适合DDD初学者的完整学习体验',
                steps: [
                    { title: '30秒理解DDD', url: 'visual-guide.html', time: '5分钟' },
                    { title: '15分钟友好入门', url: 'beginner-guide.html', time: '15分钟' },
                    { title: '设计决策指南', url: 'decision-support.html', time: '30分钟' },
                    { title: '核心概念深入', url: 'concepts/', time: '1小时' }
                ],
                estimatedTime: '2小时',
                difficulty: 'beginner'
            },
            'basic-implement': {
                title: '实践导向路径',
                description: '快速应用DDD到实际项目中',
                steps: [
                    { title: '设计决策工具', url: 'decision-support.html', time: '30分钟' },
                    { title: '异步DDD实现', url: 'examples.html', time: '45分钟' },
                    { title: '项目模板生成', url: 'tools/project-generator.html', time: '15分钟' },
                    { title: '架构验证工具', url: 'tools/architecture-checker.html', time: '30分钟' }
                ],
                estimatedTime: '2小时',
                difficulty: 'intermediate'
            },
            'experienced-team': {
                title: '团队实施路径',
                description: '帮助团队标准化采用DDD',
                steps: [
                    { title: '团队开发标准', url: 'team-standards.html', time: '1小时' },
                    { title: '渐进实施计划', url: 'production-guide.html', time: '2小时' },
                    { title: '系统迁移指南', url: 'migration-guide.html', time: '1小时' },
                    { title: '高级架构模式', url: 'advanced-patterns.html', time: '2小时' }
                ],
                estimatedTime: '6小时',
                difficulty: 'advanced'
            }
        };

        const key = `${level}-${goal}`;
        return recommendations[key] || recommendations['beginner-learn'];
    }

    displayRecommendation(recommendation) {
        const modal = this.createRecommendationModal(recommendation);
        document.body.appendChild(modal);
        
        // Animate modal appearance
        setTimeout(() => {
            modal.classList.add('active');
        }, 10);

        // Setup close functionality
        const closeBtn = modal.querySelector('.modal-close');
        const overlay = modal.querySelector('.modal-overlay');
        
        [closeBtn, overlay].forEach(element => {
            element.addEventListener('click', () => {
                modal.classList.remove('active');
                setTimeout(() => {
                    document.body.removeChild(modal);
                }, 300);
            });
        });
    }

    createRecommendationModal(recommendation) {
        const modal = document.createElement('div');
        modal.className = 'recommendation-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                <div class="modal-header">
                    <h3>${recommendation.title}</h3>
                    <p>${recommendation.description}</p>
                    <div class="recommendation-meta">
                        <span class="time-badge">⏱️ ${recommendation.estimatedTime}</span>
                        <span class="difficulty-badge difficulty-${recommendation.difficulty}">
                            ${this.getDifficultyText(recommendation.difficulty)}
                        </span>
                    </div>
                </div>
                <div class="modal-body">
                    <h4>推荐学习步骤：</h4>
                    <div class="recommendation-steps">
                        ${recommendation.steps.map((step, index) => `
                            <div class="recommendation-step">
                                <span class="step-number">${index + 1}</span>
                                <div class="step-info">
                                    <h5>${step.title}</h5>
                                    <span class="step-time">${step.time}</span>
                                </div>
                                <a href="${step.url}" class="step-action">开始学习</a>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="start-learning-btn" onclick="this.closest('.recommendation-modal').querySelector('.recommendation-step a').click()">
                        开始我的DDD学习之旅
                    </button>
                </div>
            </div>
        `;

        // Add modal styles
        const modalStyles = `
            <style>
                .recommendation-modal {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    z-index: 10000;
                    opacity: 0;
                    visibility: hidden;
                    transition: all 0.3s ease;
                }
                
                .recommendation-modal.active {
                    opacity: 1;
                    visibility: visible;
                }
                
                .modal-overlay {
                    position: absolute;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background: rgba(0, 0, 0, 0.5);
                    backdrop-filter: blur(5px);
                }
                
                .modal-content {
                    position: absolute;
                    top: 50%;
                    left: 50%;
                    transform: translate(-50%, -50%);
                    background: white;
                    border-radius: 1rem;
                    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
                    max-width: 600px;
                    width: 90%;
                    max-height: 80vh;
                    overflow-y: auto;
                }
                
                .modal-close {
                    position: absolute;
                    top: 1rem;
                    right: 1rem;
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: #6b7280;
                    transition: color 0.2s;
                }
                
                .modal-close:hover {
                    color: #374151;
                }
                
                .modal-header {
                    padding: 2rem 2rem 1rem;
                    border-bottom: 1px solid #e5e7eb;
                }
                
                .modal-header h3 {
                    font-size: 1.5rem;
                    font-weight: 600;
                    margin-bottom: 0.5rem;
                    color: #111827;
                }
                
                .modal-header p {
                    color: #6b7280;
                    margin-bottom: 1rem;
                }
                
                .recommendation-meta {
                    display: flex;
                    gap: 0.5rem;
                    flex-wrap: wrap;
                }
                
                .time-badge, .difficulty-badge {
                    padding: 0.25rem 0.75rem;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                }
                
                .time-badge {
                    background: #dbeafe;
                    color: #1d4ed8;
                }
                
                .difficulty-beginner {
                    background: #dcfce7;
                    color: #166534;
                }
                
                .difficulty-intermediate {
                    background: #fef3c7;
                    color: #92400e;
                }
                
                .difficulty-advanced {
                    background: #fce7f3;
                    color: #be185d;
                }
                
                .modal-body {
                    padding: 1rem 2rem;
                }
                
                .modal-body h4 {
                    font-weight: 600;
                    margin-bottom: 1rem;
                    color: #111827;
                }
                
                .recommendation-steps {
                    display: flex;
                    flex-direction: column;
                    gap: 1rem;
                }
                
                .recommendation-step {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                    padding: 1rem;
                    background: #f9fafb;
                    border-radius: 0.75rem;
                    border: 1px solid #e5e7eb;
                }
                
                .recommendation-step .step-number {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 2rem;
                    height: 2rem;
                    background: #2563eb;
                    color: white;
                    border-radius: 50%;
                    font-weight: 600;
                    font-size: 0.875rem;
                    flex-shrink: 0;
                }
                
                .step-info {
                    flex: 1;
                }
                
                .step-info h5 {
                    font-weight: 500;
                    margin-bottom: 0.25rem;
                    color: #111827;
                }
                
                .step-time {
                    font-size: 0.75rem;
                    color: #6b7280;
                }
                
                .step-action {
                    padding: 0.5rem 1rem;
                    background: #2563eb;
                    color: white;
                    text-decoration: none;
                    border-radius: 0.5rem;
                    font-size: 0.875rem;
                    font-weight: 500;
                    transition: background 0.2s;
                }
                
                .step-action:hover {
                    background: #1d4ed8;
                }
                
                .modal-footer {
                    padding: 1rem 2rem 2rem;
                    text-align: center;
                }
                
                .start-learning-btn {
                    padding: 0.75rem 2rem;
                    background: linear-gradient(135deg, #2563eb, #7c3aed);
                    color: white;
                    border: none;
                    border-radius: 0.75rem;
                    font-weight: 600;
                    font-size: 1rem;
                    cursor: pointer;
                    transition: transform 0.2s;
                }
                
                .start-learning-btn:hover {
                    transform: translateY(-1px);
                }
            </style>
        `;

        modal.insertAdjacentHTML('afterbegin', modalStyles);
        return modal;
    }

    getDifficultyText(difficulty) {
        const difficultyMap = {
            'beginner': '初级',
            'intermediate': '中级',
            'advanced': '高级'
        };
        return difficultyMap[difficulty] || '初级';
    }

    // Interactive elements
    setupInteractiveElements() {
        // Layer hover effects in architecture diagram
        const layers = document.querySelectorAll('.layer');
        layers.forEach(layer => {
            layer.addEventListener('mouseenter', () => {
                this.highlightRelatedConcepts(layer);
            });
            
            layer.addEventListener('mouseleave', () => {
                this.removeHighlights();
            });
        });

        // Concept card interactions
        const conceptCards = document.querySelectorAll('.concept-card');
        conceptCards.forEach(card => {
            card.addEventListener('click', () => {
                this.showConceptPreview(card);
            });
        });

        // Quick nav card hover effects
        const quickNavCards = document.querySelectorAll('.quick-nav-card');
        quickNavCards.forEach(card => {
            card.addEventListener('mouseenter', () => {
                card.style.transform = 'translateY(-8px) scale(1.02)';
            });
            
            card.addEventListener('mouseleave', () => {
                card.style.transform = 'translateY(0) scale(1)';
            });
        });
    }

    highlightRelatedConcepts(layer) {
        const layerType = layer.className.split(' ')[1]; // e.g., 'layer-domain'
        
        // Add highlight effect to related concept cards
        const relatedConcepts = this.getRelatedConcepts(layerType);
        relatedConcepts.forEach(conceptClass => {
            const card = document.querySelector(`.concept-card.${conceptClass}`);
            if (card) {
                card.classList.add('highlighted');
            }
        });
    }

    removeHighlights() {
        document.querySelectorAll('.highlighted').forEach(element => {
            element.classList.remove('highlighted');
        });
    }

    getRelatedConcepts(layerType) {
        const conceptMapping = {
            'layer-presentation': ['controllers'],
            'layer-application': ['commands', 'queries'],
            'layer-domain': ['value-objects', 'entities', 'aggregates', 'events'],
            'layer-infrastructure': []
        };
        return conceptMapping[layerType] || [];
    }

    showConceptPreview(card) {
        const concept = card.querySelector('h3').textContent;
        const description = card.querySelector('p').textContent;
        
        this.showNotification(`${concept}: ${description}`, 'info', 3000);
    }

    // Progress tracking
    setupProgressTracking() {
        this.progress = this.loadProgress();
        this.updateProgressDisplay();
    }

    loadProgress() {
        const saved = localStorage.getItem('ddd-learning-progress');
        return saved ? JSON.parse(saved) : {
            visitedPages: [],
            completedSections: [],
            currentPath: null,
            startDate: new Date().toISOString()
        };
    }

    saveProgress() {
        localStorage.setItem('ddd-learning-progress', JSON.stringify(this.progress));
    }

    trackPageVisit(page) {
        if (!this.progress.visitedPages.includes(page)) {
            this.progress.visitedPages.push(page);
            this.saveProgress();
            this.updateProgressDisplay();
        }
    }

    updateProgressDisplay() {
        const progressElement = document.querySelector('.progress-indicator');
        if (progressElement) {
            const totalPages = 20; // Approximate total pages
            const visitedPages = this.progress.visitedPages.length;
            const percentage = Math.round((visitedPages / totalPages) * 100);
            
            progressElement.innerHTML = `
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${percentage}%"></div>
                </div>
                <span class="progress-text">学习进度: ${percentage}%</span>
            `;
        }
    }

    // Animation setup
    setupAnimations() {
        // Intersection Observer for fade-in animations
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in-up');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe elements for animation
        document.querySelectorAll('.quick-nav-card, .concept-card, .learning-path, .tool-card').forEach(el => {
            observer.observe(el);
        });

        // Stagger animations for concept cards
        const conceptCards = document.querySelectorAll('.concept-card');
        conceptCards.forEach((card, index) => {
            card.style.animationDelay = `${index * 0.1}s`;
        });
    }

    // Notification system
    showNotification(message, type = 'info', duration = 5000) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${this.getNotificationIcon(type)}</span>
                <span class="notification-message">${message}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add notification styles if not already present
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    max-width: 400px;
                    background: white;
                    border-radius: 0.5rem;
                    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
                    border-left: 4px solid;
                    z-index: 10000;
                    transform: translateX(100%);
                    transition: transform 0.3s ease;
                }
                
                .notification.show {
                    transform: translateX(0);
                }
                
                .notification-info {
                    border-left-color: #3b82f6;
                }
                
                .notification-success {
                    border-left-color: #10b981;
                }
                
                .notification-warning {
                    border-left-color: #f59e0b;
                }
                
                .notification-error {
                    border-left-color: #ef4444;
                }
                
                .notification-content {
                    display: flex;
                    align-items: center;
                    padding: 1rem;
                    gap: 0.75rem;
                }
                
                .notification-icon {
                    font-size: 1.25rem;
                }
                
                .notification-message {
                    flex: 1;
                    color: #374151;
                    font-size: 0.875rem;
                    line-height: 1.4;
                }
                
                .notification-close {
                    background: none;
                    border: none;
                    font-size: 1.25rem;
                    color: #9ca3af;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 0.5rem;
                }
                
                .notification-close:hover {
                    color: #374151;
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Animate in
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);

        // Setup close functionality
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => {
            this.hideNotification(notification);
        });

        // Auto-hide after duration
        setTimeout(() => {
            this.hideNotification(notification);
        }, duration);
    }

    hideNotification(notification) {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }

    getNotificationIcon(type) {
        const icons = {
            'info': 'ℹ️',
            'success': '✅',
            'warning': '⚠️',
            'error': '❌'
        };
        return icons[type] || icons.info;
    }

    // Search functionality
    setupSearch() {
        const searchInput = document.querySelector('.search-input');
        const searchResults = document.querySelector('.search-results');
        
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.performSearch(e.target.value);
                }, 300);
            });
        }
    }

    performSearch(query) {
        if (query.length < 2) return;
        
        // This would typically make an API call
        // For now, we'll search through static content
        const results = this.searchContent(query);
        this.displaySearchResults(results);
    }

    searchContent(query) {
        // Mock search results - in a real implementation, this would search through all content
        const mockResults = [
            { title: '值对象', url: 'concepts/value-objects.html', excerpt: '不可变的值，完全由其属性定义...' },
            { title: '实体', url: 'concepts/entities.html', excerpt: '有身份的对象，可以跟踪变化...' },
            { title: '聚合', url: 'concepts/aggregates.html', excerpt: '一致性边界，管理相关对象...' }
        ];
        
        return mockResults.filter(result => 
            result.title.toLowerCase().includes(query.toLowerCase()) ||
            result.excerpt.toLowerCase().includes(query.toLowerCase())
        );
    }

    displaySearchResults(results) {
        const searchResults = document.querySelector('.search-results');
        if (!searchResults) return;
        
        if (results.length === 0) {
            searchResults.innerHTML = '<p class="no-results">未找到相关内容</p>';
            return;
        }
        
        searchResults.innerHTML = results.map(result => `
            <div class="search-result">
                <h4><a href="${result.url}">${result.title}</a></h4>
                <p>${result.excerpt}</p>
            </div>
        `).join('');
    }
}

// Initialize the website when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dddWebsite = new DDDWebsite();
});

// Track page visits for progress
window.addEventListener('load', () => {
    if (window.dddWebsite) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        window.dddWebsite.trackPageVisit(currentPage);
    }
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + K for search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.querySelector('.search-input');
        if (searchInput) {
            searchInput.focus();
        }
    }
    
    // Escape to close modals
    if (e.key === 'Escape') {
        const activeModal = document.querySelector('.recommendation-modal.active');
        if (activeModal) {
            activeModal.querySelector('.modal-close').click();
        }
    }
});

// Export for global access
window.DDDWebsite = DDDWebsite;