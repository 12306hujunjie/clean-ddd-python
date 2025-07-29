# 架构关联关系 - Python Clean DDD整体设计

## 架构全景 - Ultra Think

Clean DDD不是简单的技术模式堆叠，而是一个**有机的生态系统**，每个要素都有明确的职责边界，通过精心设计的协作机制形成一个优雅、可扩展、可维护的整体架构。

> **系统哲学**：就像一个高效运转的城市，每个区域（层）都有专门的功能，通过完善的交通网络（接口）连接，形成一个复杂而有序的整体。Clean DDD让我们能够像城市规划师一样设计软件架构。

## 整体架构蓝图

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            PRESENTATION LAYER                                   │
│                                (表现层)                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐                │
│  │   Controllers   │  │   WebSocket     │  │    GraphQL      │                │
│  │   (HTTP API)    │  │   Handlers      │  │   Resolvers     │                │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘                │
│           │                     │                     │                        │
│           └─────────────────────┼─────────────────────┘                        │
│                                 │                                              │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                            APPLICATION LAYER                                   │
│                                (应用层)                                        │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                                 │                                              │
│  ┌─────────────────┐            │            ┌─────────────────┐               │
│  │   Command Bus   │◄───────────┼────────────►│   Query Bus     │               │
│  └─────────────────┘            │            └─────────────────┘               │
│           │                     │                     │                        │
│           ▼                     │                     ▼                        │
│  ┌─────────────────┐            │            ┌─────────────────┐               │
│  │Command Handlers │            │            │ Query Handlers  │               │
│  └─────────────────┘            │            └─────────────────┘               │
│           │                     │                     │                        │
│           └─────────────────────┼─────────────────────┘                        │
│                                 │                                              │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                             DOMAIN LAYER                                       │
│                               (领域层)                                         │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                                 │                                              │
│  ┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐               │
│  │  Value Objects  │    │  Entities    │    │   Aggregates    │               │
│  │    (值对象)     │    │   (实体)     │    │    (聚合)       │               │
│  └─────────────────┘    └──────────────┘    └─────────────────┘               │
│           │                     │                     │                        │
│           └─────────────────────┼─────────────────────┘                        │
│                                 │                                              │
│                      ┌─────────────────┐                                      │
│                      │ Domain Events   │                                      │
│                      │   (领域事件)    │                                      │
│                      └─────────────────┘                                      │
│                                 │                                              │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                        INFRASTRUCTURE LAYER                                   │
│                           (基础设施层)                                        │
├─────────────────────────────────┼─────────────────────────────────────────────┤
│                                 │                                              │
│  ┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐               │
│  │  Repositories   │    │   Message    │    │   External      │               │
│  │   (仓储实现)    │    │    Queue     │    │   Services      │               │
│  └─────────────────┘    └──────────────┘    └─────────────────┘               │
│           │                     │                     │                        │
│           └─────────────────────┼─────────────────────┘                        │
│                                 │                                              │
│  ┌─────────────────┐    ┌──────────────┐    ┌─────────────────┐               │
│  │    Database     │    │    Redis     │    │     Celery      │               │
│  │  (SQLAlchemy)   │    │   (Cache)    │    │  (Background)   │               │
│  └─────────────────┘    └──────────────┘    └─────────────────┘               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

## 核心要素关联关系

### 1. 分层依赖关系

```python
"""
依赖方向：外层 → 内层，内层不知道外层的存在

Presentation Layer
    ↓ 依赖
Application Layer  
    ↓ 依赖
Domain Layer
    ↑ 被依赖
Infrastructure Layer (通过接口反转依赖)
"""

# 表现层 → 应用层
class OrderController:
    def __init__(self, command_bus: CommandBus, query_bus: QueryBus):
        # 表现层依赖应用层的总线
        self.command_bus = command_bus
        self.query_bus = query_bus

# 应用层 → 领域层
class OrderCommandHandler:
    def __init__(self, order_repository: OrderRepositoryInterface):
        # 应用层依赖领域层的接口（而非具体实现）
        self.order_repository = order_repository
    
    async def handle(self, command: CreateOrderCommand):
        # 应用层调用领域层的聚合
        order = OrderAggregate.create(...)
        await self.order_repository.save(order)

# 基础设施层 → 领域层（依赖反转）
class SqlAlchemyOrderRepository(OrderRepositoryInterface):
    # 基础设施层实现领域层定义的接口
    async def save(self, order: OrderAggregate):
        # 具体的数据库操作
        pass
```

