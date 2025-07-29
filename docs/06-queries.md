# 查询(Queries) - Python Clean DDD实现指南

## 概念本质 - Ultra Think

查询是Clean DDD架构中**专门负责数据读取**的核心概念。与命令不同，查询不改变系统状态，而是**为用户提供各种维度的数据视图**。它体现了CQRS（命令查询职责分离）中的"查询端"，专注于高效的数据读取和展示。

> **哲学思考**：查询体现了"信息消费"的理念。在现实世界中，我们获取信息的方式往往与产生信息的方式完全不同。查询让我们能够根据不同的使用场景，以最合适的方式组织和展示数据。

## 要解决的核心问题

### 1. 读写性能的分离优化

```python
# ❌ 读写混合导致的性能问题
class OrderService:
    def get_order_details(self, order_id: str):
        # 使用写模型进行读取，性能低下
        order = self.order_repository.get_with_all_relations(order_id)
        # 需要多次数据库查询获取关联数据
        customer = self.customer_repository.get(order.customer_id)
        items = self.order_item_repository.get_by_order(order_id)
        # 复杂的数据转换逻辑
        return self._convert_to_view_model(order, customer, items)

# ✅ 专门的读模型优化查询性能
class OrderQueryService:
    def get_order_details(self, order_id: OrderId) -> OrderDetailsViewModel:
        # 使用专门的读模型，一次查询获取所有需要的数据
        return await self.read_model_repository.get_order_details(order_id)
    
    def get_order_summary(self, customer_id: CustomerId, 
                         page: int = 1, page_size: int = 20) -> PagedResult[OrderSummaryViewModel]:
        # 针对列表展示优化的查询
        return await self.read_model_repository.get_customer_orders_summary(
            customer_id, page, page_size
        )
```

### 2. 多样化的数据视图需求

```python
# 同一个订单数据，根据不同场景提供不同视图

# 客户端视图：关注订单状态和配送信息
@dataclass(frozen=True)
class CustomerOrderViewModel:
    order_id: str
    order_number: str
    status: str
    status_display: str
    order_date: datetime
    estimated_delivery: Optional[datetime]
    total_amount: str  # 格式化的金额显示
    item_count: int
    tracking_number: Optional[str]

# 管理后台视图：关注完整的业务信息
@dataclass(frozen=True)
class AdminOrderViewModel:
    order_id: str
    order_number: str
    customer_info: CustomerBasicInfo
    items: List[OrderItemDetail]
    financial_info: OrderFinancialInfo
    logistics_info: OrderLogisticsInfo
    status_history: List[OrderStatusChange]
    created_at: datetime
    updated_at: datetime

# 报表分析视图：关注统计和趋势数据
@dataclass(frozen=True)
class OrderAnalyticsViewModel:
    order_id: str
    customer_segment: str
    product_categories: List[str]
    order_value_range: str
    payment_method: str
    order_source: str
    fulfillment_days: int
    customer_lifetime_orders: int
```

### 3. 复杂查询和数据聚合

```python
# 复杂的业务查询需求
@dataclass(frozen=True)
class SalesAnalyticsQuery:
    """销售分析查询"""
    date_range: DateRange
    product_categories: Optional[List[str]] = None
    customer_segments: Optional[List[str]] = None
    regions: Optional[List[str]] = None
    group_by: List[str] = field(default_factory=lambda: ['date'])
    metrics: List[str] = field(default_factory=lambda: ['revenue', 'order_count'])

@dataclass(frozen=True)
class SalesAnalyticsResult:
    """销售分析结果"""
    summary: SalesSummary
    trend_data: List[SalesTrendPoint]
    top_products: List[ProductSalesInfo]
    regional_breakdown: List[RegionalSalesInfo]
    customer_insights: CustomerSalesInsights
```

## Python中的查询架构设计

### 查询基础设施

```python
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Optional, TypeVar, Generic, Dict, Any
from datetime import datetime
from enum import Enum
import asyncio

# 查询基类
@dataclass(frozen=True)
class Query(ABC):
    """查询基类"""
    query_id: UUID = field(default_factory=uuid4)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    
    @property
    @abstractmethod
    def query_type(self) -> str:
        """查询类型标识"""
        pass

# 分页查询基类
@dataclass(frozen=True)
class PagedQuery(Query):
    """分页查询基类"""
    page: int = 1
    page_size: int = 20
    
    def __post_init__(self):
        if self.page < 1:
            raise ValueError("页码必须大于0")
        if self.page_size < 1 or self.page_size > 100:
            raise ValueError("页面大小必须在1-100之间")

# 排序查询基类
@dataclass(frozen=True)
class SortableQuery(Query):
    """可排序查询基类"""
    sort_by: Optional[str] = None
    sort_direction: str = "asc"
    
    def __post_init__(self):
        if self.sort_direction not in ["asc", "desc"]:
            raise ValueError("排序方向必须是asc或desc")

# 查询结果包装
TResult = TypeVar('TResult')

@dataclass(frozen=True)
class QueryResult(Generic[TResult]):
    """查询结果包装"""
    data: TResult
    execution_time_ms: Optional[int] = None
    cache_hit: bool = False
    metadata: Optional[Dict[str, Any]] = None

@dataclass(frozen=True)
class PagedResult(Generic[TResult]):
    """分页结果"""
    items: List[TResult]
    total_count: int
    page: int
    page_size: int
    has_next: bool
    has_previous: bool
    
    @property
    def total_pages(self) -> int:
        """总页数"""
        return (self.total_count + self.page_size - 1) // self.page_size
```

