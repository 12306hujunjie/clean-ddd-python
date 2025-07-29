# 命令(Commands) - Python Clean DDD实现指南

## 概念本质 - Ultra Think

命令是Clean DDD架构中**表达用户意图**的核心概念。它不仅仅是数据传输对象，更是**业务操作的显式声明**——当用户想要改变系统状态时，命令就是这种意图的具体化表达。

> **哲学思考**：命令体现了"意图驱动设计"的理念。在现实世界中，我们通过语言表达意图："我要下单"、"我要取消订单"、"我要修改地址"。命令让我们在代码中用同样自然的方式表达这些业务意图。

## 要解决的核心问题

### 1. 业务意图的明确表达

```python
# ❌ 意图不明确的方法调用
def update_order(order_id: str, data: dict):
    # 无法从方法名和参数看出具体要做什么操作
    # data里可能包含各种不同的修改意图
    pass

# ✅ 明确的业务意图表达
@dataclass(frozen=True)
class ConfirmOrderCommand:
    """确认订单命令 - 明确表达用户想要确认订单的意图"""
    order_id: OrderId
    payment_method: str
    requested_by: CustomerId
    confirmation_notes: Optional[str] = None

@dataclass(frozen=True)
class CancelOrderCommand:
    """取消订单命令 - 明确表达用户想要取消订单的意图"""
    order_id: OrderId
    cancellation_reason: str
    requested_by: CustomerId
    refund_method: Optional[str] = None

@dataclass(frozen=True)
class ChangeShippingAddressCommand:
    """修改配送地址命令 - 意图清晰，参数明确"""
    order_id: OrderId
    new_shipping_address: Address
    requested_by: CustomerId
```

### 2. 操作边界的清晰划分

```python
# Clean DDD原则：一个命令仅操作一个聚合
@dataclass(frozen=True)
class RegisterCustomerCommand:
    """注册客户命令 - 只操作Customer聚合"""
    email: Email
    name: PersonName
    phone: Optional[PhoneNumber] = None
    preferred_language: str = "zh-CN"
    marketing_consent: bool = False

# 不会直接操作其他聚合，而是通过领域事件触发后续操作
@command_handler(RegisterCustomerCommand)
async def handle_register_customer(command: RegisterCustomerCommand):
    # 只操作Customer聚合
    customer = CustomerAggregate.register(
        email=command.email,
        name=command.name,
        phone=command.phone
    )
    
    await customer_repository.save(customer)
    
    # 发布事件让其他聚合响应
    await customer.publish_domain_events()  # CustomerRegisteredEvent
```

### 3. 业务规则的前置验证

```python
@dataclass(frozen=True)
class PlaceOrderCommand:
    """下单命令 - 包含完整的业务上下文和验证信息"""
    customer_id: CustomerId
    items: List[OrderItemRequest]
    shipping_address: Address
    payment_method: str
    discount_code: Optional[str] = None
    special_instructions: Optional[str] = None
    
    def __post_init__(self):
        """命令级别的业务规则验证"""
        if not self.items:
            raise ValueError("订单必须包含至少一个商品")
        
        if len(self.items) > 50:
            raise ValueError("单个订单最多支持50个商品")
        
        total_quantity = sum(item.quantity for item in self.items)
        if total_quantity > 100:
            raise ValueError("订单总数量不能超过100件")
        
        # 验证地址完整性
        if not self.shipping_address.is_complete():
            raise ValueError("配送地址信息不完整")

@dataclass(frozen=True)
class OrderItemRequest:
    """订单项请求 - 命令中的嵌套值对象"""
    product_id: ProductId
    quantity: int
    unit_price: Money
    
    def __post_init__(self):
        if self.quantity <= 0:
            raise ValueError("商品数量必须大于0")
        if self.unit_price.is_negative_or_zero:
            raise ValueError("商品价格必须大于0")
```

## Python中的命令架构设计

### 命令基础设施

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Type, Callable, List, Optional, TypeVar, Generic
from uuid import uuid4, UUID
from datetime import datetime
import asyncio
from enum import Enum

