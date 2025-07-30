/**
 * Learning Path Manager - Personalized Learning Journey System
 * Manages adaptive learning paths, progress tracking, and skill assessment
 */

class LearningPathManager {
    constructor() {
        this.currentPath = 'beginner';
        this.userLevel = null;
        this.pathData = {};
        this.progress = {
            totalSteps: 0,
            completedSteps: 0,
            currentStep: 0,
            startDate: null,
            lastActivity: null
        };
        
        // Progress persistence
        this.storageKey = 'ddd-learning-progress';
        
        this.setupPathSelector();
        this.loadProgress();
    }

    /**
     * Initialize the learning path system
     */
    initialize() {
        console.log('📚 Initializing Learning Path Manager...');
        
        // Show current path
        this.showPath(this.currentPath);
        
        // Update progress display
        this.updateProgressDisplay();
        
        // Setup event listeners
        this.setupEventListeners();
        
        console.log('✅ Learning Path Manager initialized');
    }

    /**
     * Setup path selector tabs
     */
    setupPathSelector() {
        const pathTabs = document.querySelectorAll('.path-tab');
        
        pathTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const pathType = tab.dataset.path;
                this.selectPath(pathType);
                
                // Update active tab
                pathTabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
            });
        });
    }

    /**
     * Setup additional event listeners
     */
    setupEventListeners() {
        // Listen for step completion events
        document.addEventListener('click', (event) => {
            if (event.target.closest('.step-item')) {
                const stepElement = event.target.closest('.step-item');
                const stepId = parseInt(stepElement.dataset.stepId);
                
                if (stepId) {
                    this.toggleStepCompletion(stepId);
                }
            }
        });

        // Listen for path assessment events
        document.addEventListener('click', (event) => {
            if (event.target.matches('[data-action="assess-level"]')) {
                this.startLevelAssessment();
            }
            
            if (event.target.matches('[data-action="reset-progress"]')) {
                this.resetProgress();
            }
            
            if (event.target.matches('[data-action="export-progress"]')) {
                this.exportProgress();
            }
        });

        // Auto-save progress periodically
        setInterval(() => {
            this.saveProgress();
        }, 30000); // Save every 30 seconds
    }

    /**
     * Set path data from external source
     */
    setPathData(data) {
        this.pathData = data;
        this.calculateTotalSteps();
        this.updateProgressDisplay();
        
        console.log('📈 Learning path data loaded:', Object.keys(data));
    }

    /**
     * Set user level and recommend appropriate path
     */
    setUserLevel(level) {
        this.userLevel = level;
        
        // Recommend path based on level
        const recommendedPath = this.getRecommendedPath(level);
        if (recommendedPath) {
            this.selectPath(recommendedPath);
        }
        
        console.log(`👤 User level set to: ${level}, recommended path: ${recommendedPath}`);
    }

    /**
     * Get recommended path based on user level
     */
    getRecommendedPath(level) {
        const levelMap = {
            'never-used-ddd': 'beginner',
            'heard-of-ddd': 'beginner', 
            'some-experience': 'intermediate',
            'experienced': 'intermediate',
            'expert': 'expert'
        };
        
        return levelMap[level] || 'beginner';
    }

    /**
     * Select and display a learning path
     */
    selectPath(pathType) {
        this.currentPath = pathType;
        
        // Hide all paths
        document.querySelectorAll('.learning-path').forEach(path => {
            path.classList.remove('active');
        });
        
        // Show selected path
        const selectedPath = document.getElementById(`${pathType}-path`);
        if (selectedPath) {
            selectedPath.classList.add('active');
        }
        
        // Generate timeline for the path
        this.generatePathTimeline(pathType);
        
        // Update progress for current path
        this.updateProgressDisplay();
        
        console.log(`🛤️ Selected learning path: ${pathType}`);
    }

    /**
     * Show a specific path (alias for selectPath)
     */
    showPath(pathType) {
        this.selectPath(pathType);
    }

    /**
     * Generate timeline for a specific path
     */
    generatePathTimeline(pathType) {
        const pathData = this.pathData[pathType];
        if (!pathData) return;
        
        const timelineContainer = document.querySelector(`#${pathType}-path .path-timeline`);
        if (!timelineContainer) return;
        
        // Clear existing content
        timelineContainer.innerHTML = '';
        
        // Generate timeline items
        const steps = pathData.steps || [];
        steps.forEach((step, index) => {
            const stepElement = this.createStepElement(step, index, pathType);
            timelineContainer.appendChild(stepElement);
        });
        
        // Update step states based on progress
        this.updateStepStates(pathType);
    }

    /**
     * Create a step element for the timeline
     */
    createStepElement(step, index, pathType) {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'timeline-item';
        stepDiv.dataset.stepId = step.id;
        stepDiv.dataset.pathType = pathType;
        
        const isCompleted = this.isStepCompleted(step.id);
        const isCurrent = this.isCurrentStep(step.id);
        const isLocked = this.isStepLocked(step.id, index);
        
        stepDiv.innerHTML = `
            <div class="timeline-marker ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}">
                <i class="fas fa-${isCompleted ? 'check' : isLocked ? 'lock' : 'circle'}"></i>
            </div>
            
            <div class="timeline-content">
                <div class="step-header">
                    <h4 class="step-title">${step.title}</h4>
                    <div class="step-meta">
                        <span class="step-duration">
                            <i class="fas fa-clock"></i>
                            ${step.duration}
                        </span>
                        ${step.difficulty ? `<span class="step-difficulty ${step.difficulty}">${step.difficulty}</span>` : ''}
                    </div>
                </div>
                
                ${step.description ? `<p class="step-description">${step.description}</p>` : ''}
                
                <div class="step-actions">
                    ${!isLocked ? `
                        <button class="btn btn-small ${isCompleted ? 'btn-secondary' : 'btn-primary'}" 
                                data-action="toggle-step" data-step-id="${step.id}">
                            <i class="fas fa-${isCompleted ? 'undo' : 'play'}"></i>
                            ${isCompleted ? 'Mark Incomplete' : 'Start Step'}
                        </button>
                    ` : `
                        <button class="btn btn-small btn-disabled" disabled>
                            <i class="fas fa-lock"></i>
                            Locked
                        </button>
                    `}
                    
                    ${step.resources ? `
                        <div class="step-resources">
                            <h5>Resources:</h5>
                            <ul>
                                ${step.resources.map(resource => `
                                    <li><a href="${resource.url}" target="_blank">${resource.title}</a></li>
                                `).join('')}
                            </ul>
                        </div>
                    ` : ''}
                </div>
                
                ${step.prerequisites && step.prerequisites.length > 0 ? `
                    <div class="step-prerequisites">
                        <small><strong>Prerequisites:</strong> ${step.prerequisites.join(', ')}</small>
                    </div>
                ` : ''}
            </div>
        `;
        
        return stepDiv;
    }

    /**
     * Update step states based on current progress
     */
    updateStepStates(pathType) {
        const pathData = this.pathData[pathType];
        if (!pathData) return;
        
        const steps = pathData.steps || [];
        
        steps.forEach((step, index) => {
            const stepElement = document.querySelector(`[data-step-id="${step.id}"]`);
            if (!stepElement) return;
            
            const marker = stepElement.querySelector('.timeline-marker');
            const button = stepElement.querySelector('[data-action="toggle-step"]');
            
            const isCompleted = this.isStepCompleted(step.id);
            const isCurrent = this.isCurrentStep(step.id);
            const isLocked = this.isStepLocked(step.id, index);
            
            // Update marker
            marker.className = `timeline-marker ${isCompleted ? 'completed' : ''} ${isCurrent ? 'current' : ''} ${isLocked ? 'locked' : ''}`;
            marker.innerHTML = `<i class="fas fa-${isCompleted ? 'check' : isLocked ? 'lock' : 'circle'}"></i>`;
            
            // Update button
            if (button) {
                if (isLocked) {
                    button.className = 'btn btn-small btn-disabled';
                    button.disabled = true;
                    button.innerHTML = '<i class="fas fa-lock"></i> Locked';
                } else {
                    button.className = `btn btn-small ${isCompleted ? 'btn-secondary' : 'btn-primary'}`;
                    button.disabled = false;
                    button.innerHTML = `<i class="fas fa-${isCompleted ? 'undo' : 'play'}"></i> ${isCompleted ? 'Mark Incomplete' : 'Start Step'}`;
                }
            }
        });
    }

    /**
     * Toggle step completion status
     */
    toggleStepCompletion(stepId) {
        const pathData = this.pathData[this.currentPath];
        if (!pathData) return;
        
        const step = pathData.steps.find(s => s.id === stepId);
        if (!step) return;
        
        // Check if step is locked
        const stepIndex = pathData.steps.findIndex(s => s.id === stepId);
        if (this.isStepLocked(stepId, stepIndex)) {
            this.showToast('Complete previous steps to unlock this one', 'warning');
            return;
        }
        
        // Toggle completion
        const isCompleted = this.isStepCompleted(stepId);
        if (isCompleted) {
            this.markStepIncomplete(stepId);
        } else {
            this.markStepCompleted(stepId);
        }
        
        // Update display
        this.updateStepStates(this.currentPath);
        this.updateProgressDisplay();
        
        // Save progress
        this.saveProgress();
        
        // Track completion event
        if (!isCompleted) {
            this.trackStepCompletion(stepId, step.title);
        }
    }

    /**
     * Mark a step as completed
     */
    markStepCompleted(stepId) {
        if (!this.progress.completedSteps) {
            this.progress.completedSteps = [];
        }
        
        if (!this.progress.completedSteps.includes(stepId)) {
            this.progress.completedSteps.push(stepId);
            this.progress.lastActivity = new Date().toISOString();
            
            // Update current step to next incomplete step
            this.updateCurrentStep();
            
            console.log(`✅ Step ${stepId} marked as completed`);
            this.showToast('Step completed! Great job! 🎉', 'success');
        }
    }

    /**
     * Mark a step as incomplete
     */
    markStepIncomplete(stepId) {
        if (this.progress.completedSteps) {
            this.progress.completedSteps = this.progress.completedSteps.filter(id => id !== stepId);
            this.updateCurrentStep();
            
            console.log(`↩️ Step ${stepId} marked as incomplete`);
            this.showToast('Step marked as incomplete', 'info');
        }
    }

    /**
     * Check if a step is completed
     */
    isStepCompleted(stepId) {
        return this.progress.completedSteps && this.progress.completedSteps.includes(stepId);
    }

    /**
     * Check if a step is the current step
     */
    isCurrentStep(stepId) {
        return this.progress.currentStep === stepId;
    }

    /**
     * Check if a step is locked (prerequisites not met)
     */
    isStepLocked(stepId, stepIndex) {
        if (stepIndex === 0) return false; // First step is never locked
        
        const pathData = this.pathData[this.currentPath];
        if (!pathData) return true;
        
        // Check if previous step is completed
        const previousStep = pathData.steps[stepIndex - 1];
        if (previousStep && !this.isStepCompleted(previousStep.id)) {
            return true;
        }
        
        // Check specific prerequisites
        const step = pathData.steps.find(s => s.id === stepId);
        if (step && step.prerequisites) {
            for (const prereq of step.prerequisites) {
                const prereqStep = pathData.steps.find(s => s.title === prereq || s.id === prereq);
                if (prereqStep && !this.isStepCompleted(prereqStep.id)) {
                    return true;
                }
            }
        }
        
        return false;
    }

    /**
     * Update current step to next incomplete step
     */
    updateCurrentStep() {
        const pathData = this.pathData[this.currentPath];
        if (!pathData) return;
        
        // Find first incomplete step
        const nextStep = pathData.steps.find(step => !this.isStepCompleted(step.id));
        this.progress.currentStep = nextStep ? nextStep.id : null;
    }

    /**
     * Calculate total steps across all paths
     */
    calculateTotalSteps() {
        let total = 0;
        Object.values(this.pathData).forEach(pathData => {
            if (pathData.steps) {
                total += pathData.steps.length;
            }
        });
        this.progress.totalSteps = total;
    }

    /**
     * Update progress display
     */
    updateProgressDisplay() {
        const progressBar = document.getElementById('learning-progress');
        const progressText = document.getElementById('progress-text');
        const progressPercentage = document.getElementById('progress-percentage');
        
        const completedCount = this.progress.completedSteps ? this.progress.completedSteps.length : 0;
        const currentPathData = this.pathData[this.currentPath];
        const currentPathSteps = currentPathData ? (currentPathData.steps || []).length : 0;
        const currentPathCompleted = currentPathData 
            ? (currentPathData.steps || []).filter(step => this.isStepCompleted(step.id)).length 
            : 0;
        
        // Calculate percentage for current path
        const percentage = currentPathSteps > 0 ? Math.round((currentPathCompleted / currentPathSteps) * 100) : 0;
        
        // Update progress bar
        if (progressBar) {
            progressBar.style.width = `${percentage}%`;
        }
        
        // Update progress text
        if (progressText) {
            if (completedCount === 0) {
                progressText.textContent = '准备开始学习之旅';
            } else if (percentage === 100) {
                progressText.textContent = `🎉 ${this.currentPath} 路径完成！`;
            } else {
                progressText.textContent = `${this.currentPath} 路径进度: ${currentPathCompleted}/${currentPathSteps} 步骤`;
            }
        }
        
        // Update percentage display
        if (progressPercentage) {
            progressPercentage.textContent = `${percentage}%`;
        }
        
        // Update path completion indicators
        this.updatePathCompletionIndicators();
    }

    /**
     * Update path completion indicators on tabs
     */
    updatePathCompletionIndicators() {
        Object.keys(this.pathData).forEach(pathType => {
            const tab = document.querySelector(`[data-path="${pathType}"]`);
            if (!tab) return;
            
            const pathData = this.pathData[pathType];
            const steps = pathData.steps || [];
            const completed = steps.filter(step => this.isStepCompleted(step.id)).length;
            const percentage = steps.length > 0 ? Math.round((completed / steps.length) * 100) : 0;
            
            // Add or update completion indicator
            let indicator = tab.querySelector('.completion-indicator');
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'completion-indicator';
                tab.appendChild(indicator);
            }
            
            indicator.textContent = `${percentage}%`;
            indicator.className = `completion-indicator ${percentage === 100 ? 'completed' : ''}`;
        });
    }

    /**
     * Start level assessment to determine appropriate path
     */
    startLevelAssessment() {
        const assessment = {
            title: '📊 学习水平评估',
            questions: [
                {
                    question: '你对领域驱动设计(DDD)的了解程度？',
                    options: [
                        { value: 'never-heard', text: '从未听说过', weight: 0 },
                        { value: 'heard-of', text: '听说过但不了解', weight: 1 },
                        { value: 'basic-understanding', text: '有基本了解', weight: 2 },
                        { value: 'some-experience', text: '有一些实践经验', weight: 3 },
                        { value: 'experienced', text: '有丰富经验', weight: 4 }
                    ]
                },
                {
                    question: '你的Python编程经验如何？',
                    options: [
                        { value: 'beginner', text: '初学者（<1年）', weight: 0 },
                        { value: 'intermediate', text: '中级（1-3年）', weight: 1 },
                        { value: 'advanced', text: '高级（3-5年）', weight: 2 },
                        { value: 'expert', text: '专家（>5年）', weight: 3 }
                    ]
                },
                {
                    question: '你对软件架构模式的熟悉程度？',
                    options: [
                        { value: 'none', text: '不了解', weight: 0 },
                        { value: 'basic', text: '了解MVC等基础模式', weight: 1 },
                        { value: 'intermediate', text: '熟悉多种架构模式', weight: 2 },
                        { value: 'advanced', text: '深度理解架构设计', weight: 3 }
                    ]
                }
            ]
        };
        
        this.showAssessmentModal(assessment);
    }

    /**
     * Show assessment modal
     */
    showAssessmentModal(assessment) {
        // Create modal HTML
        const modalHTML = `
            <div class="modal-overlay" id="assessment-modal">
                <div class="modal-content assessment-modal">
                    <div class="modal-header">
                        <h3>${assessment.title}</h3>
                        <button class="modal-close" data-action="close-modal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    
                    <div class="modal-body">
                        <form id="assessment-form">
                            ${assessment.questions.map((q, index) => `
                                <div class="question-group">
                                    <h4 class="question-title">${q.question}</h4>
                                    <div class="options-group">
                                        ${q.options.map(option => `
                                            <label class="option-label">
                                                <input type="radio" name="question-${index}" value="${option.weight}" required>
                                                <span class="option-text">${option.text}</span>
                                            </label>
                                        `).join('')}
                                    </div>
                                </div>
                            `).join('')}
                        </form>
                    </div>
                    
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-action="close-modal">
                            取消
                        </button>
                        <button type="submit" form="assessment-form" class="btn btn-primary">
                            获取推荐路径
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        // Add to page
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Setup event listeners
        const modal = document.getElementById('assessment-modal');
        const form = document.getElementById('assessment-form');
        
        // Close modal events
        modal.querySelectorAll('[data-action="close-modal"]').forEach(btn => {
            btn.addEventListener('click', () => {
                this.closeModal('assessment-modal');
            });
        });
        
        // Form submission
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const results = this.calculateAssessmentResults(form);
            this.showAssessmentResults(results);
            this.closeModal('assessment-modal');
        });
        
        // Show modal
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
    }

    /**
     * Calculate assessment results
     */
    calculateAssessmentResults(form) {
        const formData = new FormData(form);
        let totalScore = 0;
        let questionCount = 0;
        
        for (const [key, value] of formData.entries()) {
            totalScore += parseInt(value);
            questionCount++;
        }
        
        const averageScore = totalScore / questionCount;
        
        // Determine recommended path
        let recommendedPath;
        if (averageScore <= 1) {
            recommendedPath = 'beginner';
        } else if (averageScore <= 2.5) {
            recommendedPath = 'intermediate';
        } else {
            recommendedPath = 'expert';
        }
        
        return {
            totalScore,
            averageScore,
            recommendedPath,
            pathName: this.pathData[recommendedPath]?.name || recommendedPath
        };
    }

    /**
     * Show assessment results
     */
    showAssessmentResults(results) {
        const message = `
            <div class="assessment-results">
                <h4>📊 评估结果</h4>
                <p>基于你的回答，我们推荐你选择：</p>
                <div class="recommended-path">
                    <strong>${results.pathName}</strong>
                </div>
                <p>这个路径最适合你的当前水平，将帮助你循序渐进地掌握DDD概念和实践。</p>
                <div class="results-actions">
                    <button class="btn btn-primary" data-action="accept-recommendation" data-path="${results.recommendedPath}">
                        选择推荐路径
                    </button>
                    <button class="btn btn-secondary" data-action="dismiss-results">
                        我自己选择
                    </button>
                </div>
            </div>
        `;
        
        this.showToast(message, 'info', 10000); // Show for 10 seconds
        
        // Handle recommendation acceptance
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action="accept-recommendation"]')) {
                const recommendedPath = e.target.dataset.path;
                this.selectPath(recommendedPath);
                this.setUserLevel(results.averageScore);
                
                // Update tab selection
                document.querySelectorAll('.path-tab').forEach(tab => {
                    tab.classList.toggle('active', tab.dataset.path === recommendedPath);
                });
                
                this.showToast('已为你选择最适合的学习路径！', 'success');
            }
        }, { once: true });
    }

    /**
     * Reset all progress
     */
    resetProgress() {
        if (confirm('确定要重置所有学习进度吗？此操作无法撤销。')) {
            this.progress = {
                totalSteps: 0,
                completedSteps: [],
                currentStep: 0,
                startDate: null,
                lastActivity: null
            };
            
            this.saveProgress();
            this.updateProgressDisplay();
            this.updateStepStates(this.currentPath);
            
            this.showToast('学习进度已重置', 'info');
            console.log('🔄 Learning progress reset');
        }
    }

    /**
     * Export progress data
     */
    exportProgress() {
        const exportData = {
            currentPath: this.currentPath,
            userLevel: this.userLevel,
            progress: this.progress,
            exportDate: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `ddd-learning-progress-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        
        this.showToast('学习进度已导出', 'success');
    }

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem(this.storageKey);
            if (saved) {
                const data = JSON.parse(saved);
                this.progress = { ...this.progress, ...data.progress };
                this.currentPath = data.currentPath || this.currentPath;
                this.userLevel = data.userLevel || this.userLevel;
                
                console.log('📚 Progress loaded from storage');
            }
        } catch (error) {
            console.warn('Failed to load progress:', error);
        }
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        try {
            const data = {
                currentPath: this.currentPath,
                userLevel: this.userLevel,
                progress: this.progress,
                savedAt: new Date().toISOString()
            };
            
            localStorage.setItem(this.storageKey, JSON.stringify(data));
        } catch (error) {
            console.warn('Failed to save progress:', error);
        }
    }

    /**
     * Track step completion for analytics
     */
    trackStepCompletion(stepId, stepTitle) {
        // Analytics tracking would go here
        console.log(`📊 Step completed: ${stepTitle} (${stepId})`);
        
        // Could send to analytics service
        // analytics.track('step_completed', {
        //     stepId,
        //     stepTitle,
        //     path: this.currentPath,
        //     userLevel: this.userLevel
        // });
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = typeof message === 'string' ? message : message;
        
        document.body.appendChild(toast);
        
        // Animate in
        setTimeout(() => toast.classList.add('show'), 10);
        
        // Remove after duration
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    toast.parentNode.removeChild(toast);
                }
            }, 300);
        }, duration);
        
        // Manual close for persistent toasts
        if (duration > 5000) {
            const closeBtn = document.createElement('button');
            closeBtn.className = 'toast-close';
            closeBtn.innerHTML = '&times;';
            closeBtn.addEventListener('click', () => {
                toast.classList.remove('show');
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.parentNode.removeChild(toast);
                    }
                }, 300);
            });
            toast.appendChild(closeBtn);
        }
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('show');
            setTimeout(() => {
                if (modal.parentNode) {
                    modal.parentNode.removeChild(modal);
                }
            }, 300);
        }
    }

    /**
     * Handle resize events
     */
    handleResize() {
        // Update responsive timeline layout if needed
        console.log('📱 Learning path layout updated for resize');
    }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
    window.LearningPathManager = LearningPathManager;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = LearningPathManager;
}