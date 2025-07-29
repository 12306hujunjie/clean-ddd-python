# DDD设计决策支持指南

> 解决开发者在DDD实践中的具体设计决策问题

## 🎯 使用说明

这个指南专门解决用户反馈的"核心DDD元素的具体安排说明不足"问题。每个决策点都提供：
- ✅ **明确的判断标准**
- 🔍 **具体的代码示例**
- ⚠️ **常见陷阱提醒**
- 🚀 **最佳实践建议**

---

## 📋 值对象 vs 实体决策流程

### 决策树

```
开始设计一个概念
    ↓
有唯一标识吗？
    ↓ Yes              ↓ No
需要跟踪变化吗？      是否可以互换？
    ↓ Yes    ↓ No         ↓ Yes    ↓ No
   实体     值对象       值对象    考虑实体
```

### 具体判断标准

| 问题 | 值对象 | 实体 |
|------|--------|------|
| 有唯一标识？ | ❌ 无需ID | ✅ 必须有ID |
| 可以替换？ | ✅ 完全可替换 | ❌ 不可替换 |
| 关心历史变化？ | ❌ 只关心当前值 | ✅ 需要跟踪变化 |
| 生命周期？ | 与使用者相同 | 独立的生命周期 |

### 代码示例对比

**值对象示例：**
```python
@dataclass(frozen=True)
class Money:
    """金钱 - 值对象，可以完全替换"""
    amount: Decimal
    currency: str
    
    def __post_init__(self):
        if self.amount < 0:
            raise ValueError("Amount cannot be negative")
    
    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise ValueError("Currency mismatch")
        return Money(self.amount + other.amount, self.currency)

# 使用方式：完全可替换
order_total = Money(Decimal('100.00'), 'USD')
new_total = order_total.add(Money(Decimal('25.00'), 'USD'))
# order_total 没有变化，产生了新的 new_total
```

**实体示例：**
```python
@dataclass
class Customer:
    """客户 - 实体，不可替换，需要跟踪变化"""
    id: CustomerId
    email: str
    name: str
    registration_date: datetime
    
    def change_email(self, new_email: str) -> None:
        """业务操作：改变状态但保持身份"""
        if not self._is_valid_email(new_email):
            raise ValueError("Invalid email format")
        
        old_email = self.email
        self.email = new_email
        
        # 记录变化事件
        self._add_domain_event(
            CustomerEmailChangedEvent(self.id, old_email, new_email)
        )

# 使用方式：修改状态，保持身份
customer = Customer(CustomerId("123"), "old@example.com", "John")
customer.change_email("new@example.com")  # 同一个客户，新的邮箱
```

### ⚠️ 常见陷阱

**陷阱1：把实体设计成值对象**
```python
# ❌ 错误：用户账户应该是实体，不是值对象
@dataclass(frozen=True)  # frozen=True 表示不可变，值对象特征
class UserAccount:
    username: str
    balance: Decimal
    
# ✅ 正确：用户账户是实体，需要跟踪状态变化
@dataclass
class UserAccount:
    id: AccountId
    username: str
    balance: Decimal
    
    def deposit(self, amount: Money) -> None:
        self.balance += amount.amount
        self._add_domain_event(MoneyDepositedEvent(...))
```

**陷阱2：把值对象设计成实体**
```python
# ❌ 错误：地址通常是值对象，不需要ID
@dataclass
class Address:
    id: AddressId  # 不必要的ID
    street: str
    city: str
    
# ✅ 正确：地址是值对象，描述位置信息
@dataclass(frozen=True)
class Address:
    street: str
    city: str
    postal_code: str
    
    def __post_init__(self):
        if not all([self.street, self.city, self.postal_code]):
            raise ValueError("Address must be complete")
```

---

## 🏗️ 聚合边界设计检查清单

### 聚合设计原则

1. **一致性边界**：聚合内部必须保持业务不变式
2. **最小化原则**：聚合应该尽可能小
3. **单一职责**：一个聚合只负责一个业务概念
4. **独立修改**：不同聚合可以独立开发和部署

### 设计检查清单

**步骤1：识别业务边界**
- [ ] 是否有清晰的业务概念边界？
- [ ] 这些对象是否必须同时修改？
- [ ] 是否存在必须保持的业务规则？

**步骤2：验证一致性需求**
- [ ] 聚合内的对象是否需要强一致性？
- [ ] 是否可以接受最终一致性？
- [ ] 业务规则违反时是否会导致数据损坏？

**步骤3：评估聚合大小**
- [ ] 聚合是否过大（包含过多实体）？
- [ ] 是否可以拆分为多个更小的聚合？
- [ ] 修改频率是否合理？

### 聚合设计示例