### 具体查询实现 - 订单领域

```python
@dataclass(frozen=True)
class GetOrderDetailsQuery(Query):
    """获取订单详情查询"""
    order_id: OrderId
    include_items: bool = True
    include_customer: bool = True
    include_status_history: bool = False
    
    @property
    def query_type(self) -> str:
        return "GetOrderDetails"

@dataclass(frozen=True)
class GetCustomerOrdersQuery(PagedQuery, SortableQuery):
    """获取客户订单列表查询"""
    customer_id: CustomerId
    status_filter: Optional[List[str]] = None
    date_range: Optional[DateRange] = None
    
    @property
    def query_type(self) -> str:
        return "GetCustomerOrders"

@dataclass(frozen=True)
class SearchOrdersQuery(PagedQuery, SortableQuery):
    """订单搜索查询"""
    search_term: Optional[str] = None
    order_number: Optional[str] = None
    customer_email: Optional[str] = None
    status_filter: Optional[List[str]] = None
    date_range: Optional[DateRange] = None
    amount_range: Optional[MoneyRange] = None
    
    @property
    def query_type(self) -> str:
        return "SearchOrders"
    
    def __post_init__(self):
        super().__post_init__()
        # 至少需要一个查询条件
        conditions = [
            self.search_term,
            self.order_number,
            self.customer_email,
            self.status_filter,
            self.date_range,
            self.amount_range
        ]
        if not any(condition for condition in conditions):
            raise ValueError("至少需要提供一个查询条件")

@dataclass(frozen=True)
class GetOrderAnalyticsQuery(Query):
    """订单分析查询"""
    date_range: DateRange
    group_by_period: str = "day"  # day, week, month
    include_trends: bool = True
    include_categories: bool = True
    customer_segment: Optional[str] = None
    
    @property
    def query_type(self) -> str:
        return "GetOrderAnalytics"
    
    def __post_init__(self):
        if self.group_by_period not in ["day", "week", "month"]:
            raise ValueError("分组周期必须是day、week或month")
```

### 视图模型定义

```python
# 客户端订单详情视图
@dataclass(frozen=True)
class OrderDetailsViewModel:
    """订单详情视图模型"""
    order_id: str
    order_number: str
    status: str
    status_display: str
    created_at: datetime
    confirmed_at: Optional[datetime]
    
    # 客户信息
    customer: CustomerBasicInfo
    
    # 订单项
    items: List[OrderItemViewModel]
    
    # 金额信息
    subtotal: str
    discount_amount: str
    shipping_cost: str
    total_amount: str
    
    # 配送信息
    shipping_address: AddressViewModel
    estimated_delivery: Optional[datetime]
    tracking_number: Optional[str]
    
    # 支付信息
    payment_method: str
    payment_status: str

@dataclass(frozen=True)
class OrderItemViewModel:
    """订单项视图模型"""
    product_id: str
    product_name: str
    product_image_url: Optional[str]
    quantity: int
    unit_price: str
    total_price: str
    
    # 产品链接（用于前端导航）
    product_url: Optional[str] = None

@dataclass(frozen=True)
class CustomerBasicInfo:
    """客户基本信息"""
    customer_id: str
    name: str
    email: str
    phone: Optional[str]
    customer_level: str

@dataclass(frozen=True)
class AddressViewModel:
    """地址视图模型"""
    full_address: str
    recipient_name: str
    recipient_phone: str
    is_default: bool

# 订单列表视图（精简版）
@dataclass(frozen=True)
class OrderSummaryViewModel:
    """订单摘要视图模型"""
    order_id: str
    order_number: str
    status: str
    status_display: str
    order_date: datetime
    total_amount: str
    item_count: int
    
    # 快速操作标识
    can_cancel: bool
    can_modify: bool
    can_track: bool

# 分析报表视图
@dataclass(frozen=True)
class OrderAnalyticsViewModel:
    """订单分析视图模型"""
    summary: OrderSummary
    trends: List[OrderTrendPoint]
    top_products: List[ProductPerformance]
    status_distribution: List[StatusDistribution]
    
@dataclass(frozen=True)
class OrderSummary:
    """订单汇总"""
    total_orders: int
    total_revenue: str
    average_order_value: str
    growth_rate: float
    
@dataclass(frozen=True)
class OrderTrendPoint:
    """订单趋势点"""
    date: datetime
    order_count: int
    revenue: str
    
@dataclass(frozen=True)
class ProductPerformance:
    """产品表现"""
    product_id: str
    product_name: str
    order_count: int
    revenue: str
    growth_rate: float
```

