/**
 * Python Clean DDD Website - Main JavaScript Controller
 * Coordinates all interactive features and manages application state
 */

class DDDWebsiteApp {
  constructor () {
    this.currentSection = 'home'
    this.theme = 'light'
    this.isLoaded = false
    this.components = new Map()

    // Initialize app when DOM is ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.init())
    } else {
      this.init()
    }
  }

  /**
     * Initialize the application
     */
  async init () {
    try {
      console.log('🚀 Initializing Python Clean DDD Website...')

      // Show loading screen
      this.showLoadingScreen()

      // Initialize core components
      await this.initializeComponents()

      // Setup event listeners
      this.setupEventListeners()

      // Initialize theme
      this.initializeTheme()

      // Load initial content
      await this.loadInitialContent()

      // Hide loading screen
      this.hideLoadingScreen()

      // Mark as loaded
      this.isLoaded = true

      console.log('✅ Website initialized successfully!')
    } catch (error) {
      console.error('❌ Failed to initialize website:', error)
      this.showErrorMessage('Failed to load the website. Please refresh the page.')
    }
  }

  /**
     * Initialize all website components
     */
  async initializeComponents () {
    const componentModules = [
      'navigation',
      'knowledge-map',
      'learning-path',
      'code-examples',
      'theme',
      'utils'
    ]

    for (const module of componentModules) {
      try {
        // Dynamic import would be used in a proper module system
        // For now, we'll initialize components directly
        console.log(`Initializing ${module} component...`)

        switch (module) {
          case 'navigation':
            this.components.set('navigation', new NavigationManager())
            break
          case 'knowledge-map':
            this.components.set('knowledgeMap', new KnowledgeMapManager())
            break
          case 'learning-path':
            this.components.set('learningPath', new LearningPathManager())
            break
          case 'code-examples':
            this.components.set('codeExamples', new CodeExamplesManager())
            break
          case 'theme':
            this.components.set('theme', new ThemeManager())
            break
        }
      } catch (error) {
        console.warn(`⚠️ Failed to initialize ${module}:`, error)
      }
    }
  }

  /**
     * Setup global event listeners
     */
  setupEventListeners () {
    // Handle navigation
    document.addEventListener('click', this.handleGlobalClick.bind(this))

    // Handle keyboard navigation
    document.addEventListener('keydown', this.handleKeyboard.bind(this))

    // Handle scroll events
    window.addEventListener('scroll', this.throttle(this.handleScroll.bind(this), 16))

    // Handle resize events
    window.addEventListener('resize', this.debounce(this.handleResize.bind(this), 250))

    // Handle visibility changes
    document.addEventListener('visibilitychange', this.handleVisibilityChange.bind(this))

    // Handle online/offline status
    window.addEventListener('online', this.handleOnline.bind(this))
    window.addEventListener('offline', this.handleOffline.bind(this))
  }

  /**
     * Handle global click events
     */
  handleGlobalClick (event) {
    const target = event.target.closest('[data-action]')
    if (!target) return

    const action = target.dataset.action
    const params = target.dataset.params ? JSON.parse(target.dataset.params) : {}

    this.executeAction(action, params, event)
  }

  /**
     * Execute application actions
     */
  executeAction (action, params = {}, event = null) {
    console.log(`🎯 Executing action: ${action}`, params)

    switch (action) {
      case 'navigate':
        this.navigateToSection(params.section || params.to)
        break

      case 'start-learning':
        this.startLearningFlow()
        break

      case 'view-docs':
        this.openDocumentation()
        break

      case 'toggle-theme':
        this.components.get('theme')?.toggleTheme()
        break

      case 'run-code':
        this.components.get('codeExamples')?.runCode(params.code)
        break

      case 'copy-code':
        this.copyToClipboard(params.code || this.getSelectedCode())
        break

      case 'download-code':
        this.downloadCode(params.code, params.filename)
        break

      case 'filter-content':
        this.filterContent(params.type, params.value)
        break

      case 'search':
        this.performSearch(params.query)
        break

      default:
        console.warn(`Unknown action: ${action}`)
    }
  }

  /**
     * Navigate to a specific section
     */
  navigateToSection (sectionId) {
    if (!sectionId || sectionId === this.currentSection) return

    // Hide current section
    const currentElement = document.getElementById(this.currentSection)
    if (currentElement) {
      currentElement.classList.remove('active')
    }

    // Show new section
    const newElement = document.getElementById(sectionId)
    if (newElement) {
      newElement.classList.add('active')
      this.currentSection = sectionId

      // Update URL without reload
      this.updateURL(sectionId)

      // Update navigation state
      this.components.get('navigation')?.updateActiveSection(sectionId)

      // Trigger section-specific initialization
      this.initializeSection(sectionId)

      // Analytics tracking
      this.trackPageView(sectionId)
    }
  }

  /**
     * Initialize section-specific functionality
     */
  initializeSection (sectionId) {
    switch (sectionId) {
      case 'knowledge-map':
        this.components.get('knowledgeMap')?.initialize()
        break

      case 'learning-path':
        this.components.get('learningPath')?.initialize()
        break

      case 'examples':
        this.components.get('codeExamples')?.initialize()
        break
    }
  }

  /**
     * Start the learning flow
     */
  startLearningFlow () {
    // Determine user's experience level
    this.showModal('learning-assessment', {
      title: 'Choose Your Learning Path',
      content: this.generateLearningAssessment(),
      onComplete: (level) => {
        this.navigateToSection('learning-path')
        this.components.get('learningPath')?.setUserLevel(level)
      }
    })
  }

  /**
     * Open documentation
     */
  openDocumentation () {
    this.navigateToSection('knowledge-map')
    this.components.get('knowledgeMap')?.focusOnConcept('introduction')
  }

  /**
     * Initialize theme system
     */
  initializeTheme () {
    const themeManager = this.components.get('theme')
    if (themeManager) {
      this.theme = themeManager.getCurrentTheme()
      document.documentElement.setAttribute('data-theme', this.theme)
    }
  }

  /**
     * Load initial content and data
     */
  async loadInitialContent () {
    try {
      // Load DDD concepts data
      const conceptsData = await this.loadDDDConcepts()
      this.components.get('knowledgeMap')?.setConceptsData(conceptsData)

      // Load learning path data
      const learningPathData = await this.loadLearningPaths()
      this.components.get('learningPath')?.setPathData(learningPathData)

      // Load code examples
      const examplesData = await this.loadCodeExamples()
      this.components.get('codeExamples')?.setExamplesData(examplesData)

      // Initialize statistics
      this.initializeStatistics()
    } catch (error) {
      console.error('Failed to load initial content:', error)
    }
  }

  /**
     * Load Clean DDD concepts data - Focus on Clean Architecture + DDD integration
     */
  async loadDDDConcepts () {
    // Clean DDD concepts emphasizing Clean Architecture principles
    return {
      concepts: [
        {
          id: 'clean-value-object',
          name: 'Clean Value Object',
          difficulty: 'beginner',
          category: 'clean-tactical',
          description: 'Immutable domain objects following Clean Architecture - independent of frameworks, with pure business logic',
          examples: ['Money (framework-independent)', 'Email (validated)', 'Address (immutable)'],
          cleanPrinciples: ['Independent of Frameworks', 'Testable', 'Independent of UI/DB']
        },
        {
          id: 'clean-entity',
          name: 'Clean Entity',
          difficulty: 'beginner',
          category: 'clean-tactical',
          description: 'Domain entities in Clean Architecture - business logic without infrastructure dependencies',
          examples: ['User (pure domain)', 'Order (business rules)', 'Product (domain-focused)'],
          cleanPrinciples: ['Business Rules Encapsulation', 'Framework Independence', 'Dependency Rule Compliance']
        },
        {
          id: 'clean-use-case',
          name: 'Clean Use Case',
          difficulty: 'intermediate',
          category: 'clean-application',
          description: 'Application business rules orchestrating domain entities - the heart of Clean Architecture',
          examples: ['CreateOrderUseCase', 'ProcessPaymentUseCase', 'UpdateUserProfileUseCase'],
          cleanPrinciples: ['Application Business Rules', 'Framework Independent', 'Orchestrates Domain Logic']
        },
        {
          id: 'clean-repository-interface',
          name: 'Clean Repository Interface',
          difficulty: 'intermediate',
          category: 'clean-interface',
          description: 'Clean Architecture repositories - interfaces defined in domain, implemented in infrastructure',
          examples: ['IUserRepository (interface)', 'IOrderRepository (abstract)', 'IPaymentGateway (contract)'],
          cleanPrinciples: ['Dependency Inversion', 'Interface Segregation', 'Testability']
        },
        {
          id: 'clean-aggregate',
          name: 'Clean Aggregate Root',
          difficulty: 'advanced',
          category: 'clean-tactical',
          description: 'DDD Aggregates following Clean Architecture - consistency boundaries with pure domain logic',
          examples: ['OrderAggregate (clean)', 'UserProfileAggregate', 'ShoppingCartAggregate'],
          cleanPrinciples: ['Consistency Boundary', 'Framework Independence', 'Domain Events']
        },
        {
          id: 'clean-bounded-context',
          name: 'Clean Bounded Context',
          difficulty: 'advanced',
          category: 'clean-strategic',
          description: 'Strategic DDD contexts implementing Clean Architecture across service boundaries',
          examples: ['Sales Context (clean)', 'Inventory Context (independent)', 'Shipping Context (modular)'],
          cleanPrinciples: ['Service Independence', 'Context Isolation', 'Clean Boundaries']
        }
      ],
      relationships: [
        { from: 'clean-value-object', to: 'clean-entity', type: 'used-by', cleanNote: 'Value objects compose entities in domain layer' },
        { from: 'clean-entity', to: 'clean-aggregate', type: 'contained-in', cleanNote: 'Entities are managed by aggregate roots' },
        { from: 'clean-use-case', to: 'clean-entity', type: 'orchestrates', cleanNote: 'Use cases coordinate domain entities' },
        { from: 'clean-use-case', to: 'clean-repository-interface', type: 'depends-on', cleanNote: 'Use cases depend on abstractions, not concretions' },
        { from: 'clean-aggregate', to: 'clean-bounded-context', type: 'belongs-to', cleanNote: 'Aggregates exist within context boundaries' }
      ],
      traditionalDddNote: 'Traditional DDD concepts are included for reference but Clean DDD emphasizes framework independence and the dependency rule.'
    }
  }

  /**
     * Load Clean DDD learning paths data - Structured around Clean Architecture principles
     */
  async loadLearningPaths () {
    return {
      beginner: {
        name: 'Clean DDD Foundations',
        description: 'Learn DDD through Clean Architecture lens from day one',
        duration: '3-4 months',
        modules: 8,
        projects: 3,
        cleanFocus: 'Framework Independence & Domain Purity',
        steps: [
          {
            id: 1,
            title: 'Clean Architecture Fundamentals',
            duration: '30 min',
            completed: false,
            description: 'Understand the dependency rule and layered architecture before diving into DDD'
          },
          {
            id: 2,
            title: 'Clean DDD Overview',
            duration: '45 min',
            completed: false,
            description: 'How Domain-Driven Design integrates with Clean Architecture principles'
          },
          {
            id: 3,
            title: 'Your First Clean Value Object',
            duration: '45 min',
            completed: false,
            description: 'Build framework-independent value objects with pure business logic'
          },
          {
            id: 4,
            title: 'Clean Domain Entities',
            duration: '60 min',
            completed: false,
            description: 'Create entities that encapsulate business rules without external dependencies'
          },
          {
            id: 5,
            title: 'Clean Use Cases',
            duration: '90 min',
            completed: false,
            description: 'Implement application business rules that orchestrate domain logic'
          },
          {
            id: 6,
            title: 'Repository Interfaces (Clean Way)',
            duration: '75 min',
            completed: false,
            description: 'Define contracts in domain layer, implement in infrastructure'
          },
          {
            id: 7,
            title: 'Clean Aggregate Design',
            duration: '120 min',
            completed: false,
            description: 'Build consistency boundaries following Clean Architecture'
          },
          {
            id: 8,
            title: 'First Clean DDD Project',
            duration: '300 min',
            completed: false,
            description: 'Complete project implementing Clean DDD principles end-to-end'
          }
        ]
      },
      intermediate: {
        name: 'Clean Architecture Mastery',
        description: 'Advanced Clean DDD patterns and strategic design',
        duration: '2-3 months',
        modules: 6,
        projects: 2,
        cleanFocus: 'Strategic Design & Clean Boundaries',
        steps: [
          {
            id: 1,
            title: 'Clean Bounded Contexts',
            duration: '90 min',
            completed: false,
            description: 'Design context boundaries following Clean Architecture principles'
          },
          {
            id: 2,
            title: 'Context Mapping (Clean Approach)',
            duration: '120 min',
            completed: false,
            description: 'Map relationships between clean contexts and services'
          },
          {
            id: 3,
            title: 'Clean Event-Driven Architecture',
            duration: '150 min',
            completed: false,
            description: 'Implement domain events within Clean Architecture constraints'
          },
          {
            id: 4,
            title: 'Clean Hexagonal Ports & Adapters',
            duration: '180 min',
            completed: false,
            description: 'Advanced Clean Architecture patterns for complex systems'
          },
          {
            id: 5,
            title: 'Clean Microservices with DDD',
            duration: '240 min',
            completed: false,
            description: 'Apply Clean DDD principles to distributed systems'
          },
          {
            id: 6,
            title: 'Advanced Clean DDD Project',
            duration: '360 min',
            completed: false,
            description: 'Multi-context system following Clean DDD principles'
          }
        ]
      },
      expert: {
        name: 'Clean DDD Architecture Expert',
        description: 'Enterprise-grade Clean DDD implementations',
        duration: '1-2 months',
        modules: 4,
        projects: 1,
        cleanFocus: 'Enterprise Patterns & Legacy Integration',
        steps: [
          {
            id: 1,
            title: 'Enterprise Clean DDD Patterns',
            duration: '240 min',
            completed: false,
            description: 'Advanced patterns for large-scale Clean DDD systems'
          },
          {
            id: 2,
            title: 'Legacy System Integration (Clean Way)',
            duration: '300 min',
            completed: false,
            description: 'Integrate Clean DDD with existing systems using Clean Architecture'
          },
          {
            id: 3,
            title: 'Clean DDD Performance & Scaling',
            duration: '180 min',
            completed: false,
            description: 'Optimize Clean DDD systems for performance while maintaining purity'
          },
          {
            id: 4,
            title: 'Expert Clean DDD Capstone',
            duration: '480 min',
            completed: false,
            description: 'Design and implement enterprise-grade Clean DDD architecture'
          }
        ]
      }
    }
  }

  /**
     * Load Clean DDD code examples - All examples follow Clean Architecture principles
     */
  async loadCodeExamples () {
    return {
      'clean-domain-modeling': {
        title: 'Clean DDD Domain Modeling',
        description: 'Domain modeling following Clean Architecture - framework-independent, testable, and focused on business rules',
        cleanPrinciples: ['Framework Independence', 'Dependency Rule Compliance', 'Testability'],
        files: {
          main: `# Clean DDD Domain Modeling Example
# Following Clean Architecture principles - no framework dependencies

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import Optional, Protocol
from uuid import UUID, uuid4
from datetime import datetime

# ===== CLEAN VALUE OBJECTS =====
# Framework-independent, immutable, business-focused

@dataclass(frozen=True)
class Money:
    """Clean Value Object - No framework dependencies, pure business logic"""
    amount: Decimal
    currency: str
    
    def __post_init__(self):
        # Business rules validation - no external dependencies
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        if not self.currency or len(self.currency) != 3:
            raise ValueError("Currency must be a valid 3-letter code")
        
    def add(self, other: 'Money') -> 'Money':
        """Business rule: Can only add same currency"""
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} to {other.currency}")
        return Money(self.amount + other.amount, self.currency)
    
    def multiply(self, factor: Decimal) -> 'Money':
        """Business rule: Multiply money by factor"""
        return Money(self.amount * factor, self.currency)

@dataclass(frozen=True)
class Email:
    """Clean Value Object - Email with business validation"""
    value: str
    
    def __post_init__(self):
        if not self._is_valid_email(self.value):
            raise ValueError(f"Invalid email format: {self.value}")
    
    def _is_valid_email(self, email: str) -> bool:
        # Simple business rule - in real world, use proper validation
        return '@' in email and '.' in email.split('@')[1]

# ===== CLEAN DOMAIN ENTITIES =====
# Encapsulate business rules, no infrastructure dependencies

class User:
    """Clean Domain Entity - Pure business logic, testable"""
    
    def __init__(self, user_id: UUID, email: Email, name: str):
        self._id = user_id
        self._email = email
        self._name = name
        self._balance = Money(Decimal('0'), 'USD')
        self._created_at = datetime.utcnow()
        self._is_active = True
    
    @property
    def id(self) -> UUID:
        return self._id
    
    @property
    def email(self) -> Email:
        return self._email
    
    @property
    def name(self) -> str:
        return self._name
    
    @property
    def balance(self) -> Money:
        return self._balance
    
    def add_funds(self, amount: Money) -> None:
        """Business rule: Add funds to user balance"""
        if not self._is_active:
            raise ValueError("Cannot add funds to inactive user")
        self._balance = self._balance.add(amount)
    
    def deactivate(self) -> None:
        """Business rule: Deactivate user account"""
        self._is_active = False
    
    def can_make_purchase(self, amount: Money) -> bool:
        """Business rule: Check if user can afford purchase"""
        return (self._is_active and 
                self._balance.currency == amount.currency and 
                self._balance.amount >= amount.amount)

# ===== CLEAN REPOSITORY INTERFACE =====
# Defined in domain layer - implementation will be in infrastructure

class IUserRepository(Protocol):
    """Clean Architecture: Repository interface in domain layer"""
    
    def save(self, user: User) -> None:
        """Save user - implementation depends on chosen persistence"""
        ...
    
    def get_by_id(self, user_id: UUID) -> Optional[User]:
        """Get user by ID - implementation handles data access"""
        ...
    
    def get_by_email(self, email: Email) -> Optional[User]:
        """Get user by email - implementation handles querying"""
        ...

# ===== USAGE EXAMPLE =====
if __name__ == "__main__":
    # Create clean domain objects - no framework coupling
    user_id = uuid4()
    email = Email("john.doe@example.com")
    user = User(user_id, email, "John Doe")
    
    # Apply business rules
    funds = Money(Decimal('100.50'), 'USD')
    user.add_funds(funds)
    
    purchase_amount = Money(Decimal('25.00'), 'USD')
    can_buy = user.can_make_purchase(purchase_amount)
    
    print(f"User: {user.name} ({user.email.value})")
    print(f"Balance: {user.balance.amount} {user.balance.currency}")
    print(f"Can make purchase of {purchase_amount.amount}: {can_buy}")
    
    # This is Clean DDD: Pure domain logic, testable, framework-independent
`,
          models: `# Clean DDD Domain Models
# Additional clean domain models following the same principles

from abc import ABC, abstractmethod
from dataclasses import dataclass
from decimal import Decimal
from typing import List, Optional
from uuid import UUID
from datetime import datetime

# ===== CLEAN AGGREGATE ROOT =====

class Order:
    """Clean Aggregate Root - Manages consistency boundary"""
    
    def __init__(self, order_id: UUID, customer_id: UUID):
        self._id = order_id
        self._customer_id = customer_id
        self._items: List[OrderItem] = []
        self._status = OrderStatus.PENDING
        self._created_at = datetime.utcnow()
    
    def add_item(self, product_id: UUID, quantity: int, unit_price: Money) -> None:
        """Business rule: Add item to order"""
        if self._status != OrderStatus.PENDING:
            raise ValueError("Cannot modify confirmed order")
        
        item = OrderItem(product_id, quantity, unit_price)
        self._items.append(item)
    
    def confirm(self) -> None:
        """Business rule: Confirm order"""
        if not self._items:
            raise ValueError("Cannot confirm empty order")
        if self._status != OrderStatus.PENDING:
            raise ValueError("Order already processed")
        
        self._status = OrderStatus.CONFIRMED
    
    def get_total(self) -> Money:
        """Business rule: Calculate order total"""
        if not self._items:
            return Money(Decimal('0'), 'USD')
        
        total = self._items[0].get_total()
        for item in self._items[1:]:
            total = total.add(item.get_total())
        return total
    
    @property
    def id(self) -> UUID:
        return self._id
    
    @property
    def status(self) -> 'OrderStatus':
        return self._status

@dataclass(frozen=True)
class OrderItem:
    """Clean Value Object - Order line item"""
    product_id: UUID
    quantity: int
    unit_price: Money
    
    def __post_init__(self):
        if self.quantity <= 0:
            raise ValueError("Quantity must be positive")
    
    def get_total(self) -> Money:
        return self.unit_price.multiply(Decimal(self.quantity))

class OrderStatus:
    """Clean Value Object - Order status enumeration"""
    PENDING = "PENDING"
    CONFIRMED = "CONFIRMED"
    SHIPPED = "SHIPPED"
    DELIVERED = "DELIVERED"
    CANCELLED = "CANCELLED"
`,
          tests: `# Clean DDD Unit Tests
# Testing pure domain logic - no framework dependencies needed

import unittest
from decimal import Decimal
from uuid import uuid4

class TestCleanDDDModels(unittest.TestCase):
    """Test Clean DDD domain models - pure unit tests"""
    
    def test_money_creation_and_validation(self):
        """Test Money value object business rules"""
        # Valid money creation
        money = Money(Decimal('10.50'), 'USD')
        self.assertEqual(money.amount, Decimal('10.50'))
        self.assertEqual(money.currency, 'USD')
        
        # Test business rule: negative amounts not allowed
        with self.assertRaises(ValueError):
            Money(Decimal('-10.00'), 'USD')
        
        # Test business rule: invalid currency
        with self.assertRaises(ValueError):
            Money(Decimal('10.00'), 'US')  # Not 3 characters
    
    def test_money_business_operations(self):
        """Test Money business operations"""
        money1 = Money(Decimal('10.50'), 'USD')
        money2 = Money(Decimal('5.25'), 'USD')
        
        # Test addition business rule
        result = money1.add(money2)
        self.assertEqual(result.amount, Decimal('15.75'))
        
        # Test currency mismatch business rule
        eur_money = Money(Decimal('10.00'), 'EUR')
        with self.assertRaises(ValueError):
            money1.add(eur_money)
    
    def test_user_entity_business_rules(self):
        """Test User entity business logic"""
        user_id = uuid4()
        email = Email("test@example.com")
        user = User(user_id, email, "Test User")
        
        # Test initial state
        self.assertEqual(user.balance.amount, Decimal('0'))
        
        # Test add funds business rule
        funds = Money(Decimal('100.00'), 'USD')
        user.add_funds(funds)
        self.assertEqual(user.balance.amount, Decimal('100.00'))
        
        # Test purchase capability business rule
        purchase = Money(Decimal('50.00'), 'USD')
        self.assertTrue(user.can_make_purchase(purchase))
        
        expensive_purchase = Money(Decimal('150.00'), 'USD')
        self.assertFalse(user.can_make_purchase(expensive_purchase))
    
    def test_order_aggregate_business_rules(self):
        """Test Order aggregate business logic"""
        order_id = uuid4()
        customer_id = uuid4()
        order = Order(order_id, customer_id)
        
        # Test add item business rule
        product_id = uuid4()
        unit_price = Money(Decimal('25.00'), 'USD')
        order.add_item(product_id, 2, unit_price)
        
        # Test total calculation business rule
        expected_total = Money(Decimal('50.00'), 'USD')
        self.assertEqual(order.get_total().amount, expected_total.amount)
        
        # Test confirm order business rule
        order.confirm()
        self.assertEqual(order.status, OrderStatus.CONFIRMED)
        
        # Test business rule: cannot modify confirmed order
        with self.assertRaises(ValueError):
            order.add_item(uuid4(), 1, unit_price)

if __name__ == '__main__':
    unittest.main()
    
# This demonstrates Clean DDD testing:
# - No framework dependencies
# - Pure business logic testing
# - Fast, isolated unit tests
# - Tests business rules directly
`
        }
      },
      'clean-use-cases': {
        title: 'Clean DDD Use Cases',
        description: 'Application business rules orchestrating domain logic - the heart of Clean Architecture',
        cleanPrinciples: ['Application Business Rules', 'Framework Independence', 'Dependency Inversion'],
        files: {
          main: `# Clean DDD Use Cases Example
# Application layer orchestrating domain logic

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional
from uuid import UUID, uuid4

# ===== USE CASE INPUT/OUTPUT MODELS =====
# Clean Architecture: Use cases have their own models

@dataclass
class CreateUserRequest:
    """Use case input model"""
    email: str
    name: str
    initial_balance: Optional[str] = None  # String to avoid coupling to Money

@dataclass
class CreateUserResponse:
    """Use case output model"""
    user_id: str
    success: bool
    message: str

@dataclass
class AddFundsRequest:
    """Use case input model"""
    user_id: str
    amount: str
    currency: str

# ===== CLEAN USE CASE IMPLEMENTATION =====

class CreateUserUseCase:
    """Clean Architecture Use Case - Application Business Rules"""
    
    def __init__(self, user_repository: IUserRepository):
        # Dependency injection - depends on abstraction, not concretion
        self._user_repository = user_repository
    
    def execute(self, request: CreateUserRequest) -> CreateUserResponse:
        """Execute use case - orchestrate domain logic"""
        try:
            # Convert use case input to domain objects
            email = Email(request.email)
            
            # Check business rule: email must be unique
            existing_user = self._user_repository.get_by_email(email)
            if existing_user:
                return CreateUserResponse(
                    user_id="",
                    success=False,
                    message="User with this email already exists"
                )
            
            # Create domain entity
            user_id = uuid4()
            user = User(user_id, email, request.name)
            
            # Apply initial balance if provided
            if request.initial_balance:
                initial_funds = Money(Decimal(request.initial_balance), 'USD')
                user.add_funds(initial_funds)
            
            # Persist through repository interface
            self._user_repository.save(user)
            
            return CreateUserResponse(
                user_id=str(user_id),
                success=True,
                message="User created successfully"
            )
            
        except ValueError as e:
            return CreateUserResponse(
                user_id="",
                success=False,
                message=f"Validation error: {str(e)}"
            )
        except Exception as e:
            return CreateUserResponse(
                user_id="",
                success=False,
                message=f"Unexpected error: {str(e)}"
            )

class AddFundsUseCase:
    """Clean Use Case - Add funds to user account"""
    
    def __init__(self, user_repository: IUserRepository):
        self._user_repository = user_repository
    
    def execute(self, request: AddFundsRequest) -> CreateUserResponse:
        """Execute add funds use case"""
        try:
            # Get user from repository
            user_id = UUID(request.user_id)
            user = self._user_repository.get_by_id(user_id)
            
            if not user:
                return CreateUserResponse(
                    user_id=request.user_id,
                    success=False,
                    message="User not found"
                )
            
            # Create money value object
            funds = Money(Decimal(request.amount), request.currency)
            
            # Apply domain business rule
            user.add_funds(funds)
            
            # Persist changes
            self._user_repository.save(user)
            
            return CreateUserResponse(
                user_id=request.user_id,
                success=True,
                message=f"Added {funds.amount} {funds.currency} to account"
            )
            
        except Exception as e:
            return CreateUserResponse(
                user_id=request.user_id,
                success=False,
                message=f"Error adding funds: {str(e)}"
            )

# ===== USE CASE ORCHESTRATION =====

class UserService:
    """Service orchestrating multiple use cases"""
    
    def __init__(self, user_repository: IUserRepository):
        self._create_user_use_case = CreateUserUseCase(user_repository)
        self._add_funds_use_case = AddFundsUseCase(user_repository)
    
    def create_user(self, request: CreateUserRequest) -> CreateUserResponse:
        return self._create_user_use_case.execute(request)
    
    def add_funds(self, request: AddFundsRequest) -> CreateUserResponse:
        return self._add_funds_use_case.execute(request)

# This demonstrates Clean DDD Use Cases:
# - Framework independent
# - Depends on abstractions (repository interfaces)
# - Contains application business rules
# - Orchestrates domain logic
# - Testable in isolation
`
        }
      }
    }
  }

  /**
     * Initialize statistics counters
     */
  initializeStatistics () {
    const stats = [
      { element: '[data-target="15"]', target: 15, label: 'Core Concepts' },
      { element: '[data-target="50"]', target: 50, label: 'Code Examples' },
      { element: '[data-target="8"]', target: 8, label: 'Real Projects' },
      { element: '[data-target="100"]', target: 100, label: 'Best Practices' }
    ]

    stats.forEach(stat => {
      const element = document.querySelector(stat.element)
      if (element) {
        this.animateCounter(element, stat.target)
      }
    })
  }

  /**
     * Animate counter from 0 to target
     */
  animateCounter (element, target, duration = 2000) {
    const start = 0
    const startTime = performance.now()

    const updateCounter = (currentTime) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Easing function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const current = Math.floor(start + (target - start) * easeOut)

      element.textContent = current.toString()

      if (progress < 1) {
        requestAnimationFrame(updateCounter)
      } else {
        element.textContent = target.toString()
      }
    }

    requestAnimationFrame(updateCounter)
  }

  /**
     * Show loading screen
     */
  showLoadingScreen () {
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
      loadingScreen.style.display = 'flex'
    }
  }

  /**
     * Hide loading screen
     */
  hideLoadingScreen () {
    const loadingScreen = document.getElementById('loading-screen')
    if (loadingScreen) {
      setTimeout(() => {
        loadingScreen.style.opacity = '0'
        setTimeout(() => {
          loadingScreen.style.display = 'none'
        }, 300)
      }, 1000) // Show loading for at least 1 second
    }
  }

  /**
     * Show error message
     */
  showErrorMessage (message) {
    // Create and show error toast
    const toast = document.createElement('div')
    toast.className = 'toast toast-error'
    toast.innerHTML = `
            <i class="fas fa-exclamation-triangle"></i>
            <span>${message}</span>
            <button class="toast-close">&times;</button>
        `

    document.body.appendChild(toast)

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    }, 5000)

    // Manual close
    toast.querySelector('.toast-close').addEventListener('click', () => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast)
      }
    })
  }

  /**
     * Copy text to clipboard
     */
  async copyToClipboard (text) {
    try {
      await navigator.clipboard.writeText(text)
      this.showToast('Code copied to clipboard!', 'success')
    } catch (error) {
      console.error('Failed to copy:', error)
      this.showToast('Failed to copy code', 'error')
    }
  }

  /**
     * Show toast notification
     */
  showToast (message, type = 'info') {
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
     * Utility: Throttle function calls
     */
  throttle (func, limit) {
    let inThrottle
    return function () {
      const args = arguments
      const context = this
      if (!inThrottle) {
        func.apply(context, args)
        inThrottle = true
        setTimeout(() => inThrottle = false, limit)
      }
    }
  }

  /**
     * Utility: Debounce function calls
     */
  debounce (func, wait) {
    let timeout
    return function () {
      const context = this
      const args = arguments
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(context, args), wait)
    }
  }

  /**
     * Handle keyboard events
     */
  handleKeyboard (event) {
    // Handle escape key
    if (event.key === 'Escape') {
      this.closeModals()
    }

    // Handle navigation shortcuts
    if (event.ctrlKey || event.metaKey) {
      switch (event.key) {
        case 'k':
          event.preventDefault()
          this.focusSearch()
          break
      }
    }
  }

  /**
     * Handle scroll events
     */
  handleScroll () {
    const scrollTop = window.pageYOffset

    // Show/hide back to top button
    const backToTop = document.getElementById('back-to-top')
    if (backToTop) {
      backToTop.style.display = scrollTop > 300 ? 'block' : 'none'
    }

    // Update header background
    const header = document.getElementById('header')
    if (header) {
      header.classList.toggle('scrolled', scrollTop > 50)
    }
  }

  /**
     * Handle window resize
     */
  handleResize () {
    // Update responsive components
    this.components.forEach(component => {
      if (typeof component.handleResize === 'function') {
        component.handleResize()
      }
    })
  }

  /**
     * Handle visibility change
     */
  handleVisibilityChange () {
    if (document.visibilityState === 'visible') {
      // Resume animations and updates
      this.resumeApplication()
    } else {
      // Pause non-essential operations
      this.pauseApplication()
    }
  }

  /**
     * Handle online status
     */
  handleOnline () {
    this.showToast('Back online!', 'success')
  }

  /**
     * Handle offline status
     */
  handleOffline () {
    this.showToast('You are offline. Some features may not work.', 'warning')
  }

  /**
     * Update URL without page reload
     */
  updateURL (section) {
    const url = new URL(window.location)
    url.hash = section
    window.history.replaceState({}, '', url)
  }

  /**
     * Track page views (placeholder for analytics)
     */
  trackPageView (section) {
    console.log(`📊 Page view: ${section}`)
    // Integration with analytics service would go here
  }

  /**
     * Pause application
     */
  pauseApplication () {
    // Pause animations, stop timers, etc.
    console.log('⏸️ Application paused')
  }

  /**
     * Resume application
     */
  resumeApplication () {
    // Resume animations, restart timers, etc.
    console.log('▶️ Application resumed')
  }
}