# 命令基类
@dataclass(frozen=True)
class Command(ABC):
    """命令基类"""
    command_id: UUID = field(default_factory=uuid4)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    correlation_id: Optional[UUID] = None  # 用于追踪相关的操作链
    
    @property
    @abstractmethod
    def command_type(self) -> str:
        """命令类型标识"""
        pass
    
    def to_dict(self) -> Dict[str, Any]:
        """序列化为字典"""
        return {
            'command_id': str(self.command_id),
            'command_type': self.command_type,
            'timestamp': self.timestamp.isoformat(),
            'correlation_id': str(self.correlation_id) if self.correlation_id else None,
            **self._get_command_data()
        }
    
    @abstractmethod
    def _get_command_data(self) -> Dict[str, Any]:
        """获取命令特有数据"""
        pass

# 命令结果
@dataclass(frozen=True)
class CommandResult:
    """命令执行结果"""
    command_id: UUID
    success: bool
    result_data: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    error_code: Optional[str] = None
    processing_time_ms: Optional[int] = None
    
    @classmethod
    def success_result(cls, command_id: UUID, 
                      data: Optional[Dict[str, Any]] = None,
                      processing_time_ms: Optional[int] = None) -> 'CommandResult':
        """创建成功结果"""
        return cls(
            command_id=command_id,
            success=True,
            result_data=data,
            processing_time_ms=processing_time_ms
        )
    
    @classmethod
    def error_result(cls, command_id: UUID, 
                    error_message: str,
                    error_code: Optional[str] = None,
                    processing_time_ms: Optional[int] = None) -> 'CommandResult':
        """创建错误结果"""
        return cls(
            command_id=command_id,
            success=False,
            error_message=error_message,
            error_code=error_code,
            processing_time_ms=processing_time_ms
        )
```

### 具体命令实现 - 订单领域

```python
@dataclass(frozen=True)
class CreateOrderCommand(Command):
    """创建订单命令"""
    customer_id: CustomerId
    shipping_address: Address
    items: List[OrderItemRequest]
    payment_method: str
    discount_code: Optional[str] = None
    notes: Optional[str] = None
    
    @property
    def command_type(self) -> str:
        return "CreateOrder"
    
    def _get_command_data(self) -> Dict[str, Any]:
        return {
            'customer_id': str(self.customer_id),
            'shipping_address': self.shipping_address.to_dict(),
            'items': [item.to_dict() for item in self.items],
            'payment_method': self.payment_method,
            'discount_code': self.discount_code,
            'notes': self.notes
        }
    
    def __post_init__(self):
        """命令验证"""
        if not self.items:
            raise ValueError("订单必须包含商品")
        
        if not self.payment_method:
            raise ValueError("必须指定支付方式")
        
        # 验证商品数量限制
        total_quantity = sum(item.quantity for item in self.items)
        if total_quantity > 100:
            raise ValueError("订单商品总数量不能超过100件")

@dataclass(frozen=True)
class AddOrderItemCommand(Command):
    """添加订单项命令"""
    order_id: OrderId
    product_id: ProductId
    product_name: str
    quantity: int
    unit_price: Money
    requested_by: CustomerId
    
    @property
    def command_type(self) -> str:
        return "AddOrderItem"
    
    def _get_command_data(self) -> Dict[str, Any]:
        return {
            'order_id': str(self.order_id),
            'product_id': str(self.product_id),
            'product_name': self.product_name,
            'quantity': self.quantity,
            'unit_price': self.unit_price.to_dict(),
            'requested_by': str(self.requested_by)
        }
    
    def __post_init__(self):
        if self.quantity <= 0:
            raise ValueError("商品数量必须大于0")
        if self.unit_price.is_negative_or_zero:
            raise ValueError("商品价格必须大于0")
        if not self.product_name.strip():
            raise ValueError("商品名称不能为空")