### 2. 数据流和控制流

```python
"""
完整的请求处理流程：

1. 外部请求 → Controller（表现层）
2. Controller → Command/Query（应用层）
3. Command Handler → Aggregate（领域层）
4. Aggregate → Domain Event（领域层）
5. Domain Event → Event Handler（应用层）
6. Repository → Database（基础设施层）
"""

# 1. 表现层接收请求
@router.post("/orders")
async def create_order(request: CreateOrderRequest, 
                      current_user: User = Depends(get_current_user)):
    
    # 2. 转换为领域命令
    command = CreateOrderCommand(
        customer_id=current_user.customer_id,
        shipping_address=Address.from_dict(request.shipping_address),
        items=[OrderItemRequest(...) for item in request.items],
        payment_method=request.payment_method
    )
    
    # 3. 发送到应用层
    result = await command_bus.send(command)
    
    # 8. 返回响应
    return ApiResponse(success=result.success, data=result.result_data)

# 4. 应用层处理命令
class OrderCommandHandler:
    async def handle(self, command: CreateOrderCommand) -> CommandResult:
        
        # 5. 调用领域层
        order = OrderAggregate.create(
            customer_id=command.customer_id,
            shipping_address=command.shipping_address
        )
        
        for item_request in command.items:
            order.add_item(...)  # 领域行为
        
        # 6. 保存聚合（通过基础设施层）
        await self.order_repository.save(order)
        
        # 7. 发布领域事件
        await order.publish_domain_events()
        
        return CommandResult.success_result(...)
```

### 3. 事件驱动的协作模式

```python
"""
事件驱动协作：聚合通过事件进行松耦合通信

OrderAggregate --发布--> OrderConfirmedEvent
                              ↓
                         Event Handlers:
                         ├── InventoryService (库存预留)
                         ├── NotificationService (发送邮件)  
                         ├── LoyaltyService (积分增加)
                         └── LogisticsService (准备发货)
"""

# 聚合发布事件
class OrderAggregate(AggregateRoot[OrderId]):
    def confirm_order(self):
        # 业务状态变更
        self._status = OrderStatus.CONFIRMED
        
        # 发布领域事件
        self._add_domain_event(OrderConfirmedEvent(
            order_id=self.id,
            customer_id=self._customer_id,
            order_amount=self.total_amount,
            items=self.items,
            confirmed_at=datetime.utcnow()
        ))

# 多个事件处理器响应同一事件
@event_handler(OrderConfirmedEvent)
async def reserve_inventory(event: OrderConfirmedEvent):
    """库存服务响应订单确认"""
    for item in event.items:
        await inventory_service.reserve_item(
            product_id=item.product_id,
            quantity=item.quantity,
            order_id=event.order_id
        )

@event_handler(OrderConfirmedEvent)
async def send_confirmation_email(event: OrderConfirmedEvent):
    """通知服务响应订单确认"""
    customer = await customer_service.get_customer(event.customer_id)
    await email_service.send_order_confirmation(
        email=customer.email,
        order_details=event
    )

@event_handler(OrderConfirmedEvent)
async def add_loyalty_points(event: OrderConfirmedEvent):
    """积分服务响应订单确认"""
    points = calculate_points(event.order_amount)
    await loyalty_service.add_points(
        customer_id=event.customer_id,
        points=points,
        reason=f"订单消费：{event.order_id}"
    )
```

### 4. CQRS架构实现

