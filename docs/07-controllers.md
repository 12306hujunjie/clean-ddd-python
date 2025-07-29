# 控制器(Controllers) - Python Clean DDD实现指南

## 概念本质 - Ultra Think

控制器是Clean DDD架构中**连接外部世界与领域逻辑**的关键桥梁。它不仅仅是HTTP请求的处理器，更是**协议转换器和边界守护者**——负责将外部协议（HTTP、GraphQL、CLI等）转换为领域理解的命令和查询，同时保护领域核心不被外部技术细节污染。

> **哲学思考**：控制器体现了"适配器模式"的深层思想。就像翻译官需要精通两种语言一样，控制器必须既懂外部协议的规则，又理解内部领域的语言，在两者之间进行无缝转换。

## 要解决的核心问题

### 1. 协议适配和数据转换

```python
# ❌ 协议细节泄漏到领域层
class OrderService:
    def create_order(self, request: HTTPRequest) -> HTTPResponse:
        # 直接处理HTTP请求对象 - 违反Clean Architecture
        customer_id = request.json.get('customer_id')
        items = request.json.get('items', [])
        
        # 领域逻辑与HTTP协议耦合
        order = Order.create(customer_id, items)
        
        # 直接返回HTTP响应 - 协议泄漏
        return HTTPResponse(status=201, json=order.to_dict())

# ✅ 清晰的协议适配边界
class OrderController:
    def __init__(self, command_bus: CommandBus, query_bus: QueryBus):
        self.command_bus = command_bus
        self.query_bus = query_bus
    
    async def create_order(self, request: CreateOrderRequest) -> CreateOrderResponse:
        """HTTP协议到领域命令的转换"""
        # 1. 请求验证和数据转换
        command = CreateOrderCommand(
            customer_id=CustomerId(request.customer_id),
            shipping_address=Address.from_dict(request.shipping_address),
            items=[OrderItemRequest.from_dict(item) for item in request.items],
            payment_method=request.payment_method,
            discount_code=request.discount_code
        )
        
        # 2. 委托给领域层处理
        result = await self.command_bus.send(command)
        
        # 3. 将领域结果转换为协议响应
        if result.success:
            return CreateOrderResponse(
                order_id=result.result_data['order_id'],
                status='created',
                message='订单创建成功'
            )
        else:
            raise HTTPException(
                status_code=400,
                detail=result.error_message
            )
```

### 2. 跨协议的统一业务逻辑

```python
# 同一个业务逻辑支持多种协议接入

# HTTP REST API
class OrderRestController:
    async def create_order_rest(self, request: CreateOrderHttpRequest) -> Dict[str, Any]:
        command = self._build_create_order_command(request.dict())
        result = await self.command_bus.send(command)
        return self._format_rest_response(result)

# GraphQL API
class OrderGraphQLResolver:
    async def create_order_mutation(self, info, input: CreateOrderInput) -> CreateOrderPayload:
        command = self._build_create_order_command(input.__dict__)
        result = await self.command_bus.send(command)
        return self._format_graphql_response(result)

# CLI命令
class OrderCliCommand:
    async def create_order_cli(self, args: argparse.Namespace) -> None:
        command = self._build_create_order_command(vars(args))
        result = await self.command_bus.send(command)
        self._print_cli_response(result)

# 消息队列处理
class OrderMessageHandler:
    async def handle_create_order_message(self, message: Dict[str, Any]) -> None:
        command = self._build_create_order_command(message)
        result = await self.command_bus.send(command)
        await self._send_result_message(result)

# 共享的命令构建逻辑
class OrderCommandBuilder:
    @staticmethod
    def build_create_order_command(data: Dict[str, Any]) -> CreateOrderCommand:
        """统一的命令构建逻辑"""
        return CreateOrderCommand(
            customer_id=CustomerId(data['customer_id']),
            shipping_address=Address.from_dict(data['shipping_address']),
            items=[OrderItemRequest.from_dict(item) for item in data['items']],
            payment_method=data['payment_method'],
            discount_code=data.get('discount_code')
        )
```

### 3. 安全和权限控制

