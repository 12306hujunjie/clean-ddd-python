/**
 * Code Examples Manager - Interactive Code Learning System
 * Handles code execution, syntax highlighting, and interactive examples
 */

class CodeExamplesManager {
  constructor () {
    this.currentCategory = 'domain-modeling'
    this.currentFile = 'main'
    this.examplesData = {}
    this.editor = null
    this.isExecuting = false
    this.executionHistory = []

    // Code execution simulation
    this.pythonExecutor = new PythonExecutor()

    this.setupCategorySelector()
    this.setupCodeTabs()
    this.setupActions()
  }

  /**
     * Initialize the code examples system
     */
  initialize () {
    console.log('💻 Initializing Code Examples Manager...')

    // Setup initial category
    this.showCategory(this.currentCategory)

    // Initialize syntax highlighting
    this.initializeSyntaxHighlighting()

    // Setup code editor if available
    this.initializeCodeEditor()

    console.log('✅ Code Examples Manager initialized')
  }

  /**
     * Setup category selector
     */
  setupCategorySelector () {
    const categoryItems = document.querySelectorAll('.category-item')

    categoryItems.forEach(item => {
      item.addEventListener('click', () => {
        const category = item.dataset.category
        if (category) {
          this.selectCategory(category)

          // Update active category
          categoryItems.forEach(i => i.classList.remove('active'))
          item.classList.add('active')
        }
      })
    })
  }

  /**
     * Setup code file tabs
     */
  setupCodeTabs () {
    document.addEventListener('click', (event) => {
      if (event.target.matches('.code-tab')) {
        const file = event.target.dataset.file
        if (file) {
          this.selectFile(file)

          // Update active tab
          document.querySelectorAll('.code-tab').forEach(tab => {
            tab.classList.remove('active')
          })
          event.target.classList.add('active')
        }
      }
    })
  }

  /**
     * Setup action buttons
     */
  setupActions () {
    const runButton = document.getElementById('run-code')
    const copyButton = document.getElementById('copy-code')
    const downloadButton = document.getElementById('download-code')
    const clearButton = document.getElementById('clear-output')

    if (runButton) {
      runButton.addEventListener('click', () => this.runCurrentCode())
    }

    if (copyButton) {
      copyButton.addEventListener('click', () => this.copyCurrentCode())
    }

    if (downloadButton) {
      downloadButton.addEventListener('click', () => this.downloadCurrentCode())
    }

    if (clearButton) {
      clearButton.addEventListener('click', () => this.clearOutput())
    }
  }

  /**
     * Set examples data from external source
     */
  setExamplesData (data) {
    this.examplesData = data
    console.log('💾 Code examples data loaded:', Object.keys(data))

    // Show default category
    this.showCategory(this.currentCategory)
  }

  /**
     * Select and show a category
     */
  selectCategory (category) {
    this.currentCategory = category
    this.currentFile = 'main' // Reset to main file

    this.showCategory(category)
    this.updateActiveFileTab()

    console.log(`📁 Selected category: ${category}`)
  }

  /**
     * Show category content
     */
  showCategory (category) {
    const categoryData = this.examplesData[category]
    if (!categoryData) {
      this.showEmptyState()
      return
    }

    // Update title
    const titleElement = document.getElementById('example-title')
    if (titleElement) {
      titleElement.textContent = categoryData.title || category
    }

    // Update description if available
    if (categoryData.description) {
      let descElement = document.querySelector('.example-description')
      if (!descElement) {
        descElement = document.createElement('p')
        descElement.className = 'example-description'
        titleElement.parentNode.insertBefore(descElement, titleElement.nextSibling)
      }
      descElement.textContent = categoryData.description
    }

    // Update file tabs
    this.updateFileTabs(categoryData.files)

    // Show default file
    this.showFile(this.currentFile)
  }

  /**
     * Update file tabs based on available files
     */
  updateFileTabs (files) {
    const tabsContainer = document.querySelector('.code-tabs')
    if (!tabsContainer || !files) return

    // Clear existing tabs
    tabsContainer.innerHTML = ''

    // Create tabs for each file
    Object.keys(files).forEach(fileName => {
      const tab = document.createElement('button')
      tab.className = `code-tab ${fileName === this.currentFile ? 'active' : ''}`
      tab.dataset.file = fileName
      tab.textContent = this.getFileDisplayName(fileName)

      tabsContainer.appendChild(tab)
    })
  }

