# Clean Value Objects in Python

## 🎯 What are Clean Value Objects?

Clean Value Objects are **immutable domain objects** that represent concepts in your business domain, built following **Clean Architecture principles**:

- **Framework Independent**: No coupling to ORMs, web frameworks, or databases
- **Immutable**: Cannot be changed after creation
- **Self-Validating**: Enforce business rules internally
- **Testable**: Can be unit tested without external dependencies

## 🏗️ Anatomy of a Clean Value Object

```python
from dataclasses import dataclass
from decimal import Decimal

@dataclass(frozen=True)  # Immutable
class Money:
    """Clean Value Object - No framework dependencies"""
    amount: Decimal
    currency: str
    
    def __post_init__(self):
        # Business rule validation - no external dependencies
        if self.amount < 0:
            raise ValueError("Money amount cannot be negative")
        if not self.currency or len(self.currency) != 3:
            raise ValueError("Currency must be 3-letter code (e.g., USD)")
    
    def add(self, other: 'Money') -> 'Money':
        """Business rule: Only add same currency"""
        if self.currency != other.currency:
            raise ValueError(f"Cannot add {self.currency} to {other.currency}")
        return Money(self.amount + other.amount, self.currency)
    
    def multiply(self, factor: Decimal) -> 'Money':
        """Business rule: Multiply money amount"""
        return Money(self.amount * factor, self.currency)
```

## ✅ Clean Value Object Characteristics

### 1. **Immutability**
```python
# ✅ Immutable - creates new instance
money = Money(Decimal('100'), 'USD')
new_money = money.add(Money(Decimal('50'), 'USD'))  # Returns new instance
# money is unchanged, new_money has the result

# ❌ Mutable - modifies existing instance
class BadMoney:
    def add(self, amount):
        self.amount += amount  # Modifies state - not a value object!
```

### 2. **Self-Validation**
```python
@dataclass(frozen=True)
class Email:
    """Self-validating email value object"""
    value: str
    
    def __post_init__(self):
        if not self._is_valid_email(self.value):
            raise ValueError(f"Invalid email format: {self.value}")
    
    def _is_valid_email(self, email: str) -> bool:
        # Business rule for email validation
        return '@' in email and '.' in email.split('@')[1]

# Usage
email = Email("user@example.com")     # ✅ Valid
# Email("invalid-email")              # ❌ Raises ValueError
```

### 3. **Framework Independence**
```python
# ❌ Framework coupled value object
from django.core.validators import validate_email
from django.core.exceptions import ValidationError

class EmailValueObject:
    def __init__(self, value):
        try:
            validate_email(value)  # Depends on Django!
            self.value = value
        except ValidationError:
            raise ValueError("Invalid email")

# ✅ Clean value object - no framework dependencies
@dataclass(frozen=True)
class Email:
    value: str
    
    def __post_init__(self):
        # Pure Python validation - no framework needed
        if not self._is_valid(self.value):
            raise ValueError("Invalid email")
    
    def _is_valid(self, email: str) -> bool:
        return '@' in email and len(email.split('@')) == 2
```

## 🔧 Common Clean Value Object Patterns

### Money and Currency
```python
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str
    
    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Negative amounts not allowed")
        if self.currency not in ['USD', 'EUR', 'GBP']:  # Business rule
            raise ValueError(f"Unsupported currency: {self.currency}")
    
    def is_zero(self) -> bool:
        return self.amount == 0
    
    def is_positive(self) -> bool:
        return self.amount > 0
```

### Address
```python
@dataclass(frozen=True)
class Address:
    street: str
    city: str
    state: str
    zip_code: str
    country: str = "USA"
    
    def __post_init__(self):
        if not all([self.street, self.city, self.state, self.zip_code]):
            raise ValueError("All address fields are required")
        if len(self.zip_code) != 5:
            raise ValueError("ZIP code must be 5 digits")
    
    def get_full_address(self) -> str:
        return f"{self.street}, {self.city}, {self.state} {self.zip_code}"
```