```python
# 控制器层的安全边界
class SecureOrderController:
    def __init__(self, 
                 command_bus: CommandBus,
                 auth_service: AuthenticationService,
                 authz_service: AuthorizationService):
        self.command_bus = command_bus
        self.auth_service = auth_service
        self.authz_service = authz_service
    
    async def cancel_order(self, 
                          order_id: str, 
                          request: CancelOrderRequest,
                          current_user: CurrentUser) -> CancelOrderResponse:
        """取消订单 - 包含完整的安全检查"""
        
        # 1. 身份验证 (Authentication)
        if not current_user.is_authenticated:
            raise HTTPException(status_code=401, detail="未认证用户")
        
        # 2. 权限验证 (Authorization)
        can_cancel = await self.authz_service.can_cancel_order(
            user=current_user,
            order_id=OrderId(order_id)
        )
        if not can_cancel:
            raise HTTPException(status_code=403, detail="无权限取消此订单")
        
        # 3. 业务规则验证
        command = CancelOrderCommand(
            order_id=OrderId(order_id),
            cancellation_reason=request.reason,
            requested_by=CustomerId(current_user.user_id)
        )
        
        # 4. 审计日志
        await self._log_security_action(
            action="cancel_order",
            user=current_user,
            resource=order_id,
            timestamp=datetime.utcnow()
        )
        
        # 5. 执行业务操作
        result = await self.command_bus.send(command)
        
        if result.success:
            return CancelOrderResponse(
                order_id=order_id,
                status='cancelled',
                message='订单已取消'
            )
        else:
            raise HTTPException(status_code=400, detail=result.error_message)
```

## Python中的控制器架构设计

### FastAPI控制器实现

