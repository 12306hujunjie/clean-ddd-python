# 🏆 DDD高级模式指南 - 基于经典理论的Python实现

> 融合Evans、Vernon、Fowler、Percival等大师理论的高级DDD实践模式

## 🎯 适用场景

**什么时候需要高级模式？**
- ✅ **复杂业务规则**：超过10个实体的聚合设计
- ✅ **高并发场景**：需要事件驱动的异步处理
- ✅ **微服务架构**：多个有界上下文的协调
- ✅ **审计追踪需求**：需要完整的状态变更历史
- ✅ **最终一致性**：跨聚合的复杂业务流程

## 📚 经典理论基础

### Eric Evans分类系统的深度应用

**Evans三分法的Python实现：**

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Protocol, runtime_checkable
from uuid import UUID, uuid4

# 🔹 Evans分类：Value Objects (值对象)
@dataclass(frozen=True)
class CustomerAddress:
    """值对象：完全由其属性定义，可替换"""
    street: str
    city: str
    postal_code: str
    country: str
    
    def __post_init__(self):
        """Evans强调的不变式验证"""
        if not self.street or not self.city:
            raise ValueError("地址信息不完整")
        if len(self.postal_code) != 6:
            raise ValueError("邮政编码格式错误")
    
    def format_for_shipping(self) -> str:
        """值对象的行为：基于属性的计算"""
        return f"{self.street}, {self.city} {self.postal_code}, {self.country}"
    
    def is_same_city(self, other: 'CustomerAddress') -> bool:
        """值对象比较：基于属性相等性"""
        return self.city == other.city and self.country == other.country

# 🔸 Evans分类：Entities (实体)
@dataclass
class Customer:
    """实体：有唯一标识，生命周期独立"""
    id: UUID
    email: str
    name: str
    address: CustomerAddress
    registration_date: datetime
    _version: int = 1  # 乐观锁版本控制
    
    def __post_init__(self):
        """实体的身份不变性"""
        if not self.id:
            raise ValueError("实体必须有唯一标识")
    
    def change_address(self, new_address: CustomerAddress) -> None:
        """Evans强调：通过行为修改状态，而非直接赋值"""
        if not isinstance(new_address, CustomerAddress):
            raise TypeError("地址必须是CustomerAddress类型")
        
        old_address = self.address
        self.address = new_address
        self._version += 1
        
        # 发布领域事件
        self._add_domain_event(
            CustomerAddressChangedEvent(
                customer_id=self.id,
                old_address=old_address,
                new_address=new_address,
                changed_at=datetime.utcnow()
            )
        )
    
    def __eq__(self, other) -> bool:
        """实体相等性：基于身份，而非属性"""
        if not isinstance(other, Customer):
            return False
        return self.id == other.id
    
    def __hash__(self) -> int:
        """基于身份的哈希"""
        return hash(self.id)

# 🔺 Evans分类：Domain Services (领域服务)
class CustomerDuplicationChecker:
    """领域服务：无状态的业务逻辑，不属于任何实体或值对象"""
    
    def __init__(self, customer_repo: 'CustomerRepository'):
        self._customer_repo = customer_repo
    
    async def is_email_unique(self, email: str, exclude_customer_id: UUID = None) -> bool:
        """Evans服务模式：跨实体的业务规则验证"""
        existing_customer = await self._customer_repo.find_by_email(email)
        
        if not existing_customer:
            return True
        
        # 排除当前客户（用于更新场景）
        if exclude_customer_id and existing_customer.id == exclude_customer_id:
            return True
        
        return False
    
    async def suggest_similar_customers(self, address: CustomerAddress) -> List[Customer]:
        """复杂的领域逻辑：不属于单个实体"""
        return await self._customer_repo.find_by_city(address.city)
```

### Vaughn Vernon的领域事件高级模式

**领域事件的完整生命周期管理：**

```python
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional
from datetime import datetime
from uuid import UUID, uuid4
import asyncio
import json

