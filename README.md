# Python Clean DDD实践指南

> 基于分层思维的Python领域驱动设计实用指导

## 🚀 快速开始（适合新手）

**30分钟从零到生产级异步DDD示例**
```bash
# 推荐：异步版本（解决性能瓶颈，生产级）
📖 ASYNC_QUICK_START.md - 基于async/await的高性能DDD实现

# 备选：同步版本（学习概念用）
📖 QUICK_START.md - 传统同步模式，概念理解更直观

# 项目生成器
python templates/project_template.py my-project User
```

## 🧭 设计决策指导（适合开发者）

**解决"具体实践方式"和"核心元素安排"问题**
```bash
# 值对象 vs 实体？聚合边界怎么划分？何时使用事件？
📋 DECISION_SUPPORT.md - 具体设计决策指南，含代码示例
```

```bash
# DDD核心概念和Python实现细节
📖 docs/ - 理论文档系列（值对象、实体、聚合、事件等）
```

## 🏗️ 生产应用（适合团队）

**团队标准和生产级实施**
```bash
# 团队开发流程和代码规范
📖 TEAM_STANDARDS.md - 团队组织和开发标准

# 实际项目实施指导  
📖 CLEAN_DDD_PRODUCTION_GUIDE.md - 渐进式实施路线图（30分钟→6个月）

# 现有系统迁移
📖 MIGRATION_GUIDE.md - Flask/Django迁移实用指南
```

## 🧩 架构核心概念

**DDD = 分层思维**：让每一层专注解决自己层级的问题

```
表现层 → 应用层 → 领域层 ← 基础设施层
   ↓        ↓        ↓         ↓
外部交互  用例编排  业务逻辑   技术实现
```

**核心元素**：值对象 • 实体 • 聚合 • 领域事件 • 命令 • 查询 • 控制器

## 🎯 选择你的起点

| 用户类型 | 推荐路径 | 预计时间 |
|----------|----------|----------|
| **DDD新手** | QUICK_START.md → DECISION_SUPPORT.md | 2小时 |
| **有经验开发者** | DECISION_SUPPORT.md → docs/系列 | 1天 |
| **团队负责人** | TEAM_STANDARDS.md → PRODUCTION_GUIDE.md | 3天 |
| **架构师** | 全部文档 → 自定义实施方案 | 1周 |

## 📋 核心原则

1. **依赖指向内层**：表现→应用→领域，基础设施→领域（仅接口）
2. **每层单一职责**：领域=业务逻辑，应用=用例编排，基础设施=技术实现
3. **Python优先**：充分利用dataclass、async/await、类型提示等Python特性
4. **渐进采用**：从简单开始，随复杂度增长逐步引入DDD模式

## 🤝 贡献和反馈

- 提交问题：[GitHub Issues](https://github.com/12306hujunjie/clean-ddd-python/issues)
- 贡献代码：查看各文档中的TODO项和改进建议
- 分享经验：通过Issues分享你的DDD实践经验

---

**记住**：DDD是为了解决复杂度问题。如果你的领域不复杂，从简单的值对象和实体开始就足够了。