@dataclass(frozen=True)
class ConfirmOrderCommand(Command):
    """确认订单命令"""
    order_id: OrderId
    payment_method: str
    requested_by: CustomerId
    confirmation_notes: Optional[str] = None
    
    @property
    def command_type(self) -> str:
        return "ConfirmOrder"
    
    def _get_command_data(self) -> Dict[str, Any]:
        return {
            'order_id': str(self.order_id),
            'payment_method': self.payment_method,
            'requested_by': str(self.requested_by),
            'confirmation_notes': self.confirmation_notes
        }

@dataclass(frozen=True)
class CancelOrderCommand(Command):
    """取消订单命令"""
    order_id: OrderId
    cancellation_reason: str
    requested_by: CustomerId
    refund_method: Optional[str] = None
    
    @property
    def command_type(self) -> str:
        return "CancelOrder"
    
    def _get_command_data(self) -> Dict[str, Any]:
        return {
            'order_id': str(self.order_id),
            'cancellation_reason': self.cancellation_reason,
            'requested_by': str(self.requested_by),
            'refund_method': self.refund_method
        }
    
    def __post_init__(self):
        if not self.cancellation_reason.strip():
            raise ValueError("取消原因不能为空")
```

### 命令处理器架构

```python
from typing import TypeVar, Generic
import time
import logging

TCommand = TypeVar('TCommand', bound=Command)

class CommandHandler(Generic[TCommand], ABC):
    """命令处理器基类"""
    
    @abstractmethod
    async def handle(self, command: TCommand) -> CommandResult:
        """处理命令"""
        pass
    
    @abstractmethod
    def can_handle(self, command_type: str) -> bool:
        """判断是否能处理指定类型的命令"""
        pass

