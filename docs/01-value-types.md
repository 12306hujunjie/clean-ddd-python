# 值类型(Value Types) - Python Clean DDD实现指南

## 概念本质

值类型是Clean DDD中最基础的构建块，它们将**业务概念**从原始的数据类型（如字符串、整数）中解放出来，成为具有业务语义的一等公民。

> **核心理念**：不要用`str`表示邮箱地址，不要用`int`表示金额，而是创建`Email`和`Money`这样的值类型来明确表达业务意图。

## 要解决的核心问题

### 1. 原始类型偏执 (Primitive Obsession)
```python
# ❌ 原始类型偏执的问题
def send_welcome_email(email: str, name: str) -> None:
    # email和name都是str，容易搞混参数顺序
    pass

def transfer_money(amount: int, from_account: str, to_account: str) -> None:
    # amount用int表示，无法表达货币概念，容易出现精度问题
    pass

# ✅ 使用值类型解决
def send_welcome_email(email: Email, name: PersonName) -> None:
    # 类型明确，不会搞混
    pass

def transfer_money(amount: Money, from_account: AccountId, to_account: AccountId) -> None:
    # 业务概念清晰，类型安全
    pass
```

### 2. 业务规则分散
```python
# ❌ 验证逻辑分散在各处
def register_user(email: str, phone: str):
    if "@" not in email:  # 邮箱验证逻辑
        raise ValueError("无效邮箱")
    if not phone.startswith("1"):  # 手机号验证逻辑
        raise ValueError("无效手机号")
    # ... 其他地方也需要重复这些验证

# ✅ 验证逻辑封装在值类型中
def register_user(email: Email, phone: PhoneNumber):
    # Email和PhoneNumber的创建过程已经包含了验证
    # 这里只需要关注业务逻辑
    pass
```

### 3. 缺乏表达力
```python
# ❌ 难以理解的代码
def calculate_discount(price: int, rate: int) -> int:
    return price * rate // 100

# ✅ 有表达力的代码  
def calculate_discount(price: Money, rate: DiscountRate) -> Money:
    return price.multiply(rate)
```

## Python中的值类型实现

### 基础实现模式

```python
from dataclasses import dataclass
from typing import Union
from decimal import Decimal
import re

@dataclass(frozen=True)  # frozen=True确保不可变性
class Email:
    """邮箱地址值类型"""
    value: str
    
    def __post_init__(self):
        """创建后立即验证"""
        if not self.value:
            raise ValueError("邮箱地址不能为空")
        
        if not re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', self.value):
            raise ValueError(f"无效的邮箱地址: {self.value}")
        
        # 规范化处理
        object.__setattr__(self, 'value', self.value.lower().strip())
    
    def __str__(self) -> str:
        return self.value
    
    @property
    def domain(self) -> str:
        """获取邮箱域名"""
        return self.value.split('@')[1]
    
    def is_corporate_email(self) -> bool:
        """判断是否为企业邮箱"""
        public_domains = {'gmail.com', 'qq.com', '163.com', 'hotmail.com'}
        return self.domain not in public_domains
```

### 复杂值类型：金额处理

```python
from decimal import Decimal, ROUND_HALF_UP
from enum import Enum
from typing import Union

class Currency(Enum):
    """货币枚举"""
    CNY = "CNY"
    USD = "USD" 
    EUR = "EUR"

@dataclass(frozen=True)
class Money:
    """金额值类型 - 处理货币相关的复杂业务逻辑"""
    amount: Decimal
    currency: Currency = Currency.CNY
    
    def __post_init__(self):
        """金额验证和规范化"""
        if not isinstance(self.amount, Decimal):
            # 自动转换为Decimal避免浮点数精度问题
            object.__setattr__(self, 'amount', Decimal(str(self.amount)))
        
        if self.amount < 0:
            raise ValueError(f"金额不能为负数: {self.amount}")
        
        # 保留两位小数
        rounded_amount = self.amount.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        object.__setattr__(self, 'amount', rounded_amount)
    
    @classmethod
    def from_yuan(cls, yuan: Union[int, float, str]) -> 'Money':
        """从元创建金额"""
        return cls(Decimal(str(yuan)), Currency.CNY)
    
    @classmethod
    def from_cents(cls, cents: int, currency: Currency = Currency.CNY) -> 'Money':
        """从分创建金额，避免小数精度问题"""
        return cls(Decimal(cents) / 100, currency)
    
    def __add__(self, other: 'Money') -> 'Money':
        """金额相加"""
        if self.currency != other.currency:
            raise ValueError(f"不同货币不能直接相加: {self.currency} + {other.currency}")
        return Money(self.amount + other.amount, self.currency)
    
    def __sub__(self, other: 'Money') -> 'Money':
        """金额相减"""
        if self.currency != other.currency:
            raise ValueError(f"不同货币不能直接相减: {self.currency} - {other.currency}")
        result_amount = self.amount - other.amount
        if result_amount < 0:
            raise ValueError("计算结果不能为负数")
        return Money(result_amount, self.currency)
    
    def multiply(self, multiplier: Union[int, float, Decimal]) -> 'Money':
        """金额乘法"""
        if not isinstance(multiplier, Decimal):
            multiplier = Decimal(str(multiplier))
        return Money(self.amount * multiplier, self.currency)
    
    def divide_by(self, divisor: Union[int, float, Decimal]) -> 'Money':
        """金额除法"""
        if not isinstance(divisor, Decimal):
            divisor = Decimal(str(divisor))
        if divisor == 0:
            raise ValueError("除数不能为零")
        return Money(self.amount / divisor, self.currency)
    
    def allocate(self, ratios: list[Decimal]) -> list['Money']:
        """按比例分配金额，避免精度损失"""
        if sum(ratios) != Decimal('1'):
            raise ValueError("分配比例之和必须等于1")
        
        # 转换为分进行计算
        total_cents = int(self.amount * 100)
        allocated_cents = []
        
        for ratio in ratios[:-1]:  # 除了最后一个
            cents = int(total_cents * ratio)
            allocated_cents.append(cents)
        
        # 最后一个金额 = 总金额 - 已分配金额（避免舍入误差）
        allocated_cents.append(total_cents - sum(allocated_cents))
        
        return [Money.from_cents(cents, self.currency) for cents in allocated_cents]
    
    def __str__(self) -> str:
        return f"{self.currency.value} {self.amount}"
    
    def __repr__(self) -> str:
        return f"Money(amount={self.amount}, currency={self.currency})"
    
    @property
    def is_zero(self) -> bool:
        """判断是否为零金额"""
        return self.amount == 0
    
    def to_display_string(self) -> str:
        """格式化显示"""
        if self.currency == Currency.CNY:
            return f"¥{self.amount:,.2f}"
        elif self.currency == Currency.USD:
            return f"${self.amount:,.2f}"
        elif self.currency == Currency.EUR:
            return f"€{self.amount:,.2f}"
        else:
            return f"{self.currency.value} {self.amount:,.2f}"
```

