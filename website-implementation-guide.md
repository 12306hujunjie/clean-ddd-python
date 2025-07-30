# 静态网站实施指南

## 🚀 快速开始

### 1. 项目初始化
```bash
# 创建项目目录
mkdir clean-ddd-website
cd clean-ddd-website

# 初始化npm项目
npm init -y

# 安装VitePress和依赖
npm install -D vitepress vue typescript
npm install -D @types/node vite

# 创建基础目录结构
mkdir -p .vitepress/theme/components
mkdir -p docs/{guide,examples,api,advanced}
mkdir -p public/{images,diagrams}
mkdir -p components assets/styles
```

### 2. VitePress配置
```typescript
// .vitepress/config.ts
import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Clean DDD Python',
  description: '现代Python DDD架构实践指南',
  lang: 'zh-CN',
  
  // 主题配置
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      { text: '指南', link: '/guide/introduction' },
      { text: '示例', link: '/examples/' },
      { text: 'API', link: '/api/' },
      { 
        text: '高级主题',
        items: [
          { text: '设计模式', link: '/advanced/patterns/' },
          { text: '最佳实践', link: '/advanced/best-practices/' }
        ]
      }
    ],
    
    sidebar: {
      '/guide/': [
        {
          text: '开始使用',
          items: [
            { text: '介绍', link: '/guide/introduction' },
            { text: '快速开始', link: '/guide/quick-start' },
            { text: '核心概念', link: '/guide/concepts' }
          ]
        },
        {
          text: '架构层次',
          items: [
            { text: '值对象', link: '/guide/value-objects' },
            { text: '实体', link: '/guide/entities' },
            { text: '聚合', link: '/guide/aggregates' },
            { text: '领域服务', link: '/guide/domain-services' }
          ]
        }
      ],
      
      '/examples/': [
        {
          text: '基础示例',
          items: [
            { text: '用户管理', link: '/examples/user-management' },
            { text: '订单系统', link: '/examples/order-system' }
          ]
        }
      ]
    },
    
    // 搜索配置
    search: {
      provider: 'local'
    },
    
    // 社交链接
    socialLinks: [
      { icon: 'github', link: 'https://github.com/your-org/clean-ddd-python' }
    ],
    
    // 页脚
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024 Your Organization'
    }
  },
  
  // SEO优化
  head: [
    ['meta', { name: 'theme-color', content: '#3c4043' }],
    ['meta', { name: 'og:type', content: 'website' }],
    ['meta', { name: 'og:locale', content: 'zh_CN' }],
    ['meta', { name: 'og:site_name', content: 'Clean DDD Python' }],
    ['link', { rel: 'icon', href: '/favicon.ico' }]
  ],
  
  // 构建优化
  vite: {
    build: {
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: {
            'vue-vendor': ['vue'],
            'vitepress-vendor': ['vitepress']
          }
        }
      }
    }
  }
})
```

## 🎨 自定义主题

### 1. 主题入口文件
```typescript
// .vitepress/theme/index.ts
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import CodeExample from '../components/CodeExample.vue'
import ArchitectureDiagram from '../components/ArchitectureDiagram.vue'
import './styles/custom.css'

export default {
  ...DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('CodeExample', CodeExample)
    app.component('ArchitectureDiagram', ArchitectureDiagram)
  }
}
```

### 2. 自定义布局
```vue
<!-- .vitepress/theme/Layout.vue -->
<template>
  <Layout>
    <template #nav-bar-title-after>
      <span class="version-badge">v1.0</span>
    </template>
    
    <template #doc-footer-before>
      <div class="custom-footer">
        <FeedbackWidget />
      </div>
    </template>
  </Layout>
</template>

<script setup lang="ts">
import DefaultTheme from 'vitepress/theme'
import FeedbackWidget from './components/FeedbackWidget.vue'

const { Layout } = DefaultTheme
</script>
```