class OrderCommandHandler(CommandHandler[Command]):
    """订单命令处理器"""
    
    def __init__(self, 
                 order_repository: OrderRepositoryInterface,
                 customer_repository: CustomerRepositoryInterface,
                 product_repository: ProductRepositoryInterface,
                 unit_of_work: UnitOfWorkInterface):
        self.order_repository = order_repository
        self.customer_repository = customer_repository
        self.product_repository = product_repository
        self.unit_of_work = unit_of_work
        self.logger = logging.getLogger(__name__)
    
    async def handle(self, command: Command) -> CommandResult:
        """统一命令处理入口"""
        start_time = time.time()
        
        try:
            if isinstance(command, CreateOrderCommand):
                result_data = await self._handle_create_order(command)
            elif isinstance(command, AddOrderItemCommand):
                result_data = await self._handle_add_order_item(command)
            elif isinstance(command, ConfirmOrderCommand):
                result_data = await self._handle_confirm_order(command)
            elif isinstance(command, CancelOrderCommand):
                result_data = await self._handle_cancel_order(command)
            else:
                raise ValueError(f"不支持的命令类型: {command.command_type}")
            
            processing_time = int((time.time() - start_time) * 1000)
            
            return CommandResult.success_result(
                command_id=command.command_id,
                data=result_data,
                processing_time_ms=processing_time
            )
            
        except Exception as e:
            processing_time = int((time.time() - start_time) * 1000)
            self.logger.error(f"命令处理失败: {command.command_type}, {e}", exc_info=True)
            
            return CommandResult.error_result(
                command_id=command.command_id,
                error_message=str(e),
                error_code=self._get_error_code(e),
                processing_time_ms=processing_time
            )
    
    def can_handle(self, command_type: str) -> bool:
        """判断是否能处理指定命令"""
        return command_type in ['CreateOrder', 'AddOrderItem', 'ConfirmOrder', 'CancelOrder']
    
    async def _handle_create_order(self, command: CreateOrderCommand) -> Dict[str, Any]:
        """处理创建订单命令"""
        async with self.unit_of_work:
            # 1. 验证客户存在且有效
            customer = await self.customer_repository.get(command.customer_id)
            if not customer or not customer.is_active:
                raise ValueError(f"客户不存在或已禁用: {command.customer_id}")
            
            # 2. 验证商品信息
            product_ids = [item.product_id for item in command.items]
            products = await self.product_repository.get_by_ids(product_ids)
            
            if len(products) != len(product_ids):
                missing_ids = set(product_ids) - {p.id for p in products}
                raise ValueError(f"商品不存在: {missing_ids}")
            
            # 3. 创建订单聚合
            order = OrderAggregate.create(
                customer_id=command.customer_id,
                shipping_address=command.shipping_address,
                payment_method=command.payment_method
            )
            
            # 4. 添加订单项
            for item_request in command.items:
                product = next(p for p in products if p.id == item_request.product_id)
                
                # 验证库存
                if not product.has_sufficient_stock(item_request.quantity):
                    raise ValueError(f"商品库存不足: {product.name}")
                
                order.add_item(
                    product_id=item_request.product_id,
                    product_name=product.name,
                    quantity=item_request.quantity,
                    unit_price=product.current_price
                )
            
            # 5. 应用折扣码
            if command.discount_code:
                discount = await self._validate_and_get_discount(command.discount_code, order)
                if discount:
                    order.apply_discount(discount)
            
            # 6. 保存订单
            await self.order_repository.save(order)
            
            # 7. 发布领域事件
            await order.publish_domain_events()
            
            # 8. 提交事务
            await self.unit_of_work.commit()
            
            self.logger.info(f"订单创建成功: {order.id}")
            
            return {
                'order_id': str(order.id),
                'total_amount': order.total_amount.to_dict(),
                'status': order.status.value,
                'item_count': len(order.items)
            }
    
    async def _handle_confirm_order(self, command: ConfirmOrderCommand) -> Dict[str, Any]:
        """处理确认订单命令"""
        async with self.unit_of_work:
            # 1. 获取订单
            order = await self.order_repository.get(command.order_id)
            if not order:
                raise ValueError(f"订单不存在: {command.order_id}")
            
            # 2. 验证权限
            if order.customer_id != command.requested_by:
                raise ValueError("无权限操作此订单")
            
            # 3. 执行业务操作
            order.confirm(payment_method=command.payment_method)
            
            # 4. 保存变更
            await self.order_repository.save(order)
            
            # 5. 发布事件
            await order.publish_domain_events()
            
            # 6. 提交事务
            await self.unit_of_work.commit()
            
            return {
                'order_id': str(order.id),
                'status': order.status.value,
                'confirmed_at': order.confirmed_at.isoformat() if order.confirmed_at else None
            }
    
    async def _handle_cancel_order(self, command: CancelOrderCommand) -> Dict[str, Any]:
        """处理取消订单命令"""
        async with self.unit_of_work:
            order = await self.order_repository.get(command.order_id)
            if not order:
                raise ValueError(f"订单不存在: {command.order_id}")
            
            # 验证权限和业务规则
            if order.customer_id != command.requested_by:
                raise ValueError("无权限操作此订单")
            
            # 执行取消操作
            order.cancel(reason=command.cancellation_reason)
            
            await self.order_repository.save(order)
            await order.publish_domain_events()
            await self.unit_of_work.commit()
            
            return {
                'order_id': str(order.id),
                'status': order.status.value,
                'cancelled_at': order.cancelled_at.isoformat() if order.cancelled_at else None
            }
    
    def _get_error_code(self, exception: Exception) -> str:
        """根据异常类型返回错误代码"""
        if isinstance(exception, ValueError):
            return "VALIDATION_ERROR"
        elif isinstance(exception, PermissionError):
            return "PERMISSION_DENIED"
        else:
            return "INTERNAL_ERROR"
```

### 命令总线 (Command Bus)

```python
class CommandBus:
    """命令总线 - 统一的命令分发和处理机制"""
    
    def __init__(self):
        self._handlers: Dict[str, CommandHandler] = {}
        self._middleware: List[Callable] = []
        self.logger = logging.getLogger(__name__)
    
    def register_handler(self, command_type: str, handler: CommandHandler) -> None:
        """注册命令处理器"""
        self._handlers[command_type] = handler
        self.logger.info(f"注册命令处理器: {command_type} -> {handler.__class__.__name__}")
    
    def add_middleware(self, middleware: Callable) -> None:
        """添加中间件"""
        self._middleware.append(middleware)
    
    async def send(self, command: Command) -> CommandResult:
        """发送命令并获取处理结果"""
        command_type = command.command_type
        
        # 查找处理器
        handler = self._handlers.get(command_type)
        if not handler:
            error_msg = f"未找到命令处理器: {command_type}"
            self.logger.error(error_msg)
            return CommandResult.error_result(
                command_id=command.command_id,
                error_message=error_msg,
                error_code="HANDLER_NOT_FOUND"
            )
        
        # 应用中间件
        for middleware in self._middleware:
            await middleware(command)
        
        # 处理命令
        self.logger.info(f"处理命令: {command_type} ({command.command_id})")
        result = await handler.handle(command)
        
        if result.success:
            self.logger.info(f"命令处理成功: {command_type} ({command.command_id})")
        else:
            self.logger.error(f"命令处理失败: {command_type} ({command.command_id}): {result.error_message}")
        
        return result