```python
"""
命令查询职责分离：

写端（Command Side）：
Controller → Command → Command Handler → Aggregate → Repository → Database

读端（Query Side）：
Controller → Query → Query Handler → Read Model Repository → Read Database

两端通过事件同步：
Command Side --Event--> Event Handler --> Update Read Model
"""

# 写端：处理业务操作
class OrderWriteService:
    """订单写服务"""
    
    def __init__(self, command_bus: CommandBus):
        self.command_bus = command_bus
    
    async def create_order(self, request: CreateOrderRequest) -> CommandResult:
        command = CreateOrderCommand(...)
        return await self.command_bus.send(command)
    
    async def confirm_order(self, order_id: OrderId) -> CommandResult:
        command = ConfirmOrderCommand(order_id=order_id)
        return await self.command_bus.send(command)

# 读端：处理查询操作
class OrderReadService:
    """订单读服务"""
    
    def __init__(self, query_bus: QueryBus):
        self.query_bus = query_bus
    
    async def get_order_details(self, order_id: OrderId) -> OrderDetailsViewModel:
        query = GetOrderDetailsQuery(order_id=order_id)
        result = await self.query_bus.send(query)
        return result.data
    
    async def search_orders(self, criteria: SearchOrdersQuery) -> PagedResult[OrderSummaryViewModel]:
        result = await self.query_bus.send(criteria)
        return result.data

# 读模型更新：通过事件同步
@event_handler(OrderConfirmedEvent)
async def update_order_read_model(event: OrderConfirmedEvent):
    """更新读模型"""
    await order_read_model_updater.update_order_status(
        order_id=event.order_id,
        new_status="confirmed",
        confirmed_at=event.occurred_at
    )
    
    # 更新客户统计
    await customer_stats_updater.increment_order_count(
        customer_id=event.customer_id,
        order_amount=event.order_amount
    )
```

## 完整业务流程示例

### 订单创建到交付的完整流程

```python
"""
业务场景：客户下单并完成整个订单生命周期

1. 客户提交订单 → OrderController.create_order()
2. 创建订单聚合 → OrderAggregate.create()
3. 发布订单创建事件 → OrderCreatedEvent
4. 库存预留 → InventoryService.reserve_items()
5. 客户确认订单 → OrderController.confirm_order()
6. 发布订单确认事件 → OrderConfirmedEvent
7. 发送确认邮件 → EmailService.send_confirmation()
8. 处理支付 → PaymentService.process_payment()
9. 发布支付完成事件 → PaymentProcessedEvent
10. 准备发货 → LogisticsService.prepare_shipment()
11. 订单发货 → OrderController.ship_order()
12. 发布发货事件 → OrderShippedEvent
13. 更新物流跟踪 → TrackingService.update_tracking()
14. 订单送达 → OrderController.deliver_order()
15. 发布送达事件 → OrderDeliveredEvent
16. 完成订单 → OrderAggregate.complete()
"""

class CompleteOrderWorkflow:
    """完整订单工作流"""
    
    def __init__(self, 
                 order_service: OrderWriteService,
                 payment_service: PaymentService,
                 logistics_service: LogisticsService):
        self.order_service = order_service
        self.payment_service = payment_service
        self.logistics_service = logistics_service
    
    async def execute_order_workflow(self, customer_id: CustomerId, 
                                   order_request: CreateOrderRequest) -> OrderWorkflowResult:
        """执行完整订单工作流"""
        
        try:
            # 1. 创建订单
            order_result = await self.order_service.create_order(order_request)
            if not order_result.success:
                return OrderWorkflowResult.failed("订单创建失败", order_result.error_message)
            
            order_id = OrderId(order_result.result_data['order_id'])
            
            # 2. 确认订单
            confirm_result = await self.order_service.confirm_order(order_id)
            if not confirm_result.success:
                # 取消订单
                await self.order_service.cancel_order(order_id, "确认失败")
                return OrderWorkflowResult.failed("订单确认失败", confirm_result.error_message)
            
            # 3. 处理支付
            payment_result = await self.payment_service.process_payment(
                order_id=order_id,
                payment_method=order_request.payment_method,
                amount=Money.from_yuan(order_result.result_data['total_amount'])
            )
            
            if not payment_result.success:
                # 取消订单并释放库存
                await self.order_service.cancel_order(order_id, "支付失败")
                return OrderWorkflowResult.failed("支付失败", payment_result.error_message)
            
            # 4. 安排发货
            shipping_result = await self.logistics_service.arrange_shipping(order_id)
            if not shipping_result.success:
                # 退款并取消订单
                await self.payment_service.refund_payment(payment_result.payment_id)
                await self.order_service.cancel_order(order_id, "发货安排失败")
                return OrderWorkflowResult.failed("发货安排失败", shipping_result.error_message)
            
            return OrderWorkflowResult.success(order_id, "订单工作流执行成功")
            
        except Exception as e:
            # 异常处理和回滚
            await self._handle_workflow_exception(order_id, e)
            return OrderWorkflowResult.failed("工作流执行异常", str(e))
    
    async def _handle_workflow_exception(self, order_id: OrderId, exception: Exception):
        """处理工作流异常"""
        logging.error(f"订单工作流异常: {order_id}, {exception}", exc_info=True)
        
        # 执行补偿操作
        try:
            await self.order_service.cancel_order(order_id, f"系统异常: {str(exception)}")
        except Exception as compensation_error:
            logging.critical(f"补偿操作失败: {compensation_error}", exc_info=True)
```