/**
 * Navigation Manager - Handles navigation and routing
 */
class NavigationManager {
  constructor () {
    this.currentSection = 'home'
    this.navLinks = document.querySelectorAll('.nav-link')
    this.sections = document.querySelectorAll('.section')

    this.setupNavigation()
  }

  setupNavigation () {
    // Handle nav link clicks
    this.navLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault()
        const section = link.dataset.section
        if (section) {
          this.navigateToSection(section)
        }
      })
    })

    // Handle mobile menu toggle
    const navToggle = document.getElementById('nav-toggle')
    const navMenu = document.getElementById('nav-menu')

    if (navToggle && navMenu) {
      navToggle.addEventListener('click', () => {
        navMenu.classList.toggle('active')
        navToggle.classList.toggle('active')
      })
    }

    // Handle back to top
    const backToTop = document.getElementById('back-to-top')
    if (backToTop) {
      backToTop.addEventListener('click', () => {
        window.scrollTo({ top: 0, behavior: 'smooth' })
      })
    }
  }

  navigateToSection (sectionId) {
    // Remove active class from all nav links
    this.navLinks.forEach(link => link.classList.remove('active'))

    // Add active class to current nav link
    const activeLink = document.querySelector(`[data-section="${sectionId}"]`)
    if (activeLink) {
      activeLink.classList.add('active')
    }

    // Hide all sections
    this.sections.forEach(section => section.classList.remove('active'))

    // Show target section
    const targetSection = document.getElementById(sectionId)
    if (targetSection) {
      targetSection.classList.add('active')
      this.currentSection = sectionId
    }

    // Close mobile menu
    const navMenu = document.getElementById('nav-menu')
    const navToggle = document.getElementById('nav-toggle')
    if (navMenu && navToggle) {
      navMenu.classList.remove('active')
      navToggle.classList.remove('active')
    }
  }

  updateActiveSection (sectionId) {
    this.navigateToSection(sectionId)
  }
}

/**
 * Initialize the application when the script loads
 */
window.dddiWebsiteApp = new DDDWebsiteApp()

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { DDDWebsiteApp, NavigationManager }
}