  /**
     * Get display name for file
     */
  getFileDisplayName (fileName) {
    const nameMap = {
      main: 'main.py',
      models: 'models.py',
      tests: 'test_' + this.currentCategory.replace('-', '_') + '.py',
      config: 'config.py',
      utils: 'utils.py'
    }

    return nameMap[fileName] || `${fileName}.py`
  }

  /**
     * Select and show a file
     */
  selectFile (fileName) {
    this.currentFile = fileName
    this.showFile(fileName)
    this.updateActiveFileTab()
  }

  /**
     * Show file content
     */
  showFile (fileName) {
    const categoryData = this.examplesData[this.currentCategory]
    if (!categoryData || !categoryData.files || !categoryData.files[fileName]) {
      this.showEmptyCode()
      return
    }

    const code = categoryData.files[fileName]
    this.displayCode(code)

    console.log(`📄 Showing file: ${fileName}`)
  }

  /**
     * Display code in the editor
     */
  displayCode (code) {
    const codeElement = document.getElementById('code-content')
    if (!codeElement) return

    // Update code content
    codeElement.textContent = code

    // Apply syntax highlighting
    this.applySyntaxHighlighting(codeElement)

    // Update editor if available
    if (this.editor) {
      this.editor.setValue(code)
    }
  }

  /**
     * Initialize syntax highlighting
     */
  initializeSyntaxHighlighting () {
    // Use Prism.js if available
    if (typeof Prism !== 'undefined') {
      Prism.highlightAll()
      console.log('🎨 Syntax highlighting initialized with Prism.js')
    } else {
      console.log('⚠️ Prism.js not available, using basic highlighting')
    }
  }

  /**
     * Apply syntax highlighting to code element
     */
  applySyntaxHighlighting (element) {
    if (typeof Prism !== 'undefined') {
      element.className = 'language-python'
      Prism.highlightElement(element)
    } else {
      // Basic highlighting fallback
      this.applyBasicHighlighting(element)
    }
  }