# 🎯 Vernon事件模式：领域事件基类
@dataclass(frozen=True)
class DomainEvent:
    """Vernon强调的领域事件基础结构"""
    event_id: UUID = field(default_factory=uuid4)
    occurred_on: datetime = field(default_factory=datetime.utcnow)
    event_version: int = 1
    
    @abstractmethod
    def event_type(self) -> str:
        """事件类型标识"""
        pass
    
    def to_primitive(self) -> Dict[str, Any]:
        """序列化为原始数据类型"""
        return {
            'event_id': str(self.event_id),
            'event_type': self.event_type(),
            'occurred_on': self.occurred_on.isoformat(),
            'event_version': self.event_version,
            'event_data': self._event_data()
        }
    
    @abstractmethod
    def _event_data(self) -> Dict[str, Any]:
        """具体事件数据"""
        pass

# 🎯 具体领域事件实现
@dataclass(frozen=True)
class OrderConfirmedEvent(DomainEvent):
    """订单确认事件：Vernon的事件粒度指导"""
    order_id: UUID
    customer_id: UUID
    total_amount: Decimal
    confirmed_at: datetime
    confirmation_method: str  # 'automatic' | 'manual'
    
    def event_type(self) -> str:
        return "order.confirmed.v1"
    
    def _event_data(self) -> Dict[str, Any]:
        return {
            'order_id': str(self.order_id),
            'customer_id': str(self.customer_id),
            'total_amount': str(self.total_amount),
            'confirmed_at': self.confirmed_at.isoformat(),
            'confirmation_method': self.confirmation_method
        }

# 🎯 Vernon聚合事件发布模式
class EventSourcedAggregate:
    """Vernon的事件溯源聚合基类"""
    
    def __init__(self):
        self._uncommitted_events: List[DomainEvent] = []
        self._version = 0
    
    def _apply_event(self, event: DomainEvent) -> None:
        """应用事件到聚合状态"""
        self._uncommitted_events.append(event)
        self._handle_event(event)
        self._version += 1
    
    @abstractmethod
    def _handle_event(self, event: DomainEvent) -> None:
        """处理具体事件的状态变更"""
        pass
    
    def get_uncommitted_events(self) -> List[DomainEvent]:
        """获取未提交的事件"""
        return self._uncommitted_events.copy()
    
    def mark_events_as_committed(self) -> None:
        """标记事件已提交"""
        self._uncommitted_events.clear()
    
    @classmethod
    def from_events(cls, events: List[DomainEvent]) -> 'EventSourcedAggregate':
        """Vernon重建模式：从事件重建聚合"""
        instance = cls()
        for event in events:
            instance._handle_event(event)
            instance._version += 1
        return instance

# 🎯 高级事件存储模式
class EventStore:
    """Vernon的事件存储抽象"""
    
    @abstractmethod
    async def save_events(self, aggregate_id: UUID, events: List[DomainEvent], 
                         expected_version: int) -> None:
        """保存事件流"""
        pass
    
    @abstractmethod
    async def get_events(self, aggregate_id: UUID, 
                        from_version: int = 0) -> List[DomainEvent]:
        """获取事件流"""
        pass