```python
from fastapi import APIRouter, HTTPException, Depends, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
import asyncio
from datetime import datetime

# 请求/响应模型定义
class CreateOrderRequest(BaseModel):
    """创建订单请求"""
    customer_id: str = Field(..., description="客户ID")
    shipping_address: Dict[str, Any] = Field(..., description="配送地址")
    items: List[Dict[str, Any]] = Field(..., description="订单项列表", min_items=1)
    payment_method: str = Field(..., description="支付方式")
    discount_code: Optional[str] = Field(None, description="优惠码")
    notes: Optional[str] = Field(None, description="订单备注")
    
    class Config:
        schema_extra = {
            "example": {
                "customer_id": "CUST-12345",
                "shipping_address": {
                    "country": "中国",
                    "province": "北京",
                    "city": "北京市",
                    "district": "朝阳区",
                    "street": "三里屯街道123号",
                    "postal_code": "100027"
                },
                "items": [
                    {
                        "product_id": "PROD-001",
                        "quantity": 2,
                        "unit_price": {"amount": "99.99", "currency": "CNY"}
                    }
                ],
                "payment_method": "credit_card",
                "discount_code": "WELCOME10"
            }
        }

class CreateOrderResponse(BaseModel):
    """创建订单响应"""
    order_id: str = Field(..., description="订单ID")
    order_number: str = Field(..., description="订单号")
    status: str = Field(..., description="订单状态")
    total_amount: str = Field(..., description="订单总金额")
    estimated_delivery: Optional[datetime] = Field(None, description="预计送达时间")
    message: str = Field(..., description="操作结果消息")

class GetOrderResponse(BaseModel):
    """获取订单响应"""
    order_id: str
    order_number: str
    status: str
    status_display: str
    created_at: datetime
    customer: Dict[str, Any]
    items: List[Dict[str, Any]]
    total_amount: str
    shipping_address: Dict[str, Any]
    tracking_number: Optional[str]

class OrderListResponse(BaseModel):
    """订单列表响应"""
    items: List[Dict[str, Any]]
    total_count: int
    page: int
    page_size: int
    has_next: bool
    has_previous: bool

# 控制器基类
class BaseController:
    """控制器基类"""
    
    def __init__(self, 
                 command_bus: CommandBus,
                 query_bus: QueryBus,
                 auth_service: AuthenticationService):
        self.command_bus = command_bus
        self.query_bus = query_bus
        self.auth_service = auth_service
        self.logger = logging.getLogger(self.__class__.__name__)
    
    async def get_current_user(self, 
                              credentials: HTTPAuthorizationCredentials = Security(HTTPBearer())) -> CurrentUser:
        """获取当前用户"""
        try:
            user = await self.auth_service.authenticate_token(credentials.credentials)
            if not user:
                raise HTTPException(status_code=401, detail="无效的认证令牌")
            return user
        except Exception as e:
            self.logger.warning(f"认证失败: {e}")
            raise HTTPException(status_code=401, detail="认证失败")
    
    def handle_command_result(self, result: CommandResult) -> Dict[str, Any]:
        """处理命令结果"""
        if result.success:
            return {
                "success": True,
                "data": result.result_data,
                "message": "操作成功"
            }
        else:
            # 根据错误类型返回不同的HTTP状态码
            if result.error_code == "VALIDATION_ERROR":
                raise HTTPException(status_code=400, detail=result.error_message)
            elif result.error_code == "PERMISSION_DENIED":
                raise HTTPException(status_code=403, detail=result.error_message)
            elif result.error_code == "NOT_FOUND":
                raise HTTPException(status_code=404, detail=result.error_message)
            else:
                raise HTTPException(status_code=500, detail="内部服务错误")

# 订单控制器实现
class OrderController(BaseController):
    """订单控制器"""
    
    def __init__(self, 
                 command_bus: CommandBus,
                 query_bus: QueryBus,
                 auth_service: AuthenticationService,
                 order_command_builder: OrderCommandBuilder):
        super().__init__(command_bus, query_bus, auth_service)
        self.command_builder = order_command_builder
    
    async def create_order(self, 
                          request: CreateOrderRequest,
                          current_user: CurrentUser = Depends(get_current_user)) -> CreateOrderResponse:
        """创建订单"""
        try:
            # 构建命令
            command = self.command_builder.build_create_order_command({
                **request.dict(),
                'customer_id': current_user.user_id  # 使用认证用户的ID
            })
            
            # 执行命令
            result = await self.command_bus.send(command)
            
            if result.success:
                return CreateOrderResponse(
                    order_id=result.result_data['order_id'],
                    order_number=result.result_data.get('order_number', ''),
                    status=result.result_data.get('status', 'created'),
                    total_amount=result.result_data.get('total_amount', ''),
                    estimated_delivery=result.result_data.get('estimated_delivery'),
                    message="订单创建成功"
                )
            else:
                self.handle_command_result(result)
                
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"创建订单失败: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="订单创建失败")
    
    async def get_order(self, 
                       order_id: str,
                       current_user: CurrentUser = Depends(get_current_user)) -> GetOrderResponse:
        """获取订单详情"""
        try:
            # 构建查询
            query = GetOrderDetailsQuery(
                order_id=OrderId(order_id),
                include_items=True,
                include_customer=True
            )
            
            # 执行查询
            result = await self.query_bus.send(query)
            
            # 权限检查 - 只能查看自己的订单
            if result.data.customer.customer_id != current_user.user_id:
                raise HTTPException(status_code=403, detail="无权限查看此订单")
            
            return GetOrderResponse(**result.data.to_dict())
            
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"获取订单失败: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="获取订单失败")
    
    async def list_orders(self, 
                         page: int = 1,
                         page_size: int = 20,
                         status: Optional[str] = None,
                         current_user: CurrentUser = Depends(get_current_user)) -> OrderListResponse:
        """获取订单列表"""
        try:
            # 参数验证
            if page < 1:
                raise HTTPException(status_code=400, detail="页码必须大于0")
            if page_size < 1 or page_size > 100:
                raise HTTPException(status_code=400, detail="页面大小必须在1-100之间")
            
            # 构建查询
            query = GetCustomerOrdersQuery(
                customer_id=CustomerId(current_user.user_id),
                status_filter=[status] if status else None,
                page=page,
                page_size=page_size,
                sort_by='created_at',
                sort_direction='desc'
            )
            
            # 执行查询
            result = await self.query_bus.send(query)
            
            return OrderListResponse(
                items=[item.to_dict() for item in result.data.items],
                total_count=result.data.total_count,
                page=result.data.page,
                page_size=result.data.page_size,
                has_next=result.data.has_next,
                has_previous=result.data.has_previous
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"获取订单列表失败: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="获取订单列表失败")
    
    async def cancel_order(self, 
                          order_id: str,
                          request: CancelOrderRequest,
                          current_user: CurrentUser = Depends(get_current_user)) -> CancelOrderResponse:
        """取消订单"""
        try:
            # 构建命令
            command = CancelOrderCommand(
                order_id=OrderId(order_id),
                cancellation_reason=request.reason,
                requested_by=CustomerId(current_user.user_id)
            )
            
            # 执行命令
            result = await self.command_bus.send(command)
            
            if result.success:
                return CancelOrderResponse(
                    order_id=order_id,
                    status='cancelled',
                    message='订单已取消'
                )
            else:
                self.handle_command_result(result)
                
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"取消订单失败: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="取消订单失败")

# 路由定义
def create_order_router(order_controller: OrderController) -> APIRouter:
    """创建订单路由"""
    router = APIRouter(prefix="/api/v1/orders", tags=["订单"])
    
    @router.post("/", response_model=CreateOrderResponse, status_code=201)
    async def create_order(
        request: CreateOrderRequest,
        current_user: CurrentUser = Depends(order_controller.get_current_user)
    ):
        """创建订单"""
        return await order_controller.create_order(request, current_user)
    
    @router.get("/{order_id}", response_model=GetOrderResponse)
    async def get_order(
        order_id: str,
        current_user: CurrentUser = Depends(order_controller.get_current_user)
    ):
        """获取订单详情"""
        return await order_controller.get_order(order_id, current_user)
    
    @router.get("/", response_model=OrderListResponse)
    async def list_orders(
        page: int = 1,
        page_size: int = 20,
        status: Optional[str] = None,
        current_user: CurrentUser = Depends(order_controller.get_current_user)
    ):
        """获取订单列表"""
        return await order_controller.list_orders(page, page_size, status, current_user)
    
    @router.patch("/{order_id}/cancel", response_model=CancelOrderResponse)
    async def cancel_order(
        order_id: str,
        request: CancelOrderRequest,
        current_user: CurrentUser = Depends(order_controller.get_current_user)
    ):
        """取消订单"""
        return await order_controller.cancel_order(order_id, request, current_user)
    
    return router
```

