#!/usr/bin/env python3
"""
Clean DDD 项目模板生成器
用于快速创建符合Clean DDD标准的Python项目结构
"""

import shutil
import sys
from pathlib import Path

# 项目模板结构
PROJECT_STRUCTURE = {
    "src": {
        "__init__.py": "",
        "domain": {
            "__init__.py": "",
            "entities": {"__init__.py": ""},
            "value_objects": {"__init__.py": ""},
            "aggregates": {"__init__.py": ""},
            "events": {"__init__.py": ""},
            "repositories": {"__init__.py": ""},
            "services": {"__init__.py": ""}
        },
        "application": {
            "__init__.py": "",
            "commands": {"__init__.py": ""},
            "queries": {"__init__.py": ""},
            "handlers": {"__init__.py": ""},
            "services": {"__init__.py": ""},
            "dtos": {"__init__.py": ""}
        },
        "infrastructure": {
            "__init__.py": "",
            "persistence": {"__init__.py": ""},
            "repositories": {"__init__.py": ""},
            "messaging": {"__init__.py": ""},
            "external_services": {"__init__.py": ""}
        },
        "presentation": {
            "__init__.py": "",
            "api": {"__init__.py": ""},
            "cli": {"__init__.py": ""},
            "web": {"__init__.py": ""}
        }
    },
    "tests": {
        "__init__.py": "",
        "unit": {
            "__init__.py": "",
            "domain": {"__init__.py": ""},
            "application": {"__init__.py": ""}
        },
        "integration": {"__init__.py": ""},
        "e2e": {"__init__.py": ""}
    },
    "docs": {
        "README.md": "# 项目文档\n\n请在此处添加项目特定的文档。\n"
    }
}

# 模板文件内容
TEMPLATES = {
    "entity_template.py": '''"""
领域实体模板
"""
from dataclasses import dataclass


@dataclass
class {entity_name}:
    """
    {entity_name} 聚合根

    业务规则：
    - 在此处描述主要业务规则
    - 列出不变式条件
    """
    id: str
    # 添加其他属性

    def __post_init__(self):
        """验证业务不变式"""
        if not self.id:
            raise ValueError("ID cannot be empty")

    def business_operation(self) -> None:
        """描述业务操作"""
        # 实现业务逻辑
        pass
''',

    "repository_interface_template.py": '''"""
仓储接口模板
"""
from abc import ABC, abstractmethod
from typing import Optional, List
from .{entity_name_lower} import {entity_name}


class {entity_name}Repository(ABC):
    """
    {entity_name}仓储抽象接口
    定义数据访问合约
    """

    @abstractmethod
    def save(self, {entity_name_lower}: {entity_name}) -> None:
        """保存{entity_name_lower}"""
        pass

    @abstractmethod
    def find_by_id(
        self, {entity_name_lower}_id: str
    ) -> Optional[{entity_name}]:
        """通过ID查找{entity_name_lower}"""
        pass

    @abstractmethod
    def find_all(self) -> List[{entity_name}]:
        """查找所有{entity_name_lower}"""
        pass

    @abstractmethod
    def delete(self, {entity_name_lower}_id: str) -> bool:
        """删除{entity_name_lower}"""
        pass
''',

    "pyproject.toml": '''[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "{project_name}"
version = "0.1.0"
description = "Clean DDD Python项目"
authors = [
    {{name = "Your Name", email = "your.email@example.com"}},
]
dependencies = [
    "dataclasses-json>=0.5.7",
    "pydantic>=1.10.0",
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0.0",
    "pytest-cov>=4.0.0",
    "mypy>=1.0.0",
    "ruff>=0.1.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
addopts = "--cov=src --cov-report=html --cov-report=term-missing"

[tool.ruff]
target-version = "py38"
line-length = 88
select = ["E", "W", "F", "I", "B", "C4", "UP"]
ignore = ["E501", "B008"]

[tool.ruff.per-file-ignores]
"__init__.py" = ["F401"]
"tests/*" = ["B011"]
''',

    "README.md": '''# {project_name}

基于Clean DDD架构的Python项目

## 项目结构

```
src/
├── domain/          # 领域层 - 业务逻辑核心
├── application/     # 应用层 - 用例编排
├── infrastructure/  # 基础设施层 - 技术实现
└── presentation/    # 表现层 - 外部接口
```

## 快速开始

1. 安装依赖:
```bash
pip install -e .
pip install -e ".[dev]"
```

2. 运行测试:
```bash
pytest
```

## 开发指南

遵循Clean DDD原则：
- 依赖指向内层 (Presentation → Application → Domain)
- 领域层保持纯净，无外部依赖
- 通过接口实现依赖倒置
- 关注点明确分离
'''
}


def create_directory_structure(base_path: Path, structure: dict):
    """递归创建目录结构"""
    for name, content in structure.items():
        path = base_path / name

        if isinstance(content, dict):
            # 创建目录
            path.mkdir(parents=True, exist_ok=True)
            create_directory_structure(path, content)
        else:
            # 创建文件
            path.parent.mkdir(parents=True, exist_ok=True)
            if not path.exists() or content.strip():
                path.write_text(content, encoding='utf-8')


def generate_template_files(
    project_path: Path, entity_name: str, project_name: str
):
    """生成模板文件"""
    entity_name_lower = entity_name.lower()

    templates_dir = project_path / "templates"
    templates_dir.mkdir(exist_ok=True)

    for template_name, template_content in TEMPLATES.items():
        file_path = templates_dir / template_name
        content = template_content.format(
            entity_name=entity_name,
            entity_name_lower=entity_name_lower,
            project_name=project_name
        )
        file_path.write_text(content, encoding='utf-8')


def main():
    """主函数"""
    if len(sys.argv) != 3:
        print("用法: python project_template.py <项目名称> <主要实体名称>")
        print("示例: python project_template.py my-ecommerce Product")
        sys.exit(1)

    project_name = sys.argv[1]
    entity_name = sys.argv[2]

    print(f"🚀 创建Clean DDD项目: {project_name}")
    print(f"📦 主要实体: {entity_name}")

    # 创建项目目录
    project_path = Path(project_name)
    if project_path.exists():
        print(f"❌ 目录 {project_name} 已存在")
        sys.exit(1)

    project_path.mkdir()

    try:
        # 创建基本目录结构
        print("📁 创建目录结构...")
        create_directory_structure(project_path, PROJECT_STRUCTURE)

        # 生成模板文件
        print("📝 生成模板文件...")
        generate_template_files(project_path, entity_name, project_name)

        # 创建项目级文件
        print("🔧 创建项目配置文件...")
        for file_name in ["pyproject.toml", "README.md"]:
            content = TEMPLATES[file_name].format(
                project_name=project_name,
                entity_name=entity_name,
                entity_name_lower=entity_name.lower()
            )
            (project_path / file_name).write_text(content, encoding='utf-8')

        print("✅ 项目创建成功!")
        print(f"""
🎉 下一步:
1. cd {project_name}
2. pip install -e ".[dev]"
3. 查看 templates/ 目录下的模板文件
4. 使用模板创建你的第一个实体和服务
5. 运行 pytest 验证设置

📚 参考文档:
- README.md: 项目概述
- templates/: 代码模板
- ../QUICK_START.md: 快速开始指南
        """)

    except Exception as e:
        print(f"❌ 创建项目时出错: {e}")
        # 清理已创建的目录
        if project_path.exists():
            shutil.rmtree(project_path)
        sys.exit(1)


if __name__ == "__main__":
    main()