class PostgreSQLEventStore(EventStore):
    """PostgreSQL事件存储实现"""
    
    def __init__(self, connection_pool):
        self._pool = connection_pool
    
    async def save_events(self, aggregate_id: UUID, events: List[DomainEvent], 
                         expected_version: int) -> None:
        """原子性保存事件，支持乐观并发控制"""
        async with self._pool.acquire() as conn:
            async with conn.transaction():
                # 检查版本冲突
                current_version = await self._get_current_version(conn, aggregate_id)
                if current_version != expected_version:
                    raise ConcurrencyError(f"版本冲突：期望{expected_version}，实际{current_version}")
                
                # 保存事件
                for i, event in enumerate(events):
                    await conn.execute(
                        """
                        INSERT INTO event_store 
                        (aggregate_id, event_id, event_type, event_data, event_version, occurred_on)
                        VALUES ($1, $2, $3, $4, $5, $6)
                        """,
                        str(aggregate_id),
                        str(event.event_id),
                        event.event_type(),
                        json.dumps(event.to_primitive()),
                        expected_version + i + 1,
                        event.occurred_on
                    )
    
    async def get_events(self, aggregate_id: UUID, from_version: int = 0) -> List[DomainEvent]:
        """获取聚合的完整事件历史"""
        async with self._pool.acquire() as conn:
            rows = await conn.fetch(
                """
                SELECT event_type, event_data, occurred_on 
                FROM event_store 
                WHERE aggregate_id = $1 AND event_version > $2
                ORDER BY event_version
                """,
                str(aggregate_id), from_version
            )
            
            return [self._deserialize_event(row) for row in rows]
```

### Martin Fowler的事件架构模式

**Fowler四种事件模式的Python实现：**

```python
# 🔔 Fowler模式1：Event Notification（事件通知）
class EventNotificationBus:
    """轻量级事件通知：只传递事件发生的消息"""
    
    def __init__(self):
        self._subscribers: Dict[str, List[Callable]] = {}
    
    def subscribe(self, event_type: str, handler: Callable) -> None:
        """订阅事件通知"""
        if event_type not in self._subscribers:
            self._subscribers[event_type] = []
        self._subscribers[event_type].append(handler)
    
    async def publish(self, event_type: str, aggregate_id: UUID) -> None:
        """发布事件通知：只包含最小信息"""
        handlers = self._subscribers.get(event_type, [])
        tasks = [
            self._handle_safely(handler, aggregate_id) 
            for handler in handlers
        ]
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _handle_safely(self, handler: Callable, aggregate_id: UUID) -> None:
        """安全执行处理器"""
        try:
            if asyncio.iscoroutinefunction(handler):
                await handler(aggregate_id)
            else:
                handler(aggregate_id)
        except Exception as e:
            # 记录错误但不中断其他处理器
            logger.error(f"事件处理器失败: {e}")

# 📦 Fowler模式2：Event-Carried State Transfer（事件携带状态）
@dataclass(frozen=True)
class CustomerEmailChangedEvent(DomainEvent):
    """携带完整状态变更信息的事件"""
    customer_id: UUID
    old_email: str
    new_email: str
    customer_name: str  # 携带相关状态
    customer_tier: str  # 携带相关状态
    changed_by: UUID
    reason: str
    
    def event_type(self) -> str:
        return "customer.email_changed.v1"
    
    def _event_data(self) -> Dict[str, Any]:
        return {
            'customer_id': str(self.customer_id),
            'old_email': self.old_email,
            'new_email': self.new_email,
            'customer_name': self.customer_name,
            'customer_tier': self.customer_tier,
            'changed_by': str(self.changed_by),
            'reason': self.reason
        }

class CustomerEmailChangedHandler:
    """处理携带状态的事件"""
    
    def __init__(self, notification_service: 'NotificationService'):
        self._notification_service = notification_service
    
    async def handle(self, event: CustomerEmailChangedEvent) -> None:
        """利用事件中的完整状态信息"""
        # 无需额外查询，事件已包含所需信息
        await self._notification_service.send_email_change_confirmation(
            new_email=event.new_email,
            customer_name=event.customer_name,
            customer_tier=event.customer_tier
        )
        
        # 根据客户等级发送不同通知
        if event.customer_tier == 'VIP':
            await self._notification_service.notify_account_manager(
                f"VIP客户 {event.customer_name} 更改了邮箱"
            )