### Date Ranges
```python
@dataclass(frozen=True)
class DateRange:
    start_date: date
    end_date: date
    
    def __post_init__(self):
        if self.start_date > self.end_date:
            raise ValueError("Start date must be before end date")
    
    def contains(self, check_date: date) -> bool:
        return self.start_date <= check_date <= self.end_date
    
    def duration_days(self) -> int:
        return (self.end_date - self.start_date).days
```

## 🆚 Clean vs Traditional Value Objects

| Aspect | Traditional Value Object | Clean Value Object |
|--------|-------------------------|-------------------|
| **Dependencies** | May depend on ORM/Framework | Zero external dependencies |
| **Validation** | Often uses framework validators | Self-contained business rules |
| **Testing** | May require database/framework setup | Pure unit tests |
| **Reusability** | Tied to specific technology stack | Reusable across projects |

## 🧪 Testing Clean Value Objects

```python
import unittest
from decimal import Decimal

class TestMoney(unittest.TestCase):
    """Clean value objects are easily testable"""
    
    def test_money_creation(self):
        money = Money(Decimal('100.50'), 'USD')
        self.assertEqual(money.amount, Decimal('100.50'))
        self.assertEqual(money.currency, 'USD')
    
    def test_business_rule_negative_amount(self):
        with self.assertRaises(ValueError):
            Money(Decimal('-10.00'), 'USD')
    
    def test_business_rule_currency_validation(self):
        with self.assertRaises(ValueError):
            Money(Decimal('100'), 'INVALID')
    
    def test_addition_same_currency(self):
        money1 = Money(Decimal('100'), 'USD')
        money2 = Money(Decimal('50'), 'USD')
        result = money1.add(money2)
        self.assertEqual(result.amount, Decimal('150'))
    
    def test_addition_different_currency_fails(self):
        usd_money = Money(Decimal('100'), 'USD')
        eur_money = Money(Decimal('50'), 'EUR')
        with self.assertRaises(ValueError):
            usd_money.add(eur_money)

# No database, no framework, no external dependencies needed!
```

## 🎯 Best Practices

### 1. **Use Type Hints**
```python
@dataclass(frozen=True)
class ProductId:
    value: UUID
    
    @classmethod
    def generate(cls) -> 'ProductId':
        return cls(uuid4())
```

### 2. **Factory Methods for Complex Creation**
```python
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str
    
    @classmethod
    def dollars(cls, amount: str) -> 'Money':
        return cls(Decimal(amount), 'USD')
    
    @classmethod
    def zero(cls, currency: str = 'USD') -> 'Money':
        return cls(Decimal('0'), currency)

# Usage
price = Money.dollars('29.99')
empty_balance = Money.zero()
```

### 3. **Rich Behavior, Not Just Data**
```python
@dataclass(frozen=True)
class Age:
    years: int
    
    def __post_init__(self):
        if self.years < 0 or self.years > 150:
            raise ValueError("Invalid age")
    
    def is_adult(self) -> bool:
        return self.years >= 18
    
    def is_senior(self) -> bool:
        return self.years >= 65
    
    def can_vote(self) -> bool:
        return self.years >= 18
    
    def can_drink_alcohol_us(self) -> bool:
        return self.years >= 21
```

## 🚀 Integration with Entities

```python
class User:
    """Clean Entity using Clean Value Objects"""
    
    def __init__(self, user_id: UUID, email: Email, name: str):
        self._id = user_id
        self._email = email  # Clean Value Object
        self._name = name
        self._balance = Money.zero()  # Clean Value Object
    
    def add_funds(self, amount: Money) -> None:
        self._balance = self._balance.add(amount)  # Immutable operation
    
    def can_afford(self, price: Money) -> bool:
        try:
            # This will fail if currencies don't match (business rule)
            remaining = self._balance.add(price.multiply(Decimal('-1')))
            return remaining.amount >= 0
        except ValueError:
            return False  # Different currencies
```

---

> **Key Takeaway**: Clean Value Objects are the foundation of Clean DDD. They encapsulate business rules, remain framework-independent, and provide a solid base for building more complex domain logic.