### 事件驱动的微服务协作

```python
"""
跨服务的事件驱动架构：

Order Service --OrderConfirmedEvent--> Message Queue
                                           ↓
    ┌─────────────────┬──────────────────┬──────────────────┬─────────────────┐
    ↓                 ↓                  ↓                  ↓                 ↓
Inventory         Notification       Loyalty            Logistics        Analytics
Service           Service            Service            Service          Service
"""

# 订单服务发布事件
class OrderService:
    async def confirm_order(self, order_id: OrderId):
        order = await self.order_repository.get(order_id)
        order.confirm()
        
        await self.order_repository.save(order)
        
        # 发布事件到消息队列
        await self.event_publisher.publish(OrderConfirmedEvent(
            order_id=order.id,
            customer_id=order.customer_id,
            items=order.items,
            total_amount=order.total_amount
        ))

# 库存服务响应事件
class InventoryEventHandler:
    @celery_task
    def handle_order_confirmed(self, event_data: dict):
        """处理订单确认事件"""
        event = OrderConfirmedEvent.from_dict(event_data)
        
        # 预留库存
        for item in event.items:
            self.inventory_service.reserve_stock(
                product_id=item.product_id,
                quantity=item.quantity,
                reservation_id=str(event.order_id)
            )
        
        # 发布库存预留事件
        self.event_publisher.publish(InventoryReservedEvent(
            order_id=event.order_id,
            reservations=[{
                'product_id': item.product_id,
                'quantity': item.quantity
            } for item in event.items]
        ))

# 通知服务响应事件
class NotificationEventHandler:
    @celery_task
    def handle_order_confirmed(self, event_data: dict):
        """发送订单确认通知"""
        event = OrderConfirmedEvent.from_dict(event_data)
        
        # 获取客户信息
        customer = self.customer_service.get_customer(event.customer_id)
        
        # 发送邮件
        self.email_service.send_template_email(
            to=customer.email,
            template="order_confirmed",
            context={
                'customer_name': customer.name,
                'order_id': str(event.order_id),
                'total_amount': event.total_amount.to_display_string(),
                'items': [item.to_dict() for item in event.items]
            }
        )
        
        # 发送手机短信
        if customer.phone:
            self.sms_service.send_sms(
                phone=customer.phone,
                message=f"您的订单{event.order_id}已确认，总金额{event.total_amount.to_display_string()}"
            )
```

## 测试策略的整体设计

### 1. 分层测试策略