# 🏛️ Fowler模式3：Event Sourcing（事件溯源）
class OrderAggregate(EventSourcedAggregate):
    """Fowler事件溯源模式的完整实现"""
    
    def __init__(self, order_id: UUID = None):
        super().__init__()
        self.id = order_id or uuid4()
        self.customer_id: Optional[UUID] = None
        self.items: List[OrderItem] = []
        self.status = OrderStatus.DRAFT
        self.total_amount = Decimal('0')
    
    @classmethod
    def create(cls, customer_id: UUID, items: List[OrderItem]) -> 'OrderAggregate':
        """通过事件创建聚合"""
        order = cls()
        
        # 发布创建事件
        order._apply_event(OrderCreatedEvent(
            order_id=order.id,
            customer_id=customer_id,
            items=[item.to_dict() for item in items],
            created_at=datetime.utcnow()
        ))
        
        return order
    
    def confirm_order(self) -> None:
        """通过事件确认订单"""
        if self.status != OrderStatus.DRAFT:
            raise InvalidOperationError("只能确认草稿状态的订单")
        
        self._apply_event(OrderConfirmedEvent(
            order_id=self.id,
            customer_id=self.customer_id,
            total_amount=self.total_amount,
            confirmed_at=datetime.utcnow(),
            confirmation_method='manual'
        ))
    
    def _handle_event(self, event: DomainEvent) -> None:
        """Fowler事件处理：通过事件重建状态"""
        if isinstance(event, OrderCreatedEvent):
            self.customer_id = event.customer_id
            self.items = [OrderItem.from_dict(item) for item in event.items]
            self.status = OrderStatus.DRAFT
            self._calculate_total()
        
        elif isinstance(event, OrderConfirmedEvent):
            self.status = OrderStatus.CONFIRMED
        
        # 可以添加更多事件处理...
    
    def _calculate_total(self) -> None:
        """重新计算总金额"""
        self.total_amount = sum(item.price * item.quantity for item in self.items)

# 🎯 Fowler模式4：CQRS（命令查询职责分离）
class OrderCommandHandler:
    """CQRS命令端：处理写操作"""
    
    def __init__(self, event_store: EventStore, event_bus: 'EventBus'):
        self._event_store = event_store
        self._event_bus = event_bus
    
    async def handle_create_order(self, command: CreateOrderCommand) -> UUID:
        """处理创建订单命令"""
        # 创建聚合
        order = OrderAggregate.create(command.customer_id, command.items)
        
        # 保存事件
        await self._event_store.save_events(
            order.id, 
            order.get_uncommitted_events(), 
            expected_version=0
        )
        
        # 发布事件
        for event in order.get_uncommitted_events():
            await self._event_bus.publish(event)
        
        order.mark_events_as_committed()
        return order.id

class OrderQueryHandler:
    """CQRS查询端：处理读操作"""
    
    def __init__(self, read_db: 'ReadDatabase'):
        self._read_db = read_db
    
    async def get_order_summary(self, order_id: UUID) -> OrderSummaryDTO:
        """查询订单摘要：从优化的读模型查询"""
        return await self._read_db.get_order_summary(order_id)
    
    async def get_customer_orders(self, customer_id: UUID) -> List[OrderListItemDTO]:
        """查询客户订单列表：从专门的查询模型"""
        return await self._read_db.get_customer_orders(customer_id)

# 📊 CQRS读模型投影器
class OrderProjectionHandler:
    """将事件投影到读模型"""
    
    def __init__(self, read_db: 'ReadDatabase'):
        self._read_db = read_db
    
    async def handle_order_created(self, event: OrderCreatedEvent) -> None:
        """处理订单创建事件，更新读模型"""
        order_summary = OrderSummaryDTO(
            id=event.order_id,
            customer_id=event.customer_id,
            status='DRAFT',
            total_amount=self._calculate_total(event.items),
            created_at=event.created_at
        )
        
        await self._read_db.save_order_summary(order_summary)
    
    async def handle_order_confirmed(self, event: OrderConfirmedEvent) -> None:
        """处理订单确认事件，更新读模型"""
        await self._read_db.update_order_status(event.order_id, 'CONFIRMED')