### GraphQL控制器实现

```python
import strawberry
from strawberry.types import Info
from typing import List, Optional

# GraphQL类型定义
@strawberry.type
class OrderType:
    """订单GraphQL类型"""
    order_id: str
    order_number: str
    status: str
    status_display: str
    created_at: datetime
    total_amount: str
    item_count: int

@strawberry.type
class OrderDetailsType:
    """订单详情GraphQL类型"""
    order_id: str
    order_number: str
    status: str
    status_display: str
    created_at: datetime
    customer: "CustomerType"
    items: List["OrderItemType"]
    total_amount: str
    shipping_address: "AddressType"

@strawberry.input
class CreateOrderInput:
    """创建订单输入"""
    shipping_address: "AddressInput"
    items: List["OrderItemInput"]
    payment_method: str
    discount_code: Optional[str] = None

@strawberry.type
class CreateOrderPayload:
    """创建订单响应"""
    order: Optional[OrderType]
    success: bool
    message: str
    errors: Optional[List[str]] = None

# GraphQL解析器
@strawberry.type
class OrderResolver:
    """订单GraphQL解析器"""
    
    def __init__(self, 
                 command_bus: CommandBus,
                 query_bus: QueryBus):
        self.command_bus = command_bus
        self.query_bus = query_bus
    
    @strawberry.field
    async def order(self, info: Info, order_id: str) -> Optional[OrderDetailsType]:
        """获取订单详情"""
        # 从GraphQL上下文获取当前用户
        current_user = info.context.get('current_user')
        if not current_user:
            raise Exception("未认证用户")
        
        query = GetOrderDetailsQuery(
            order_id=OrderId(order_id),
            include_items=True,
            include_customer=True
        )
        
        result = await self.query_bus.send(query)
        
        # 权限检查
        if result.data.customer.customer_id != current_user.user_id:
            raise Exception("无权限查看此订单")
        
        return self._convert_to_graphql_type(result.data)
    
    @strawberry.field
    async def orders(self, 
                    info: Info,
                    page: int = 1,
                    page_size: int = 20,
                    status: Optional[str] = None) -> List[OrderType]:
        """获取订单列表"""
        current_user = info.context.get('current_user')
        if not current_user:
            raise Exception("未认证用户")
        
        query = GetCustomerOrdersQuery(
            customer_id=CustomerId(current_user.user_id),
            status_filter=[status] if status else None,
            page=page,
            page_size=page_size
        )
        
        result = await self.query_bus.send(query)
        
        return [self._convert_to_graphql_summary(item) for item in result.data.items]

@strawberry.type
class OrderMutation:
    """订单变更操作"""
    
    def __init__(self, 
                 command_bus: CommandBus):
        self.command_bus = command_bus
    
    @strawberry.mutation
    async def create_order(self, 
                          info: Info,
                          input: CreateOrderInput) -> CreateOrderPayload:
        """创建订单"""
        current_user = info.context.get('current_user')
        if not current_user:
            return CreateOrderPayload(
                order=None,
                success=False,
                message="未认证用户",
                errors=["AUTHENTICATION_REQUIRED"]
            )
        
        try:
            command = CreateOrderCommand(
                customer_id=CustomerId(current_user.user_id),
                shipping_address=Address.from_dict(input.shipping_address.__dict__),
                items=[OrderItemRequest.from_dict(item.__dict__) for item in input.items],
                payment_method=input.payment_method,
                discount_code=input.discount_code
            )
            
            result = await self.command_bus.send(command)
            
            if result.success:
                return CreateOrderPayload(
                    order=OrderType(
                        order_id=result.result_data['order_id'],
                        order_number=result.result_data.get('order_number', ''),
                        status=result.result_data.get('status', 'created'),
                        status_display="已创建",
                        created_at=datetime.utcnow(),
                        total_amount=result.result_data.get('total_amount', ''),
                        item_count=len(input.items)
                    ),
                    success=True,
                    message="订单创建成功"
                )
            else:
                return CreateOrderPayload(
                    order=None,
                    success=False,
                    message=result.error_message,
                    errors=[result.error_code] if result.error_code else None
                )
                
        except Exception as e:
            return CreateOrderPayload(
                order=None,
                success=False,
                message=f"创建订单失败: {str(e)}",
                errors=["INTERNAL_ERROR"]
            )
```