```python
"""
测试金字塔：

                  ┌─────────────────┐
                  │   E2E Tests     │  ← 少量、高价值
                  │   (端到端测试)   │
                  └─────────────────┘
                 ┌───────────────────┐
                 │Integration Tests  │  ← 适量、关键路径
                 │  (集成测试)       │
                 └───────────────────┘
                ┌─────────────────────┐
                │   Unit Tests        │  ← 大量、快速反馈
                │   (单元测试)        │
                └─────────────────────┘
"""

# 单元测试：测试单个组件
class TestOrderAggregate:
    def test_create_order(self):
        order = OrderAggregate.create(
            customer_id=CustomerId.generate(),
            shipping_address=Address(...)
        )
        assert order.status == OrderStatus.DRAFT

    def test_confirm_order_publishes_event(self):
        order = self._create_test_order()
        order.confirm()
        
        events = order.get_domain_events()
        assert len(events) == 1
        assert isinstance(events[0], OrderConfirmedEvent)

# 集成测试：测试组件间协作
class TestOrderCommandHandler:
    async def test_create_order_integration(self):
        # 使用真实的数据库和消息队列
        command = CreateOrderCommand(...)
        handler = OrderCommandHandler(
            order_repository=real_order_repository,
            message_publisher=real_message_publisher
        )
        
        result = await handler.handle(command)
        
        assert result.success
        # 验证数据库中的数据
        saved_order = await real_order_repository.get(result.order_id)
        assert saved_order is not None

# 端到端测试：测试完整用户场景
class TestOrderE2E:
    async def test_complete_order_workflow(self):
        # 模拟真实用户操作
        async with AsyncClient(app=app, base_url="http://test") as client:
            # 1. 登录
            login_response = await client.post("/auth/login", json={
                "email": "test@example.com",
                "password": "password"
            })
            token = login_response.json()["access_token"]
            
            # 2. 创建订单
            order_response = await client.post("/api/v1/orders", 
                json=create_order_request,
                headers={"Authorization": f"Bearer {token}"}
            )
            assert order_response.status_code == 200
            order_id = order_response.json()["data"]["order_id"]
            
            # 3. 确认订单
            confirm_response = await client.put(f"/api/v1/orders/{order_id}/confirm",
                json={"payment_method": "credit_card"},
                headers={"Authorization": f"Bearer {token}"}
            )
            assert confirm_response.status_code == 200
            
            # 4. 验证订单状态
            details_response = await client.get(f"/api/v1/orders/{order_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            assert details_response.json()["data"]["status"] == "confirmed"
```

### 2. 测试数据管理

```python
# 测试数据工厂
class TestDataFactory:
    """测试数据工厂"""
    
    @staticmethod
    def create_customer(
        customer_id: Optional[CustomerId] = None,
        email: Optional[str] = None,
        name: Optional[str] = None
    ) -> CustomerAggregate:
        return CustomerAggregate(
            id=customer_id or CustomerId.generate(),
            name=PersonName(name or "测试", "用户"),
            email=Email(email or f"test{uuid4().hex[:8]}@example.com")
        )
    
    @staticmethod
    def create_order(
        order_id: Optional[OrderId] = None,
        customer_id: Optional[CustomerId] = None,
        status: OrderStatus = OrderStatus.DRAFT
    ) -> OrderAggregate:
        order = OrderAggregate.create(
            id=order_id or OrderId.generate(),
            customer_id=customer_id or CustomerId.generate(),
            shipping_address=TestDataFactory.create_address()
        )
        
        # 添加测试商品
        order.add_item(
            product_id=ProductId("TEST-PROD-001"),
            product_name="测试商品",
            quantity=1,
            unit_price=Money.from_yuan(99.99)
        )
        
        return order
    
    @staticmethod
    def create_address() -> Address:
        return Address(
            country="中国",
            province="北京",
            city="北京市",
            district="朝阳区",
            street="测试街道123号",
            postal_code="100000"
        )

# 测试容器
class TestContainer:
    """测试依赖注入容器"""
    
    def __init__(self):
        self._setup_test_services()
    
    def _setup_test_services(self):
        # 使用内存数据库
        self.db_session = create_test_db_session()
        
        # 使用内存消息队列
        self.message_queue = InMemoryMessageQueue()
        
        # 创建仓储
        self.order_repository = InMemoryOrderRepository()
        self.customer_repository = InMemoryCustomerRepository()
        
        # 创建应用服务
        self.command_bus = CommandBus()
        self.query_bus = QueryBus()
        
        # 注册处理器
        self._register_handlers()
    
    def _register_handlers(self):
        order_handler = OrderCommandHandler(
            order_repository=self.order_repository,
            customer_repository=self.customer_repository
        )
        self.command_bus.register_handler("CreateOrder", order_handler)
```