```

### 战略DDD：有界上下文与微服务

**基于Nick Tune和Scott Millett理论的战略设计：**

```python
# 🗺️ 上下文映射模式
@dataclass
class BoundedContext:
    """有界上下文的Python实现"""
    name: str
    ubiquitous_language: Dict[str, str]
    aggregates: List[str]
    domain_services: List[str]
    upstream_contexts: List['ContextRelationship']
    downstream_contexts: List['ContextRelationship']
    
    def validates_term(self, term: str) -> bool:
        """验证术语是否属于此上下文的通用语言"""
        return term in self.ubiquitous_language
    
    def get_shared_kernel_with(self, other_context: 'BoundedContext') -> List[str]:
        """识别与其他上下文的共享内核"""
        shared_terms = set(self.ubiquitous_language.keys()) & set(other_context.ubiquitous_language.keys())
        return list(shared_terms)

@dataclass
class ContextRelationship:
    """上下文关系映射"""
    context_name: str
    relationship_type: str  # 'SHARED_KERNEL', 'CUSTOMER_SUPPLIER', 'CONFORMIST', 'ANTICORRUPTION_LAYER'
    integration_patterns: List[str]  # ['REST_API', 'MESSAGE_QUEUE', 'SHARED_DATABASE']
    
    def requires_translation(self) -> bool:
        """判断是否需要防腐层"""
        return self.relationship_type in ['ANTICORRUPTION_LAYER', 'CONFORMIST']

# 🛡️ 防腐层模式（Anti-Corruption Layer）
class ExternalPaymentService:
    """外部支付服务的防腐层"""
    
    def __init__(self, external_api: 'ThirdPartyPaymentAPI'):
        self._external_api = external_api
    
    async def process_payment(self, payment_request: PaymentRequest) -> PaymentResult:
        """将领域模型转换为外部API格式"""
        # 转换输入：领域模型 -> 外部API格式
        external_request = self._translate_to_external_format(payment_request)
        
        # 调用外部服务
        external_response = await self._external_api.charge_payment(external_request)
        
        # 转换输出：外部API格式 -> 领域模型
        return self._translate_from_external_format(external_response)
    
    def _translate_to_external_format(self, payment: PaymentRequest) -> Dict[str, Any]:
        """输入转换：保护内部模型不受外部影响"""
        return {
            'amount_cents': int(payment.amount * 100),  # 外部API使用分为单位
            'currency_code': payment.currency.upper(),   # 外部API要求大写
            'customer_reference': f"CUST_{payment.customer_id}",  # 外部格式
            'description': payment.description[:50],     # 外部API限制长度
            'metadata': {
                'internal_order_id': str(payment.order_id)
            }
        }
    
    def _translate_from_external_format(self, response: Dict[str, Any]) -> PaymentResult:
        """输出转换：将外部响应转换为领域模型"""
        # 处理外部API的不同状态映射
        status_mapping = {
            'SUCCESS': PaymentStatus.COMPLETED,
            'FAILED': PaymentStatus.FAILED, 
            'PENDING': PaymentStatus.PROCESSING,
            'DECLINED': PaymentStatus.DECLINED
        }
        
        return PaymentResult(
            transaction_id=UUID(response['transaction_id']),
            status=status_mapping.get(response['status'], PaymentStatus.FAILED),
            amount=Decimal(response['amount_cents']) / 100,  # 转换回元
            processed_at=datetime.fromisoformat(response['processed_at']),
            external_reference=response.get('reference'),
            failure_reason=response.get('error_message')
        )

# 🔄 共享内核模式（Shared Kernel）
class SharedKernel:
    """多个有界上下文的共享内核"""
    
    # 共享的值对象
    @dataclass(frozen=True)
    class CustomerId:
        value: UUID
        
        def __post_init__(self):
            if not isinstance(self.value, UUID):
                raise ValueError("CustomerId必须是UUID类型")
    
    @dataclass(frozen=True) 
    class Money:
        amount: Decimal
        currency: str
        
        def __post_init__(self):
            if self.amount < 0:
                raise ValueError("金额不能为负数")
            if self.currency not in ['USD', 'EUR', 'CNY']:
                raise ValueError("不支持的货币类型")
    
    # 共享的事件
    @dataclass(frozen=True)
    class CustomerRegisteredEvent(DomainEvent):
        customer_id: 'SharedKernel.CustomerId'
        email: str
        registration_date: datetime
        
        def event_type(self) -> str:
            return "shared.customer_registered.v1"

