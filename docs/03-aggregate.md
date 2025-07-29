# 聚合(Aggregate) - Python Clean DDD实现指南

## 概念本质

聚合是DDD中**数据修改的基本单元**，它定义了**一致性边界**，确保业务不变性得到保护。聚合将相关的实体和值对象组织在一起，通过聚合根控制对内部对象的访问。

> **核心理念**：聚合不是技术概念，而是业务概念。它回答了"哪些对象必须在一起保持一致性"这个业务问题。

## Clean DDD中的聚合原则

基于参考博文，Clean DDD强调以下核心原则：

### 1. 聚合不相互引用
```python
# ❌ 错误：聚合间直接引用
class Order:
    def __init__(self):
        self.customer: Customer = None  # 直接引用另一个聚合

# ✅ 正确：通过ID引用
class Order:
    def __init__(self, customer_id: CustomerId):
        self.customer_id = customer_id  # 只保存ID引用
```

### 2. 一个命令仅操作一个聚合
```python
# ❌ 错误：一个命令修改多个聚合
def process_order(order: Order, customer: Customer, inventory: Inventory):
    order.confirm()        # 修改订单聚合
    customer.add_points()  # 修改客户聚合  
    inventory.reduce()     # 修改库存聚合

# ✅ 正确：一个命令只修改一个聚合
def confirm_order(order: Order):
    order.confirm()  # 只修改订单聚合
    # 其他聚合的修改通过领域事件触发
```

### 3. 聚合不共享实体
```python
# ❌ 错误：多个聚合共享同一个实体
class Order:
    def __init__(self):
        self.items: List[OrderItem] = []

class ShoppingCart:
    def __init__(self):
        self.items: List[OrderItem] = []  # 共享OrderItem实体

# ✅ 正确：每个聚合拥有自己的实体
class Order:
    def __init__(self):
        self.items: List[OrderItem] = []

class ShoppingCart:
    def __init__(self):
        self.items: List[CartItem] = []  # 不同的实体类型
```

### 4. 聚合间通过事件传递影响
```python
class Order:
    def confirm(self):
        # 修改自身状态
        self.status = OrderStatus.CONFIRMED
        
        # 通过事件影响其他聚合
        self._add_domain_event(OrderConfirmedEvent(
            order_id=self.id,
            customer_id=self.customer_id,
            total_amount=self.total_amount
        ))
```

## Python中的聚合实现

### 聚合根基类设计

```python
from typing import List, TypeVar, Generic
from abc import ABC, abstractmethod
from datetime import datetime

TId = TypeVar('TId', bound=EntityId)

class DomainEvent(ABC):
    """领域事件基类"""
    def __init__(self):
        self.occurred_on = datetime.utcnow()
        self.event_id = str(uuid4())

class AggregateRoot(Entity[TId], ABC):
    """聚合根基类"""
    
    def __init__(self, id: TId):
        super().__init__(id)
        self._domain_events: List[DomainEvent] = []
        self._is_deleted = False
    
    def _add_domain_event(self, event: DomainEvent) -> None:
        """添加领域事件"""
        self._domain_events.append(event)
    
    def clear_domain_events(self) -> List[DomainEvent]:
        """清空并返回领域事件（通常在持久化后调用）"""
        events = self._domain_events.copy()
        self._domain_events.clear()
        return events
    
    def get_uncommitted_events(self) -> List[DomainEvent]:
        """获取未提交的事件（只读）"""
        return self._domain_events.copy()
    
    @property
    def is_deleted(self) -> bool:
        """是否已删除"""
        return self._is_deleted
    
    def _mark_as_deleted(self) -> None:
        """标记为已删除"""
        self._is_deleted = True
        self._mark_updated()
    
    @abstractmethod
    def _validate_business_rules(self) -> None:
        """验证业务不变性（子类必须实现）"""
        pass
    
    def _ensure_valid_state(self) -> None:
        """确保聚合处于有效状态"""
        if self._is_deleted:
            raise ValueError(f"已删除的聚合不能执行操作: {self.id}")
        self._validate_business_rules()
```

### 订单聚合实现