### 组合值类型：地址

```python
@dataclass(frozen=True)
class Address:
    """地址值类型 - 展示复杂业务概念的组合"""
    country: str
    province: str  
    city: str
    district: str
    street: str
    postal_code: str
    detail: str = ""
    
    def __post_init__(self):
        """地址验证"""
        required_fields = [self.country, self.province, self.city, self.district, self.street]
        if not all(field.strip() for field in required_fields):
            raise ValueError("地址信息不完整")
        
        # 邮编验证（简化版）
        if self.country == "中国" and not re.match(r'^\d{6}$', self.postal_code):
            raise ValueError(f"无效的中国邮政编码: {self.postal_code}")
    
    @property
    def full_address(self) -> str:
        """完整地址"""
        parts = [self.country, self.province, self.city, self.district, self.street]
        if self.detail:
            parts.append(self.detail)
        return "".join(parts)
    
    @property
    def short_address(self) -> str:
        """简短地址"""
        return f"{self.city}{self.district}{self.street}"
    
    def is_same_city(self, other: 'Address') -> bool:
        """判断是否同城"""
        return (self.country == other.country and 
                self.province == other.province and 
                self.city == other.city)
    
    def calculate_shipping_zone(self) -> str:
        """计算配送区域（业务规则示例）"""
        # 这里可以封装复杂的配送区域计算逻辑
        if self.province in ["北京", "上海", "广东", "江苏"]:
            return "一线区域"
        elif self.province in ["浙江", "山东", "湖北", "四川"]:
            return "二线区域"
        else:
            return "三线区域"
```

### 具有业务方法的值类型

```python
@dataclass(frozen=True)  
class PersonName:
    """人名值类型 - 展示业务方法的封装"""
    first_name: str
    last_name: str
    
    def __post_init__(self):
        if not self.first_name.strip() or not self.last_name.strip():
            raise ValueError("姓名不能为空")
        
        # 规范化处理
        object.__setattr__(self, 'first_name', self.first_name.strip().title())
        object.__setattr__(self, 'last_name', self.last_name.strip().title())
    
    @property
    def full_name(self) -> str:
        """全名"""
        return f"{self.last_name} {self.first_name}"
    
    @property
    def display_name(self) -> str:
        """显示名称（中文习惯）"""
        return f"{self.last_name}{self.first_name}"
    
    @property
    def initials(self) -> str:
        """姓名首字母"""
        return f"{self.first_name[0]}{self.last_name[0]}".upper()
    
    def matches_search(self, search_term: str) -> bool:
        """姓名搜索匹配"""
        search_term = search_term.lower()
        return (search_term in self.full_name.lower() or 
                search_term in self.display_name.lower() or
                search_term == self.initials.lower())
```

## 值类型的测试策略

### 单元测试示例