# 🏛️ 开放主机服务模式（Open Host Service）
class CustomerOpenHostService:
    """为下游上下文提供标准化API"""
    
    def __init__(self, customer_app_service: 'CustomerApplicationService'):
        self._customer_service = customer_app_service
    
    async def get_customer_info(self, customer_id: UUID) -> CustomerInfoDTO:
        """标准化的客户信息API"""
        customer = await self._customer_service.get_customer(customer_id)
        
        return CustomerInfoDTO(
            id=str(customer.id),
            email=customer.email,
            name=customer.name,
            tier=customer.tier.value,
            registration_date=customer.registration_date.isoformat(),
            status=customer.status.value,
            # 标准化的地址格式
            address={
                'street': customer.address.street,
                'city': customer.address.city,
                'country': customer.address.country,
                'postal_code': customer.address.postal_code
            }
        )
    
    async def get_customer_orders_summary(self, customer_id: UUID) -> CustomerOrdersSummaryDTO:
        """为其他上下文提供客户订单摘要"""
        orders = await self._customer_service.get_customer_orders(customer_id)
        
        return CustomerOrdersSummaryDTO(
            customer_id=str(customer_id),
            total_orders=len(orders),
            total_spent=sum(order.total_amount for order in orders),
            last_order_date=max(order.created_at for order in orders) if orders else None,
            favorite_categories=self._analyze_favorite_categories(orders)
        )
```

## 🚀 性能优化高级模式

**基于Cosmic Python的异步优化：**

```python
# ⚡ 异步聚合根加载优化
class AsyncAggregateLoader:
    """高性能聚合加载器"""
    
    def __init__(self, event_store: EventStore, snapshot_store: 'SnapshotStore'):
        self._event_store = event_store
        self._snapshot_store = snapshot_store
        self._cache: Dict[UUID, Any] = {}
    
    async def load_aggregate(self, aggregate_id: UUID, aggregate_type: type) -> Any:
        """优化的聚合加载：快照 + 增量事件"""
        # 1. 检查内存缓存
        if aggregate_id in self._cache:
            return self._cache[aggregate_id]
        
        # 2. 尝试从快照加载
        snapshot = await self._snapshot_store.get_latest_snapshot(aggregate_id)
        
        if snapshot:
            # 从快照重建 + 增量事件
            aggregate = aggregate_type.from_snapshot(snapshot)
            incremental_events = await self._event_store.get_events(
                aggregate_id, from_version=snapshot.version
            )
            
            for event in incremental_events:
                aggregate._handle_event(event)
        else:
            # 从完整事件流重建
            events = await self._event_store.get_events(aggregate_id)
            aggregate = aggregate_type.from_events(events)
        
        # 3. 缓存结果
        self._cache[aggregate_id] = aggregate
        return aggregate
    
    async def save_aggregate(self, aggregate: Any) -> None:
        """保存聚合并创建快照"""
        # 保存事件
        await self._event_store.save_events(
            aggregate.id,
            aggregate.get_uncommitted_events(),
            aggregate._version - len(aggregate.get_uncommitted_events())
        )
        
        # 每10个版本创建一次快照
        if aggregate._version % 10 == 0:
            snapshot = aggregate.create_snapshot()
            await self._snapshot_store.save_snapshot(snapshot)
        
        # 更新缓存
        self._cache[aggregate.id] = aggregate
        aggregate.mark_events_as_committed()