### 查询处理器架构

```python
TQuery = TypeVar('TQuery', bound=Query)
TResult = TypeVar('TResult')

class QueryHandler(Generic[TQuery, TResult], ABC):
    """查询处理器基类"""
    
    @abstractmethod
    async def handle(self, query: TQuery) -> QueryResult[TResult]:
        """处理查询"""
        pass
    
    @abstractmethod
    def can_handle(self, query_type: str) -> bool:
        """判断是否能处理指定类型的查询"""
        pass

class OrderQueryHandler(QueryHandler[Query, Any]):
    """订单查询处理器"""
    
    def __init__(self, 
                 read_model_repository: OrderReadModelRepository,
                 cache_service: CacheServiceInterface,
                 metrics_collector: MetricsCollectorInterface):
        self.read_repository = read_model_repository
        self.cache = cache_service
        self.metrics = metrics_collector
        self.logger = logging.getLogger(__name__)
    
    async def handle(self, query: Query) -> QueryResult[Any]:
        """统一查询处理入口"""
        start_time = time.time()
        cache_hit = False
        
        try:
            # 尝试从缓存获取
            cache_key = self._get_cache_key(query)
            cached_result = await self.cache.get(cache_key)
            
            if cached_result:
                cache_hit = True
                result_data = cached_result
                self.logger.debug(f"缓存命中: {query.query_type}")
            else:
                # 执行查询
                if isinstance(query, GetOrderDetailsQuery):
                    result_data = await self._handle_get_order_details(query)
                elif isinstance(query, GetCustomerOrdersQuery):
                    result_data = await self._handle_get_customer_orders(query)
                elif isinstance(query, SearchOrdersQuery):
                    result_data = await self._handle_search_orders(query)
                elif isinstance(query, GetOrderAnalyticsQuery):
                    result_data = await self._handle_get_order_analytics(query)
                else:
                    raise ValueError(f"不支持的查询类型: {query.query_type}")
                
                # 缓存结果
                await self._cache_result(cache_key, result_data, query)
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # 记录指标
            self.metrics.record_query_executed(
                query_type=query.query_type,
                execution_time_ms=execution_time,
                cache_hit=cache_hit
            )
            
            return QueryResult(
                data=result_data,
                execution_time_ms=execution_time,
                cache_hit=cache_hit
            )
            
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            self.logger.error(f"查询处理失败: {query.query_type}, {e}", exc_info=True)
            
            self.metrics.record_query_failed(
                query_type=query.query_type,
                execution_time_ms=execution_time,
                error=str(e)
            )
            
            raise
    
    def can_handle(self, query_type: str) -> bool:
        """判断是否能处理指定查询"""
        return query_type in [
            'GetOrderDetails', 'GetCustomerOrders', 
            'SearchOrders', 'GetOrderAnalytics'
        ]
    
    async def _handle_get_order_details(self, query: GetOrderDetailsQuery) -> OrderDetailsViewModel:
        """处理获取订单详情查询"""
        # 基本订单信息
        order_data = await self.read_repository.get_order_basic_info(query.order_id)
        if not order_data:
            raise ValueError(f"订单不存在: {query.order_id}")
        
        # 根据查询参数决定加载哪些关联数据
        tasks = []
        
        if query.include_customer:
            tasks.append(self.read_repository.get_customer_info(order_data.customer_id))
        
        if query.include_items:
            tasks.append(self.read_repository.get_order_items(query.order_id))
        
        if query.include_status_history:
            tasks.append(self.read_repository.get_order_status_history(query.order_id))
        
        # 并行加载关联数据
        if tasks:
            results = await asyncio.gather(*tasks)
            customer_info = results[0] if query.include_customer else None
            order_items = results[1] if query.include_items else []
            status_history = results[2] if query.include_status_history else []
        else:
            customer_info = None
            order_items = []
            status_history = []
        
        # 构建视图模型
        return OrderDetailsViewModel(
            order_id=str(order_data.order_id),
            order_number=order_data.order_number,
            status=order_data.status,
            status_display=self._get_status_display(order_data.status),
            created_at=order_data.created_at,
            confirmed_at=order_data.confirmed_at,
            customer=self._build_customer_info(customer_info) if customer_info else None,
            items=[self._build_order_item_view(item) for item in order_items],
            subtotal=self._format_money(order_data.subtotal),
            discount_amount=self._format_money(order_data.discount_amount),
            shipping_cost=self._format_money(order_data.shipping_cost),
            total_amount=self._format_money(order_data.total_amount),
            shipping_address=self._build_address_view(order_data.shipping_address),
            estimated_delivery=order_data.estimated_delivery,
            tracking_number=order_data.tracking_number,
            payment_method=order_data.payment_method,
            payment_status=order_data.payment_status
        )
    
    async def _handle_get_customer_orders(self, query: GetCustomerOrdersQuery) -> PagedResult[OrderSummaryViewModel]:
        """处理获取客户订单列表查询"""
        # 构建查询条件
        filters = {
            'customer_id': query.customer_id,
            'status_filter': query.status_filter,
            'date_range': query.date_range
        }
        
        # 并行执行计数和数据查询
        count_task = self.read_repository.count_customer_orders(filters)
        data_task = self.read_repository.get_customer_orders_paged(
            filters=filters,
            page=query.page,
            page_size=query.page_size,
            sort_by=query.sort_by or 'created_at',
            sort_direction=query.sort_direction
        )
        
        total_count, orders_data = await asyncio.gather(count_task, data_task)
        
        # 构建视图模型
        order_summaries = [
            OrderSummaryViewModel(
                order_id=str(order.order_id),
                order_number=order.order_number,
                status=order.status,
                status_display=self._get_status_display(order.status),
                order_date=order.created_at,
                total_amount=self._format_money(order.total_amount),
                item_count=order.item_count,
                can_cancel=self._can_cancel_order(order.status),
                can_modify=self._can_modify_order(order.status),
                can_track=self._can_track_order(order.status, order.tracking_number)
            )
            for order in orders_data
        ]
        
        return PagedResult(
            items=order_summaries,
            total_count=total_count,
            page=query.page,
            page_size=query.page_size,
            has_next=(query.page * query.page_size) < total_count,
            has_previous=query.page > 1
        )
    
    async def _handle_search_orders(self, query: SearchOrdersQuery) -> PagedResult[OrderSummaryViewModel]:
        """处理订单搜索查询"""
        # 构建搜索条件
        search_criteria = {
            'search_term': query.search_term,
            'order_number': query.order_number,
            'customer_email': query.customer_email,
            'status_filter': query.status_filter,
            'date_range': query.date_range,
            'amount_range': query.amount_range
        }
        
        # 执行搜索
        count_task = self.read_repository.count_orders_by_search(search_criteria)
        data_task = self.read_repository.search_orders_paged(
            criteria=search_criteria,
            page=query.page,
            page_size=query.page_size,
            sort_by=query.sort_by or 'created_at',
            sort_direction=query.sort_direction
        )
        
        total_count, orders_data = await asyncio.gather(count_task, data_task)
        
        # 构建结果（与客户订单列表类似）
        # ... 省略重复代码
        
        return PagedResult(
            items=order_summaries,
            total_count=total_count,
            page=query.page,
            page_size=query.page_size,
            has_next=(query.page * query.page_size) < total_count,
            has_previous=query.page > 1
        )
    
    async def _handle_get_order_analytics(self, query: GetOrderAnalyticsQuery) -> OrderAnalyticsViewModel:
        """处理订单分析查询"""
        # 并行执行多个分析查询
        tasks = [
            self.read_repository.get_order_summary(query.date_range, query.customer_segment),
            self.read_repository.get_order_trends(query.date_range, query.group_by_period),
        ]
        
        if query.include_categories:
            tasks.append(self.read_repository.get_top_products(query.date_range, limit=10))
        
        results = await asyncio.gather(*tasks)
        
        summary_data = results[0]
        trends_data = results[1]
        top_products_data = results[2] if query.include_categories else []
        
        return OrderAnalyticsViewModel(
            summary=self._build_order_summary(summary_data),
            trends=[self._build_trend_point(point) for point in trends_data],
            top_products=[self._build_product_performance(product) for product in top_products_data],
            status_distribution=[]  # 可以根据需要添加
        )
    
    def _get_cache_key(self, query: Query) -> str:
        """生成缓存键"""
        # 根据查询类型和参数生成唯一的缓存键
        return f"query:{query.query_type}:{hash(str(query))}"
    
    async def _cache_result(self, cache_key: str, result_data: Any, query: Query) -> None:
        """缓存查询结果"""
        # 根据查询类型设置不同的缓存时间
        if isinstance(query, GetOrderDetailsQuery):
            ttl = 300  # 5分钟
        elif isinstance(query, GetCustomerOrdersQuery):
            ttl = 600  # 10分钟
        elif isinstance(query, GetOrderAnalyticsQuery):
            ttl = 1800  # 30分钟
        else:
            ttl = 300  # 默认5分钟
        
        await self.cache.set(cache_key, result_data, ttl=ttl)
```