## 性能优化和扩展性设计

### 1. 缓存策略

```python
"""
多层缓存架构：

Application Cache (应用缓存)
    ↓ miss
Query Result Cache (查询结果缓存)  
    ↓ miss
Database Query Cache (数据库查询缓存)
    ↓ miss
Database (数据库)
"""

class CacheManager:
    """缓存管理器"""
    
    def __init__(self, 
                 redis_client: Redis,
                 local_cache: Dict[str, Any] = None):
        self.redis = redis_client
        self.local_cache = local_cache or {}
        self.cache_stats = CacheStats()
    
    async def get_or_set(self, 
                        cache_key: str,
                        fetch_func: Callable,
                        ttl: int = 300,
                        use_local_cache: bool = True) -> Any:
        """获取或设置缓存"""
        
        # 1. 本地缓存
        if use_local_cache and cache_key in self.local_cache:
            self.cache_stats.record_hit("local")
            return self.local_cache[cache_key]
        
        # 2. Redis缓存
        cached_data = await self.redis.get(cache_key)
        if cached_data:
            self.cache_stats.record_hit("redis")
            data = json.loads(cached_data)
            
            if use_local_cache:
                self.local_cache[cache_key] = data
            
            return data
        
        # 3. 执行原始查询
        self.cache_stats.record_miss()
        data = await fetch_func()
        
        # 4. 设置缓存
        await self._set_cache(cache_key, data, ttl, use_local_cache)
        
        return data
    
    async def _set_cache(self, cache_key: str, data: Any, 
                        ttl: int, use_local_cache: bool):
        """设置多层缓存"""
        # Redis缓存
        serialized_data = json.dumps(data, default=self._json_serializer)
        await self.redis.setex(cache_key, ttl, serialized_data)
        
        # 本地缓存（较短TTL）
        if use_local_cache:
            self.local_cache[cache_key] = data
            # 设置本地缓存过期（简化实现）
            asyncio.create_task(self._expire_local_cache(cache_key, ttl // 2))

# 智能缓存失效
class SmartCacheInvalidation:
    """智能缓存失效"""
    
    def __init__(self, cache_manager: CacheManager):
        self.cache = cache_manager
        self.invalidation_rules = self._setup_invalidation_rules()
    
    def _setup_invalidation_rules(self) -> Dict[str, List[str]]:
        """设置失效规则"""
        return {
            'OrderConfirmedEvent': [
                'query:GetOrderDetails:*',
                'query:GetCustomerOrders:*',
                'query:GetOrderAnalytics:*'
            ],
            'CustomerRegisteredEvent': [
                'query:GetCustomerDetails:*',
                'query:GetCustomerStats:*'
            ],
            'InventoryUpdatedEvent': [
                'query:GetProductDetails:*',
                'query:GetInventoryStatus:*'
            ]
        }
    
    async def handle_event(self, event: DomainEvent):
        """处理事件并失效相关缓存"""
        event_type = event.event_type
        patterns = self.invalidation_rules.get(event_type, [])
        
        for pattern in patterns:
            # 替换模式中的占位符
            actual_pattern = pattern.replace('*', f'*{event.aggregate_id}*')
            await self.cache.invalidate_pattern(actual_pattern)
```

### 2. 水平扩展设计