# 📊 事件批处理模式
class BatchEventProcessor:
    """批量事件处理器：提升吞吐量"""
    
    def __init__(self, batch_size: int = 100, batch_timeout: float = 5.0):
        self.batch_size = batch_size
        self.batch_timeout = batch_timeout
        self._event_queue: asyncio.Queue = asyncio.Queue()
        self._handlers: Dict[str, List[Callable]] = {}
        self._processing_task: Optional[asyncio.Task] = None
    
    def subscribe(self, event_type: str, handler: Callable) -> None:
        """订阅事件处理器"""
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)
    
    async def publish(self, event: DomainEvent) -> None:
        """发布事件到批处理队列"""
        await self._event_queue.put(event)
        
        # 启动处理任务（如果未运行）
        if not self._processing_task or self._processing_task.done():
            self._processing_task = asyncio.create_task(self._process_batch())
    
    async def _process_batch(self) -> None:
        """批量处理事件"""
        batch: List[DomainEvent] = []
        
        try:
            # 收集批次
            while len(batch) < self.batch_size:
                try:
                    event = await asyncio.wait_for(
                        self._event_queue.get(), 
                        timeout=self.batch_timeout
                    )
                    batch.append(event)
                except asyncio.TimeoutError:
                    # 超时则处理当前批次
                    break
            
            if batch:
                await self._handle_batch(batch)
                
        except Exception as e:
            logger.error(f"批处理失败: {e}")
    
    async def _handle_batch(self, events: List[DomainEvent]) -> None:
        """并行处理事件批次"""
        # 按事件类型分组
        events_by_type: Dict[str, List[DomainEvent]] = {}
        for event in events:
            event_type = event.event_type()
            if event_type not in events_by_type:
                events_by_type[event_type] = []
            events_by_type[event_type].append(event)
        
        # 并行处理每种事件类型
        tasks = []
        for event_type, type_events in events_by_type.items():
            handlers = self._handlers.get(event_type, [])
            for handler in handlers:
                task = asyncio.create_task(
                    self._handle_events_batch(handler, type_events)
                )
                tasks.append(task)
        
        # 等待所有处理完成
        await asyncio.gather(*tasks, return_exceptions=True)
    
    async def _handle_events_batch(self, handler: Callable, events: List[DomainEvent]) -> None:
        """批量调用单个处理器"""
        try:
            # 如果处理器支持批处理
            if hasattr(handler, 'handle_batch'):
                await handler.handle_batch(events)
            else:
                # 逐个处理
                for event in events:
                    await handler(event)
        except Exception as e:
            logger.error(f"事件处理器批处理失败: {e}")
```

## 🎯 使用决策矩阵

| 模式类别 | 适用场景 | 复杂度 | 性能影响 | 实施建议 |
|---------|---------|-------|---------|---------|
| **Evans分类** | 所有DDD项目 | 低 | 中性 | 必须掌握 |
| **Vernon事件** | 复杂业务流程 | 中 | 提升 | 推荐使用 |
| **Fowler事件架构** | 微服务/集成 | 高 | 显著提升 | 谨慎选择 |
| **事件溯源** | 审计/历史追踪 | 高 | 复杂影响 | 特定场景 |
| **CQRS** | 读写分离需求 | 中 | 读性能提升 | 适度使用 |
| **战略模式** | 大型系统 | 中 | 架构优化 | 团队协作 |

## 📚 进一步学习资源

### 经典书籍
- **Eric Evans**: "Domain-Driven Design" (蓝皮书)
- **Vaughn Vernon**: "Implementing Domain-Driven Design" (红皮书)
- **Scott Millett & Nick Tune**: "Patterns, Principles, and Practices of Domain-Driven Design"
- **Harry Percival & Bob Gregory**: "Architecture Patterns with Python"

### 在线资源
- **Martin Fowler博客**: martinfowler.com/tags/domain%20driven%20design.html
- **Cosmic Python**: cosmicpython.com
- **DDD Community**: dddcommunity.org

记住：高级模式是工具，不是目标。根据实际业务复杂度和团队能力选择合适的模式组合，避免过度工程化。