### 3. 自定义样式
```css
/* .vitepress/theme/styles/custom.css */
:root {
  /* 品牌色彩 */
  --vp-c-brand: #3c82f6;
  --vp-c-brand-light: #60a5fa;
  --vp-c-brand-lighter: #93c5fd;
  --vp-c-brand-dark: #2563eb;
  
  /* 代码块 */
  --vp-code-block-bg: #1e1e1e;
  --vp-code-line-highlight-color: rgba(59, 130, 246, 0.1);
}

/* 响应式设计 */
@media (max-width: 768px) {
  .VPNavBar .title {
    font-size: 1.2rem;
  }
  
  .VPContent {
    padding: 1rem;
  }
}

/* 自定义组件样式 */
.code-example {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
  margin: 1rem 0;
}

.example-tabs {
  display: flex;
  background: var(--vp-c-bg-soft);
  border-bottom: 1px solid var(--vp-c-divider);
}

.example-tabs button {
  padding: 0.5rem 1rem;
  border: none;
  background: transparent;
  cursor: pointer;
  transition: background-color 0.2s;
}

.example-tabs button.active {
  background: var(--vp-c-brand);
  color: white;
}
```

## 🧩 核心组件实现

### 1. 代码示例组件
```vue
<!-- components/CodeExample.vue -->
<template>
  <div class="code-example">
    <div class="example-header">
      <div class="example-tabs">
        <button 
          v-for="tab in tabs" 
          :key="tab.id"
          :class="{ active: activeTab === tab.id }"
          @click="activeTab = tab.id"
        >
          {{ tab.label }}
        </button>
      </div>
      <button class="copy-btn" @click="copyCode" title="复制代码">
        <CopyIcon />
      </button>
    </div>
    
    <div class="example-content">
      <div v-show="activeTab === 'code'" class="code-block">
        <pre><code v-html="highlightedCode"></code></pre>
      </div>
      
      <div v-show="activeTab === 'demo'" class="demo-block">
        <iframe 
          v-if="demoUrl" 
          :src="demoUrl" 
          class="demo-iframe"
          sandbox="allow-scripts allow-same-origin"
        />
        <component v-else-if="demoComponent" :is="demoComponent" />
        <div v-else class="demo-placeholder">
          <PlayIcon />
          <p>交互式演示</p>
        </div>
      </div>
      
      <div v-show="activeTab === 'explanation'" class="explanation-block">
        <div v-html="explanation"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { highlightCode } from '../utils/syntax-highlighter'

interface Props {
  code: string
  language?: string
  demo?: string
  demoUrl?: string
  explanation?: string
  filename?: string
}

const props = withDefaults(defineProps<Props>(), {
  language: 'python',
  demo: '',
  explanation: ''
})

const activeTab = ref('code')
const tabs = computed(() => {
  const tabList = [{ id: 'code', label: '代码' }]
  
  if (props.demo || props.demoUrl) {
    tabList.push({ id: 'demo', label: '演示' })
  }
  
  if (props.explanation) {
    tabList.push({ id: 'explanation', label: '说明' })
  }
  
  return tabList
})

const highlightedCode = computed(() => {
  return highlightCode(props.code, props.language)
})

const demoComponent = computed(() => {
  if (props.demo) {
    return markRaw(defineAsyncComponent(() => import(`../demos/${props.demo}.vue`)))
  }
  return null
})

const copyCode = () => {
  navigator.clipboard.writeText(props.code)
  // 显示复制成功提示
}
</script>
```