```python
from typing import List, Optional, Dict
from decimal import Decimal
from enum import Enum

# 领域事件定义
@dataclass
class OrderCreatedEvent(DomainEvent):
    order_id: OrderId
    customer_id: CustomerId

@dataclass  
class OrderConfirmedEvent(DomainEvent):
    order_id: OrderId
    customer_id: CustomerId
    total_amount: Money

@dataclass
class OrderItemAddedEvent(DomainEvent):
    order_id: OrderId
    product_id: ProductId
    quantity: int
    unit_price: Money

class OrderAggregate(AggregateRoot[OrderId]):
    """订单聚合根"""
    
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
        self._payment_method: Optional[str] = None
        
        # 发布聚合创建事件
        self._add_domain_event(OrderCreatedEvent(id, customer_id))
    
    @classmethod
    def create(cls, 
               customer_id: CustomerId,
               shipping_address: Address) -> 'OrderAggregate':
        """工厂方法：创建新订单"""
        order_id = OrderId.generate()
        return cls(order_id, customer_id, shipping_address)
    
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
        return self._items.copy()  # 返回副本，保护内部状态
    
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
    def item_count(self) -> int:
        """商品总数量"""
        return sum(item.quantity for item in self._items)
    
    @property
    def is_empty(self) -> bool:
        """是否空订单"""
        return len(self._items) == 0
    
    @property
    def can_be_modified(self) -> bool:
        """是否可以修改"""
        return self._status in [OrderStatus.DRAFT, OrderStatus.CONFIRMED]
    
    # 业务方法（聚合的行为）
    def add_item(self, 
                 product_id: ProductId,
                 product_name: str,
                 quantity: int,
                 unit_price: Money) -> None:
        """添加订单项"""
        self._ensure_valid_state()
        
        if not self.can_be_modified:
            raise ValueError(f"订单状态为{self._status.value}，不能添加商品")
        
        if quantity <= 0:
            raise ValueError("商品数量必须大于0")
        
        if unit_price.is_zero_or_negative:
            raise ValueError("商品单价必须大于0")
        
        # 检查是否已存在相同商品
        existing_item = self._find_item_by_product_id(product_id)
        if existing_item:
            # 合并数量
            new_quantity = existing_item.quantity + quantity
            self._update_item_quantity_internal(existing_item, new_quantity)
        else:
            # 添加新商品
            new_item = OrderItem(product_id, product_name, quantity, unit_price)
            self._items.append(new_item)
        
        self._mark_updated()
        self._add_domain_event(OrderItemAddedEvent(
            self.id, product_id, quantity, unit_price
        ))
    
    def remove_item(self, product_id: ProductId) -> None:
        """移除订单项"""
        self._ensure_valid_state()
        
        if not self.can_be_modified:
            raise ValueError(f"订单状态为{self._status.value}，不能移除商品")
        
        item = self._find_item_by_product_id(product_id)
        if not item:
            raise ValueError(f"商品{product_id}不存在于订单中")
        
        self._items.remove(item)
        self._mark_updated()
    
    def update_item_quantity(self, product_id: ProductId, new_quantity: int) -> None:
        """更新商品数量"""
        self._ensure_valid_state()
        
        if not self.can_be_modified:
            raise ValueError(f"订单状态为{self._status.value}，不能修改商品数量")
        
        if new_quantity <= 0:
            raise ValueError("商品数量必须大于0")
        
        item = self._find_item_by_product_id(product_id)
        if not item:
            raise ValueError(f"商品{product_id}不存在于订单中")
        
        self._update_item_quantity_internal(item, new_quantity)
        self._mark_updated()
    
    def apply_discount(self, discount_amount: Money, reason: str = "") -> None:
        """应用折扣"""
        self._ensure_valid_state()
        
        if discount_amount.is_negative:
            raise ValueError("折扣金额不能为负数")
        
        if discount_amount.amount > self.subtotal.amount:
            raise ValueError("折扣金额不能超过商品小计")
        
        self._discount_amount = discount_amount
        if reason:
            self._notes = f"折扣原因：{reason}"
        
        self._mark_updated()
    
    def set_shipping_cost(self, shipping_cost: Money) -> None:
        """设置运费"""
        self._ensure_valid_state()
        
        if shipping_cost.is_negative:
            raise ValueError("运费不能为负数")
        
        self._shipping_cost = shipping_cost
        self._mark_updated()
    
    def update_shipping_address(self, new_address: Address) -> None:
        """更新配送地址"""
        self._ensure_valid_state()
        
        if not self.can_be_modified:
            raise ValueError(f"订单状态为{self._status.value}，不能修改配送地址")
        
        self._shipping_address = new_address
        self._mark_updated()
    
    def set_payment_method(self, payment_method: str) -> None:
        """设置支付方式"""
        self._ensure_valid_state()
        
        if not payment_method:
            raise ValueError("支付方式不能为空")
        
        allowed_methods = ["支付宝", "微信支付", "银行卡", "现金"]
        if payment_method not in allowed_methods:
            raise ValueError(f"不支持的支付方式：{payment_method}")
        
        self._payment_method = payment_method
        self._mark_updated()
    
    def confirm(self) -> None:
        """确认订单"""
        self._ensure_valid_state()
        
        if self._status != OrderStatus.DRAFT:
            raise ValueError(f"只有草稿状态的订单才能确认，当前状态：{self._status.value}")
        
        if self.is_empty:
            raise ValueError("空订单不能确认")
        
        if not self._payment_method:
            raise ValueError("必须设置支付方式才能确认订单")
        
        self._status = OrderStatus.CONFIRMED
        self._mark_updated()
        
        # 发布订单确认事件
        self._add_domain_event(OrderConfirmedEvent(
            self.id, self._customer_id, self.total_amount
        ))
    
    def cancel(self, reason: str) -> None:
        """取消订单"""
        self._ensure_valid_state()
        
        if self._status in [OrderStatus.SHIPPED, OrderStatus.DELIVERED]:
            raise ValueError(f"订单已{self._status.value}，不能取消")
        
        if not reason:
            raise ValueError("取消原因不能为空")
        
        old_status = self._status
        self._status = OrderStatus.CANCELLED
        self._notes = f"取消原因：{reason}"
        self._mark_updated()
        
        self._add_domain_event(OrderCancelledEvent(
            self.id, old_status, reason
        ))
    
    def mark_as_paid(self, payment_id: str) -> None:
        """标记为已支付"""
        self._ensure_valid_state()
        
        if self._status != OrderStatus.CONFIRMED:
            raise ValueError("只有已确认的订单才能标记为已支付")
        
        self._status = OrderStatus.PAID
        self._notes = f"支付ID：{payment_id}"
        self._mark_updated()
        
        self._add_domain_event(OrderPaidEvent(self.id, payment_id, self.total_amount))
    
    def ship(self, tracking_number: Optional[str] = None) -> None:
        """发货"""
        self._ensure_valid_state()
        
        if self._status != OrderStatus.PAID:
            raise ValueError("只有已支付的订单才能发货")
        
        self._status = OrderStatus.SHIPPED
        if tracking_number:
            self._notes = f"快递单号：{tracking_number}"
        self._mark_updated()
        
        self._add_domain_event(OrderShippedEvent(self.id, tracking_number))
    
    def deliver(self) -> None:
        """确认送达"""
        self._ensure_valid_state()
        
        if self._status != OrderStatus.SHIPPED:
            raise ValueError("只有已发货的订单才能确认送达")
        
        self._status = OrderStatus.DELIVERED
        self._mark_updated()
        
        self._add_domain_event(OrderDeliveredEvent(self.id))
    
    # 业务不变性验证
    def _validate_business_rules(self) -> None:
        """验证业务不变性"""
        # 规则1：订单必须有客户ID
        if not self._customer_id:
            raise ValueError("订单必须有客户ID")
        
        # 规则2：订单必须有配送地址
        if not self._shipping_address:
            raise ValueError("订单必须有配送地址")
        
        # 规则3：已确认的订单必须有支付方式
        if self._status != OrderStatus.DRAFT and not self._payment_method:
            raise ValueError("已确认的订单必须有支付方式")
        
        # 规则4：订单项数量限制
        if len(self._items) > 50:
            raise ValueError("单笔订单商品种类不能超过50种")
        
        # 规则5：订单总金额限制
        if self.total_amount.amount > Decimal('100000'):
            raise ValueError("单笔订单金额不能超过10万元")
        
        # 规则6：折扣金额不能超过商品小计
        if self._discount_amount.amount > self.subtotal.amount:
            raise ValueError("折扣金额不能超过商品小计")
    
    # 私有辅助方法
    def _find_item_by_product_id(self, product_id: ProductId) -> Optional[OrderItem]:
        """根据商品ID查找订单项"""
        return next((item for item in self._items if item.product_id == product_id), None)
    
    def _update_item_quantity_internal(self, item: OrderItem, new_quantity: int) -> None:
        """更新商品数量（内部方法）"""
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
```