### 查询总线 (Query Bus)

```python
class QueryBus:
    """查询总线"""
    
    def __init__(self):
        self._handlers: Dict[str, QueryHandler] = {}
        self._middleware: List[Callable] = []
        self.logger = logging.getLogger(__name__)
    
    def register_handler(self, query_type: str, handler: QueryHandler) -> None:
        """注册查询处理器"""
        self._handlers[query_type] = handler
        self.logger.info(f"注册查询处理器: {query_type} -> {handler.__class__.__name__}")
    
    def add_middleware(self, middleware: Callable) -> None:
        """添加中间件"""
        self._middleware.append(middleware)
    
    async def send(self, query: Query) -> QueryResult:
        """发送查询并获取结果"""
        query_type = query.query_type
        
        # 查找处理器
        handler = self._handlers.get(query_type)
        if not handler:
            raise ValueError(f"未找到查询处理器: {query_type}")
        
        # 应用中间件
        for middleware in self._middleware:
            await middleware(query)
        
        # 处理查询
        self.logger.debug(f"处理查询: {query_type} ({query.query_id})")
        result = await handler.handle(query)
        
        self.logger.debug(f"查询处理完成: {query_type} ({query.query_id}), 耗时: {result.execution_time_ms}ms")
        
        return result

# 全局查询总线
query_bus = QueryBus()

# 装饰器风格的查询处理器注册
def query_handler(query_type: str):
    """查询处理器装饰器"""
    def decorator(handler_class):
        handler_instance = handler_class()
        query_bus.register_handler(query_type, handler_instance)
        return handler_class
    return decorator
```

