# 实体(Entity) - Python Clean DDD实现指南

## 概念本质

实体是DDD中**有唯一标识的业务对象**，它们代表了业务领域中那些"你需要跟踪其变化"的重要概念。与值类型不同，实体的**身份比其属性更重要**。

> **核心理念**：实体不是数据容器，而是**有身份、有行为、有生命周期**的业务对象。

## 实体的关键特征

### 1. 唯一标识(Identity)
```python
# 每个实体都有在其生命周期内不变的唯一标识
customer1 = Customer(id=CustomerId("123"), name="张三", email="zhang@example.com")
customer2 = Customer(id=CustomerId("123"), name="李四", email="li@example.com")

# 即使属性不同，只要ID相同，就是同一个实体
assert customer1 == customer2  # True，因为ID相同
```

### 2. 可变性(Mutability)
```python
# 实体的属性可以改变，但身份保持不变
customer = Customer(id=CustomerId("123"), name="张三")
customer.change_name("张三丰")  # 属性改变
customer.change_email(Email("new@example.com"))  # 属性改变
# 但customer的身份(ID)始终是"123"
```

### 3. 业务行为(Business Behavior)
```python
# 实体不只是数据容器，包含业务方法
class Order:
    def add_item(self, product: Product, quantity: int) -> None:
        """添加订单项"""
        # 业务逻辑封装在实体内部
        
    def confirm(self) -> None:
        """确认订单"""
        # 业务状态转换
        
    def cancel(self, reason: str) -> None:
        """取消订单"""
        # 业务行为
```

## Python中的实体实现

### 强类型ID设计

```python
from typing import NewType, TypeVar, Generic
from uuid import UUID, uuid4
from dataclasses import dataclass

# 方式1：使用NewType创建强类型ID
CustomerId = NewType('CustomerId', str)
OrderId = NewType('OrderId', str)
ProductId = NewType('ProductId', str)

# 方式2：创建ID基类，提供更多功能
@dataclass(frozen=True)
class EntityId:
    """实体ID基类"""
    value: str
    
    def __post_init__(self):
        if not self.value:
            raise ValueError("实体ID不能为空")
    
    def __str__(self) -> str:
        return self.value

@dataclass(frozen=True)
class CustomerId(EntityId):
    """客户ID"""
    
    @classmethod
    def generate(cls) -> 'CustomerId':
        """生成新的客户ID"""
        return cls(str(uuid4()))
    
    @classmethod
    def from_string(cls, value: str) -> 'CustomerId':
        """从字符串创建客户ID"""
        return cls(value)

@dataclass(frozen=True)
class OrderId(EntityId):
    """订单ID"""
    
    @classmethod
    def generate(cls) -> 'OrderId':
        """生成新的订单ID"""
        return cls(f"ORD-{uuid4().hex[:8].upper()}")
```

### 实体基类设计

```python
from abc import ABC
from typing import TypeVar, Generic, List
from datetime import datetime

TId = TypeVar('TId', bound=EntityId)

class Entity(Generic[TId], ABC):
    """实体基类"""
    
    def __init__(self, id: TId):
        self._id = id
        self._created_at = datetime.utcnow()
        self._updated_at = datetime.utcnow()
        self._version = 0  # 用于乐观锁
    
    @property
    def id(self) -> TId:
        """实体ID（只读）"""
        return self._id
    
    @property
    def created_at(self) -> datetime:
        """创建时间"""
        return self._created_at
    
    @property
    def updated_at(self) -> datetime:
        """更新时间"""
        return self._updated_at
    
    @property
    def version(self) -> int:
        """版本号"""
        return self._version
    
    def __eq__(self, other) -> bool:
        """实体相等性：只比较ID"""
        if not isinstance(other, Entity):
            return False
        return self._id == other._id
    
    def __hash__(self) -> int:
        """基于ID的哈希"""
        return hash(self._id)
    
    def __repr__(self) -> str:
        return f"{self.__class__.__name__}(id={self._id})"
    
    def _mark_updated(self) -> None:
        """标记实体已更新"""
        self._updated_at = datetime.utcnow()
        self._version += 1
```