### CLI控制器实现

```python
import click
import asyncio
import json
from typing import Optional

class OrderCliController:
    """订单CLI控制器"""
    
    def __init__(self, 
                 command_bus: CommandBus,
                 query_bus: QueryBus):
        self.command_bus = command_bus
        self.query_bus = query_bus
    
    async def create_order_async(self, 
                               customer_id: str,
                               items_json: str,
                               shipping_address_json: str,
                               payment_method: str,
                               discount_code: Optional[str] = None):
        """异步创建订单"""
        try:
            # 解析JSON参数
            items_data = json.loads(items_json)
            address_data = json.loads(shipping_address_json)
            
            # 构建命令
            command = CreateOrderCommand(
                customer_id=CustomerId(customer_id),
                shipping_address=Address.from_dict(address_data),
                items=[OrderItemRequest.from_dict(item) for item in items_data],
                payment_method=payment_method,
                discount_code=discount_code
            )
            
            # 执行命令
            result = await self.command_bus.send(command)
            
            if result.success:
                click.echo(click.style("✓ 订单创建成功", fg='green'))
                click.echo(f"订单ID: {result.result_data['order_id']}")
                click.echo(f"订单号: {result.result_data.get('order_number', 'N/A')}")
                click.echo(f"总金额: {result.result_data.get('total_amount', 'N/A')}")
            else:
                click.echo(click.style(f"✗ 订单创建失败: {result.error_message}", fg='red'))
                
        except json.JSONDecodeError as e:
            click.echo(click.style(f"✗ JSON解析失败: {e}", fg='red'))
        except Exception as e:
            click.echo(click.style(f"✗ 创建订单失败: {e}", fg='red'))
    
    async def get_order_async(self, order_id: str):
        """异步获取订单"""
        try:
            query = GetOrderDetailsQuery(
                order_id=OrderId(order_id),
                include_items=True,
                include_customer=True
            )
            
            result = await self.query_bus.send(query)
            
            # 格式化输出
            order = result.data
            click.echo(click.style("订单详情", fg='blue', bold=True))
            click.echo(f"订单ID: {order.order_id}")
            click.echo(f"订单号: {order.order_number}")
            click.echo(f"状态: {order.status_display}")
            click.echo(f"创建时间: {order.created_at}")
            click.echo(f"总金额: {order.total_amount}")
            
            if order.items:
                click.echo(click.style("\n订单项:", fg='blue'))
                for item in order.items:
                    click.echo(f"- {item.product_name} x{item.quantity} = {item.total_price}")
            
        except Exception as e:
            click.echo(click.style(f"✗ 获取订单失败: {e}", fg='red'))

# CLI命令定义
@click.group()
def order_cli():
    """订单管理CLI"""
    pass

@order_cli.command()
@click.option('--customer-id', required=True, help='客户ID')
@click.option('--items', required=True, help='订单项JSON字符串')
@click.option('--shipping-address', required=True, help='配送地址JSON字符串')
@click.option('--payment-method', required=True, help='支付方式')
@click.option('--discount-code', help='优惠码')
def create_order(customer_id: str, 
                items: str, 
                shipping_address: str, 
                payment_method: str,
                discount_code: Optional[str]):
    """创建订单"""
    controller = OrderCliController(command_bus, query_bus)
    asyncio.run(controller.create_order_async(
        customer_id=customer_id,
        items_json=items,
        shipping_address_json=shipping_address,
        payment_method=payment_method,
        discount_code=discount_code
    ))

@order_cli.command()
@click.option('--order-id', required=True, help='订单ID')
def get_order(order_id: str):
    """获取订单详情"""
    controller = OrderCliController(command_bus, query_bus)
    asyncio.run(controller.get_order_async(order_id))

# 使用示例
# python cli.py create-order --customer-id CUST-001 --items '[{"product_id":"PROD-001","quantity":2,"unit_price":{"amount":"99.99","currency":"CNY"}}]' --shipping-address '{"country":"中国","province":"北京","city":"北京市","district":"朝阳区","street":"测试街道","postal_code":"100000"}' --payment-method credit_card
```

### 中间件和横切关注点