### 客户聚合实现

```python
@dataclass
class CustomerCreatedEvent(DomainEvent):
    customer_id: CustomerId
    name: PersonName
    email: Email

@dataclass
class CustomerLevelUpgradedEvent(DomainEvent):
    customer_id: CustomerId
    old_level: CustomerLevel
    new_level: CustomerLevel

class CustomerAggregate(AggregateRoot[CustomerId]):
    """客户聚合根"""
    
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
        self._total_spent = Money.zero()
        self._registration_date = datetime.utcnow()
        self._last_login_at: Optional[datetime] = None
        
        # 发布客户创建事件
        self._add_domain_event(CustomerCreatedEvent(id, name, email))
    
    @classmethod
    def create(cls, 
               name: PersonName,
               email: Email,
               phone: Optional[PhoneNumber] = None) -> 'CustomerAggregate':
        """工厂方法：创建新客户"""
        customer_id = CustomerId.generate()
        return cls(customer_id, name, email, phone)
    
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
        return self._addresses.copy()
    
    @property
    def total_spent(self) -> Money:
        return self._total_spent
    
    @property
    def is_active(self) -> bool:
        return self._status == CustomerStatus.ACTIVE
    
    @property
    def is_vip(self) -> bool:
        return self._level in [CustomerLevel.VIP, CustomerLevel.PREMIUM]
    
    # 业务方法
    def change_name(self, new_name: PersonName) -> None:
        """修改姓名"""
        self._ensure_valid_state()
        
        if self._name == new_name:
            return  # 没有变化
        
        old_name = self._name
        self._name = new_name
        self._mark_updated()
        
        self._add_domain_event(CustomerNameChangedEvent(self.id, old_name, new_name))
    
    def change_email(self, new_email: Email) -> None:
        """修改邮箱"""
        self._ensure_valid_state()
        
        if self._email == new_email:
            return  # 没有变化
        
        old_email = self._email
        self._email = new_email
        self._mark_updated()
        
        self._add_domain_event(CustomerEmailChangedEvent(self.id, old_email, new_email))
    
    def add_address(self, address: Address) -> None:
        """添加地址"""
        self._ensure_valid_state()
        
        if len(self._addresses) >= 5:
            raise ValueError("客户地址不能超过5个")
        
        # 检查是否已存在相同地址
        if any(addr.full_address == address.full_address for addr in self._addresses):
            raise ValueError("地址已存在")
        
        self._addresses.append(address)
        self._mark_updated()
    
    def remove_address(self, address: Address) -> None:
        """移除地址"""
        self._ensure_valid_state()
        
        try:
            self._addresses.remove(address)
            self._mark_updated()
        except ValueError:
            raise ValueError("地址不存在")
    
    def suspend(self, reason: str) -> None:
        """暂停客户"""
        self._ensure_valid_state()
        
        if not reason:
            raise ValueError("暂停原因不能为空")
        
        if self._status == CustomerStatus.SUSPENDED:
            return  # 已经暂停
        
        old_status = self._status
        self._status = CustomerStatus.SUSPENDED
        self._mark_updated()
        
        self._add_domain_event(CustomerSuspendedEvent(self.id, old_status, reason))
    
    def activate(self) -> None:
        """激活客户"""
        self._ensure_valid_state()
        
        if self._status == CustomerStatus.ACTIVE:
            return  # 已经激活
        
        old_status = self._status
        self._status = CustomerStatus.ACTIVE
        self._mark_updated()
        
        self._add_domain_event(CustomerActivatedEvent(self.id, old_status))
    
    def record_spending(self, amount: Money) -> None:
        """记录消费金额"""
        self._ensure_valid_state()
        
        if amount.is_zero_or_negative:
            raise ValueError("消费金额必须大于0")
        
        old_total = self._total_spent
        old_level = self._level
        
        self._total_spent = self._total_spent.add(amount)
        self._check_level_upgrade()
        
        self._mark_updated()
        
        # 如果等级有变化，发布升级事件
        if self._level != old_level:
            self._add_domain_event(CustomerLevelUpgradedEvent(
                self.id, old_level, self._level
            ))
    
    def record_login(self) -> None:
        """记录登录"""
        self._ensure_valid_state()
        
        self._last_login_at = datetime.utcnow()
        self._mark_updated()
    
    def can_place_order(self, order_amount: Money) -> bool:
        """判断是否可以下单"""
        if not self.is_active:
            return False
        
        # VIP客户无限制，普通客户单笔订单不超过5000元
        if self.is_vip:
            return True
        
        return order_amount.amount <= Decimal('5000')
    
    def get_discount_rate(self) -> Decimal:
        """获取折扣比例"""
        if self._level == CustomerLevel.PREMIUM:
            return Decimal('0.20')  # 8折
        elif self._level == CustomerLevel.VIP:
            return Decimal('0.10')  # 9折
        else:
            return Decimal('0.00')  # 无折扣
    
    # 业务不变性验证
    def _validate_business_rules(self) -> None:
        """验证业务不变性"""
        # 规则1：客户必须有姓名
        if not self._name:
            raise ValueError("客户必须有姓名")
        
        # 规则2：客户必须有邮箱
        if not self._email:
            raise ValueError("客户必须有邮箱")
        
        # 规则3：地址数量限制
        if len(self._addresses) > 5:
            raise ValueError("客户地址不能超过5个")
        
        # 规则4：消费金额不能为负
        if self._total_spent.is_negative:
            raise ValueError("客户消费总额不能为负数")
    
    # 私有辅助方法
    def _check_level_upgrade(self) -> None:
        """检查客户等级升级"""
        if self._level == CustomerLevel.PREMIUM:
            return  # 已经是最高等级
        
        # 业务规则：消费满1万升级为VIP，满5万升级为Premium
        if (self._total_spent.amount >= Decimal('10000') and 
            self._level == CustomerLevel.REGULAR):
            self._level = CustomerLevel.VIP
        
        elif (self._total_spent.amount >= Decimal('50000') and 
              self._level == CustomerLevel.VIP):
            self._level = CustomerLevel.PREMIUM
```