```python
"""
微服务拆分策略：

┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Order Service  │  │Customer Service │  │Inventory Service│
│                 │  │                 │  │                 │
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │
│ │OrderAggregate│ │  │ │CustomerAgg. │ │  │ │InventoryAgg.│ │
│ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │
│                 │  │                 │  │                 │
│ ┌─────────────┐ │  │ ┌─────────────┐ │  │ ┌─────────────┐ │
│ │  Order DB   │ │  │ │Customer DB  │ │  │ │Inventory DB │ │
│ └─────────────┘ │  │ └─────────────┘ │  │ └─────────────┘ │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                      │                      │
         └──────────────────────┼──────────────────────┘
                                │
                    ┌─────────────────┐
                    │  Message Queue  │
                    │     (Redis)     │
                    └─────────────────┘
"""

class ServiceRegistry:
    """服务注册中心"""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.services = {}
    
    async def register_service(self, service_name: str, 
                             service_instance: ServiceInstance):
        """注册服务实例"""
        service_key = f"services:{service_name}"
        instance_data = {
            'id': service_instance.id,
            'host': service_instance.host,
            'port': service_instance.port,
            'health_check_url': service_instance.health_check_url,
            'registered_at': datetime.utcnow().isoformat()
        }
        
        await self.redis.hset(service_key, service_instance.id, 
                             json.dumps(instance_data))
        
        # 设置心跳
        await self._start_heartbeat(service_name, service_instance)
    
    async def discover_service(self, service_name: str) -> List[ServiceInstance]:
        """发现服务实例"""
        service_key = f"services:{service_name}"
        instances_data = await self.redis.hgetall(service_key)
        
        instances = []
        for instance_id, instance_json in instances_data.items():
            instance_data = json.loads(instance_json)
            
            # 健康检查
            if await self._health_check(instance_data):
                instances.append(ServiceInstance.from_dict(instance_data))
            else:
                # 移除不健康的实例
                await self.redis.hdel(service_key, instance_id)
        
        return instances

class LoadBalancer:
    """负载均衡器"""
    
    def __init__(self, service_registry: ServiceRegistry):
        self.registry = service_registry
        self.strategies = {
            'round_robin': self._round_robin,
            'least_connections': self._least_connections,
            'weighted_random': self._weighted_random
        }
    
    async def get_service_instance(self, service_name: str, 
                                 strategy: str = 'round_robin') -> ServiceInstance:
        """获取服务实例"""
        instances = await self.registry.discover_service(service_name)
        
        if not instances:
            raise ServiceUnavailableError(f"No available instances for {service_name}")
        
        strategy_func = self.strategies.get(strategy, self._round_robin)
        return strategy_func(instances)
    
    def _round_robin(self, instances: List[ServiceInstance]) -> ServiceInstance:
        """轮询策略"""
        # 简化实现，实际应该持久化轮询状态
        return random.choice(instances)
```

### 3. 监控和可观测性