```python
# 请求/响应日志中间件
class RequestLoggingMiddleware:
    """请求日志中间件"""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    async def __call__(self, request: Request, call_next):
        """记录请求和响应"""
        start_time = time.time()
        
        # 记录请求
        self.logger.info(f"收到请求: {request.method} {request.url}")
        
        # 处理请求
        response = await call_next(request)
        
        # 记录响应
        process_time = time.time() - start_time
        self.logger.info(f"响应: {response.status_code}, 耗时: {process_time:.3f}s")
        
        return response

# 错误处理中间件
class ErrorHandlingMiddleware:
    """全局错误处理中间件"""
    
    def __init__(self, logger: logging.Logger):
        self.logger = logger
    
    async def __call__(self, request: Request, call_next):
        """全局异常处理"""
        try:
            return await call_next(request)
        except HTTPException:
            # HTTP异常直接抛出
            raise
        except ValidationError as e:
            # 验证错误
            self.logger.warning(f"验证错误: {e}")
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            # 未预期的错误
            self.logger.error(f"未处理的异常: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail="内部服务器错误")

# 限流中间件
class RateLimitMiddleware:
    """API限流中间件"""
    
    def __init__(self, redis_client: Redis, default_limit: int = 100):
        self.redis = redis_client
        self.default_limit = default_limit
    
    async def __call__(self, request: Request, call_next):
        """请求限流"""
        # 获取客户端标识（IP或用户ID）
        client_id = self._get_client_id(request)
        
        # 检查限流
        current_count = await self._get_request_count(client_id)
        if current_count >= self.default_limit:
            raise HTTPException(
                status_code=429, 
                detail="请求过于频繁，请稍后再试"
            )
        
        # 增加计数
        await self._increment_request_count(client_id)
        
        return await call_next(request)
    
    def _get_client_id(self, request: Request) -> str:
        """获取客户端标识"""
        # 优先使用用户ID，否则使用IP
        user_id = getattr(request.state, 'user_id', None)
        if user_id:
            return f"user:{user_id}"
        else:
            return f"ip:{request.client.host}"
    
    async def _get_request_count(self, client_id: str) -> int:
        """获取请求计数"""
        key = f"rate_limit:{client_id}"
        count = await self.redis.get(key)
        return int(count) if count else 0
    
    async def _increment_request_count(self, client_id: str):
        """增加请求计数"""
        key = f"rate_limit:{client_id}"
        await self.redis.incr(key)
        await self.redis.expire(key, 3600)  # 1小时过期
```

### WebSocket控制器

```python
from fastapi import WebSocket, WebSocketDisconnect
import json

class OrderWebSocketController:
    """订单WebSocket控制器"""
    
    def __init__(self, 
                 query_bus: QueryBus,
                 event_bus: EventBus):
        self.query_bus = query_bus
        self.event_bus = event_bus
        self.active_connections: Dict[str, WebSocket] = {}
    
    async def connect(self, websocket: WebSocket, user_id: str):
        """WebSocket连接"""
        await websocket.accept()
        self.active_connections[user_id] = websocket
        
        # 订阅用户相关的订单事件
        await self.event_bus.subscribe(
            event_pattern=f"order.*",
            handler=self._handle_order_event,
            filter_func=lambda event: self._is_user_related_event(event, user_id)
        )
    
    async def disconnect(self, user_id: str):
        """WebSocket断开"""
        if user_id in self.active_connections:
            del self.active_connections[user_id]
    
    async def handle_message(self, websocket: WebSocket, user_id: str, message: str):
        """处理WebSocket消息"""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'get_order_status':
                await self._handle_get_order_status(websocket, user_id, data)
            elif message_type == 'subscribe_order_updates':
                await self._handle_subscribe_order_updates(websocket, user_id, data)
            else:
                await websocket.send_text(json.dumps({
                    'type': 'error',
                    'message': f'未知消息类型: {message_type}'
                }))
                
        except json.JSONDecodeError:
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': '无效的JSON格式'
            }))
        except Exception as e:
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': f'处理消息失败: {str(e)}'
            }))
    
    async def _handle_get_order_status(self, websocket: WebSocket, user_id: str, data: Dict[str, Any]):
        """处理获取订单状态请求"""
        order_id = data.get('order_id')
        if not order_id:
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': '缺少order_id参数'
            }))
            return
        
        query = GetOrderDetailsQuery(
            order_id=OrderId(order_id),
            include_items=False,
            include_customer=False
        )
        
        result = await self.query_bus.send(query)
        
        # 权限检查
        if result.data.customer.customer_id != user_id:
            await websocket.send_text(json.dumps({
                'type': 'error',
                'message': '无权限查看此订单'
            }))
            return
        
        await websocket.send_text(json.dumps({
            'type': 'order_status',
            'data': {
                'order_id': result.data.order_id,
                'status': result.data.status,
                'status_display': result.data.status_display
            }
        }))
    
    async def _handle_order_event(self, event: DomainEvent):
        """处理订单事件"""
        # 向相关用户推送订单更新
        if hasattr(event, 'customer_id'):
            user_id = str(event.customer_id)
            websocket = self.active_connections.get(user_id)
            
            if websocket:
                try:
                    await websocket.send_text(json.dumps({
                        'type': 'order_event',
                        'event_type': event.event_type,
                        'data': event.to_dict()
                    }))
                except Exception as e:
                    # 连接可能已断开，清理连接
                    await self.disconnect(user_id)
    
    def _is_user_related_event(self, event: DomainEvent, user_id: str) -> bool:
        """判断事件是否与用户相关"""
        return (hasattr(event, 'customer_id') and 
                str(event.customer_id) == user_id)

# WebSocket路由
@app.websocket("/ws/orders/{user_id}")
async def order_websocket_endpoint(websocket: WebSocket, user_id: str):
    controller = OrderWebSocketController(query_bus, event_bus)
    await controller.connect(websocket, user_id)
    
    try:
        while True:
            message = await websocket.receive_text()
            await controller.handle_message(websocket, user_id, message)
    except WebSocketDisconnect:
        await controller.disconnect(user_id)
```