## 聚合设计最佳实践

### 1. 聚合边界设计
```python
# ✅ 好的聚合边界：围绕业务不变性
class OrderAggregate:
    # 订单和订单项必须保持一致性
    def __init__(self):
        self._items: List[OrderItem] = []
        self._total_amount: Money = Money.zero()
    
    def add_item(self, item: OrderItem):
        self._items.append(item)
        self._recalculate_total()  # 保持一致性

# ❌ 避免：过大的聚合
class CustomerOrderAggregate:  # 将客户和订单放在一个聚合中
    def __init__(self):
        self.customer: Customer = None
        self.orders: List[Order] = []  # 这会让聚合变得很大
```

### 2. 聚合根的访问控制
```python
class OrderAggregate(AggregateRoot[OrderId]):
    def __init__(self):
        self._items: List[OrderItem] = []  # 私有字段
    
    @property
    def items(self) -> List[OrderItem]:
        return self._items.copy()  # 返回副本，防止外部修改
    
    def add_item(self, item: OrderItem) -> None:
        # 通过方法控制访问，确保业务规则得到执行
        self._items.append(item)
        self._validate_business_rules()
```

### 3. 聚合间协作
```python
# ✅ 通过领域事件协作
class OrderAggregate:
    def confirm(self):
        self._status = OrderStatus.CONFIRMED
        # 发布事件，让其他聚合响应
        self._add_domain_event(OrderConfirmedEvent(
            self.id, self.customer_id, self.total_amount
        ))

# 事件处理器处理跨聚合逻辑
class CustomerEventHandler:
    def handle_order_confirmed(self, event: OrderConfirmedEvent):
        # 更新客户聚合
        customer = self.customer_repository.get_by_id(event.customer_id)
        customer.record_spending(event.total_amount)
        self.customer_repository.save(customer)
```