# 全局命令总线实例
command_bus = CommandBus()

# 装饰器风格的命令处理器注册
def command_handler(command_type: str):
    """命令处理器装饰器"""
    def decorator(handler_class):
        handler_instance = handler_class()
        command_bus.register_handler(command_type, handler_instance)
        return handler_class
    return decorator

# 使用装饰器注册处理器
@command_handler("CreateOrder")
class CreateOrderCommandHandler(CommandHandler[CreateOrderCommand]):
    async def handle(self, command: CreateOrderCommand) -> CommandResult:
        # 处理逻辑
        pass
    
    def can_handle(self, command_type: str) -> bool:
        return command_type == "CreateOrder"
```

### 命令验证中间件

```python
from pydantic import BaseModel, ValidationError
from typing import Any, Dict

class CommandValidationMiddleware:
    """命令验证中间件"""
    
    def __init__(self):
        self._validators: Dict[str, BaseModel] = {}
    
    def register_validator(self, command_type: str, validator_class: BaseModel):
        """注册命令验证器"""
        self._validators[command_type] = validator_class
    
    async def __call__(self, command: Command) -> None:
        """验证命令"""
        validator_class = self._validators.get(command.command_type)
        if validator_class:
            try:
                # 使用Pydantic进行详细验证
                validator_class(**command.to_dict())
            except ValidationError as e:
                raise ValueError(f"命令验证失败: {e}")

# Pydantic验证模型
class CreateOrderCommandValidator(BaseModel):
    """创建订单命令验证器"""
    customer_id: str
    shipping_address: Dict[str, Any]
    items: List[Dict[str, Any]]
    payment_method: str
    
    class Config:
        extra = 'allow'  # 允许额外字段

# 注册验证中间件
validation_middleware = CommandValidationMiddleware()
validation_middleware.register_validator("CreateOrder", CreateOrderCommandValidator)
command_bus.add_middleware(validation_middleware)
```

### 命令日志和审计中间件

```python
class CommandAuditMiddleware:
    """命令审计中间件"""
    
    def __init__(self, audit_repository: AuditRepositoryInterface):
        self.audit_repository = audit_repository
    
    async def __call__(self, command: Command) -> None:
        """记录命令审计日志"""
        audit_log = CommandAuditLog(
            command_id=command.command_id,
            command_type=command.command_type,
            command_data=command.to_dict(),
            timestamp=datetime.utcnow(),
            correlation_id=command.correlation_id
        )
        
        await self.audit_repository.save(audit_log)

class CommandPerformanceMiddleware:
    """命令性能监控中间件"""
    
    def __init__(self, metrics_collector: MetricsCollectorInterface):
        self.metrics = metrics_collector
    
    async def __call__(self, command: Command) -> None:
        """记录命令性能指标"""
        # 记录命令接收时间
        self.metrics.record_command_received(
            command_type=command.command_type,
            timestamp=command.timestamp
        )
        
        # 可以在这里添加更多监控逻辑
