# Clean DDD: Domain-Driven Design with Clean Architecture

## 🎯 What is Clean DDD?

Clean DDD is the integration of **Domain-Driven Design (DDD)** principles with **Clean Architecture**, creating software that is:

- **Framework Independent**: Business logic doesn't depend on frameworks
- **Testable**: Core business rules can be tested without external dependencies  
- **Independent of UI/Database**: Domain logic is isolated from infrastructure concerns
- **Maintainable**: Clear separation of concerns and dependency direction

## 🏗️ Clean Architecture Foundation

Before diving into DDD concepts, understand the Clean Architecture dependency rule:

```
Source code dependencies must point inward toward higher-level policies
```

### The Layers (from outer to inner):
1. **Frameworks & Drivers** (Web, Database, External APIs)
2. **Interface Adapters** (Controllers, Presenters, Gateways)
3. **Application Business Rules** (Use Cases)
4. **Enterprise Business Rules** (Domain Entities, Value Objects)

## 🔗 How DDD Fits into Clean Architecture

### Domain Layer (Innermost Circle)
- **Value Objects**: Immutable objects representing domain concepts
- **Entities**: Objects with identity and lifecycle
- **Aggregate Roots**: Consistency boundaries managing related entities
- **Domain Services**: Domain logic that doesn't belong to a single entity

### Application Layer (Use Cases Circle)
- **Use Cases**: Application-specific business rules
- **Repository Interfaces**: Contracts for data access (defined here, implemented in outer layers)
- **Domain Event Handlers**: React to domain events

### Interface Adapters Layer
- **Repository Implementations**: Concrete data access implementations
- **Controllers**: Handle HTTP requests, call use cases
- **Presenters**: Format output for UI

### Frameworks & Drivers Layer
- **Web Frameworks**: FastAPI, Flask, Django (just delivery mechanisms)
- **Databases**: PostgreSQL, MongoDB (just storage mechanisms)
- **External Services**: APIs, message queues

## 🆚 Clean DDD vs Traditional DDD

| Aspect | Traditional DDD | Clean DDD |
|--------|-----------------|-----------|
| **Framework Coupling** | Often coupled to ORM/Framework | Framework Independent |
| **Testing** | Often requires full infrastructure | Unit testable without infrastructure |
| **Dependency Direction** | Mixed directions | Strict inward dependency rule |
| **Repository Pattern** | Often implemented with ORM coupling | Interface in domain, implementation in infrastructure |
| **Use Cases** | Less explicit | Explicit use case classes |

## 🎯 Key Principles of Clean DDD

### 1. **Dependency Inversion Principle**
```python
# ❌ Traditional DDD - Direct dependency on infrastructure
class UserService:
    def __init__(self):
        self.db = SqlAlchemyUserRepository()  # Depends on concrete implementation

# ✅ Clean DDD - Depends on abstraction
class UserService:
    def __init__(self, user_repository: IUserRepository):
        self._user_repository = user_repository  # Depends on interface
```

### 2. **Framework Independence**
```python
# ❌ Framework coupled
from django.db import models

class User(models.Model):  # Coupled to Django
    email = models.EmailField()

# ✅ Framework independent
@dataclass(frozen=True)
class Email:
    value: str
    
    def __post_init__(self):
        if not self._is_valid(self.value):
            raise ValueError("Invalid email")

class User:  # Pure Python, no framework
    def __init__(self, user_id: UUID, email: Email):
        self._id = user_id
        self._email = email
```

### 3. **Explicit Use Cases**
```python
# ✅ Clean DDD - Explicit application business rules
class CreateUserUseCase:
    def __init__(self, user_repository: IUserRepository):
        self._user_repository = user_repository
    
    def execute(self, request: CreateUserRequest) -> CreateUserResponse:
        # Application business rules here
        # Orchestrate domain objects
        # Return response
```

## 🚀 Benefits of Clean DDD

1. **Testability**: Test business logic without databases or web frameworks
2. **Flexibility**: Swap frameworks, databases, or UI without changing business rules
3. **Maintainability**: Clear boundaries and dependency directions
4. **Team Productivity**: Developers can work on business logic independently of infrastructure
5. **Legacy Integration**: Gradually modernize systems while preserving business rules

## 📖 Learning Path

1. **Start with Clean Architecture fundamentals**
2. **Learn DDD concepts through Clean Architecture lens**
3. **Practice with framework-independent implementations**
4. **Apply to real projects incrementally**

---

> **Note**: Traditional DDD concepts are valuable for reference, but Clean DDD emphasizes framework independence and strict adherence to the dependency rule from day one.