### 4. 聚合加载策略
```python
class OrderRepository:
    async def get_by_id(self, order_id: OrderId) -> Optional[OrderAggregate]:
        """加载完整的订单聚合"""
        # 一次性加载聚合的所有数据
        order_data = await self._load_order_with_items(order_id)
        if not order_data:
            return None
        
        # 重建聚合状态
        order = OrderAggregate.reconstitute(order_data)
        return order
    
    async def save(self, order: OrderAggregate) -> None:
        """保存整个聚合"""
        # 作为一个事务保存聚合的所有变化
        async with self.db.transaction():
            await self._save_order(order)
            await self._save_order_items(order)
            
            # 发布领域事件
            events = order.clear_domain_events()
            for event in events:
                await self.event_publisher.publish(event)
```

## 聚合的测试策略

### 单元测试示例

```python
import pytest

class TestOrderAggregate:
    """订单聚合测试"""
    
    def test_create_order(self):
        """测试创建订单"""
        customer_id = CustomerId.generate()
        address = self._create_test_address()
        
        order = OrderAggregate.create(customer_id, address)
        
        assert order.customer_id == customer_id
        assert order.shipping_address == address
        assert order.status == OrderStatus.DRAFT
        assert order.is_empty
        
        # 检查领域事件
        events = order.get_uncommitted_events()
        assert len(events) == 1
        assert isinstance(events[0], OrderCreatedEvent)
    
    def test_add_item_to_order(self):
        """测试添加订单项"""
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
        
        # 检查领域事件
        events = order.get_uncommitted_events()
        item_added_events = [e for e in events if isinstance(e, OrderItemAddedEvent)]
        assert len(item_added_events) == 1
    
    def test_confirm_order_publishes_event(self):
        """测试确认订单发布事件"""
        order = self._create_test_order()
        order.add_item(
            ProductId("PROD-001"), "iPhone 15", 1, Money.from_yuan(5999)
        )
        order.set_payment_method("支付宝")
        
        order.confirm()
        
        assert order.status == OrderStatus.CONFIRMED
        
        # 检查领域事件
        events = order.get_uncommitted_events()
        confirmed_events = [e for e in events if isinstance(e, OrderConfirmedEvent)]
        assert len(confirmed_events) == 1
        assert confirmed_events[0].total_amount == Money.from_yuan(5999)
    
    def test_business_rule_validation(self):
        """测试业务规则验证"""
        order = self._create_test_order()
        
        # 测试空订单不能确认
        with pytest.raises(ValueError, match="空订单不能确认"):
            order.confirm()
        
        # 测试没有支付方式不能确认
        order.add_item(ProductId("PROD-001"), "iPhone 15", 1, Money.from_yuan(5999))
        with pytest.raises(ValueError, match="必须设置支付方式才能确认订单"):
            order.confirm()
    
    def test_aggregate_consistency(self):
        """测试聚合一致性"""
        order = self._create_test_order()
        
        # 添加商品
        order.add_item(ProductId("PROD-001"), "iPhone 15", 2, Money.from_yuan(5999))
        
        # 应用折扣
        order.apply_discount(Money.from_yuan(1000), "VIP折扣")
        
        # 设置运费
        order.set_shipping_cost(Money.from_yuan(20))
        
        # 验证总金额计算正确
        expected_total = Money.from_yuan(5999 * 2 - 1000 + 20)  # 11998 - 1000 + 20 = 11018
        assert order.total_amount == expected_total
    
    def test_cannot_modify_confirmed_order(self):
        """测试不能修改已确认的订单"""
        order = self._create_test_order()
        order.add_item(ProductId("PROD-001"), "iPhone 15", 1, Money.from_yuan(5999))
        order.set_payment_method("支付宝")
        order.confirm()
        
        # 尝试添加商品应该失败
        with pytest.raises(ValueError, match="不能添加商品"):
            order.add_item(ProductId("PROD-002"), "iPad", 1, Money.from_yuan(3999))
    
    def _create_test_order(self) -> OrderAggregate:
        """创建测试用订单"""
        return OrderAggregate.create(
            customer_id=CustomerId.generate(),
            shipping_address=self._create_test_address()
        )
    
    def _create_test_address(self) -> Address:
        """创建测试用地址"""
        return Address(
            country="中国",
            province="北京",
            city="北京市", 
            district="朝阳区",
            street="三里屯街道",
            postal_code="100027"
        )

class TestCustomerAggregate:
    """客户聚合测试"""
    
    def test_create_customer(self):
        """测试创建客户"""
        name = PersonName("张", "三")
        email = Email("zhang@example.com")
        
        customer = CustomerAggregate.create(name, email)
        
        assert customer.name == name
        assert customer.email == email
        assert customer.status == CustomerStatus.ACTIVE
        assert customer.level == CustomerLevel.REGULAR
        
        # 检查领域事件
        events = customer.get_uncommitted_events()
        assert len(events) == 1
        assert isinstance(events[0], CustomerCreatedEvent)
    
    def test_customer_level_upgrade(self):
        """测试客户等级升级"""
        customer = self._create_test_customer()
        
        # 消费9999元，应该还是普通客户
        customer.record_spending(Money.from_yuan(9999))
        assert customer.level == CustomerLevel.REGULAR
        
        # 再消费1元，应该升级为VIP
        customer.record_spending(Money.from_yuan(1))
        assert customer.level == CustomerLevel.VIP
        
        # 检查升级事件
        events = customer.get_uncommitted_events()
        upgrade_events = [e for e in events if isinstance(e, CustomerLevelUpgradedEvent)]
        assert len(upgrade_events) == 1
        assert upgrade_events[0].new_level == CustomerLevel.VIP
    
    def _create_test_customer(self) -> CustomerAggregate:
        """创建测试用客户"""
        return CustomerAggregate.create(
            name=PersonName("张", "三"),
            email=Email("zhang@example.com")
        )
```