```

### 异步命令处理

```python
class AsyncCommandProcessor:
    """异步命令处理器"""
    
    def __init__(self, command_bus: CommandBus, 
                 message_queue: MessageQueueInterface):
        self.command_bus = command_bus
        self.message_queue = message_queue
    
    async def send_async(self, command: Command) -> UUID:
        """异步发送命令"""
        # 将命令放入消息队列
        await self.message_queue.enqueue(
            queue_name="commands",
            message=command.to_dict()
        )
        
        return command.command_id
    
    async def process_queued_commands(self) -> None:
        """处理队列中的命令"""
        while True:
            try:
                message = await self.message_queue.dequeue("commands", timeout=5)
                if message:
                    command = self._deserialize_command(message)
                    result = await self.command_bus.send(command)
                    
                    # 处理结果可以发送到结果队列或存储
                    await self._handle_command_result(command, result)
                    
            except Exception as e:
                logging.error(f"处理队列命令失败: {e}", exc_info=True)
                await asyncio.sleep(1)  # 错误后稍等再试

# Celery集成示例
from celery import Celery

celery_app = Celery('commands')

@celery_app.task
def process_command_async(command_data: Dict[str, Any]):
    """Celery任务：异步处理命令"""
    command = command_factory.create(command_data['command_type'], command_data)
    result = asyncio.run(command_bus.send(command))
    return result.to_dict()
```

## 命令与查询分离 (CQRS)

```python
# 命令端：负责写操作
class OrderCommandService:
    """订单命令服务"""
    
    def __init__(self, command_bus: CommandBus):
        self.command_bus = command_bus
    
    async def create_order(self, request: CreateOrderRequest) -> CommandResult:
        """创建订单"""
        command = CreateOrderCommand(
            customer_id=request.customer_id,
            shipping_address=request.shipping_address,
            items=request.items,
            payment_method=request.payment_method,
            discount_code=request.discount_code
        )
        
        return await self.command_bus.send(command)
    
    async def confirm_order(self, order_id: OrderId, 
                          customer_id: CustomerId,
                          payment_method: str) -> CommandResult:
        """确认订单"""
        command = ConfirmOrderCommand(
            order_id=order_id,
            payment_method=payment_method,
            requested_by=customer_id
        )
        
        return await self.command_bus.send(command)

# 查询端：负责读操作（将在queries.md中详细说明）
class OrderQueryService:
    """订单查询服务"""
    
    def __init__(self, read_model_repository: ReadModelRepositoryInterface):
        self.read_repository = read_model_repository
    
    async def get_order_details(self, order_id: OrderId) -> OrderDetailsViewModel:
        """获取订单详情"""
        return await self.read_repository.get_order_details(order_id)
    
    async def get_customer_orders(self, customer_id: CustomerId) -> List[OrderSummaryViewModel]:
        """获取客户订单列表"""
        return await self.read_repository.get_customer_orders(customer_id)
```

## 命令的高级模式

### 1. 命令组合 (Command Composition)

```python
@dataclass(frozen=True)
class BatchOrderOperationCommand(Command):
    """批量订单操作命令"""
    operations: List[Command]
    correlation_id: UUID
    
    @property
    def command_type(self) -> str:
        return "BatchOrderOperation"
    
    def _get_command_data(self) -> Dict[str, Any]:
        return {
            'operations': [op.to_dict() for op in self.operations],
            'correlation_id': str(self.correlation_id)
        }

class BatchCommandHandler(CommandHandler[BatchOrderOperationCommand]):
    """批量命令处理器"""
    
    async def handle(self, command: BatchOrderOperationCommand) -> CommandResult:
        """处理批量命令"""
        results = []
        
        async with self.unit_of_work:
            for operation in command.operations:
                try:
                    result = await self.command_bus.send(operation)
                    results.append(result)
                    
                    if not result.success:
                        # 如果任何操作失败，回滚整个批次
                        await self.unit_of_work.rollback()
                        return CommandResult.error_result(
                            command_id=command.command_id,
                            error_message=f"批量操作失败: {result.error_message}"
                        )
                except Exception as e:
                    await self.unit_of_work.rollback()
                    return CommandResult.error_result(
                        command_id=command.command_id,
                        error_message=f"批量操作异常: {str(e)}"
                    )
            
            await self.unit_of_work.commit()
        
        return CommandResult.success_result(
            command_id=command.command_id,
            data={'results': [r.to_dict() for r in results]}
        )