### 具体实体实现：客户

```python
from typing import Optional, List
from enum import Enum

class CustomerStatus(Enum):
    """客户状态"""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"

class CustomerLevel(Enum):
    """客户等级"""
    REGULAR = "regular"
    VIP = "vip"
    PREMIUM = "premium"

class Customer(Entity[CustomerId]):
    """客户实体"""
    
    def __init__(self, 
                 id: CustomerId,
                 name: PersonName,
                 email: Email,
                 phone: Optional[PhoneNumber] = None):
        super().__init__(id)
        self._name = name
        self._email = email
        self._phone = phone
        self._status = CustomerStatus.ACTIVE
        self._level = CustomerLevel.REGULAR
        self._addresses: List[Address] = []
        self._registration_date = datetime.utcnow()
        self._last_login_at: Optional[datetime] = None
        self._total_spent = Money.zero()
    
    # 属性访问器
    @property
    def name(self) -> PersonName:
        return self._name
    
    @property
    def email(self) -> Email:
        return self._email
    
    @property
    def phone(self) -> Optional[PhoneNumber]:
        return self._phone
    
    @property
    def status(self) -> CustomerStatus:
        return self._status
    
    @property
    def level(self) -> CustomerLevel:
        return self._level
    
    @property
    def addresses(self) -> List[Address]:
        return self._addresses.copy()  # 返回副本，防止外部修改
    
    @property
    def total_spent(self) -> Money:
        return self._total_spent
    
    @property
    def is_active(self) -> bool:
        """是否活跃客户"""
        return self._status == CustomerStatus.ACTIVE
    
    @property
    def is_vip(self) -> bool:
        """是否VIP客户"""
        return self._level in [CustomerLevel.VIP, CustomerLevel.PREMIUM]
    
    # 业务方法
    def change_name(self, new_name: PersonName) -> None:
        """修改姓名"""
        if not new_name:
            raise ValueError("客户姓名不能为空")
        
        old_name = self._name
        self._name = new_name
        self._mark_updated()
        
        # 这里可以发布领域事件
        # self._add_domain_event(CustomerNameChangedEvent(self.id, old_name, new_name))
    
    def change_email(self, new_email: Email) -> None:
        """修改邮箱"""
        if self._email == new_email:
            return  # 没有变化，不需要操作
        
        old_email = self._email
        self._email = new_email
        self._mark_updated()
        
        # 邮箱变更需要重新验证
        # self._add_domain_event(CustomerEmailChangedEvent(self.id, old_email, new_email))
    
    def add_address(self, address: Address) -> None:
        """添加地址"""
        if len(self._addresses) >= 5:  # 业务规则：最多5个地址
            raise ValueError("客户地址不能超过5个")
        
        # 检查是否已存在相同地址
        if any(addr.full_address == address.full_address for addr in self._addresses):
            raise ValueError("地址已存在")
        
        self._addresses.append(address)
        self._mark_updated()
    
    def remove_address(self, address: Address) -> None:
        """移除地址"""
        try:
            self._addresses.remove(address)
            self._mark_updated()
        except ValueError:
            raise ValueError("地址不存在")
    
    def update_phone(self, phone: PhoneNumber) -> None:
        """更新电话"""
        self._phone = phone
        self._mark_updated()
    
    def activate(self) -> None:
        """激活客户"""
        if self._status == CustomerStatus.ACTIVE:
            return
        
        self._status = CustomerStatus.ACTIVE
        self._mark_updated()
    
    def suspend(self, reason: str) -> None:
        """暂停客户"""
        if not reason:
            raise ValueError("暂停原因不能为空")
        
        self._status = CustomerStatus.SUSPENDED
        self._mark_updated()
        
        # self._add_domain_event(CustomerSuspendedEvent(self.id, reason))
    
    def record_login(self) -> None:
        """记录登录时间"""
        self._last_login_at = datetime.utcnow()
        self._mark_updated()
    
    def add_spending(self, amount: Money) -> None:
        """增加消费金额"""
        if amount.is_negative:
            raise ValueError("消费金额不能为负数")
        
        old_total = self._total_spent
        self._total_spent = self._total_spent.add(amount)
        self._mark_updated()
        
        # 检查是否需要升级客户等级
        self._check_level_upgrade(old_total, self._total_spent)
    
    def _check_level_upgrade(self, old_total: Money, new_total: Money) -> None:
        """检查客户等级升级"""
        if self._level == CustomerLevel.PREMIUM:
            return  # 已经是最高等级
        
        # 业务规则：消费满1万升级为VIP，满5万升级为Premium
        if (old_total.amount < 10000 and new_total.amount >= 10000 and 
            self._level == CustomerLevel.REGULAR):
            self._level = CustomerLevel.VIP
            # self._add_domain_event(CustomerLevelUpgradedEvent(self.id, CustomerLevel.VIP))
        
        elif (old_total.amount < 50000 and new_total.amount >= 50000 and 
              self._level == CustomerLevel.VIP):
            self._level = CustomerLevel.PREMIUM
            # self._add_domain_event(CustomerLevelUpgradedEvent(self.id, CustomerLevel.PREMIUM))
    
    def can_place_order(self, order_amount: Money) -> bool:
        """判断是否可以下单"""
        if not self.is_active:
            return False
        
        # VIP客户无限制，普通客户单笔订单不超过5000元
        if self.is_vip:
            return True
        
        return order_amount.amount <= 5000
    
    def get_discount_rate(self) -> Decimal:
        """获取折扣比例"""
        if self._level == CustomerLevel.PREMIUM:
            return Decimal('0.20')  # 8折
        elif self._level == CustomerLevel.VIP:
            return Decimal('0.10')  # 9折
        else:
            return Decimal('0.00')  # 无折扣
```