## 与其他DDD要素的关系

### 1. 聚合使用实体和值对象
```python
class OrderAggregate(AggregateRoot[OrderId]):  # 聚合根是特殊的实体
    def __init__(self):
        self._items: List[OrderItem] = []      # OrderItem是值对象
        self._shipping_address: Address = None  # Address是值对象
        self._customer_id: CustomerId = None   # CustomerId是值对象
```

### 2. 聚合发布领域事件
```python
class OrderAggregate:
    def confirm(self):
        # 状态变更
        self._status = OrderStatus.CONFIRMED
        
        # 发布领域事件，通知其他聚合
        self._add_domain_event(OrderConfirmedEvent(...))
```

### 3. 聚合通过仓储持久化
```python
class OrderRepository:
    async def save(self, order: OrderAggregate) -> None:
        # 聚合作为一个单元进行持久化
        pass
    
    async def get_by_id(self, order_id: OrderId) -> OrderAggregate:
        # 重建完整的聚合
        pass
```

## 总结

聚合是Clean DDD中管理复杂性的核心模式：

1. **一致性边界**：聚合定义了强一致性的边界
2. **事务边界**：一个事务只修改一个聚合
3. **业务不变性**：聚合确保业务规则始终得到满足
4. **访问控制**：通过聚合根控制对内部对象的访问
5. **解耦协作**：聚合间通过事件进行异步协作

关键设计原则：
- **聚合不相互引用**：通过ID关联，避免直接引用
- **一个命令一个聚合**：保持操作的原子性
- **聚合不共享实体**：每个实体只属于一个聚合
- **事件驱动协作**：通过领域事件实现聚合间通信

在Python中实现聚合的要点：
- 继承AggregateRoot基类
- 实现业务不变性验证
- 通过方法控制状态变更
- 合理发布领域事件
- 考虑聚合的加载和持久化策略

**下一步**：了解了聚合之后，我们将深入学习**领域事件(Domain Events)**，这是实现聚合间解耦协作的关键机制。