## 测试策略

### 控制器测试

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, Mock

class TestOrderController:
    """订单控制器测试"""
    
    @pytest.fixture
    def mock_command_bus(self):
        """模拟命令总线"""
        return AsyncMock(spec=CommandBus)
    
    @pytest.fixture
    def mock_query_bus(self):
        """模拟查询总线"""
        return AsyncMock(spec=QueryBus)
    
    @pytest.fixture
    def mock_auth_service(self):
        """模拟认证服务"""
        return AsyncMock(spec=AuthenticationService)
    
    @pytest.fixture
    def order_controller(self, mock_command_bus, mock_query_bus, mock_auth_service):
        """订单控制器"""
        return OrderController(
            command_bus=mock_command_bus,
            query_bus=mock_query_bus,
            auth_service=mock_auth_service,
            order_command_builder=OrderCommandBuilder()
        )
    
    @pytest.fixture
    def test_client(self, order_controller):
        """测试客户端"""
        app = FastAPI()
        app.include_router(create_order_router(order_controller))
        return TestClient(app)
    
    @pytest.fixture
    def mock_current_user(self):
        """模拟当前用户"""
        return CurrentUser(
            user_id="CUST-12345",
            email="test@example.com",
            is_authenticated=True
        )
    
    async def test_create_order_success(self, order_controller, mock_command_bus, mock_current_user):
        """测试创建订单成功"""
        # 准备测试数据
        request = CreateOrderRequest(
            customer_id="CUST-12345",
            shipping_address={
                "country": "中国",
                "province": "北京",
                "city": "北京市",
                "district": "朝阳区",
                "street": "测试街道",
                "postal_code": "100000"
            },
            items=[{
                "product_id": "PROD-001",
                "quantity": 2,
                "unit_price": {"amount": "99.99", "currency": "CNY"}
            }],
            payment_method="credit_card"
        )
        
        # 配置模拟命令结果
        mock_command_bus.send.return_value = CommandResult.success_result(
            command_id=UUID4(),
            data={
                'order_id': 'ORDER-12345',
                'order_number': 'ORD-001',
                'status': 'created',
                'total_amount': '¥199.98'
            }
        )
        
        # 执行测试
        response = await order_controller.create_order(request, mock_current_user)
        
        # 验证结果
        assert response.order_id == 'ORDER-12345'
        assert response.status == 'created'
        assert response.message == '订单创建成功'
        
        # 验证命令总线调用
        mock_command_bus.send.assert_called_once()
        sent_command = mock_command_bus.send.call_args[0][0]
        assert isinstance(sent_command, CreateOrderCommand)
        assert sent_command.customer_id == CustomerId("CUST-12345")
    
    async def test_create_order_validation_error(self, order_controller, mock_command_bus, mock_current_user):
        """测试创建订单验证错误"""
        request = CreateOrderRequest(
            customer_id="CUST-12345",
            shipping_address={},  # 无效地址
            items=[],  # 空商品列表
            payment_method="credit_card"
        )
        
        mock_command_bus.send.return_value = CommandResult.error_result(
            command_id=UUID4(),
            error_message="订单必须包含商品",
            error_code="VALIDATION_ERROR"
        )
        
        # 验证抛出HTTP异常
        with pytest.raises(HTTPException) as exc_info:
            await order_controller.create_order(request, mock_current_user)
        
        assert exc_info.value.status_code == 400
        assert "订单必须包含商品" in str(exc_info.value.detail)
    
    async def test_get_order_permission_denied(self, order_controller, mock_query_bus, mock_current_user):
        """测试获取订单权限拒绝"""
        # 配置查询结果 - 订单属于其他用户
        mock_query_bus.send.return_value = QueryResult(
            data=Mock(
                customer=Mock(customer_id="OTHER-USER"),
                to_dict=Mock(return_value={})
            )
        )
        
        # 验证抛出权限异常
        with pytest.raises(HTTPException) as exc_info:
            await order_controller.get_order("ORDER-12345", mock_current_user)
        
        assert exc_info.value.status_code == 403
        assert "无权限查看此订单" in str(exc_info.value.detail)
    
    def test_http_endpoint_integration(self, test_client, mock_command_bus):
        """测试HTTP端点集成"""
        # 配置认证
        # 这里需要模拟JWT token等认证逻辑
        
        # 配置命令结果
        mock_command_bus.send.return_value = CommandResult.success_result(
            command_id=UUID4(),
            data={'order_id': 'ORDER-12345', 'status': 'created'}
        )
        
        # 发送HTTP请求
        response = test_client.post(
            "/api/v1/orders/",
            json={
                "customer_id": "CUST-12345",
                "shipping_address": {
                    "country": "中国",
                    "province": "北京",
                    "city": "北京市",
                    "district": "朝阳区",
                    "street": "测试街道",
                    "postal_code": "100000"
                },
                "items": [{
                    "product_id": "PROD-001",
                    "quantity": 2,
                    "unit_price": {"amount": "99.99", "currency": "CNY"}
                }],
                "payment_method": "credit_card"
            },
            headers={"Authorization": "Bearer mock-token"}
        )
        
        # 验证响应
        assert response.status_code == 201
        data = response.json()
        assert data["order_id"] == "ORDER-12345"
        assert data["status"] == "created"
