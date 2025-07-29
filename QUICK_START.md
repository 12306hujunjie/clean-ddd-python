# Clean DDD 快速开始指南

> 30分钟从零到可工作的Clean DDD示例

## 🎯 目标

在30分钟内创建一个简单但完整的Clean DDD Python应用，演示核心概念而不造成认知过载。

## 📋 前提条件

- Python 3.8+
- 基本OOP概念理解
- 熟悉dataclasses和typing

## ⚡ 30分钟实施路径

### 第1步：项目结构（5分钟）

创建基本目录结构：
```bash
mkdir clean-ddd-example
cd clean-ddd-example

# 创建项目结构
mkdir -p src/{domain,application,infrastructure,presentation}
mkdir -p tests/{domain,application,infrastructure}
touch src/__init__.py
```

### 第2步：领域层 - 用户实体（10分钟）

**创建 `src/domain/user.py`：**
```python
from dataclasses import dataclass
from typing import Optional
import re

@dataclass
class User:
    """用户聚合根 - 封装用户业务规则"""
    id: str
    email: str
    name: str
    is_active: bool = True
    
    def __post_init__(self):
        """验证业务不变式"""
        if not self._is_valid_email(self.email):
            raise ValueError(f"Invalid email: {self.email}")
        if not self.name.strip():
            raise ValueError("Name cannot be empty")
    
    def deactivate(self) -> None:
        """业务规则：用户可以被停用"""
        if not self.is_active:
            raise ValueError("User is already inactive")
        self.is_active = False
    
    def activate(self) -> None:
        """业务规则：用户可以被激活"""
        if self.is_active:
            raise ValueError("User is already active")
        self.is_active = True
    
    def change_email(self, new_email: str) -> None:
        """业务规则：邮箱变更需要验证"""
        if not self._is_valid_email(new_email):
            raise ValueError(f"Invalid email: {new_email}")
        self.email = new_email
    
    @staticmethod
    def _is_valid_email(email: str) -> bool:
        """简单邮箱验证"""
        pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        return re.match(pattern, email) is not None

    @classmethod
    def create(cls, user_id: str, email: str, name: str) -> 'User':
        """工厂方法：创建新用户"""
        return cls(id=user_id, email=email, name=name)
```

**创建 `src/domain/user_repository.py`（仓储接口）：**
```python
from abc import ABC, abstractmethod
from typing import Optional, List
from .user import User

class UserRepository(ABC):
    """用户仓储抽象接口"""
    
    @abstractmethod
    def save(self, user: User) -> None:
        """保存用户"""
        pass
    
    @abstractmethod
    def find_by_id(self, user_id: str) -> Optional[User]:
        """通过ID查找用户"""
        pass
    
    @abstractmethod
    def find_by_email(self, email: str) -> Optional[User]:
        """通过邮箱查找用户"""
        pass
    
    @abstractmethod
    def find_all_active(self) -> List[User]:
        """查找所有活跃用户"""
        pass
    
    @abstractmethod
    def delete(self, user_id: str) -> bool:
        """删除用户"""
        pass
```

### 第3步：应用层 - 用例服务（10分钟）

**创建 `src/application/user_service.py`：**
```python
from dataclasses import dataclass
from typing import Optional, List
from src.domain.user import User
from src.domain.user_repository import UserRepository

@dataclass
class CreateUserCommand:
    """创建用户命令"""
    user_id: str
    email: str
    name: str

@dataclass
class UpdateUserEmailCommand:
    """更新用户邮箱命令"""
    user_id: str
    new_email: str

class UserService:
    """用户应用服务 - 编排用例"""
    
    def __init__(self, user_repository: UserRepository):
        self._user_repo = user_repository
    
    def create_user(self, command: CreateUserCommand) -> User:
        """用例：创建新用户"""
        # 检查邮箱是否已存在
        existing_user = self._user_repo.find_by_email(command.email)
        if existing_user:
            raise ValueError(f"User with email {command.email} already exists")
        
        # 创建用户（领域逻辑）
        user = User.create(command.user_id, command.email, command.name)
        
        # 持久化
        self._user_repo.save(user)
        return user
    
    def deactivate_user(self, user_id: str) -> bool:
        """用例：停用用户"""
        user = self._user_repo.find_by_id(user_id)
        if not user:
            return False
        
        # 领域逻辑
        user.deactivate()
        
        # 持久化
        self._user_repo.save(user)
        return True
    
    def update_user_email(self, command: UpdateUserEmailCommand) -> bool:
        """用例：更新用户邮箱"""
        user = self._user_repo.find_by_id(command.user_id)
        if not user:
            return False
        
        # 检查新邮箱是否已被使用
        existing_user = self._user_repo.find_by_email(command.new_email)
        if existing_user and existing_user.id != user.id:
            raise ValueError(f"Email {command.new_email} is already in use")
        
        # 领域逻辑
        user.change_email(command.new_email)
        
        # 持久化
        self._user_repo.save(user)
        return True
    
    def get_active_users(self) -> List[User]:
        """查询：获取所有活跃用户"""
        return self._user_repo.find_all_active()
```

