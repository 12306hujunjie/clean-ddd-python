/**
 * Knowledge Map Manager - Interactive DDD Concepts Visualization
 * Creates an interactive network graph of DDD concepts and their relationships
 */

class KnowledgeMapManager {
  constructor () {
    this.canvas = null
    this.ctx = null
    this.concepts = []
    this.relationships = []
    this.selectedConcept = null
    this.hoveredConcept = null
    this.isDragging = false
    this.dragOffset = { x: 0, y: 0 }
    this.zoom = 1
    this.pan = { x: 0, y: 0 }
    this.filters = {
      difficulty: 'all',
      domain: 'all'
    }

    // Animation properties
    this.animationId = null
    this.isAnimating = false

    // Physics simulation
    this.simulation = {
      enabled: true,
      damping: 0.9,
      repulsion: 500,
      attraction: 0.01
    }

    this.setupCanvas()
    this.setupControls()
    this.setupEventListeners()
  }

  /**
     * Initialize the knowledge map
     */
  initialize () {
    if (!this.canvas) {
      console.error('Knowledge map canvas not found')
      return
    }

    console.log('🗺️ Initializing Knowledge Map...')

    // Setup canvas dimensions
    this.resizeCanvas()

    // Start render loop
    this.startRenderLoop()

    // Show loading state
    this.showLoading()
  }

  /**
     * Setup canvas element
     */
  setupCanvas () {
    this.canvas = document.getElementById('knowledge-map-canvas')
    if (!this.canvas) {
      // Create canvas if it doesn't exist
      const container = document.querySelector('.map-canvas')
      if (container) {
        this.canvas = document.createElement('canvas')
        this.canvas.id = 'knowledge-map-canvas'
        this.canvas.style.width = '100%'
        this.canvas.style.height = '600px'
        this.canvas.style.border = '1px solid var(--border-color)'
        this.canvas.style.borderRadius = 'var(--border-radius-lg)'

        // Clear loading content
        container.innerHTML = ''
        container.appendChild(this.canvas)
      }
    }

    if (this.canvas) {
      this.ctx = this.canvas.getContext('2d')

      // Set up high DPI support
      const dpr = window.devicePixelRatio || 1
      const rect = this.canvas.getBoundingClientRect()

      this.canvas.width = rect.width * dpr
      this.canvas.height = rect.height * dpr

      this.ctx.scale(dpr, dpr)
      this.canvas.style.width = rect.width + 'px'
      this.canvas.style.height = rect.height + 'px'
    }
  }

  /**
     * Setup map controls
     */
  setupControls () {
    // Difficulty filter
    const difficultyFilter = document.getElementById('difficulty-filter')
    if (difficultyFilter) {
      difficultyFilter.addEventListener('change', (e) => {
        this.filters.difficulty = e.target.value
        this.applyFilters()
      })
    }

    // Domain filter
    const domainFilter = document.getElementById('domain-filter')
    if (domainFilter) {
      domainFilter.addEventListener('change', (e) => {
        this.filters.domain = e.target.value
        this.applyFilters()
      })
    }

    // Reset button
    const resetButton = document.getElementById('reset-map')
    if (resetButton) {
      resetButton.addEventListener('click', () => {
        this.resetView()
      })
    }

    // Close panel button
    const closePanelButton = document.getElementById('close-panel')
    if (closePanelButton) {
      closePanelButton.addEventListener('click', () => {
        this.closeDetailPanel()
      })
    }
  }