```

### 2. 命令补偿 (Command Compensation)

```python
@dataclass(frozen=True)
class CompensatableCommand(Command):
    """可补偿命令基类"""
    
    @abstractmethod
    def get_compensation_command(self) -> 'Command':
        """获取补偿命令"""
        pass

@dataclass(frozen=True)
class ProcessPaymentCommand(CompensatableCommand):
    """处理支付命令"""
    order_id: OrderId
    payment_amount: Money
    payment_method: str
    
    @property
    def command_type(self) -> str:
        return "ProcessPayment"
    
    def get_compensation_command(self) -> 'RefundPaymentCommand':
        """获取补偿命令：退款"""
        return RefundPaymentCommand(
            order_id=self.order_id,
            refund_amount=self.payment_amount,
            refund_reason="系统自动补偿",
            correlation_id=self.command_id
        )

class SagaCommandProcessor:
    """Saga模式命令处理器"""
    
    async def execute_saga(self, commands: List[CompensatableCommand]) -> CommandResult:
        """执行Saga事务"""
        executed_commands = []
        
        try:
            # 顺序执行命令
            for command in commands:
                result = await self.command_bus.send(command)
                if not result.success:
                    # 执行补偿
                    await self._compensate(executed_commands)
                    return result
                executed_commands.append(command)
            
            return CommandResult.success_result(
                command_id=UUID4(),
                data={'executed_commands': len(executed_commands)}
            )
            
        except Exception as e:
            await self._compensate(executed_commands)
            raise
    
    async def _compensate(self, executed_commands: List[CompensatableCommand]):
        """执行补偿操作"""
        # 反向执行补偿命令
        for command in reversed(executed_commands):
            compensation = command.get_compensation_command()
            await self.command_bus.send(compensation)
```

## 测试策略

### 命令测试

```python
import pytest
from unittest.mock import AsyncMock, Mock

class TestOrderCommands:
    """订单命令测试"""
    
    @pytest.fixture
    def mock_repositories(self):
        """模拟仓储"""
        return {
            'order_repository': AsyncMock(),
            'customer_repository': AsyncMock(),
            'product_repository': AsyncMock()
        }
    
    @pytest.fixture
    def command_handler(self, mock_repositories):
        """命令处理器"""
        return OrderCommandHandler(
            order_repository=mock_repositories['order_repository'],
            customer_repository=mock_repositories['customer_repository'],
            product_repository=mock_repositories['product_repository'],
            unit_of_work=AsyncMock()
        )
    
    def test_create_order_command_validation(self):
        """测试创建订单命令验证"""
        # 有效命令
        valid_command = CreateOrderCommand(
            customer_id=CustomerId.generate(),
            shipping_address=Address(
                country="中国", province="北京", city="北京市",
                district="朝阳区", street="测试街道", postal_code="100000"
            ),
            items=[OrderItemRequest(
                product_id=ProductId("PROD-001"),
                quantity=1,
                unit_price=Money.from_yuan(100)
            )],
            payment_method="credit_card"
        )
        
        assert valid_command.command_type == "CreateOrder"
        assert len(valid_command.items) == 1
        
        # 无效命令 - 空商品列表
        with pytest.raises(ValueError, match="订单必须包含商品"):
            CreateOrderCommand(
                customer_id=CustomerId.generate(),
                shipping_address=valid_command.shipping_address,
                items=[],  # 空列表
                payment_method="credit_card"
            )
    
    async def test_create_order_command_handler(self, command_handler, mock_repositories):
        """测试创建订单命令处理器"""
        # 准备测试数据
        customer = CustomerAggregate(
            id=CustomerId.generate(),
            name=PersonName("张", "三"),
            email=Email("zhang@example.com")
        )
        
        product = Mock()
        product.id = ProductId("PROD-001")
        product.name = "测试商品"
        product.current_price = Money.from_yuan(100)
        product.has_sufficient_stock.return_value = True
        
        # 配置模拟对象
        mock_repositories['customer_repository'].get.return_value = customer
        mock_repositories['product_repository'].get_by_ids.return_value = [product]
        
        # 创建命令
        command = CreateOrderCommand(
            customer_id=customer.id,
            shipping_address=Address(
                country="中国", province="北京", city="北京市",
                district="朝阳区", street="测试街道", postal_code="100000"
            ),
            items=[OrderItemRequest(
                product_id=product.id,
                quantity=2,
                unit_price=Money.from_yuan(100)
            )],
            payment_method="credit_card"
        )
        
        # 执行命令
        result = await command_handler.handle(command)
        
        # 验证结果
        assert result.success is True
        assert 'order_id' in result.result_data
        assert result.result_data['item_count'] == 2
        
        # 验证仓储调用
        mock_repositories['order_repository'].save.assert_called_once()
    
    async def test_command_bus_integration(self):
        """测试命令总线集成"""
        # 创建命令总线
        bus = CommandBus()
        
        # 创建模拟处理器
        mock_handler = AsyncMock()
        mock_handler.can_handle.return_value = True
        mock_handler.handle.return_value = CommandResult.success_result(
            command_id=UUID4(),
            data={'test': 'success'}
        )
        
        # 注册处理器
        bus.register_handler("CreateOrder", mock_handler)
        
        # 创建命令
        command = CreateOrderCommand(
            customer_id=CustomerId.generate(),
            shipping_address=Address(
                country="中国", province="北京", city="北京市",
                district="朝阳区", street="测试街道", postal_code="100000"
            ),
            items=[OrderItemRequest(
                product_id=ProductId("PROD-001"),
                quantity=1,
                unit_price=Money.from_yuan(100)
            )],
            payment_method="credit_card"
        )
        
        # 发送命令
        result = await bus.send(command)
        
        # 验证结果
        assert result.success is True
        assert result.result_data['test'] == 'success'
        mock_handler.handle.assert_called_once_with(command)