### 第4步：基础设施层 - 内存实现（5分钟）

**创建 `src/infrastructure/memory_user_repository.py`：**
```python
from typing import Optional, List, Dict
from src.domain.user import User
from src.domain.user_repository import UserRepository

class MemoryUserRepository(UserRepository):
    """内存用户仓储实现 - 用于测试和演示"""
    
    def __init__(self):
        self._users: Dict[str, User] = {}
    
    def save(self, user: User) -> None:
        """保存用户到内存"""
        self._users[user.id] = user
    
    def find_by_id(self, user_id: str) -> Optional[User]:
        """通过ID查找用户"""
        return self._users.get(user_id)
    
    def find_by_email(self, email: str) -> Optional[User]:
        """通过邮箱查找用户"""
        for user in self._users.values():
            if user.email == email:
                return user
        return None
    
    def find_all_active(self) -> List[User]:
        """查找所有活跃用户"""
        return [user for user in self._users.values() if user.is_active]
    
    def delete(self, user_id: str) -> bool:
        """删除用户"""
        if user_id in self._users:
            del self._users[user_id]
            return True
        return False
    
    def count(self) -> int:
        """获取用户总数（额外方法用于测试）"""
        return len(self._users)
```

### 第5步：表现层 - 简单CLI（剩余时间）

**创建 `main.py` - 演示应用：**
```python
#!/usr/bin/env python3
"""
Clean DDD 示例应用
演示用户管理的完整DDD架构
"""

from src.infrastructure.memory_user_repository import MemoryUserRepository
from src.application.user_service import UserService, CreateUserCommand, UpdateUserEmailCommand

def main():
    print("🚀 Clean DDD 示例应用")
    print("=" * 40)
    
    # 依赖注入（简单版本）
    user_repo = MemoryUserRepository()
    user_service = UserService(user_repo)
    
    try:
        # 演示1：创建用户
        print("\n📝 创建用户")
        command1 = CreateUserCommand("1", "john@example.com", "John Doe")
        user1 = user_service.create_user(command1)
        print(f"✅ 创建用户: {user1.name} ({user1.email})")
        
        command2 = CreateUserCommand("2", "jane@example.com", "Jane Smith")
        user2 = user_service.create_user(command2)
        print(f"✅ 创建用户: {user2.name} ({user2.email})")
        
        # 演示2：查询活跃用户
        print("\n📋 活跃用户列表")
        active_users = user_service.get_active_users()
        for user in active_users:
            print(f"  - {user.name} ({user.email}) - {'活跃' if user.is_active else '停用'}")
        
        # 演示3：停用用户
        print("\n⏸️  停用用户")
        result = user_service.deactivate_user("1")
        print(f"✅ 停用用户1: {result}")
        
        # 演示4：再次查询活跃用户
        print("\n📋 停用后的活跃用户列表")
        active_users = user_service.get_active_users()
        for user in active_users:
            print(f"  - {user.name} ({user.email}) - {'活跃' if user.is_active else '停用'}")
        
        # 演示5：更新邮箱
        print("\n📧 更新用户邮箱")
        update_command = UpdateUserEmailCommand("2", "jane.smith@newdomain.com")
        result = user_service.update_user_email(update_command)
        print(f"✅ 更新邮箱: {result}")
        
        # 演示6：错误处理
        print("\n❌ 错误处理演示")
        try:
            # 尝试创建重复邮箱的用户
            duplicate_command = CreateUserCommand("3", "jane.smith@newdomain.com", "Duplicate Jane")
            user_service.create_user(duplicate_command)
        except ValueError as e:
            print(f"✅ 捕获业务规则错误: {e}")
        
        print("\n🎉 演示完成！")
        
    except Exception as e:
        print(f"❌ 错误: {e}")

if __name__ == "__main__":
    main()
```

## 🧪 创建测试文件