### 复杂实体：订单

```python
from typing import List, Dict
from decimal import Decimal

class OrderStatus(Enum):
    """订单状态"""
    DRAFT = "draft"           # 草稿
    CONFIRMED = "confirmed"   # 已确认
    PAID = "paid"            # 已支付
    SHIPPED = "shipped"      # 已发货
    DELIVERED = "delivered"  # 已送达
    CANCELLED = "cancelled"  # 已取消

@dataclass
class OrderItem:
    """订单项（值对象）"""
    product_id: ProductId
    product_name: str
    quantity: int
    unit_price: Money
    
    def __post_init__(self):
        if self.quantity <= 0:
            raise ValueError("商品数量必须大于0")
        if self.unit_price.is_negative_or_zero:
            raise ValueError("商品单价必须大于0")
    
    @property
    def total_price(self) -> Money:
        """总价"""
        return self.unit_price.multiply(self.quantity)

class Order(Entity[OrderId]):
    """订单实体"""
    
    def __init__(self, 
                 id: OrderId,
                 customer_id: CustomerId,
                 shipping_address: Address):
        super().__init__(id)
        self._customer_id = customer_id
        self._shipping_address = shipping_address
        self._status = OrderStatus.DRAFT
        self._items: List[OrderItem] = []
        self._discount_amount = Money.zero()
        self._shipping_cost = Money.zero()
        self._notes = ""
    
    # 属性访问器
    @property
    def customer_id(self) -> CustomerId:
        return self._customer_id
    
    @property
    def shipping_address(self) -> Address:
        return self._shipping_address
    
    @property
    def status(self) -> OrderStatus:
        return self._status
    
    @property
    def items(self) -> List[OrderItem]:
        return self._items.copy()
    
    @property
    def item_count(self) -> int:
        """商品总数量"""
        return sum(item.quantity for item in self._items)
    
    @property
    def subtotal(self) -> Money:
        """商品小计"""
        if not self._items:
            return Money.zero()
        
        total = Money.zero()
        for item in self._items:
            total = total.add(item.total_price)
        return total
    
    @property
    def total_amount(self) -> Money:
        """订单总金额"""
        return (self.subtotal
                .subtract(self._discount_amount)
                .add(self._shipping_cost))
    
    @property
    def is_empty(self) -> bool:
        """是否空订单"""
        return len(self._items) == 0
    
    @property 
    def can_be_modified(self) -> bool:
        """是否可以修改"""
        return self._status in [OrderStatus.DRAFT, OrderStatus.CONFIRMED]
    
    # 业务方法
    def add_item(self, product_id: ProductId, product_name: str, 
                 quantity: int, unit_price: Money) -> None:
        """添加订单项"""
        if not self.can_be_modified:
            raise ValueError(f"订单状态为{self._status.value}，不能添加商品")
        
        # 检查是否已存在相同商品
        existing_item = self._find_item_by_product_id(product_id)
        if existing_item:
            # 合并数量
            new_quantity = existing_item.quantity + quantity
            self._update_item_quantity(product_id, new_quantity)
        else:
            # 添加新商品
            item = OrderItem(product_id, product_name, quantity, unit_price)
            self._items.append(item)
        
        self._mark_updated()
    
    def remove_item(self, product_id: ProductId) -> None:
        """移除订单项"""
        if not self.can_be_modified:
            raise ValueError(f"订单状态为{self._status.value}，不能移除商品")
        
        item = self._find_item_by_product_id(product_id)
        if not item:
            raise ValueError(f"商品{product_id}不存在于订单中")
        
        self._items.remove(item)
        self._mark_updated()
    
    def update_item_quantity(self, product_id: ProductId, new_quantity: int) -> None:
        """更新商品数量"""
        if not self.can_be_modified:
            raise ValueError(f"订单状态为{self._status.value}，不能修改商品数量")
        
        if new_quantity <= 0:
            raise ValueError("商品数量必须大于0")
        
        item = self._find_item_by_product_id(product_id)
        if not item:
            raise ValueError(f"商品{product_id}不存在于订单中")
        
        # 创建新的订单项替换旧的（因为OrderItem是值对象，不可变）
        updated_item = OrderItem(
            product_id=item.product_id,
            product_name=item.product_name,
            quantity=new_quantity,
            unit_price=item.unit_price
        )
        
        # 替换订单项
        index = self._items.index(item)
        self._items[index] = updated_item
        self._mark_updated()
    
    def apply_discount(self, discount_amount: Money) -> None:
        """应用折扣"""
        if discount_amount.is_negative:
            raise ValueError("折扣金额不能为负数")
        
        if discount_amount.amount > self.subtotal.amount:
            raise ValueError("折扣金额不能超过商品小计")
        
        self._discount_amount = discount_amount
        self._mark_updated()
    
    def set_shipping_cost(self, shipping_cost: Money) -> None:
        """设置运费"""
        if shipping_cost.is_negative:
            raise ValueError("运费不能为负数")
        
        self._shipping_cost = shipping_cost
        self._mark_updated()
    
    def update_shipping_address(self, new_address: Address) -> None:
        """更新配送地址"""
        if not self.can_be_modified:
            raise ValueError(f"订单状态为{self._status.value}，不能修改配送地址")
        
        self._shipping_address = new_address
        self._mark_updated()
    
    def confirm(self) -> None:
        """确认订单"""
        if self._status != OrderStatus.DRAFT:
            raise ValueError(f"只有草稿状态的订单才能确认，当前状态：{self._status.value}")
        
        if self.is_empty:
            raise ValueError("空订单不能确认")
        
        self._status = OrderStatus.CONFIRMED
        self._mark_updated()
        
        # self._add_domain_event(OrderConfirmedEvent(self.id, self._customer_id, self.total_amount))
    
    def cancel(self, reason: str) -> None:
        """取消订单"""
        if self._status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            raise ValueError(f"订单已{self._status.value}，不能取消")
        
        if not reason:
            raise ValueError("取消原因不能为空")
        
        old_status = self._status
        self._status = OrderStatus.CANCELLED
        self._notes = f"取消原因：{reason}"
        self._mark_updated()
        
        # self._add_domain_event(OrderCancelledEvent(self.id, old_status, reason))
    
    def mark_as_paid(self) -> None:
        """标记为已支付"""
        if self._status != OrderStatus.CONFIRMED:
            raise ValueError("只有已确认的订单才能标记为已支付")
        
        self._status = OrderStatus.PAID
        self._mark_updated()
        
        # self._add_domain_event(OrderPaidEvent(self.id, self.total_amount))
    
    def ship(self, tracking_number: str = None) -> None:
        """发货"""
        if self._status != OrderStatus.PAID:
            raise ValueError("只有已支付的订单才能发货")
        
        self._status = OrderStatus.SHIPPED
        if tracking_number:
            self._notes = f"快递单号：{tracking_number}"
        self._mark_updated()
        
        # self._add_domain_event(OrderShippedEvent(self.id, tracking_number))
    
    def deliver(self) -> None:
        """确认送达"""
        if self._status != OrderStatus.SHIPPED:
            raise ValueError("只有已发货的订单才能确认送达")
        
        self._status = OrderStatus.DELIVERED
        self._mark_updated()
        
        # self._add_domain_event(OrderDeliveredEvent(self.id))
    
    # 私有辅助方法
    def _find_item_by_product_id(self, product_id: ProductId) -> Optional[OrderItem]:
        """根据商品ID查找订单项"""
        return next((item for item in self._items if item.product_id == product_id), None)
    
    def _update_item_quantity(self, product_id: ProductId, new_quantity: int) -> None:
        """更新商品数量（内部方法）"""
        item = self._find_item_by_product_id(product_id)
        if item:
            updated_item = OrderItem(
                product_id=item.product_id,
                product_name=item.product_name,
                quantity=new_quantity,
                unit_price=item.unit_price
            )
            index = self._items.index(item)
            self._items[index] = updated_item
```