```

## 与其他DDD要素的关系

### 1. 命令触发聚合操作

```python
# 命令处理器调用聚合的业务方法
@command_handler(ConfirmOrderCommand)
async def handle_confirm_order(command: ConfirmOrderCommand):
    order = await order_repository.get(command.order_id)
    
    # 命令参数传递给聚合方法
    order.confirm_order(
        payment_method=command.payment_method,
        notes=command.confirmation_notes
    )
    
    await order_repository.save(order)
    # 聚合发布的事件将被自动处理
    await order.publish_domain_events()
```

### 2. 命令与值类型的配合

```python
# 命令使用值类型确保类型安全和业务规则
@dataclass(frozen=True)
class UpdateCustomerAddressCommand(Command):
    customer_id: CustomerId        # 强类型ID
    new_address: Address          # 值类型，包含验证逻辑
    address_type: AddressType     # 枚举值类型
    requested_by: CustomerId      # 操作权限验证
```

### 3. 命令与查询的分离

```python
# 命令端：处理写操作
async def place_order(command: CreateOrderCommand) -> CommandResult:
    # 写操作：创建订单
    result = await command_bus.send(command)
    return result

# 查询端：处理读操作  
async def get_order_status(order_id: OrderId) -> OrderStatusViewModel:
    # 读操作：查询订单状态
    return await query_service.get_order_status(order_id)
```

## 总结 - 命令的价值

命令在Clean DDD中的核心价值：

1. **意图表达**：命令明确表达用户的业务意图，代码即文档
2. **操作边界**：一个命令一个聚合，保持操作的原子性和一致性
3. **类型安全**：利用强类型系统防止运行时错误
4. **可测试性**：命令和处理器可以独立测试
5. **审计追踪**：每个命令都有完整的执行记录
6. **异步处理**：支持异步和批量处理提升系统性能
7. **扩展性**：新的业务操作通过添加新命令实现

在Python实现中的特色：
- 使用dataclass定义不可变命令
- 利用类型提示提供编译时检查
- 装饰器模式简化处理器注册
- 与async/await无缝集成
- 中间件模式提供横切关注点
- 与Pydantic集成提供数据验证

**下一步**：了解了命令后，我们将学习**查询(Queries)**，它们负责系统的读操作和数据展示。