**好的聚合设计：**
```python
class OrderAggregate:
    """订单聚合 - 保持订单业务规则的一致性"""
    
    def __init__(self, customer_id: CustomerId):
        self.id = OrderId.generate()
        self.customer_id = customer_id
        self.order_items: List[OrderItem] = []
        self.status = OrderStatus.DRAFT
        self.total_amount = Money(Decimal('0'), 'USD')
    
    def add_item(self, product_id: ProductId, quantity: int, unit_price: Money) -> None:
        """业务规则：只有草稿状态的订单可以添加商品"""
        if self.status != OrderStatus.DRAFT:
            raise BusinessRuleViolationError(
                "Cannot add items to non-draft order"
            )
        
        item = OrderItem(product_id, quantity, unit_price)
        self.order_items.append(item)
        self._recalculate_total()  # 保持聚合内一致性
    
    def confirm(self) -> None:
        """业务规则：确认订单必须有商品且总金额大于0"""
        if not self.order_items:
            raise BusinessRuleViolationError("Cannot confirm empty order")
        
        if self.total_amount.amount <= 0:
            raise BusinessRuleViolationError("Order total must be positive")
        
        self.status = OrderStatus.CONFIRMED
        self._add_domain_event(OrderConfirmedEvent(self.id, self.customer_id))
    
    def _recalculate_total(self) -> None:
        """私有方法：维护聚合内部一致性"""
        total = sum(item.line_total().amount for item in self.order_items)
        self.total_amount = Money(Decimal(str(total)), 'USD')
```

**不好的聚合设计（过大）：**
```python
# ❌ 聚合过大，包含了不应该在一起的概念
class CustomerOrderManagementAggregate:
    def __init__(self):
        self.customer: Customer           # 客户信息
        self.orders: List[Order]         # 订单列表
        self.shipping_addresses: List[Address]  # 配送地址
        self.payment_methods: List[PaymentMethod]  # 支付方式
        self.preferences: CustomerPreferences      # 客户偏好
        
    # 这个聚合太大，违反了单一职责原则
    # 应该拆分为 Customer、Order 等多个聚合
```

---

## ⚡ 事件 vs 直接调用决策矩阵

### 何时使用领域事件

| 场景 | 使用事件 | 使用直接调用 |
|------|----------|--------------|
| **同聚合内操作** | ❌ 不需要 | ✅ 直接调用方法 |
| **跨聚合协调** | ✅ 使用事件解耦 | ❌ 避免直接依赖 |
| **异步处理** | ✅ 事件天然异步 | ❌ 可能阻塞流程 |
| **可选的副作用** | ✅ 事件处理失败不影响主流程 | ❌ 调用失败会影响主流程 |
| **审计和日志** | ✅ 事件天然提供审计轨迹 | ❌ 需要额外记录 |
| **系统集成** | ✅ 通过事件集成外部系统 | ❌ 紧耦合集成 |

### 实际代码示例

**场景1：同聚合内操作 - 使用直接调用**
```python
class OrderAggregate:
    def add_item(self, product_id: ProductId, quantity: int) -> None:
        item = OrderItem(product_id, quantity)
        self.order_items.append(item)
        self._recalculate_total()  # ✅ 直接调用，保持一致性
        
    def _recalculate_total(self) -> None:
        # 聚合内部操作，直接调用
        self.total_amount = sum(item.line_total for item in self.order_items)
```

**场景2：跨聚合协调 - 使用事件**
```python
class OrderAggregate:
    def confirm(self) -> None:
        self.status = OrderStatus.CONFIRMED
        
        # ✅ 使用事件通知其他聚合
        self._add_domain_event(OrderConfirmedEvent(
            order_id=self.id,
            customer_id=self.customer_id,
            items=self.order_items,
            total_amount=self.total_amount
        ))

# 事件处理器（在应用层）
class OrderEventHandler:
    async def handle_order_confirmed(self, event: OrderConfirmedEvent):
        # 库存聚合：预留商品
        await self.inventory_service.reserve_items(event.items)
        
        # 支付聚合：创建支付请求
        await self.payment_service.create_payment(
            event.order_id, event.total_amount
        )
        
        # 通知聚合：发送确认邮件
        await self.notification_service.send_order_confirmation(
            event.customer_id, event.order_id
        )
```

**场景3：可选副作用 - 使用事件**
```python
class UserAggregate:
    def register(self, email: str, password: str) -> None:
        # 核心业务逻辑
        self._validate_email(email)
        self._hash_password(password)
        self.status = UserStatus.REGISTERED
        
        # ✅ 可选的副作用通过事件处理
        self._add_domain_event(UserRegisteredEvent(
            user_id=self.id,
            email=email
        ))

# 可选的副作用处理器
class UserEventHandler:
    async def handle_user_registered(self, event: UserRegisteredEvent):
        # 如果这些操作失败，不应该影响用户注册成功
        try:
            await self.email_service.send_welcome_email(event.email)
            await self.analytics_service.track_registration(event.user_id)
            await self.crm_service.create_customer_profile(event.user_id)
        except Exception as e:
            # 记录错误但不影响主流程
            logger.error(f"Failed to process user registration side effects: {e}")
```