### 读模型仓储设计

```python
class OrderReadModelRepository:
    """订单读模型仓储"""
    
    def __init__(self, db_session: AsyncSession):
        self.session = db_session
    
    async def get_order_basic_info(self, order_id: OrderId) -> Optional[OrderBasicInfo]:
        """获取订单基本信息"""
        query = select(OrderReadModel).where(OrderReadModel.id == str(order_id))
        result = await self.session.execute(query)
        order_record = result.scalar_one_or_none()
        
        if not order_record:
            return None
        
        return OrderBasicInfo(
            order_id=OrderId(order_record.id),
            order_number=order_record.order_number,
            customer_id=CustomerId(order_record.customer_id),
            status=order_record.status,
            created_at=order_record.created_at,
            confirmed_at=order_record.confirmed_at,
            subtotal=Money.from_cents(order_record.subtotal_cents),
            discount_amount=Money.from_cents(order_record.discount_cents),
            shipping_cost=Money.from_cents(order_record.shipping_cents),
            total_amount=Money.from_cents(order_record.total_cents),
            shipping_address=json.loads(order_record.shipping_address_json),
            estimated_delivery=order_record.estimated_delivery,
            tracking_number=order_record.tracking_number,
            payment_method=order_record.payment_method,
            payment_status=order_record.payment_status
        )
    
    async def get_customer_orders_paged(self, 
                                      filters: Dict[str, Any],
                                      page: int, 
                                      page_size: int,
                                      sort_by: str,
                                      sort_direction: str) -> List[OrderSummaryData]:
        """分页获取客户订单"""
        query = select(OrderReadModel).where(
            OrderReadModel.customer_id == str(filters['customer_id'])
        )
        
        # 应用过滤条件
        if filters.get('status_filter'):
            query = query.where(OrderReadModel.status.in_(filters['status_filter']))
        
        if filters.get('date_range'):
            date_range = filters['date_range']
            query = query.where(
                OrderReadModel.created_at >= date_range.start_date,
                OrderReadModel.created_at <= date_range.end_date
            )
        
        # 应用排序
        sort_column = getattr(OrderReadModel, sort_by, OrderReadModel.created_at)
        if sort_direction == 'desc':
            query = query.order_by(sort_column.desc())
        else:
            query = query.order_by(sort_column.asc())
        
        # 应用分页
        query = query.offset((page - 1) * page_size).limit(page_size)
        
        result = await self.session.execute(query)
        records = result.scalars().all()
        
        return [
            OrderSummaryData(
                order_id=OrderId(record.id),
                order_number=record.order_number,
                status=record.status,
                created_at=record.created_at,
                total_amount=Money.from_cents(record.total_cents),
                item_count=record.item_count,
                tracking_number=record.tracking_number
            )
            for record in records
        ]
    
    async def count_customer_orders(self, filters: Dict[str, Any]) -> int:
        """统计客户订单数量"""
        query = select(func.count(OrderReadModel.id)).where(
            OrderReadModel.customer_id == str(filters['customer_id'])
        )
        
        # 应用同样的过滤条件
        if filters.get('status_filter'):
            query = query.where(OrderReadModel.status.in_(filters['status_filter']))
        
        if filters.get('date_range'):
            date_range = filters['date_range']
            query = query.where(
                OrderReadModel.created_at >= date_range.start_date,
                OrderReadModel.created_at <= date_range.end_date
            )
        
        result = await self.session.execute(query)
        return result.scalar()
    
    async def get_order_trends(self, date_range: DateRange, 
                             group_by_period: str) -> List[OrderTrendData]:
        """获取订单趋势数据"""
        # 根据分组周期选择不同的日期截断函数
        if group_by_period == 'day':
            date_trunc = func.date_trunc('day', OrderReadModel.created_at)
        elif group_by_period == 'week':
            date_trunc = func.date_trunc('week', OrderReadModel.created_at)
        else:  # month
            date_trunc = func.date_trunc('month', OrderReadModel.created_at)
        
        query = select(
            date_trunc.label('period'),
            func.count(OrderReadModel.id).label('order_count'),
            func.sum(OrderReadModel.total_cents).label('total_revenue_cents')
        ).where(
            OrderReadModel.created_at >= date_range.start_date,
            OrderReadModel.created_at <= date_range.end_date,
            OrderReadModel.status != 'cancelled'
        ).group_by('period').order_by('period')
        
        result = await self.session.execute(query)
        records = result.all()
        
        return [
            OrderTrendData(
                date=record.period,
                order_count=record.order_count,
                revenue=Money.from_cents(record.total_revenue_cents or 0)
            )
            for record in records
        ]
```