## 实体的测试策略

### 单元测试示例

```python
import pytest
from datetime import datetime

class TestCustomer:
    """客户实体测试"""
    
    def test_create_customer(self):
        """测试创建客户"""
        customer_id = CustomerId.generate()
        name = PersonName("张", "三")
        email = Email("zhang@example.com")
        
        customer = Customer(customer_id, name, email)
        
        assert customer.id == customer_id
        assert customer.name == name
        assert customer.email == email
        assert customer.status == CustomerStatus.ACTIVE
        assert customer.level == CustomerLevel.REGULAR
    
    def test_customer_equality_by_id(self):
        """测试客户相等性基于ID"""
        customer_id = CustomerId("123")
        name1 = PersonName("张", "三")
        name2 = PersonName("李", "四")
        email1 = Email("zhang@example.com")
        email2 = Email("li@example.com")
        
        customer1 = Customer(customer_id, name1, email1)
        customer2 = Customer(customer_id, name2, email2)
        
        # 即使属性不同，ID相同就是同一个实体
        assert customer1 == customer2
        assert hash(customer1) == hash(customer2)
    
    def test_change_name(self):
        """测试修改姓名"""
        customer = self._create_test_customer()
        old_version = customer.version
        old_updated_at = customer.updated_at
        
        new_name = PersonName("李", "四")
        customer.change_name(new_name)
        
        assert customer.name == new_name
        assert customer.version == old_version + 1
        assert customer.updated_at > old_updated_at
    
    def test_add_address(self):
        """测试添加地址"""
        customer = self._create_test_customer()
        address = Address(
            country="中国",
            province="北京",
            city="北京市",
            district="朝阳区",
            street="三里屯街道",
            postal_code="100027"
        )
        
        customer.add_address(address)
        
        assert len(customer.addresses) == 1
        assert address in customer.addresses
    
    def test_add_too_many_addresses_raises_error(self):
        """测试添加过多地址抛出异常"""
        customer = self._create_test_customer()
        
        # 添加5个地址（达到上限）
        for i in range(5):
            address = Address(
                country="中国",
                province="北京",
                city="北京市",
                district="朝阳区",
                street=f"街道{i}",
                postal_code="100027"
            )
            customer.add_address(address)
        
        # 尝试添加第6个地址应该失败
        extra_address = Address(
            country="中国",
            province="上海",
            city="上海市",
            district="浦东新区",
            street="陆家嘴",
            postal_code="200120"
        )
        
        with pytest.raises(ValueError, match="客户地址不能超过5个"):
            customer.add_address(extra_address)
    
    def test_spending_level_upgrade(self):
        """测试消费升级客户等级"""
        customer = self._create_test_customer()
        assert customer.level == CustomerLevel.REGULAR
        
        # 消费9999元，应该还是普通客户
        customer.add_spending(Money.from_yuan(9999))
        assert customer.level == CustomerLevel.REGULAR
        
        # 再消费1元，总消费达到10000元，应该升级为VIP
        customer.add_spending(Money.from_yuan(1))
        assert customer.level == CustomerLevel.VIP
        
        # 继续消费到50000元，应该升级为Premium
        customer.add_spending(Money.from_yuan(40000))
        assert customer.level == CustomerLevel.PREMIUM
    
    def _create_test_customer(self) -> Customer:
        """创建测试用客户"""
        return Customer(
            id=CustomerId.generate(),
            name=PersonName("张", "三"),
            email=Email("zhang@example.com")
        )

class TestOrder:
    """订单实体测试"""
    
    def test_create_empty_order(self):
        """测试创建空订单"""
        order = self._create_test_order()
        
        assert order.status == OrderStatus.DRAFT
        assert order.is_empty
        assert order.item_count == 0
        assert order.subtotal.is_zero
        assert order.total_amount.is_zero
    
    def test_add_item_to_order(self):
        """测试向订单添加商品"""
        order = self._create_test_order()
        
        order.add_item(
            product_id=ProductId("PROD-001"),
            product_name="iPhone 15",
            quantity=2,
            unit_price=Money.from_yuan(5999)
        )
        
        assert len(order.items) == 1
        assert order.item_count == 2
        assert order.subtotal == Money.from_yuan(11998)
    
    def test_confirm_order(self):
        """测试确认订单"""
        order = self._create_test_order()
        
        # 添加商品
        order.add_item(
            product_id=ProductId("PROD-001"),
            product_name="iPhone 15",
            quantity=1,
            unit_price=Money.from_yuan(5999)
        )
        
        # 确认订单
        order.confirm()
        
        assert order.status == OrderStatus.CONFIRMED
    
    def test_confirm_empty_order_raises_error(self):
        """测试确认空订单抛出异常"""
        order = self._create_test_order()
        
        with pytest.raises(ValueError, match="空订单不能确认"):
            order.confirm()
    
    def test_cannot_modify_confirmed_order(self):
        """测试不能修改已确认的订单"""
        order = self._create_test_order()
        
        # 添加商品并确认
        order.add_item(
            product_id=ProductId("PROD-001"),
            product_name="iPhone 15",
            quantity=1,
            unit_price=Money.from_yuan(5999)
        )
        order.confirm()
        
        # 尝试添加商品应该失败
        with pytest.raises(ValueError, match="不能添加商品"):
            order.add_item(
                product_id=ProductId("PROD-002"),
                product_name="iPad",
                quantity=1,
                unit_price=Money.from_yuan(3999)
            )
    
    def _create_test_order(self) -> Order:
        """创建测试用订单"""
        return Order(
            id=OrderId.generate(),
            customer_id=CustomerId.generate(),
            shipping_address=Address(
                country="中国",
                province="北京",
                city="北京市",
                district="朝阳区",
                street="三里屯街道",
                postal_code="100027"
            )
        )
```