### ⚠️ 事件使用陷阱

**陷阱1：过度使用事件**
```python
# ❌ 错误：聚合内部操作不应该使用事件
class OrderAggregate:
    def add_item(self, item: OrderItem) -> None:
        self.order_items.append(item)
        # ❌ 不需要事件，这是聚合内部操作
        self._add_domain_event(ItemAddedToOrderEvent(...))
        
# ✅ 正确：聚合内部操作直接调用
class OrderAggregate:
    def add_item(self, item: OrderItem) -> None:
        self.order_items.append(item)
        self._recalculate_total()  # 直接调用
```

**陷阱2：事件依赖链过长**
```python
# ❌ 错误：事件链过长，难以调试和维护
# Event1 → Event2 → Event3 → Event4 → ...

# ✅ 正确：保持事件链简短，考虑使用Saga模式
class OrderSaga:
    async def handle_order_confirmed(self, event: OrderConfirmedEvent):
        # 使用编排方式替代复杂的事件链
        await self._reserve_inventory(event)
        await self._process_payment(event)
        await self._send_notifications(event)
```

---

## 🧪 测试策略决策指南

### 分层测试决策

| 测试类型 | 目标 | 工具 | 覆盖率要求 |
|----------|------|------|------------|
| **单元测试** | 业务逻辑验证 | pytest | 领域层85% |
| **集成测试** | 层间协作验证 | pytest + testcontainers | 应用层70% |
| **契约测试** | 接口兼容性 | pytest + pact | API 90% |
| **端到端测试** | 用户场景验证 | pytest + playwright | 核心流程100% |

### 具体测试示例

**领域层测试（纯单元测试）：**
```python
class TestOrderAggregate:
    def test_add_item_to_draft_order_success(self):
        """测试：草稿状态订单可以添加商品"""
        # Arrange
        order = OrderAggregate(CustomerId("123"))
        item = OrderItem(ProductId("P1"), 2, Money(50, "USD"))
        
        # Act
        order.add_item_from_object(item)
        
        # Assert
        assert len(order.order_items) == 1
        assert order.total_amount == Money(100, "USD")
    
    def test_add_item_to_confirmed_order_fails(self):
        """测试：已确认订单不能添加商品"""
        # Arrange
        order = OrderAggregate(CustomerId("123"))
        order.add_item(ProductId("P1"), 1, Money(50, "USD"))
        order.confirm()
        
        # Act & Assert
        with pytest.raises(BusinessRuleViolationError, 
                          match="Cannot add items to non-draft order"):
            order.add_item(ProductId("P2"), 1, Money(30, "USD"))
```

**应用层测试（Mock依赖）：**
```python
class TestOrderService:
    @pytest.fixture
    def mock_order_repo(self):
        return Mock(spec=OrderRepository)
    
    @pytest.fixture
    def order_service(self, mock_order_repo):
        return OrderService(mock_order_repo)
    
    async def test_create_order_success(self, order_service, mock_order_repo):
        """测试：成功创建订单的应用服务协调"""
        # Arrange
        command = CreateOrderCommand(customer_id="123")
        mock_order_repo.save = AsyncMock()
        
        # Act
        result = await order_service.create_order(command)
        
        # Assert
        assert isinstance(result, OrderId)
        mock_order_repo.save.assert_called_once()
```

---

## 📊 性能考虑决策指南

### 查询优化决策

| 场景 | 策略 | 实现方式 |
|------|------|----------|
| **简单查询** | 直接查询 | Repository.find_by_id() |
| **复杂查询** | 查询对象 | Specification Pattern |
| **跨聚合查询** | 读模型 | CQRS + 投影 |
| **实时性要求高** | 缓存 | Redis + 失效策略 |

### 缓存策略示例

```python
# 聚合级缓存
class CachedOrderRepository:
    def __init__(self, base_repo: OrderRepository, cache: Redis):
        self._repo = base_repo
        self._cache = cache
        
    async def get_by_id(self, order_id: OrderId) -> Optional[OrderAggregate]:
        # 先查缓存
        cached = await self._cache.get(f"order:{order_id}")
        if cached:
            return OrderAggregate.from_json(cached)
        
        # 缓存未命中，查数据库
        order = await self._repo.get_by_id(order_id)
        if order:
            await self._cache.setex(
                f"order:{order_id}", 
                300,  # 5分钟TTL
                order.to_json()
            )
        return order
```

---

## 🎯 使用建议

1. **从决策树开始**：遇到设计问题时，先查看相应的决策流程
2. **参考代码示例**：理解概念后，查看具体的Python实现
3. **避免常见陷阱**：特别注意标记为⚠️的陷阱说明
4. **渐进式应用**：不要一次性应用所有模式，从简单开始

**记住**：DDD是为了解决复杂度问题，如果你的领域不复杂，可能不需要使用所有这些模式。从最简单的值对象和实体开始，随着复杂度增长再引入事件、聚合等高级概念。