### 缓存策略

```python
class QueryCacheService:
    """查询缓存服务"""
    
    def __init__(self, redis_client: Redis):
        self.redis = redis_client
        self.default_ttl = 300  # 5分钟
    
    async def get(self, cache_key: str) -> Optional[Any]:
        """获取缓存"""
        try:
            cached_data = await self.redis.get(cache_key)
            if cached_data:
                return json.loads(cached_data)
        except Exception as e:
            logging.warning(f"缓存读取失败: {e}")
        return None
    
    async def set(self, cache_key: str, data: Any, ttl: Optional[int] = None) -> None:
        """设置缓存"""
        try:
            serialized_data = json.dumps(data, default=self._json_serializer)
            await self.redis.setex(
                cache_key, 
                ttl or self.default_ttl, 
                serialized_data
            )
        except Exception as e:
            logging.warning(f"缓存写入失败: {e}")
    
    async def invalidate_pattern(self, pattern: str) -> None:
        """批量失效缓存"""
        try:
            keys = await self.redis.keys(pattern)
            if keys:
                await self.redis.delete(*keys)
        except Exception as e:
            logging.warning(f"缓存失效失败: {e}")
    
    def _json_serializer(self, obj):
        """JSON序列化器"""
        if isinstance(obj, datetime):
            return obj.isoformat()
        elif isinstance(obj, Money):
            return obj.to_dict()
        elif hasattr(obj, 'to_dict'):
            return obj.to_dict()
        else:
            return str(obj)

# 缓存失效策略
class CacheInvalidationService:
    """缓存失效服务"""
    
    def __init__(self, cache_service: QueryCacheService):
        self.cache = cache_service
    
    async def invalidate_order_caches(self, order_id: OrderId, customer_id: CustomerId):
        """失效订单相关缓存"""
        patterns = [
            f"query:GetOrderDetails:*{order_id}*",
            f"query:GetCustomerOrders:*{customer_id}*",
            f"query:SearchOrders:*",
            f"query:GetOrderAnalytics:*"
        ]
        
        for pattern in patterns:
            await self.cache.invalidate_pattern(pattern)

# 在领域事件处理器中失效缓存
@event_handler(OrderConfirmedEvent)
async def invalidate_order_caches_on_confirmed(event: OrderConfirmedEvent):
    """订单确认时失效相关缓存"""
    cache_invalidation = CacheInvalidationService(query_cache_service)
    await cache_invalidation.invalidate_order_caches(
        event.order_id, 
        event.customer_id
    )
```

## 查询优化策略

### 1. 数据预聚合和物化视图