```python
"""
监控体系：

Metrics (指标) → Prometheus → Grafana
  ↑
Traces (链路追踪) → Jaeger
  ↑  
Logs (日志) → ELK Stack
  ↑
Application (应用)
"""

class MetricsCollector:
    """指标收集器"""
    
    def __init__(self):
        # Prometheus指标
        self.command_duration = Histogram(
            'command_processing_duration_seconds',
            'Command processing duration',
            ['command_type', 'status']
        )
        
        self.query_duration = Histogram(
            'query_processing_duration_seconds', 
            'Query processing duration',
            ['query_type', 'cache_hit']
        )
        
        self.event_published = Counter(
            'domain_events_published_total',
            'Total domain events published',
            ['event_type']
        )
        
        self.active_connections = Gauge(
            'active_websocket_connections',
            'Active WebSocket connections'
        )
    
    def record_command_duration(self, command_type: str, 
                              duration: float, success: bool):
        """记录命令执行时间"""
        status = 'success' if success else 'error'
        self.command_duration.labels(
            command_type=command_type, 
            status=status
        ).observe(duration)
    
    def record_query_duration(self, query_type: str, 
                            duration: float, cache_hit: bool):
        """记录查询执行时间"""
        cache_status = 'hit' if cache_hit else 'miss'
        self.query_duration.labels(
            query_type=query_type,
            cache_hit=cache_status
        ).observe(duration)
    
    def record_event_published(self, event_type: str):
        """记录事件发布"""
        self.event_published.labels(event_type=event_type).inc()

class DistributedTracing:
    """分布式链路追踪"""
    
    def __init__(self, tracer):
        self.tracer = tracer
    
    def trace_command_execution(self, command: Command):
        """追踪命令执行"""
        def decorator(func):
            @wraps(func)
            async def wrapper(*args, **kwargs):
                with self.tracer.start_span(
                    operation_name=f"command.{command.command_type}",
                    tags={
                        'component': 'command_handler',
                        'command.id': str(command.command_id),
                        'command.type': command.command_type
                    }
                ) as span:
                    try:
                        result = await func(*args, **kwargs)
                        span.set_tag('success', result.success)
                        if not result.success:
                            span.set_tag('error.message', result.error_message)
                        return result
                    except Exception as e:
                        span.set_tag('error', True)
                        span.set_tag('error.message', str(e))
                        span.log_kv({'event': 'error', 'error.object': e})
                        raise
            return wrapper
        return decorator

# 结构化日志
class StructuredLogger:
    """结构化日志记录器"""
    
    def __init__(self, logger_name: str):
        self.logger = structlog.get_logger(logger_name)
    
    def log_command_started(self, command: Command, user_id: str):
        """记录命令开始"""
        self.logger.info(
            "Command started",
            command_id=str(command.command_id),
            command_type=command.command_type,
            user_id=user_id,
            timestamp=command.timestamp.isoformat()
        )
    
    def log_command_completed(self, command: Command, result: CommandResult):
        """记录命令完成"""
        self.logger.info(
            "Command completed",
            command_id=str(command.command_id),
            command_type=command.command_type,
            success=result.success,
            duration_ms=result.processing_time_ms,
            error_code=result.error_code if not result.success else None
        )
    
    def log_event_published(self, event: DomainEvent):
        """记录事件发布"""
        self.logger.info(
            "Domain event published",
            event_id=str(event.event_id),
            event_type=event.event_type,
            aggregate_id=event.aggregate_id,
            occurred_at=event.occurred_at.isoformat()
        )
```

## 部署和运维

### Docker化部署

```dockerfile
# Dockerfile
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 复制源码
COPY . .

# 健康检查
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# 启动应用
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```yaml
# docker-compose.yml
version: '3.8'

services:
  order-service:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/orders
      - REDIS_URL=redis://redis:6379/0
    depends_on:
      - postgres
      - redis
    
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: orders
      POSTGRES_USER: user
      POSTGRES_PASSWORD: pass
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    
  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin

volumes:
  postgres_data:
  redis_data:
```

## 总结 - Clean DDD的整体价值

Clean DDD在Python中的完整实现展现了以下核心价值：

### 1. 架构清晰性
- **分层明确**：每层职责清晰，依赖方向单一
- **接口明确**：通过抽象接口定义层间协作
- **职责分离**：读写分离、命令查询分离

### 2. 业务表达力
- **领域语言**：代码直接表达业务概念
- **意图驱动**：命令和事件明确表达业务意图
- **规则封装**：业务规则封装在聚合和值对象中

### 3. 技术灵活性
- **框架无关**：核心业务逻辑不依赖具体技术
- **可替换性**：基础设施组件可以轻松替换
- **多协议支持**：同一业务逻辑支持多种访问方式

### 4. 扩展性
- **微服务友好**：天然支持服务拆分
- **事件驱动**：通过事件实现松耦合
- **水平扩展**：支持分布式部署

### 5. 可维护性
- **测试友好**：各层可以独立测试
- **变更局部化**：业务变更影响范围有限
- **代码可读性**：代码结构映射业务结构

### 6. Python生态集成
- **现代Python特性**：充分利用类型提示、异步等特性
- **成熟生态**：与FastAPI、SQLAlchemy、Celery等无缝集成
- **开发效率**：保持Python的开发敏捷性

这个完整的Clean DDD架构为Python开发者提供了一个既符合DDD理念，又充分发挥Python语言优势的实践指南。通过这套架构，可以构建出既能应对复杂业务需求，又具备良好技术品质的软件系统。