  /**
     * Setup event listeners for canvas interactions
     */
  setupEventListeners () {
    if (!this.canvas) return

    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this))
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this))
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this))
    this.canvas.addEventListener('click', this.handleClick.bind(this))

    // Wheel event for zooming
    this.canvas.addEventListener('wheel', this.handleWheel.bind(this))

    // Touch events for mobile
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this))
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this))
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this))

    // Keyboard events
    document.addEventListener('keydown', this.handleKeyDown.bind(this))

    // Resize event
    window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250))
  }

  /**
     * Set concepts data from external source
     */
  setConceptsData (data) {
    this.concepts = this.processConceptsData(data.concepts || [])
    this.relationships = data.relationships || []

    // Position concepts using force-directed layout
    this.positionConcepts()

    // Hide loading state
    this.hideLoading()

    console.log(`✅ Loaded ${this.concepts.length} concepts and ${this.relationships.length} relationships`)
  }

  /**
     * Process raw concepts data into renderable format
     */
  processConceptsData (rawConcepts) {
    const centerX = this.canvas ? this.canvas.width / 2 : 400
    const centerY = this.canvas ? this.canvas.height / 2 : 300

    return rawConcepts.map((concept, index) => ({
      ...concept,
      x: centerX + (Math.random() - 0.5) * 200,
      y: centerY + (Math.random() - 0.5) * 200,
      vx: 0,
      vy: 0,
      radius: this.getConceptRadius(concept.difficulty),
      color: this.getConceptColor(concept.difficulty),
      visible: true,
      alpha: 1
    }))
  }

  /**
     * Get concept radius based on difficulty
     */
  getConceptRadius (difficulty) {
    switch (difficulty) {
      case 'beginner': return 25
      case 'intermediate': return 35
      case 'advanced': return 45
      default: return 30
    }
  }

  /**
     * Get concept color based on difficulty
     */
  getConceptColor (difficulty) {
    switch (difficulty) {
      case 'beginner': return '#10b981' // Green
      case 'intermediate': return '#f59e0b' // Orange
      case 'advanced': return '#ef4444' // Red
      default: return '#6b7280' // Gray
    }
  }

  /**
     * Position concepts using force-directed layout
     */
  positionConcepts () {
    if (this.concepts.length === 0) return

    // Initial positioning in a circle
    const centerX = this.canvas.width / (2 * (window.devicePixelRatio || 1))
    const centerY = this.canvas.height / (2 * (window.devicePixelRatio || 1))
    const radius = Math.min(centerX, centerY) * 0.6

    this.concepts.forEach((concept, index) => {
      const angle = (index / this.concepts.length) * 2 * Math.PI
      concept.x = centerX + Math.cos(angle) * radius
      concept.y = centerY + Math.sin(angle) * radius
    })

    // Run physics simulation for natural positioning
    if (this.simulation.enabled) {
      this.runPhysicsSimulation(100) // 100 iterations
    }
  }

  /**
     * Run physics simulation for concept positioning
     */
  runPhysicsSimulation (iterations) {
    for (let i = 0; i < iterations; i++) {
      // Apply repulsion forces between concepts
      for (let j = 0; j < this.concepts.length; j++) {
        for (let k = j + 1; k < this.concepts.length; k++) {
          const concept1 = this.concepts[j]
          const concept2 = this.concepts[k]

          const dx = concept2.x - concept1.x
          const dy = concept2.y - concept1.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance > 0) {
            const force = this.simulation.repulsion / (distance * distance)
            const fx = (dx / distance) * force
            const fy = (dy / distance) * force

            concept1.vx -= fx
            concept1.vy -= fy
            concept2.vx += fx
            concept2.vy += fy
          }
        }
      }

      // Apply attraction forces for connected concepts
      this.relationships.forEach(rel => {
        const concept1 = this.concepts.find(c => c.id === rel.from)
        const concept2 = this.concepts.find(c => c.id === rel.to)

        if (concept1 && concept2) {
          const dx = concept2.x - concept1.x
          const dy = concept2.y - concept1.y
          const distance = Math.sqrt(dx * dx + dy * dy)

          if (distance > 0) {
            const force = distance * this.simulation.attraction
            const fx = (dx / distance) * force
            const fy = (dy / distance) * force

            concept1.vx += fx
            concept1.vy += fy
            concept2.vx -= fx
            concept2.vy -= fy
          }
        }
      })

      // Update positions and apply damping
      this.concepts.forEach(concept => {
        concept.x += concept.vx
        concept.y += concept.vy
        concept.vx *= this.simulation.damping
        concept.vy *= this.simulation.damping

        // Keep concepts within bounds
        const padding = concept.radius + 10
        const width = this.canvas.width / (window.devicePixelRatio || 1)
        const height = this.canvas.height / (window.devicePixelRatio || 1)

        concept.x = Math.max(padding, Math.min(width - padding, concept.x))
        concept.y = Math.max(padding, Math.min(height - padding, concept.y))
      })
    }
  }

  /**
     * Start the render loop
     */
  startRenderLoop () {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId)
    }

    const render = () => {
      this.render()
      this.animationId = requestAnimationFrame(render)
    }

    render()
  }

  /**
     * Main render function
     */
  render () {
    if (!this.ctx || !this.canvas) return

    // Clear canvas
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)

    // Apply transformations
    this.ctx.save()
    this.ctx.translate(this.pan.x, this.pan.y)
    this.ctx.scale(this.zoom, this.zoom)

    // Render relationships first (behind concepts)
    this.renderRelationships()

    // Render concepts
    this.renderConcepts()

    // Render labels
    this.renderLabels()

    this.ctx.restore()

    // Render UI elements (zoom controls, etc.)
    this.renderUI()
  }

  /**
     * Render concept relationships
     */
  renderRelationships () {
    this.ctx.strokeStyle = 'rgba(156, 163, 175, 0.5)' // Gray-400 with transparency
    this.ctx.lineWidth = 2

    this.relationships.forEach(rel => {
      const concept1 = this.concepts.find(c => c.id === rel.from)
      const concept2 = this.concepts.find(c => c.id === rel.to)

      if (concept1 && concept2 && concept1.visible && concept2.visible) {
        // Calculate connection points on circle edges
        const dx = concept2.x - concept1.x
        const dy = concept2.y - concept1.y
        const distance = Math.sqrt(dx * dx + dy * dy)

        if (distance > 0) {
          const startX = concept1.x + (dx / distance) * concept1.radius
          const startY = concept1.y + (dy / distance) * concept1.radius
          const endX = concept2.x - (dx / distance) * concept2.radius
          const endY = concept2.y - (dy / distance) * concept2.radius

          this.ctx.beginPath()
          this.ctx.moveTo(startX, startY)
          this.ctx.lineTo(endX, endY)
          this.ctx.stroke()

          // Draw arrow
          this.drawArrow(endX, endY, Math.atan2(dy, dx))
        }
      }
    })
  }

  /**
     * Draw arrow at the end of relationships
     */
  drawArrow (x, y, angle) {
    const arrowLength = 10
    const arrowAngle = Math.PI / 6

    this.ctx.beginPath()
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(
      x - arrowLength * Math.cos(angle - arrowAngle),
      y - arrowLength * Math.sin(angle - arrowAngle)
    )
    this.ctx.moveTo(x, y)
    this.ctx.lineTo(
      x - arrowLength * Math.cos(angle + arrowAngle),
      y - arrowLength * Math.sin(angle + arrowAngle)
    )
    this.ctx.stroke()
  }

  /**
     * Render concept nodes
     */
  renderConcepts () {
    this.concepts.forEach(concept => {
      if (!concept.visible) return

      // Determine visual state
      const isSelected = this.selectedConcept === concept
      const isHovered = this.hoveredConcept === concept

      // Apply alpha
      this.ctx.globalAlpha = concept.alpha

      // Draw concept circle
      this.ctx.beginPath()
      this.ctx.arc(concept.x, concept.y, concept.radius, 0, 2 * Math.PI)

      // Fill
      if (isSelected) {
        this.ctx.fillStyle = concept.color
      } else if (isHovered) {
        this.ctx.fillStyle = this.lightenColor(concept.color, 0.2)
      } else {
        this.ctx.fillStyle = this.transparentColor(concept.color, 0.8)
      }
      this.ctx.fill()

      // Stroke
      this.ctx.strokeStyle = concept.color
      this.ctx.lineWidth = isSelected ? 4 : isHovered ? 3 : 2
      this.ctx.stroke()

      // Add glow effect for selected/hovered
      if (isSelected || isHovered) {
        this.ctx.shadowColor = concept.color
        this.ctx.shadowBlur = 15
        this.ctx.beginPath()
        this.ctx.arc(concept.x, concept.y, concept.radius, 0, 2 * Math.PI)
        this.ctx.stroke()
        this.ctx.shadowBlur = 0
      }
    })

    this.ctx.globalAlpha = 1
  }

  /**
     * Render concept labels
     */
  renderLabels () {
    this.ctx.font = '14px Inter, sans-serif'
    this.ctx.textAlign = 'center'
    this.ctx.textBaseline = 'middle'

    this.concepts.forEach(concept => {
      if (!concept.visible) return

      // Main label
      this.ctx.fillStyle = 'var(--text-primary)'
      this.ctx.fillText(concept.name, concept.x, concept.y)

      // Difficulty indicator
      this.ctx.font = '10px Inter, sans-serif'
      this.ctx.fillStyle = concept.color
      this.ctx.fillText(
        concept.difficulty.toUpperCase(),
        concept.x,
        concept.y + concept.radius + 15
      )

      this.ctx.font = '14px Inter, sans-serif'
    })
  }

  /**
     * Render UI elements
     */
  renderUI () {
    // Zoom level indicator
    this.ctx.font = '12px monospace'
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)'
    this.ctx.textAlign = 'right'
    this.ctx.textBaseline = 'top'
    this.ctx.fillText(
            `Zoom: ${(this.zoom * 100).toFixed(0)}%`,
            this.canvas.width / (window.devicePixelRatio || 1) - 10,
            10
    )
  }

  /**
     * Handle mouse down events
     */
  handleMouseDown (event) {
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const concept = this.getConceptAtPosition(x, y)
    if (concept) {
      this.isDragging = true
      this.dragOffset.x = x - concept.x
      this.dragOffset.y = y - concept.y
      this.selectedConcept = concept
    }
  }

  /**
     * Handle mouse move events
     */
  handleMouseMove (event) {
    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    if (this.isDragging && this.selectedConcept) {
      // Update concept position
      this.selectedConcept.x = x - this.dragOffset.x
      this.selectedConcept.y = y - this.dragOffset.y
    } else {
      // Update hovered concept
      this.hoveredConcept = this.getConceptAtPosition(x, y)
      this.canvas.style.cursor = this.hoveredConcept ? 'pointer' : 'default'
    }
  }

  /**
     * Handle mouse up events
     */
  handleMouseUp (event) {
    this.isDragging = false
  }

  /**
     * Handle click events
     */
  handleClick (event) {
    if (this.isDragging) return

    const rect = this.canvas.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top

    const concept = this.getConceptAtPosition(x, y)
    if (concept) {
      this.selectConcept(concept)
    } else {
      this.selectedConcept = null
      this.closeDetailPanel()
    }
  }

  /**
     * Handle wheel events for zooming
     */
  handleWheel (event) {
    event.preventDefault()

    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1
    const newZoom = Math.max(0.5, Math.min(2, this.zoom * zoomFactor))

    // Calculate zoom center
    const rect = this.canvas.getBoundingClientRect()
    const centerX = event.clientX - rect.left
    const centerY = event.clientY - rect.top

    // Update zoom and pan to zoom towards cursor
    this.pan.x = centerX - (centerX - this.pan.x) * (newZoom / this.zoom)
    this.pan.y = centerY - (centerY - this.pan.y) * (newZoom / this.zoom)
    this.zoom = newZoom
  }

  /**
     * Get concept at position
     */
  getConceptAtPosition (x, y) {
    // Transform coordinates to account for zoom and pan
    const transformedX = (x - this.pan.x) / this.zoom
    const transformedY = (y - this.pan.y) / this.zoom

    return this.concepts.find(concept => {
      if (!concept.visible) return false

      const dx = transformedX - concept.x
      const dy = transformedY - concept.y
      const distance = Math.sqrt(dx * dx + dy * dy)

      return distance <= concept.radius
    })
  }

  /**
     * Select a concept and show details
     */
  selectConcept (concept) {
    this.selectedConcept = concept
    this.showConceptDetails(concept)
    this.focusOnConcept(concept)
  }

  /**
     * Focus on a specific concept
     */
  focusOnConcept (conceptId) {
    const concept = typeof conceptId === 'string'
      ? this.concepts.find(c => c.id === conceptId)
      : conceptId

    if (!concept) return

    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1)
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1)

    // Calculate target position (center the concept)
    const targetX = canvasWidth / 2 - concept.x * this.zoom
    const targetY = canvasHeight / 2 - concept.y * this.zoom

    // Smooth animation to target position
    this.animatePan(targetX, targetY)
  }

  /**
     * Animate pan to target position
     */
  animatePan (targetX, targetY) {
    const startX = this.pan.x
    const startY = this.pan.y
    const duration = 500 // ms
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function
      const easeOut = 1 - Math.pow(1 - progress, 3)

      this.pan.x = startX + (targetX - startX) * easeOut
      this.pan.y = startY + (targetY - startY) * easeOut

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  /**
     * Show concept details in panel
     */
  showConceptDetails (concept) {
    const panel = document.getElementById('concept-detail-panel')
    const title = document.getElementById('concept-title')
    const difficulty = document.getElementById('concept-difficulty')
    const category = document.getElementById('concept-category')
    const description = document.getElementById('concept-description')
    const links = document.getElementById('concept-links')

    if (panel && title && difficulty && category && description && links) {
      title.textContent = concept.name
      difficulty.textContent = concept.difficulty
      difficulty.className = `concept-difficulty ${concept.difficulty}`
      category.textContent = concept.category
      description.textContent = concept.description

      // Generate related links
      const relatedConcepts = this.getRelatedConcepts(concept)
      links.innerHTML = relatedConcepts.length > 0
        ? `<h5>Related Concepts:</h5>
                   <ul>${relatedConcepts.map(c => `<li><a href="#" data-concept="${c.id}">${c.name}</a></li>`).join('')}</ul>`
        : '<p>No related concepts found.</p>'

      // Show panel
      panel.classList.add('active')

      // Setup related concept links
      links.querySelectorAll('[data-concept]').forEach(link => {
        link.addEventListener('click', (e) => {
          e.preventDefault()
          const conceptId = e.target.dataset.concept
          this.focusOnConcept(conceptId)
        })
      })
    }
  }

  /**
     * Get concepts related to the given concept
     */
  getRelatedConcepts (concept) {
    const related = []

    this.relationships.forEach(rel => {
      if (rel.from === concept.id) {
        const target = this.concepts.find(c => c.id === rel.to)
        if (target) related.push(target)
      } else if (rel.to === concept.id) {
        const source = this.concepts.find(c => c.id === rel.from)
        if (source) related.push(source)
      }
    })

    return related
  }

  /**
     * Close concept detail panel
     */
  closeDetailPanel () {
    const panel = document.getElementById('concept-detail-panel')
    if (panel) {
      panel.classList.remove('active')
    }
    this.selectedConcept = null
  }

  /**
     * Apply current filters to concepts
     */
  applyFilters () {
    let visibleCount = 0

    this.concepts.forEach(concept => {
      let visible = true

      // Difficulty filter
      if (this.filters.difficulty !== 'all' && concept.difficulty !== this.filters.difficulty) {
        visible = false
      }

      // Domain filter
      if (this.filters.domain !== 'all' && concept.category !== this.filters.domain) {
        visible = false
      }

      concept.visible = visible
      if (visible) visibleCount++
    })

    console.log(`🔍 Filtered to ${visibleCount} visible concepts`)

    // Animate visibility changes
    this.animateFilterChange()
  }

  /**
     * Animate filter changes
     */
  animateFilterChange () {
    this.concepts.forEach(concept => {
      const targetAlpha = concept.visible ? 1 : 0
      this.animateProperty(concept, 'alpha', targetAlpha, 300)
    })
  }

  /**
     * Animate a property of an object
     */
  animateProperty (object, property, targetValue, duration) {
    const startValue = object[property]
    const startTime = performance.now()

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      const easeOut = 1 - Math.pow(1 - progress, 3)
      object[property] = startValue + (targetValue - startValue) * easeOut

      if (progress < 1) {
        requestAnimationFrame(animate)
      }
    }

    requestAnimationFrame(animate)
  }

  /**
     * Reset view to default state
     */
  resetView () {
    // Reset zoom and pan
    this.zoom = 1
    this.pan = { x: 0, y: 0 }

    // Clear filters
    this.filters.difficulty = 'all'
    this.filters.domain = 'all'

    // Update filter controls
    const difficultyFilter = document.getElementById('difficulty-filter')
    const domainFilter = document.getElementById('domain-filter')

    if (difficultyFilter) difficultyFilter.value = 'all'
    if (domainFilter) domainFilter.value = 'all'

    // Apply filters
    this.applyFilters()

    // Reposition concepts
    this.positionConcepts()

    // Close detail panel
    this.closeDetailPanel()

    console.log('🔄 Knowledge map reset to default view')
  }

  /**
     * Show loading state
     */
  showLoading () {
    const loadingElement = document.querySelector('.map-loading')
    if (loadingElement) {
      loadingElement.style.display = 'flex'
    }
  }

  /**
     * Hide loading state
     */
  hideLoading () {
    const loadingElement = document.querySelector('.map-loading')
    if (loadingElement) {
      loadingElement.style.display = 'none'
    }
  }

  /**
     * Handle canvas resize
     */
  handleResize () {
    this.resizeCanvas()
    this.positionConcepts()
  }

  /**
     * Resize canvas to fit container
     */
  resizeCanvas () {
    if (!this.canvas) return

    const container = this.canvas.parentElement
    if (container) {
      const rect = container.getBoundingClientRect()
      const dpr = window.devicePixelRatio || 1

      this.canvas.width = rect.width * dpr
      this.canvas.height = Math.max(600, rect.height) * dpr

      this.ctx.scale(dpr, dpr)
      this.canvas.style.width = rect.width + 'px'
      this.canvas.style.height = Math.max(600, rect.height) + 'px'
    }
  }

  /**
     * Handle keyboard shortcuts
     */
  handleKeyDown (event) {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'SELECT') {
      return // Don't handle shortcuts when user is typing
    }

    switch (event.key) {
      case 'r':
      case 'R':
        this.resetView()
        break
      case 'Escape':
        this.closeDetailPanel()
        break
      case '=':
      case '+':
        this.zoom = Math.min(2, this.zoom * 1.1)
        break
      case '-':
        this.zoom = Math.max(0.5, this.zoom * 0.9)
        break
    }
  }

  /**
     * Touch event handlers for mobile support
     */
  handleTouchStart (event) {
    event.preventDefault()
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      const rect = this.canvas.getBoundingClientRect()
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top

      this.handleMouseDown({ clientX: touch.clientX, clientY: touch.clientY })
    }
  }

  handleTouchMove (event) {
    event.preventDefault()
    if (event.touches.length === 1) {
      const touch = event.touches[0]
      this.handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY })
    }
  }

  handleTouchEnd (event) {
    event.preventDefault()
    this.handleMouseUp(event)
  }

  /**
     * Utility functions
     */
  lightenColor (color, amount) {
    // Simple color lightening - in production, use a proper color library
    const hex = color.replace('#', '')
    const r = Math.min(255, parseInt(hex.substr(0, 2), 16) + amount * 255)
    const g = Math.min(255, parseInt(hex.substr(2, 2), 16) + amount * 255)
    const b = Math.min(255, parseInt(hex.substr(4, 2), 16) + amount * 255)

    return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`
  }

  transparentColor (color, alpha) {
    const hex = color.replace('#', '')
    const r = parseInt(hex.substr(0, 2), 16)
    const g = parseInt(hex.substr(2, 2), 16)
    const b = parseInt(hex.substr(4, 2), 16)

    return `rgba(${r}, ${g}, ${b}, ${alpha})`
  }

  debounce (func, wait) {
    let timeout
    return function executedFunction (...args) {
      const later = () => {
        clearTimeout(timeout)
        func(...args)
      }
      clearTimeout(timeout)
      timeout = setTimeout(later, wait)
    }
  }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
  window.KnowledgeMapManager = KnowledgeMapManager
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = KnowledgeMapManager
}