## 实体设计最佳实践

### 1. ID设计原则
```python
# ✅ 好的ID设计
@dataclass(frozen=True)
class CustomerId(EntityId):
    @classmethod
    def generate(cls) -> 'CustomerId':
        return cls(str(uuid4()))
    
    @classmethod 
    def from_string(cls, value: str) -> 'CustomerId':
        return cls(value)

# ❌ 避免的ID设计
class Customer:
    def __init__(self, id: str):  # 使用原始字符串
        self.id = id
```

### 2. 封装业务逻辑
```python
# ✅ 业务逻辑封装在实体内部
class Customer:
    def upgrade_to_vip(self) -> None:
        if self._total_spent.amount >= 10000:
            self._level = CustomerLevel.VIP
        else:
            raise ValueError("消费金额不足，无法升级为VIP")

# ❌ 业务逻辑暴露在外部
class CustomerService:
    def upgrade_customer_to_vip(self, customer: Customer) -> None:
        if customer.total_spent >= 10000:  # 业务逻辑在服务中
            customer.level = CustomerLevel.VIP
```

### 3. 不变性保护
```python
# ✅ 通过方法修改状态
class Order:
    def add_item(self, item: OrderItem) -> None:
        # 验证和业务逻辑
        self._items.append(item)
        self._mark_updated()

# ❌ 直接暴露可变状态
class Order:
    def __init__(self):
        self.items = []  # 外部可以直接修改
```