```

## 与其他DDD要素的深度关系

### 1. 控制器作为适配器

```python
# 控制器将外部协议适配为领域语言
class OrderController:
    async def create_order(self, http_request: CreateOrderRequest) -> CreateOrderResponse:
        # HTTP请求 -> 领域命令
        domain_command = CreateOrderCommand(
            customer_id=CustomerId(http_request.customer_id),
            shipping_address=Address.from_dict(http_request.shipping_address),
            items=[OrderItemRequest.from_dict(item) for item in http_request.items],
            payment_method=http_request.payment_method
        )
        
        # 领域处理
        domain_result = await self.command_bus.send(domain_command)
        
        # 领域结果 -> HTTP响应
        return CreateOrderResponse(
            order_id=domain_result.result_data['order_id'],
            status=domain_result.result_data['status'],
            message="订单创建成功"
        )
```

### 2. 控制器与命令/查询的协作

```python
# 控制器是命令和查询的入口点
class OrderController:
    # 写操作：通过命令总线发送命令
    async def create_order(self, request) -> Response:
        command = CreateOrderCommand(...)
        result = await self.command_bus.send(command)
        return self._build_response(result)
    
    # 读操作：通过查询总线发送查询
    async def get_order(self, order_id) -> Response:
        query = GetOrderDetailsQuery(order_id=OrderId(order_id))
        result = await self.query_bus.send(query)
        return self._build_response(result)
```

### 3. 控制器与事件的关系

```python
# 控制器可以订阅领域事件进行实时通知
class OrderWebSocketController:
    async def __init__(self):
        # 订阅订单相关事件
        await domain_event_publisher.subscribe_async(
            OrderConfirmedEvent, 
            self._notify_order_confirmed
        )
        await domain_event_publisher.subscribe_async(
            OrderShippedEvent,
            self._notify_order_shipped
        )
    
    async def _notify_order_confirmed(self, event: OrderConfirmedEvent):
        # 通过WebSocket通知客户端
        await self._send_to_user(
            user_id=str(event.customer_id),
            message={
                'type': 'order_confirmed',
                'order_id': str(event.order_id)
            }
        )
```

## 总结 - 控制器的价值

控制器在Clean DDD中的核心价值：

1. **协议适配**：将外部协议转换为领域理解的语言
2. **边界保护**：防止外部技术细节渗透到领域核心
3. **安全控制**：统一的认证、授权和审计入口
4. **错误处理**：统一的异常处理和错误响应格式
5. **多协议支持**：同一业务逻辑支持不同的接入方式
6. **横切关注点**：通过中间件处理日志、限流、监控等
7. **测试便利**：清晰的输入输出便于编写测试

在Python实现中的特色：
- 使用Pydantic进行请求/响应验证
- 支持FastAPI、GraphQL、CLI等多种协议
- 装饰器和依赖注入简化开发
- 异步支持提升性能
- 类型提示提供静态检查
- 中间件模式处理横切关注点

**下一步**：完成了所有核心要素的详细文档后，我们将创建一个综合文档说明这些要素之间的关联关系和整体架构结构。