  /**
     * Basic syntax highlighting fallback
     */
  applyBasicHighlighting (element) {
    let code = element.textContent

    // Highlight Python keywords
    const keywords = ['def', 'class', 'if', 'else', 'elif', 'for', 'while', 'try', 'except', 'finally', 'with', 'as', 'import', 'from', 'return', 'yield', 'pass', 'break', 'continue']
    keywords.forEach(keyword => {
      const regex = new RegExp(`\\b${keyword}\\b`, 'g')
      code = code.replace(regex, `<span class="keyword">${keyword}</span>`)
    })

    // Highlight strings
    code = code.replace(/(["'])((?:\\.|(?!\1)[^\\])*?)\1/g, '<span class="string">$1$2$1</span>')

    // Highlight comments
    code = code.replace(/#(.*)$/gm, '<span class="comment">#$1</span>')

    // Highlight numbers
    code = code.replace(/\b(\d+(?:\.\d+)?)\b/g, '<span class="number">$1</span>')

    element.innerHTML = code
  }

  /**
     * Initialize code editor (Monaco, CodeMirror, etc.)
     */
  initializeCodeEditor () {
    // Placeholder for advanced code editor integration
    // This would integrate with Monaco Editor or CodeMirror
    console.log('📝 Code editor integration ready')
  }

  /**
     * Run current code
     */
  async runCurrentCode () {
    if (this.isExecuting) {
      this.showToast('代码正在执行中...', 'warning')
      return
    }

    const categoryData = this.examplesData[this.currentCategory]
    if (!categoryData || !categoryData.files || !categoryData.files[this.currentFile]) {
      this.showToast('没有可执行的代码', 'error')
      return
    }

    const code = categoryData.files[this.currentFile]

    this.isExecuting = true
    this.showExecutionStart()

    try {
      console.log('🏃 Executing code...')
      const result = await this.pythonExecutor.execute(code)
      this.showExecutionResult(result)

      // Add to history
      this.executionHistory.push({
        timestamp: new Date(),
        code,
        result,
        file: this.currentFile,
        category: this.currentCategory
      })
    } catch (error) {
      console.error('Code execution failed:', error)
      this.showExecutionError(error)
    } finally {
      this.isExecuting = false
      this.showExecutionEnd()
    }
  }

  /**
     * Show execution start state
     */
  showExecutionStart () {
    const runButton = document.getElementById('run-code')
    const outputElement = document.getElementById('output-content')

    if (runButton) {
      runButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 执行中...'
      runButton.disabled = true
    }

    if (outputElement) {
      outputElement.innerHTML = `
                <div class="execution-status executing">
                    <i class="fas fa-cog fa-spin"></i>
                    <span>正在执行代码...</span>
                </div>
            `
    }
  }

  /**
     * Show execution result
     */
  showExecutionResult (result) {
    const outputElement = document.getElementById('output-content')
    if (!outputElement) return

    const timestamp = new Date().toLocaleTimeString()

    outputElement.innerHTML = `
            <div class="execution-header">
                <span class="execution-time">${timestamp}</span>
                <span class="execution-status ${result.success ? 'success' : 'error'}">
                    <i class="fas fa-${result.success ? 'check-circle' : 'exclamation-circle'}"></i>
                    ${result.success ? '执行成功' : '执行失败'}
                </span>
            </div>
            
            ${result.output
? `
                <div class="execution-output">
                    <h4>输出:</h4>
                    <pre><code>${this.escapeHtml(result.output)}</code></pre>
                </div>
            `
: ''}
            
            ${result.error
? `
                <div class="execution-error">
                    <h4>错误:</h4>
                    <pre><code class="error">${this.escapeHtml(result.error)}</code></pre>
                </div>
            `
: ''}
            
            ${result.executionTime
? `
                <div class="execution-meta">
                    <small>执行时间: ${result.executionTime.toFixed(2)}ms</small>
                </div>
            `
: ''}
        `
  }

  /**
     * Show execution error
     */
  showExecutionError (error) {
    const outputElement = document.getElementById('output-content')
    if (!outputElement) return

    const timestamp = new Date().toLocaleTimeString()

    outputElement.innerHTML = `
            <div class="execution-header">
                <span class="execution-time">${timestamp}</span>
                <span class="execution-status error">
                    <i class="fas fa-exclamation-triangle"></i>
                    执行异常
                </span>
            </div>
            
            <div class="execution-error">
                <h4>异常信息:</h4>
                <pre><code class="error">${this.escapeHtml(error.message || error)}</code></pre>
            </div>
        `
  }

  /**
     * Show execution end state
     */
  showExecutionEnd () {
    const runButton = document.getElementById('run-code')

    if (runButton) {
      runButton.innerHTML = '<i class="fas fa-play"></i> 运行'
      runButton.disabled = false
    }
  }

  /**
     * Copy current code to clipboard
     */
  async copyCurrentCode () {
    const categoryData = this.examplesData[this.currentCategory]
    if (!categoryData || !categoryData.files || !categoryData.files[this.currentFile]) {
      this.showToast('没有可复制的代码', 'error')
      return
    }

    const code = categoryData.files[this.currentFile]

    try {
      await navigator.clipboard.writeText(code)
      this.showToast('代码已复制到剪贴板', 'success')
      console.log('📋 Code copied to clipboard')
    } catch (error) {
      console.error('Failed to copy code:', error)
      this.showToast('复制失败，请手动选择复制', 'error')
    }
  }

  /**
     * Download current code as file
     */
  downloadCurrentCode () {
    const categoryData = this.examplesData[this.currentCategory]
    if (!categoryData || !categoryData.files || !categoryData.files[this.currentFile]) {
      this.showToast('没有可下载的代码', 'error')
      return
    }

    const code = categoryData.files[this.currentFile]
    const fileName = this.getFileDisplayName(this.currentFile)

    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)

    const a = document.createElement('a')
    a.href = url
    a.download = fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    URL.revokeObjectURL(url)

    this.showToast(`文件 ${fileName} 已下载`, 'success')
    console.log(`💾 Downloaded file: ${fileName}`)
  }

  /**
     * Clear output content
     */
  clearOutput () {
    const outputElement = document.getElementById('output-content')
    if (outputElement) {
      outputElement.innerHTML = `
                <div class="output-placeholder">
                    点击"运行"按钮查看代码执行结果
                </div>
            `
    }

    console.log('🧹 Output cleared')
  }

  /**
     * Show empty state when no category is selected
     */
  showEmptyState () {
    const titleElement = document.getElementById('example-title')
    const codeElement = document.getElementById('code-content')

    if (titleElement) {
      titleElement.textContent = '选择一个示例分类'
    }

    this.showEmptyCode()
  }

  /**
     * Show empty code state
     */
  showEmptyCode () {
    const codeElement = document.getElementById('code-content')
    if (codeElement) {
      codeElement.textContent = '# 选择左侧的示例分类查看代码\nprint("欢迎使用Python DDD学习平台")'
      this.applySyntaxHighlighting(codeElement)
    }
  }

  /**
     * Update active file tab
     */
  updateActiveFileTab () {
    document.querySelectorAll('.code-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.file === this.currentFile)
    })
  }

  /**
     * Show toast notification
     */
  showToast (message, type = 'info') {
    // Create toast element
    const toast = document.createElement('div')
    toast.className = `toast toast-${type}`
    toast.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info-circle'}"></i>
            <span>${message}</span>
        `

    document.body.appendChild(toast)

    // Animate in
    setTimeout(() => toast.classList.add('show'), 10)

    // Remove after 3 seconds
    setTimeout(() => {
      toast.classList.remove('show')
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast)
        }
      }, 300)
    }, 3000)
  }

  /**
     * Escape HTML entities
     */
  escapeHtml (text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }

  /**
     * Run code execution (for external calls)
     */
  runCode (code) {
    if (code) {
      // Update current code and run
      this.displayCode(code)
      this.runCurrentCode()
    } else {
      this.runCurrentCode()
    }
  }
}

/**
 * Python Code Executor - Simulates Python code execution
 * In a real implementation, this would use Pyodide or a backend service
 */
class PythonExecutor {
  constructor () {
    this.globalScope = {}
    this.importedModules = new Set()
  }

  /**
     * Execute Python code (simulated)
     */
  async execute (code) {
    const startTime = performance.now()

    try {
      // Simulate execution delay
      await this.sleep(Math.random() * 500 + 200)

      // Parse and simulate code execution
      const result = this.simulateExecution(code)

      const executionTime = performance.now() - startTime

      return {
        success: true,
        output: result.output,
        error: result.error,
        executionTime
      }
    } catch (error) {
      const executionTime = performance.now() - startTime

      return {
        success: false,
        output: null,
        error: error.message,
        executionTime
      }
    }
  }

  /**
     * Simulate Python code execution
     */
  simulateExecution (code) {
    const lines = code.split('\n')
    const output = []
    let error = null

    try {
      for (const line of lines) {
        const trimmed = line.trim()

        // Skip empty lines and comments
        if (!trimmed || trimmed.startsWith('#')) continue

        // Simulate print statements
        const printMatch = trimmed.match(/print\s*\(\s*(.+)\s*\)/)
        if (printMatch) {
          const content = printMatch[1]
          // Simple string evaluation
          if (content.startsWith('"') && content.endsWith('"')) {
            output.push(content.slice(1, -1))
          } else if (content.startsWith("'") && content.endsWith("'")) {
            output.push(content.slice(1, -1))
          } else {
            output.push(content)
          }
          continue
        }

        // Simulate class definitions
        if (trimmed.startsWith('class ')) {
          output.push(`# Class ${trimmed.split(' ')[1].split('(')[0]} defined`)
          continue
        }

        // Simulate function definitions
        if (trimmed.startsWith('def ')) {
          output.push(`# Function ${trimmed.split(' ')[1].split('(')[0]} defined`)
          continue
        }

        // Simulate imports
        if (trimmed.startsWith('import ') || trimmed.startsWith('from ')) {
          output.push(`# Import successful: ${trimmed}`)
          continue
        }

        // Simulate variable assignments
        if (trimmed.includes('=') && !trimmed.includes('==')) {
          const varName = trimmed.split('=')[0].trim()
          output.push(`# Variable ${varName} assigned`)
          continue
        }

        // Simulate if statements
        if (trimmed.startsWith('if ')) {
          output.push('# Conditional statement evaluated')
          continue
        }

        // Add more simulation cases as needed
      }

      // If no output was generated, show execution confirmation
      if (output.length === 0) {
        output.push('# Code executed successfully (no output)')
      }
    } catch (err) {
      error = err.message
    }

    return {
      output: output.join('\n'),
      error
    }
  }

  /**
     * Sleep utility for async simulation
     */
  sleep (ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }
}

// Export for use in main.js
if (typeof window !== 'undefined') {
  window.CodeExamplesManager = CodeExamplesManager
  window.PythonExecutor = PythonExecutor
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CodeExamplesManager, PythonExecutor }
}