### 4. 版本控制和乐观锁
```python
class Entity:
    def __init__(self, id):
        self._version = 0
    
    def _mark_updated(self) -> None:
        self._version += 1
        self._updated_at = datetime.utcnow()

# 在仓储中使用版本控制
class CustomerRepository:
    async def save(self, customer: Customer) -> None:
        # 检查版本冲突
        if await self._has_newer_version(customer):
            raise ConcurrencyError("实体已被其他进程修改")
        await self._do_save(customer)
```

## 与其他DDD要素的关系

### 1. 实体使用值类型
```python
class Customer(Entity[CustomerId]):
    def __init__(self, id: CustomerId, name: PersonName, email: Email):
        # 实体的属性大量使用值类型
        self._name = name      # PersonName值类型
        self._email = email    # Email值类型
        self._addresses: List[Address] = []  # Address值类型列表
```

### 2. 实体是聚合的构建块
```python
# Customer实体可能是一个聚合根
# Order实体也可能是一个聚合根
# 实体通过聚合边界来控制访问和修改
```

### 3. 实体发布领域事件
```python
class Customer(Entity[CustomerId]):
    def change_email(self, new_email: Email) -> None:
        old_email = self._email
        self._email = new_email
        
        # 发布领域事件
        self._add_domain_event(
            CustomerEmailChangedEvent(self.id, old_email, new_email)
        )
```

## 总结

实体是DDD中承载**业务身份和行为**的核心概念：

1. **唯一标识**：每个实体都有在生命周期内不变的ID
2. **可变性**：实体的属性可以改变，但身份保持不变
3. **业务行为**：实体封装了业务逻辑和规则
4. **生命周期**：实体有创建、修改、持久化的完整生命周期
5. **相等性**：基于ID的相等性判断

在Python中实现实体时的关键点：
- 使用强类型ID确保类型安全
- 通过方法控制状态变更，保护不变性
- 实体方法应该表达业务意图
- 合理使用值类型作为实体属性
- 考虑并发控制和版本管理

**下一步**：了解了实体之后，我们将学习如何将相关实体组织成**聚合(Aggregate)**，这是DDD中管理复杂性和保证一致性的关键模式。