```python
import pytest
from decimal import Decimal

class TestMoney:
    """Money值类型的测试"""
    
    def test_create_valid_money(self):
        """测试创建有效金额"""
        money = Money.from_yuan(100.50)
        assert money.amount == Decimal('100.50')
        assert money.currency == Currency.CNY
    
    def test_create_money_from_cents(self):
        """测试从分创建金额"""
        money = Money.from_cents(10050)  # 100.50元
        assert money.amount == Decimal('100.50')
    
    def test_negative_amount_raises_error(self):
        """测试负金额抛出异常"""
        with pytest.raises(ValueError, match="金额不能为负数"):
            Money(Decimal('-10'), Currency.CNY)
    
    def test_money_addition(self):
        """测试金额相加"""
        money1 = Money.from_yuan(100)
        money2 = Money.from_yuan(50)
        result = money1 + money2
        assert result.amount == Decimal('150')
    
    def test_different_currency_addition_raises_error(self):
        """测试不同货币相加抛出异常"""
        cny_money = Money(Decimal('100'), Currency.CNY)
        usd_money = Money(Decimal('100'), Currency.USD)
        
        with pytest.raises(ValueError, match="不同货币不能直接相加"):
            cny_money + usd_money
    
    def test_money_allocation(self):
        """测试金额分配"""
        money = Money.from_yuan(100)
        ratios = [Decimal('0.3'), Decimal('0.3'), Decimal('0.4')]
        allocated = money.allocate(ratios)
        
        assert len(allocated) == 3
        assert sum(m.amount for m in allocated) == money.amount
        assert allocated[0].amount == Decimal('30.00')
        assert allocated[1].amount == Decimal('30.00') 
        assert allocated[2].amount == Decimal('40.00')

class TestEmail:
    """Email值类型的测试"""
    
    def test_create_valid_email(self):
        """测试创建有效邮箱"""
        email = Email("user@example.com")
        assert email.value == "user@example.com"
        assert email.domain == "example.com"
    
    def test_email_normalization(self):
        """测试邮箱规范化"""
        email = Email("  USER@EXAMPLE.COM  ")
        assert email.value == "user@example.com"
    
    def test_invalid_email_raises_error(self):
        """测试无效邮箱抛出异常"""
        with pytest.raises(ValueError, match="无效的邮箱地址"):
            Email("invalid-email")
    
    def test_corporate_email_detection(self):
        """测试企业邮箱检测"""
        corporate = Email("user@company.com")
        personal = Email("user@gmail.com")
        
        assert corporate.is_corporate_email() is True
        assert personal.is_corporate_email() is False
```

## 最佳实践

### 1. 设计原则
- **单一职责**：每个值类型只表达一个业务概念
- **不可变性**：使用`frozen=True`确保值对象不可修改
- **自我验证**：在`__post_init__`中进行验证，确保值对象始终有效
- **富含行为**：不只是数据容器，要包含相关的业务方法

### 2. 命名约定
```python
# ✅ 好的命名
Email("user@example.com")
Money.from_yuan(100)
PersonName("张", "三")

# ❌ 避免的命名
EmailString("user@example.com")  # 不要包含类型信息
MoneyValue(100)                  # 不要使用Value后缀
UserName("张三")                 # 要准确反映业务概念
```

### 3. 序列化支持
```python
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: Currency = Currency.CNY
    
    def to_dict(self) -> dict:
        """序列化为字典"""
        return {
            'amount': str(self.amount),  # Decimal序列化为字符串
            'currency': self.currency.value
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'Money':
        """从字典反序列化"""
        return cls(
            amount=Decimal(data['amount']),
            currency=Currency(data['currency'])
        )
```

### 4. 与ORM集成
```python
from sqlalchemy import TypeDecorator, String
from sqlalchemy.types import DECIMAL

class MoneyType(TypeDecorator):
    """SQLAlchemy自定义类型"""
    impl = String
    
    def process_bind_param(self, value, dialect):
        if value is not None:
            return f"{value.amount}|{value.currency.value}"
        return value
    
    def process_result_value(self, value, dialect):
        if value is not None:
            amount_str, currency_str = value.split('|')
            return Money(Decimal(amount_str), Currency(currency_str))
        return value

# 在SQLAlchemy模型中使用
from sqlalchemy import Column, Integer
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True)
    price = Column(MoneyType)  # 直接使用Money值类型
```

## 与其他DDD要素的关系

值类型是构建**实体**和**聚合**的基础构建块：

```python
# 值类型作为实体的属性
@dataclass
class Customer:  # 这是一个实体
    id: CustomerId           # 强类型ID（值类型）
    name: PersonName         # 人名（值类型）
    email: Email            # 邮箱（值类型）
    shipping_address: Address # 地址（值类型）
    
    def change_email(self, new_email: Email) -> None:
        """业务方法：修改邮箱"""
        self.email = new_email
        # 这里可以发布领域事件
```

## 总结

值类型是Clean DDD的基石，它们：

1. **消除原始类型偏执**，让代码更有表达力
2. **封装业务规则**，确保数据的有效性和一致性  
3. **提供类型安全**，减少运行时错误
4. **简化测试**，业务规则集中在值类型中
5. **促进代码复用**，值类型可以在多个聚合中使用

在Python中实现值类型时，要充分利用语言特性：
- 使用`dataclass(frozen=True)`实现不可变性
- 利用`__post_init__`进行验证和规范化
- 通过特殊方法定制行为（`__add__`, `__eq__`等）
- 使用类型提示提供静态检查支持

**下一步**：值类型创建好后，我们将学习如何构建具有身份标识的**实体(Entity)**。