### 2. 架构图组件
```vue
<!-- components/ArchitectureDiagram.vue -->
<template>
  <div class="architecture-diagram">
    <div class="diagram-controls" v-if="interactive">
      <button 
        v-for="layer in layers" 
        :key="layer.id"
        :class="{ active: activeLayer === layer.id }"
        @click="activeLayer = layer.id"
      >
        {{ layer.name }}
      </button>
    </div>
    
    <svg 
      :viewBox="`0 0 ${width} ${height}`" 
      class="diagram-svg"
      @mousemove="onMouseMove"
    >
      <!-- 层级矩形 -->
      <g v-for="layer in layers" :key="layer.id">
        <rect 
          :x="layer.x" 
          :y="layer.y" 
          :width="layer.width" 
          :height="layer.height"
          :class="[
            'layer', 
            layer.type,
            { 
              active: activeLayer === layer.id,
              highlighted: hoveredLayer === layer.id 
            }
          ]"
          @mouseenter="hoveredLayer = layer.id"
          @mouseleave="hoveredLayer = null"
          @click="activeLayer = layer.id"
        />
        
        <text 
          :x="layer.x + layer.width / 2" 
          :y="layer.y + 25"
          class="layer-title"
          text-anchor="middle"
        >
          {{ layer.name }}
        </text>
        
        <text 
          :x="layer.x + layer.width / 2" 
          :y="layer.y + 45"
          class="layer-description"
          text-anchor="middle"
        >
          {{ layer.description }}
        </text>
      </g>
      
      <!-- 连接线 -->
      <g v-for="connection in connections" :key="connection.id">
        <defs>
          <marker 
            :id="`arrow-${connection.id}`" 
            markerWidth="10" 
            markerHeight="10" 
            refX="9" 
            refY="3" 
            orient="auto" 
            markerUnits="strokeWidth"
          >
            <path d="M0,0 L0,6 L9,3 z" fill="currentColor" />
          </marker>
        </defs>
        
        <line 
          :x1="connection.x1" 
          :y1="connection.y1"
          :x2="connection.x2" 
          :y2="connection.y2"
          class="connection"
          :marker-end="`url(#arrow-${connection.id})`"
        />
        
        <text 
          :x="(connection.x1 + connection.x2) / 2" 
          :y="(connection.y1 + connection.y2) / 2 - 5"
          class="connection-label"
          text-anchor="middle"
        >
          {{ connection.label }}
        </text>
      </g>
    </svg>
    
    <!-- 详细信息面板 -->
    <div v-if="activeLayer && layerDetails[activeLayer]" class="layer-details">
      <h3>{{ layerDetails[activeLayer].title }}</h3>
      <p>{{ layerDetails[activeLayer].description }}</p>
      <ul v-if="layerDetails[activeLayer].components">
        <li v-for="component in layerDetails[activeLayer].components" :key="component">
          {{ component }}
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

interface Layer {
  id: string
  name: string
  description: string
  type: string
  x: number
  y: number
  width: number
  height: number
}

interface Connection {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
  label: string
}

interface Props {
  type: 'clean-architecture' | 'ddd-layers' | 'hexagonal'
  interactive?: boolean
  width?: number
  height?: number
}

const props = withDefaults(defineProps<Props>(), {
  interactive: true,
  width: 800,
  height: 600
})

const activeLayer = ref<string | null>(null)
const hoveredLayer = ref<string | null>(null)

// 根据架构类型生成层级数据
const layers = computed(() => {
  switch (props.type) {
    case 'clean-architecture':
      return [
        {
          id: 'presentation',
          name: '表现层',
          description: 'Controllers, Views',
          type: 'presentation',
          x: 50,
          y: 50,
          width: 700,
          height: 80
        },
        {
          id: 'application',
          name: '应用层',
          description: 'Use Cases, Services',
          type: 'application',
          x: 100,
          y: 150,
          width: 600,
          height: 80
        },
        {
          id: 'domain',
          name: '领域层',
          description: 'Entities, Value Objects',
          type: 'domain',
          x: 150,
          y: 250,
          width: 500,
          height: 80
        },
        {
          id: 'infrastructure',
          name: '基础设施层',
          description: 'Database, External APIs',
          type: 'infrastructure',
          x: 50,
          y: 350,
          width: 700,
          height: 80
        }
      ]
    
    default:
      return []
  }
})

const connections = computed(() => {
  // 生成层级间的连接线
  const result: Connection[] = []
  
  for (let i = 0; i < layers.value.length - 1; i++) {
    const current = layers.value[i]
    const next = layers.value[i + 1]
    
    result.push({
      id: `${current.id}-${next.id}`,
      x1: current.x + current.width / 2,
      y1: current.y + current.height,
      x2: next.x + next.width / 2,
      y2: next.y,
      label: '依赖'
    })
  }
  
  return result
})

const layerDetails = {
  presentation: {
    title: '表现层（Presentation Layer）',
    description: '负责处理用户交互和数据展示',
    components: ['Controllers', 'Views', 'DTOs', 'Serializers']
  },
  application: {
    title: '应用层（Application Layer）',
    description: '编排业务逻辑，协调领域对象',
    components: ['Use Cases', 'Application Services', 'Command Handlers', 'Query Handlers']
  },
  domain: {
    title: '领域层（Domain Layer）',
    description: '包含核心业务逻辑和规则',
    components: ['Entities', 'Value Objects', 'Domain Services', 'Aggregates']
  },
  infrastructure: {
    title: '基础设施层（Infrastructure Layer）',
    description: '提供技术实现和外部集成',
    components: ['Repositories', 'Database', 'External APIs', 'Message Queues']
  }
}

const onMouseMove = (event: MouseEvent) => {
  // 处理鼠标悬停效果
}
</script>

<style scoped>
.architecture-diagram {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  padding: 1rem;
  margin: 1rem 0;
}

.diagram-svg {
  width: 100%;
  height: auto;
  cursor: pointer;
}

.layer {
  fill: var(--vp-c-bg-soft);
  stroke: var(--vp-c-divider);
  stroke-width: 2;
  transition: all 0.3s ease;
}

.layer.presentation { fill: #eff6ff; stroke: #3b82f6; }
.layer.application { fill: #f0fdf4; stroke: #10b981; }
.layer.domain { fill: #fef3c7; stroke: #f59e0b; }
.layer.infrastructure { fill: #fdf2f8; stroke: #ec4899; }

.layer.highlighted {
  stroke-width: 3;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
}

.layer.active {
  stroke-width: 4;
  filter: drop-shadow(0 6px 12px rgba(0,0,0,0.15));
}

.layer-title {
  font-weight: 600;
  font-size: 16px;
  fill: var(--vp-c-text-1);
}

.layer-description {
  font-size: 12px;
  fill: var(--vp-c-text-2);
}

.connection {
  stroke: var(--vp-c-text-3);
  stroke-width: 2;
  stroke-dasharray: 5,5;
}

.connection-label {
  font-size: 11px;
  fill: var(--vp-c-text-3);
}

.layer-details {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--vp-c-bg-soft);
  border-radius: 6px;
}
</style>
```

## 📝 内容创建

### 1. 首页内容
```markdown
<!-- docs/index.md -->
---
layout: home

hero:
  name: "Clean DDD"
  text: "Python 架构实践"
  tagline: 构建可维护、可测试、可扩展的Python应用
  image:
    src: /images/hero-logo.svg
    alt: Clean DDD Python
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 查看示例
      link: /examples/

features:
  - icon: 🏗️
    title: 清晰架构
    details: 基于Clean Architecture原则，分层明确，职责清晰
  - icon: 🎯
    title: 领域驱动
    details: 以业务领域为核心，模型丰富，表达力强
  - icon: 🧪
    title: 测试友好
    details: 高内聚低耦合，易于单元测试和集成测试
  - icon: 📈
    title: 可扩展性
    details: 模块化设计，支持业务快速迭代和功能扩展
---

## 为什么选择 Clean DDD？

<div class="tip custom-block">
<p class="custom-block-title">💡 核心优势</p>

Clean DDD 结合了 Clean Architecture 和 Domain-Driven Design 的优势，为 Python 开发者提供了一套完整的架构解决方案。

</div>

### 🎯 解决的核心问题

- **业务复杂性管理**：通过领域建模清晰表达业务逻辑
- **技术债务控制**：分层架构避免代码腐化
- **团队协作效率**：统一的架构语言和开发标准
- **系统演进能力**：支持业务变化和技术栈升级

### 📊 架构概览

<ArchitectureDiagram type="clean-architecture" />

### 🚀 快速体验

<CodeExample 
  :code="`
# 定义值对象
@dataclass(frozen=True)
class Email:
    value: str
    
    def __post_init__(self):
        if not self._is_valid_email(self.value):
            raise ValueError('Invalid email format')
    
    def _is_valid_email(self, email: str) -> bool:
        return '@' in email and '.' in email.split('@')[1]

# 定义实体
class User:
    def __init__(self, user_id: UserId, email: Email):
        self._id = user_id
        self._email = email
        self._created_at = datetime.utcnow()
    
    def change_email(self, new_email: Email) -> None:
        self._email = new_email
        # 发布领域事件
        self._domain_events.append(UserEmailChanged(self._id, new_email))
`" 
  language="python"
  explanation="这个例子展示了如何定义值对象和实体，体现了DDD的核心概念"
/>

## 开始你的架构之旅

<div class="vp-doc">

:::info 🎓 学习路径
1. **[核心概念](/guide/concepts)** - 理解 Clean DDD 的基本概念
2. **[快速开始](/guide/quick-start)** - 创建你的第一个 Clean DDD 项目  
3. **[实践示例](/examples/)** - 通过实际案例学习最佳实践
4. **[高级主题](/advanced/)** - 深入了解复杂场景的解决方案
:::

</div>
```

### 2. 指南页面
```markdown
<!-- docs/guide/introduction.md -->
---
title: 什么是 Clean DDD
description: 了解 Clean DDD 的核心理念和设计原则
---

# 什么是 Clean DDD

Clean DDD 是将 **Clean Architecture**（整洁架构）和 **Domain-Driven Design**（领域驱动设计）相结合的软件架构方法论。

## 核心理念

### 🎯 以业务为中心
将业务逻辑放在架构的核心位置，技术实现细节位于外层，确保业务逻辑不被技术细节污染。

### 🔄 依赖反转
高层模块不依赖低层模块，两者都依赖于抽象。抽象不依赖细节，细节依赖抽象。

### 📦 分层隔离
通过明确的分层结构，将不同关注点分离，提高代码的可维护性和可测试性。

## 架构分层

<ArchitectureDiagram type="clean-architecture" />

### 领域层（Domain Layer）
包含业务逻辑的核心：

<CodeExample 
  :code="`
# 实体：具有唯一标识的业务对象
class Order:
    def __init__(self, order_id: OrderId, customer: Customer):
        self._id = order_id
        self._customer = customer
        self._items: List[OrderItem] = []
        self._status = OrderStatus.PENDING
    
    def add_item(self, product: Product, quantity: int) -> None:
        if self._status != OrderStatus.PENDING:
            raise OrderAlreadyConfirmedException()
        
        item = OrderItem(product, quantity)
        self._items.append(item)
    
    def confirm(self) -> None:
        if not self._items:
            raise EmptyOrderException()
        
        self._status = OrderStatus.CONFIRMED
        self._domain_events.append(OrderConfirmed(self._id))

# 值对象：无身份标识的业务概念
@dataclass(frozen=True)
class Money:
    amount: Decimal
    currency: str
    
    def add(self, other: 'Money') -> 'Money':
        if self.currency != other.currency:
            raise CurrencyMismatchException()
        return Money(self.amount + other.amount, self.currency)
`"
  language="python"
  explanation="实体和值对象是 DDD 的核心构建块，它们封装了业务逻辑和不变性约束"
/>

### 应用层（Application Layer）
协调业务流程：

<CodeExample 
  :code="`
class OrderService:
    def __init__(
        self, 
        order_repository: OrderRepository,
        product_repository: ProductRepository,
        event_publisher: EventPublisher
    ):
        self._order_repo = order_repository
        self._product_repo = product_repository
        self._event_publisher = event_publisher
    
    def create_order(self, command: CreateOrderCommand) -> OrderId:
        # 获取客户信息
        customer = self._customer_repo.find_by_id(command.customer_id)
        if not customer:
            raise CustomerNotFoundException()
        
        # 创建订单
        order = Order(OrderId.generate(), customer)
        
        # 添加商品
        for item in command.items:
            product = self._product_repo.find_by_id(item.product_id)
            if not product:
                raise ProductNotFoundException()
            order.add_item(product, item.quantity)
        
        # 保存订单
        self._order_repo.save(order)
        
        # 发布事件
        for event in order.domain_events:
            self._event_publisher.publish(event)
        
        return order.id
`"
  language="python"
  explanation="应用服务协调多个领域对象完成业务用例，不包含业务逻辑"
/>

## 设计原则

### SOLID 原则
- **单一职责原则**：每个类只有一个变化的原因
- **开闭原则**：对扩展开放，对修改关闭
- **里氏替换原则**：子类型必须能够替换其基类型
- **接口隔离原则**：不应强迫客户依赖它们不使用的接口
- **依赖反转原则**：依赖抽象而不是具体实现

### DDD 模式
- **聚合（Aggregate）**：确保业务不变性的边界
- **领域事件（Domain Events）**：表示业务中发生的重要事件
- **资源库（Repository）**：封装对象持久化的细节
- **领域服务（Domain Service）**：不属于任何实体或值对象的业务逻辑

## 实践收益

### 🧪 可测试性
```python
# 业务逻辑测试不依赖外部系统
def test_order_confirmation():
    order = Order(OrderId("123"), customer)
    order.add_item(product, 2)
    
    order.confirm()
    
    assert order.status == OrderStatus.CONFIRMED
    assert len(order.domain_events) == 1
    assert isinstance(order.domain_events[0], OrderConfirmed)
```

### 🔧 可维护性
- 业务逻辑集中在领域层，易于理解和修改
- 分层结构清晰，修改影响范围可控
- 依赖注入使组件易于替换和升级

### 📈 可扩展性
- 新功能可以通过添加新的用例来实现
- 领域事件支持系统解耦和异步处理
- 分层架构支持不同层次的优化和扩展

## 下一步

现在你已经了解了 Clean DDD 的基本概念，可以继续学习：

- [快速开始](/guide/quick-start) - 创建你的第一个项目
- [核心概念](/guide/concepts) - 深入理解 DDD 概念
- [实践示例](/examples/) - 通过实际案例学习
```

## 🚀 部署配置

### 1. GitHub Actions 工作流
```yaml
# .github/workflows/deploy.yml
name: Deploy Documentation

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - name: Checkout
      uses: actions/checkout@v3
      with:
        fetch-depth: 0
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Build documentation
      run: npm run build
    
    - name: Deploy to GitHub Pages
      if: github.ref == 'refs/heads/main'
      uses: peaceiris/actions-gh-pages@v3
      with:
        github_token: ${{ secrets.GITHUB_TOKEN }}
        publish_dir: ./docs/.vitepress/dist
        cname: your-domain.com
```

### 2. 本地开发脚本
```json
{
  "scripts": {
    "dev": "vitepress dev docs",
    "build": "vitepress build docs",
    "preview": "vitepress preview docs",
    "lint": "eslint . --ext .vue,.js,.ts --fix",
    "type-check": "vue-tsc --noEmit",
    "test": "vitest",
    "test:e2e": "playwright test"
  }
}
```

这个实施指南提供了完整的技术实现细节，包括配置文件、组件代码、样式设计和部署流程，确保可以快速搭建起一个功能完整的静态网站。