**创建 `tests/domain/test_user.py`：**
```python
import pytest
from src.domain.user import User

class TestUser:
    """用户领域实体测试"""
    
    def test_create_valid_user(self):
        """测试创建有效用户"""
        user = User.create("1", "test@example.com", "Test User")
        
        assert user.id == "1"
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert user.is_active is True
    
    def test_invalid_email_raises_error(self):
        """测试无效邮箱抛出错误"""
        with pytest.raises(ValueError, match="Invalid email"):
            User.create("1", "invalid-email", "Test User")
    
    def test_empty_name_raises_error(self):
        """测试空名称抛出错误"""
        with pytest.raises(ValueError, match="Name cannot be empty"):
            User.create("1", "test@example.com", "   ")
    
    def test_deactivate_user(self):
        """测试停用用户"""
        user = User.create("1", "test@example.com", "Test User")
        user.deactivate()
        
        assert user.is_active is False
    
    def test_cannot_deactivate_inactive_user(self):
        """测试不能停用已停用的用户"""
        user = User.create("1", "test@example.com", "Test User")
        user.deactivate()
        
        with pytest.raises(ValueError, match="User is already inactive"):
            user.deactivate()
    
    def test_change_email(self):
        """测试更改邮箱"""
        user = User.create("1", "old@example.com", "Test User")
        user.change_email("new@example.com")
        
        assert user.email == "new@example.com"
```

**创建 `tests/application/test_user_service.py`：**
```python
import pytest
from src.application.user_service import UserService, CreateUserCommand, UpdateUserEmailCommand
from src.infrastructure.memory_user_repository import MemoryUserRepository

class TestUserService:
    """用户应用服务测试"""
    
    def setup_method(self):
        """每个测试前的设置"""
        self.user_repo = MemoryUserRepository()
        self.user_service = UserService(self.user_repo)
    
    def test_create_user_success(self):
        """测试成功创建用户"""
        command = CreateUserCommand("1", "test@example.com", "Test User")
        user = self.user_service.create_user(command)
        
        assert user.id == "1"
        assert user.email == "test@example.com"
        assert user.name == "Test User"
        assert self.user_repo.count() == 1
    
    def test_create_user_duplicate_email_fails(self):
        """测试创建重复邮箱用户失败"""
        command1 = CreateUserCommand("1", "test@example.com", "User One")
        command2 = CreateUserCommand("2", "test@example.com", "User Two")
        
        self.user_service.create_user(command1)
        
        with pytest.raises(ValueError, match="already exists"):
            self.user_service.create_user(command2)
    
    def test_deactivate_user_success(self):
        """测试成功停用用户"""
        # 先创建用户
        command = CreateUserCommand("1", "test@example.com", "Test User")
        self.user_service.create_user(command)
        
        # 停用用户
        result = self.user_service.deactivate_user("1")
        
        assert result is True
        user = self.user_repo.find_by_id("1")
        assert user.is_active is False
    
    def test_deactivate_nonexistent_user_fails(self):
        """测试停用不存在的用户失败"""
        result = self.user_service.deactivate_user("nonexistent")
        assert result is False
    
    def test_get_active_users(self):
        """测试获取活跃用户"""
        # 创建两个用户
        command1 = CreateUserCommand("1", "user1@example.com", "User One")
        command2 = CreateUserCommand("2", "user2@example.com", "User Two")
        
        self.user_service.create_user(command1)
        self.user_service.create_user(command2)
        
        # 停用一个用户
        self.user_service.deactivate_user("1")
        
        # 获取活跃用户
        active_users = self.user_service.get_active_users()
        
        assert len(active_users) == 1
        assert active_users[0].id == "2"
```

## 🚀 运行示例

1. **运行主应用：**
```bash
python main.py
```

2. **运行测试：**
```bash
# 安装pytest
pip install pytest

# 运行所有测试
pytest tests/ -v

# 运行特定测试
pytest tests/domain/test_user.py -v
```

## 📊 你刚刚学到了什么

### ✅ Clean DDD核心概念
1. **领域层**：纯业务逻辑（User实体，业务规则）
2. **应用层**：用例编排（UserService，命令处理）
3. **基础设施层**：技术实现（MemoryUserRepository）
4. **表现层**：外部接口（CLI应用）

### ✅ 关键DDD模式
- **实体**：有身份的业务对象
- **仓储**：数据访问抽象
- **应用服务**：用例协调
- **命令**：操作意图表达
- **依赖倒置**：内层定义接口，外层实现

### ✅ 架构优势
- **可测试性**：每层独立测试
- **可维护性**：关注点清晰分离
- **可扩展性**：易于添加新用例
- **业务对齐**：代码反映业务概念

## 🎯 下一步

1. **添加更多领域概念**：订单、产品等
2. **实现真实持久化**：SQLAlchemy、PostgreSQL
3. **添加Web API**：FastAPI端点
4. **引入领域事件**：用户创建事件
5. **实现CQRS**：读写分离

## 💡 关键要点

- **从简单开始**：不要过度工程化
- **业务优先**：让代码反映业务概念
- **测试驱动**：每层都有适当测试
- **渐进演化**：逐步添加复杂性

---

**恭喜！** 你已经创建了第一个Clean DDD Python应用。现在可以基于这个基础构建更复杂的系统。