```python
# 预聚合的客户统计数据
class CustomerStatsReadModel(Base):
    """客户统计读模型"""
    __tablename__ = 'customer_stats_read_model'
    
    customer_id = Column(String(50), primary_key=True)
    total_orders = Column(Integer, default=0)
    total_spent_cents = Column(BigInteger, default=0)
    average_order_value_cents = Column(BigInteger, default=0)
    last_order_date = Column(DateTime)
    customer_level = Column(String(20))
    updated_at = Column(DateTime, default=datetime.utcnow)

# 通过事件处理器更新预聚合数据
@event_handler(OrderConfirmedEvent)
async def update_customer_stats(event: OrderConfirmedEvent):
    """更新客户统计数据"""
    async with db_session() as session:
        # 获取或创建客户统计记录
        stats = await session.get(CustomerStatsReadModel, str(event.customer_id))
        if not stats:
            stats = CustomerStatsReadModel(customer_id=str(event.customer_id))
            session.add(stats)
        
        # 更新统计数据
        stats.total_orders += 1
        stats.total_spent_cents += event.order_amount.amount * 100
        stats.average_order_value_cents = stats.total_spent_cents // stats.total_orders
        stats.last_order_date = event.occurred_at
        stats.updated_at = datetime.utcnow()
        
        await session.commit()
```

### 2. 查询结果分页和流式处理

```python
class StreamingQueryHandler:
    """流式查询处理器"""
    
    async def stream_large_dataset(self, query: LargeDatasetQuery) -> AsyncIterator[Dict[str, Any]]:
        """流式处理大数据集查询"""
        page = 1
        page_size = 1000
        
        while True:
            # 分页查询
            paged_query = query.with_pagination(page, page_size)
            result = await self.query_handler.handle(paged_query)
            
            if not result.data.items:
                break
            
            # 逐项yield结果
            for item in result.data.items:
                yield item.to_dict()
            
            # 如果已经是最后一页，退出
            if not result.data.has_next:
                break
            
            page += 1

class ExportQueryService:
    """导出查询服务"""
    
    async def export_orders_to_csv(self, query: ExportOrdersQuery) -> str:
        """导出订单到CSV"""
        import csv
        import tempfile
        
        with tempfile.NamedTemporaryFile(mode='w', suffix='.csv', delete=False) as f:
            writer = csv.writer(f)
            
            # 写入表头
            writer.writerow(['订单号', '客户邮箱', '订单状态', '订单金额', '创建时间'])
            
            # 流式写入数据
            async for order_data in self.streaming_handler.stream_large_dataset(query):
                writer.writerow([
                    order_data['order_number'],
                    order_data['customer_email'],
                    order_data['status_display'],
                    order_data['total_amount'],
                    order_data['created_at']
                ])
            
            return f.name
```

## 测试策略

### 查询测试

```python
import pytest
from unittest.mock import AsyncMock, Mock

class TestOrderQueries:
    """订单查询测试"""
    
    @pytest.fixture
    def mock_read_repository(self):
        """模拟读模型仓储"""
        return AsyncMock(spec=OrderReadModelRepository)
    
    @pytest.fixture
    def mock_cache_service(self):
        """模拟缓存服务"""
        return AsyncMock(spec=QueryCacheService)
    
    @pytest.fixture
    def query_handler(self, mock_read_repository, mock_cache_service):
        """查询处理器"""
        return OrderQueryHandler(
            read_model_repository=mock_read_repository,
            cache_service=mock_cache_service,
            metrics_collector=Mock()
        )
    
    def test_get_order_details_query_validation(self):
        """测试获取订单详情查询验证"""
        order_id = OrderId.generate()
        
        # 有效查询
        valid_query = GetOrderDetailsQuery(
            order_id=order_id,
            include_items=True,
            include_customer=True
        )
        
        assert valid_query.query_type == "GetOrderDetails"
        assert valid_query.order_id == order_id
        assert valid_query.include_items is True
    
    async def test_get_order_details_handler(self, query_handler, mock_read_repository):
        """测试获取订单详情处理器"""
        # 准备测试数据
        order_id = OrderId.generate()
        customer_id = CustomerId.generate()
        
        order_basic_info = OrderBasicInfo(
            order_id=order_id,
            order_number="ORD-001",
            customer_id=customer_id,
            status="confirmed",
            created_at=datetime.utcnow(),
            confirmed_at=datetime.utcnow(),
            subtotal=Money.from_yuan(100),
            discount_amount=Money.from_yuan(10),
            shipping_cost=Money.from_yuan(15),
            total_amount=Money.from_yuan(105),
            shipping_address={"full_address": "测试地址"},
            estimated_delivery=None,
            tracking_number=None,
            payment_method="credit_card",
            payment_status="paid"
        )
        
        customer_info = CustomerBasicInfo(
            customer_id=str(customer_id),
            name="张三",
            email="zhang@example.com",
            phone="13800138000",
            customer_level="regular"
        )
        
        order_items = [
            OrderItemData(
                product_id="PROD-001",
                product_name="测试商品",
                quantity=2,
                unit_price=Money.from_yuan(50),
                total_price=Money.from_yuan(100)
            )
        ]
        
        # 配置模拟对象
        mock_read_repository.get_order_basic_info.return_value = order_basic_info
        mock_read_repository.get_customer_info.return_value = customer_info
        mock_read_repository.get_order_items.return_value = order_items
        
        # 创建查询
        query = GetOrderDetailsQuery(
            order_id=order_id,
            include_items=True,
            include_customer=True
        )
        
        # 执行查询
        result = await query_handler.handle(query)
        
        # 验证结果
        assert result.data.order_id == str(order_id)
        assert result.data.order_number == "ORD-001"
        assert result.data.customer.name == "张三"
        assert len(result.data.items) == 1
        assert result.data.items[0].product_name == "测试商品"
        
        # 验证仓储调用
        mock_read_repository.get_order_basic_info.assert_called_once_with(order_id)
        mock_read_repository.get_customer_info.assert_called_once_with(customer_id)
        mock_read_repository.get_order_items.assert_called_once_with(order_id)
    
    async def test_paged_query_results(self, query_handler, mock_read_repository):
        """测试分页查询结果"""
        customer_id = CustomerId.generate()
        
        # 模拟分页数据
        mock_read_repository.count_customer_orders.return_value = 25
        mock_read_repository.get_customer_orders_paged.return_value = [
            # 模拟10条订单数据
            Mock(order_id=OrderId.generate(), order_number=f"ORD-{i:03d}")
            for i in range(1, 11)
        ]
        
        # 创建分页查询
        query = GetCustomerOrdersQuery(
            customer_id=customer_id,
            page=1,
            page_size=10
        )
        
        # 执行查询
        result = await query_handler.handle(query)
        
        # 验证分页结果
        paged_result = result.data
        assert len(paged_result.items) == 10
        assert paged_result.total_count == 25
        assert paged_result.page == 1
        assert paged_result.page_size == 10
        assert paged_result.has_next is True
        assert paged_result.has_previous is False
        assert paged_result.total_pages == 3
```

## 与其他DDD要素的关系

### 1. 查询与聚合的分离

```python
# 查询不直接访问聚合，而是使用专门的读模型
class OrderQueryService:
    """订单查询服务 - 不依赖聚合"""
    
    def __init__(self, read_model_repository: OrderReadModelRepository):
        # 依赖读模型仓储，而不是聚合仓储
        self.read_repository = read_model_repository
    
    async def get_order_summary(self, order_id: OrderId) -> OrderSummaryViewModel:
        # 直接从读模型获取数据，无需重建聚合
        return await self.read_repository.get_order_summary(order_id)
```

### 2. 查询与事件的配合

```python
# 通过事件更新读模型
@event_handler(OrderConfirmedEvent)
async def update_order_read_model(event: OrderConfirmedEvent):
    """更新订单读模型"""
    await order_read_model_updater.update_order_status(
        order_id=event.order_id,
        new_status="confirmed",
        confirmed_at=event.occurred_at
    )
    
    # 失效相关缓存
    await cache_invalidation_service.invalidate_order_caches(
        event.order_id, 
        event.customer_id
    )
```

### 3. 查询与控制器的配合

```python
# 控制器调用查询服务获取数据
@router.get("/orders/{order_id}")
async def get_order_details(order_id: str) -> OrderDetailsResponse:
    query = GetOrderDetailsQuery(
        order_id=OrderId(order_id),
        include_items=True,
        include_customer=True
    )
    
    result = await query_bus.send(query)
    return OrderDetailsResponse(**result.data.to_dict())
```

## 总结 - 查询的价值

查询在Clean DDD中的核心价值：

1. **读写分离**：专门优化读操作性能，与写操作完全分离
2. **视图多样化**：根据不同使用场景提供最合适的数据视图
3. **性能优化**：通过缓存、预聚合、索引等策略优化查询性能
4. **扩展性**：新的查询需求不影响写操作的业务逻辑
5. **可测试性**：查询逻辑独立，容易进行单元测试
6. **缓存友好**：查询结果可以安全缓存，提升系统响应速度
7. **数据一致性**：通过事件更新读模型，保证最终一致性

在Python实现中的特色：
- 使用dataclass定义查询和视图模型
- 利用async/await优化查询性能
- 支持多种数据源和ORM
- 与Redis等缓存系统无缝集成
- 支持流式处理大数据集
- 类型提示提供编译时检查

**下一步**：了解了查询后，我们将学习**控制器(Controllers)**，它们是外部世界与领域逻辑的桥梁。