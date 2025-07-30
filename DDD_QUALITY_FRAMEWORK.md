# 🛡️ DDD质量保证框架 - 4层验证体系

> 确保DDD实现质量的自动化验证和持续改进框架

## 🎯 框架概述

4层验证体系确保DDD实现从理论理解到生产部署的全过程质量：

```
┌─────────────────────────────────────────────────────────────────┐
│  📚 第1层：文档理解验证 (15-30分钟检查点)                        │
│  验证开发者对DDD概念的理解程度和实践能力                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │ "概念→实践"
┌─────────────────▼───────────────────────────────────────────────┐
│  🔍 第2层：实现质量验证 (自动化代码分析)                         │
│  静态分析、架构合规性检查、代码质量评估                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │ "代码→团队"
┌─────────────────▼───────────────────────────────────────────────┐
│  👥 第3层：团队采用验证 (准备度评估&进度跟踪)                    │
│  团队技能评估、实施准备度、采用进度监控                         │
└─────────────────┬───────────────────────────────────────────────┘
                  │ "团队→生产"
┌─────────────────▼───────────────────────────────────────────────┐
│  🚀 第4层：生产就绪验证 (部署&性能验证)                          │
│  部署检查、性能验证、监控就绪、运维准备                         │
└─────────────────────────────────────────────────────────────────┘
```

## 📚 第1层：文档理解验证

### 15分钟DDD概念检查点

**快速自测工具：**

```python
# ddd_concept_checker.py
class DDDConceptChecker:
    """DDD概念理解验证工具"""
    
    def __init__(self):
        self.score = 0
        self.max_score = 0
        self.feedback = []
    
    def check_value_object_understanding(self, code_sample: str) -> bool:
        """检查值对象理解"""
        self.max_score += 10
        
        # 检查是否使用了frozen=True
        if "@dataclass(frozen=True)" in code_sample:
            self.score += 3
        else:
            self.feedback.append("❌ 值对象应该使用 @dataclass(frozen=True) 确保不可变性")
        
        # 检查是否正确实现了__post_init__验证
        if "__post_init__" in code_sample and "raise" in code_sample:
            self.score += 3
        else:
            self.feedback.append("❌ 值对象应该在__post_init__中添加验证逻辑")
        
        # 检查是否避免了setter方法
        if "def set_" not in code_sample:
            self.score += 2
        else:
            self.feedback.append("❌ 值对象不应该有setter方法，应该返回新实例")
        
        # 检查是否正确实现了业务方法
        if "def " in code_sample and "return " in code_sample:
            self.score += 2
        else:
            self.feedback.append("⚠️ 建议添加业务相关的方法，如add()、multiply()等")
        
        return self.score >= 7
    
    def check_entity_understanding(self, code_sample: str) -> bool:
        """检查实体理解"""
        self.max_score += 10
        
        # 检查是否有ID字段
        if "id:" in code_sample and "Id" in code_sample:
            self.score += 3
        else:
            self.feedback.append("❌ 实体必须有唯一ID字段")
        
        # 检查是否没有使用frozen=True
        if "frozen=True" not in code_sample:
            self.score += 2
        else:
            self.feedback.append("❌ 实体不应该使用frozen=True，需要可变状态")
        
        # 检查是否有状态修改方法
        if "def change_" in code_sample or "def update_" in code_sample:
            self.score += 3
        else:
            self.feedback.append("⚠️ 实体应该提供有意义的状态修改方法")
        
        # 检查是否考虑了领域事件
        if "Event" in code_sample or "_add_event" in code_sample:
            self.score += 2
        else:
            self.feedback.append("💡 考虑在状态变更时发布领域事件")
        
        return self.score >= 7
    
    def generate_report(self) -> str:
        """生成理解程度报告"""
        percentage = (self.score / self.max_score) * 100 if self.max_score > 0 else 0
        
        report = f"""
📊 DDD概念理解评估报告
================================
总分: {self.score}/{self.max_score} ({percentage:.1f}%)

理解等级:
{"🏆 精通" if percentage >= 90 else 
 "✅ 良好" if percentage >= 70 else 
 "⚠️ 需要改进" if percentage >= 50 else 
 "❌ 需要重新学习"}

具体反馈:
{chr(10).join(self.feedback)}

推荐下一步:
{"继续学习高级模式" if percentage >= 90 else
 "练习基础概念实现" if percentage >= 70 else
 "重新阅读基础文档" if percentage >= 50 else
 "从BEGINNER_FRIENDLY_GUIDE.md开始"}
        """
        return report

# 使用示例
def test_understanding():
    checker = DDDConceptChecker()
    
    # 测试值对象理解
    value_object_code = '''
    @dataclass(frozen=True)
    class Money:
        amount: Decimal
        currency: str
        
        def __post_init__(self):
            if self.amount < 0:
                raise ValueError("金额不能为负数")
        
        def add(self, other: 'Money') -> 'Money':
            if self.currency != other.currency:
                raise ValueError("货币类型不匹配")
            return Money(self.amount + other.amount, self.currency)
    '''
    
    checker.check_value_object_understanding(value_object_code)
    print(checker.generate_report())

if __name__ == "__main__":
    test_understanding()
```

### 30分钟实践验证

**动手实践检查清单：**

```markdown
## DDD实践验证清单 ✅

### 基础概念实践 (15分钟)
- [ ] 创建一个Money值对象，包含加法和乘法方法
- [ ] 创建一个User实体，包含changeEmail方法
- [ ] 创建一个简单的OrderItem值对象
- [ ] 运行单元测试验证不可变性和业务规则

### 进阶概念实践 (15分钟)  
- [ ] 创建一个Order聚合，包含添加商品方法
- [ ] 实现领域事件：OrderCreatedEvent
- [ ] 创建命令：CreateOrderCommand
- [ ] 实现简单的命令处理器

### 质量验证
- [ ] 所有测试通过
- [ ] 代码符合Python类型提示要求
- [ ] 业务规则验证正常工作
- [ ] 领域事件能正确发布
```

## 🔍 第2层：实现质量验证

### 自动化代码分析工具

```python
# ddd_code_analyzer.py
import ast
import inspect
from typing import List, Dict, Any
from pathlib import Path

class DDDArchitectureAnalyzer:
    """DDD架构合规性分析器"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.violations = []
        self.suggestions = []
        self.score = 0
    
    def analyze_project_structure(self) -> Dict[str, Any]:
        """分析项目结构是否符合DDD规范"""
        structure_score = 0
        max_structure_score = 100
        
        # 检查目录结构
        expected_dirs = [
            "domain/entities",
            "domain/value_objects", 
            "domain/aggregates",
            "domain/events",
            "application/commands",
            "application/queries",
            "infrastructure/repositories",
        ]
        
        for expected_dir in expected_dirs:
            dir_path = self.project_path / expected_dir
            if dir_path.exists():
                structure_score += 10
            else:
                self.violations.append(f"❌ 缺少目录: {expected_dir}")
        
        # 检查依赖方向
        self._check_dependency_direction()
        
        return {
            "structure_score": structure_score,
            "max_score": max_structure_score,
            "violations": self.violations,
            "suggestions": self.suggestions
        }
    
    def _check_dependency_direction(self):
        """检查依赖方向是否正确"""
        # 简化版依赖检查
        domain_files = list(self.project_path.glob("domain/**/*.py"))
        
        for domain_file in domain_files:
            try:
                with open(domain_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # 领域层不应该依赖基础设施层
                if "from infrastructure" in content or "import infrastructure" in content:
                    self.violations.append(
                        f"❌ {domain_file.name}: 领域层不应该依赖基础设施层"
                    )
                
                # 领域层不应该依赖应用层
                if "from application" in content or "import application" in content:
                    self.violations.append(
                        f"❌ {domain_file.name}: 领域层不应该依赖应用层"
                    )
                    
            except Exception as e:
                self.suggestions.append(f"⚠️ 无法分析文件 {domain_file}: {e}")
    
    def analyze_value_objects(self) -> Dict[str, Any]:
        """分析值对象实现质量"""
        vo_files = list(self.project_path.glob("**/value_objects/*.py"))
        vo_score = 0
        max_vo_score = len(vo_files) * 10
        
        for vo_file in vo_files:
            file_score = self._analyze_single_value_object(vo_file)
            vo_score += file_score
        
        return {
            "value_object_score": vo_score,
            "max_score": max_vo_score,
            "files_analyzed": len(vo_files)
        }
    
    def _analyze_single_value_object(self, file_path: Path) -> int:
        """分析单个值对象文件"""
        score = 0
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                tree = ast.parse(content)
            
            for node in ast.walk(tree):
                if isinstance(node, ast.ClassDef):
                    # 检查是否使用了@dataclass(frozen=True)
                    has_frozen_decorator = any(
                        (isinstance(decorator, ast.Call) and 
                         getattr(decorator.func, 'id', None) == 'dataclass' and
                         any(kw.arg == 'frozen' and kw.value.value for kw in decorator.keywords))
                        for decorator in node.decorator_list
                    )
                    
                    if has_frozen_decorator:
                        score += 3
                    else:
                        self.violations.append(f"❌ {file_path.name}::{node.name}: 值对象应该使用@dataclass(frozen=True)")
                    
                    # 检查是否有__post_init__方法
                    has_post_init = any(
                        isinstance(item, ast.FunctionDef) and item.name == '__post_init__'
                        for item in node.body
                    )
                    
                    if has_post_init:
                        score += 2
                    else:
                        self.suggestions.append(f"💡 {file_path.name}::{node.name}: 建议添加__post_init__验证")
                    
                    # 检查是否有业务方法
                    business_methods = [
                        item for item in node.body 
                        if isinstance(item, ast.FunctionDef) and 
                        not item.name.startswith('_') and 
                        item.name not in ['__post_init__', '__str__', '__repr__']
                    ]
                    
                    if business_methods:
                        score += 3
                    else:
                        self.suggestions.append(f"💡 {file_path.name}::{node.name}: 考虑添加业务方法")
                    
                    # 检查setter方法（不应该有）
                    setter_methods = [
                        item for item in node.body
                        if isinstance(item, ast.FunctionDef) and item.name.startswith('set_')
                    ]
                    
                    if not setter_methods:
                        score += 2
                    else:
                        self.violations.append(f"❌ {file_path.name}::{node.name}: 值对象不应该有setter方法")
        
        except Exception as e:
            self.suggestions.append(f"⚠️ 分析文件失败 {file_path}: {e}")
        
        return score
    
    def generate_quality_report(self) -> str:
        """生成质量分析报告"""
        structure_result = self.analyze_project_structure()
        vo_result = self.analyze_value_objects()
        
        total_score = structure_result["structure_score"] + vo_result["value_object_score"]
        max_total_score = structure_result["max_score"] + vo_result["max_score"]
        
        percentage = (total_score / max_total_score) * 100 if max_total_score > 0 else 0
        
        report = f"""
🔍 DDD实现质量分析报告
================================
总分: {total_score}/{max_total_score} ({percentage:.1f}%)

质量等级:
{"🏆 优秀" if percentage >= 90 else 
 "✅ 良好" if percentage >= 75 else 
 "⚠️ 需要改进" if percentage >= 60 else 
 "❌ 需要重构"}

项目结构分析:
- 结构得分: {structure_result["structure_score"]}/{structure_result["max_score"]}

值对象分析:
- 值对象得分: {vo_result["value_object_score"]}/{vo_result["max_score"]}
- 分析文件数: {vo_result["files_analyzed"]}

违规项目:
{chr(10).join(self.violations) if self.violations else "✅ 无违规项"}

改进建议:
{chr(10).join(self.suggestions) if self.suggestions else "✅ 无改进建议"}
        """
        
        return report

# 使用示例
if __name__ == "__main__":
    analyzer = DDDArchitectureAnalyzer("./my_ddd_project")
    print(analyzer.generate_quality_report())
```

### 自动化质量检测脚本

```python
# quality_check.py
import subprocess
import sys
from pathlib import Path

class AutomatedQualityChecker:
    """自动化质量检测工具"""
    
    def __init__(self, project_path: str):
        self.project_path = Path(project_path)
        self.results = {}
    
    def run_all_checks(self) -> Dict[str, Any]:
        """运行所有质量检查"""
        self.results["type_check"] = self.run_mypy()
        self.results["lint_check"] = self.run_flake8()
        self.results["test_coverage"] = self.run_pytest_coverage()
        self.results["ddd_analysis"] = self.run_ddd_analysis()
        
        return self.results
    
    def run_mypy(self) -> Dict[str, Any]:
        """运行类型检查"""
        try:
            result = subprocess.run(
                ["mypy", str(self.project_path)],
                capture_output=True,
                text=True
            )
            
            return {
                "passed": result.returncode == 0,
                "output": result.stdout,
                "errors": result.stderr
            }
        except FileNotFoundError:
            return {"passed": False, "error": "mypy not installed"}
    
    def run_flake8(self) -> Dict[str, Any]:
        """运行代码风格检查"""
        try:
            result = subprocess.run(
                ["flake8", str(self.project_path)],
                capture_output=True,
                text=True
            )
            
            return {
                "passed": result.returncode == 0,
                "output": result.stdout,
                "errors": result.stderr
            }
        except FileNotFoundError:
            return {"passed": False, "error": "flake8 not installed"}
    
    def run_pytest_coverage(self) -> Dict[str, Any]:
        """运行测试和覆盖率检查"""
        try:
            result = subprocess.run(
                ["pytest", "--cov=.", "--cov-report=term-missing"],
                cwd=self.project_path,
                capture_output=True,
                text=True
            )
            
            # 解析覆盖率
            coverage_line = [line for line in result.stdout.split('\n') if 'TOTAL' in line]
            coverage_percentage = 0
            if coverage_line:
                coverage_percentage = int(coverage_line[0].split()[-1].replace('%', ''))
            
            return {
                "passed": result.returncode == 0,
                "coverage": coverage_percentage,
                "output": result.stdout,
                "errors": result.stderr
            }
        except FileNotFoundError:
            return {"passed": False, "error": "pytest not installed"}
    
    def run_ddd_analysis(self) -> Dict[str, Any]:
        """运行DDD架构分析"""
        analyzer = DDDArchitectureAnalyzer(str(self.project_path))
        
        structure_result = analyzer.analyze_project_structure()
        vo_result = analyzer.analyze_value_objects()
        
        total_score = structure_result["structure_score"] + vo_result["value_object_score"]
        max_score = structure_result["max_score"] + vo_result["max_score"]
        
        return {
            "passed": (total_score / max_score) >= 0.7 if max_score > 0 else False,
            "score": total_score,
            "max_score": max_score,
            "violations": analyzer.violations,
            "suggestions": analyzer.suggestions
        }
    
    def generate_summary_report(self) -> str:
        """生成综合质量报告"""
        if not self.results:
            return "❌ 请先运行质量检查"
        
        passed_checks = sum(1 for result in self.results.values() if result.get("passed", False))
        total_checks = len(self.results)
        
        report = f"""
🛡️ DDD项目质量检查报告
================================
通过检查: {passed_checks}/{total_checks}

详细结果:
类型检查 (mypy): {"✅ 通过" if self.results["type_check"]["passed"] else "❌ 失败"}
代码风格 (flake8): {"✅ 通过" if self.results["lint_check"]["passed"] else "❌ 失败"}
测试覆盖率: {"✅ 通过" if self.results["test_coverage"]["passed"] else "❌ 失败"} ({self.results["test_coverage"].get("coverage", 0)}%)
DDD架构分析: {"✅ 通过" if self.results["ddd_analysis"]["passed"] else "❌ 失败"}

总体评级:
{"🏆 优秀" if passed_checks == total_checks else
 "✅ 良好" if passed_checks >= total_checks * 0.75 else
 "⚠️ 需要改进" if passed_checks >= total_checks * 0.5 else
 "❌ 需要重构"}

下一步建议:
{"继续保持高质量标准" if passed_checks == total_checks else
 "修复失败的检查项" if passed_checks > 0 else
 "建议重新审视项目架构"}
        """
        
        return report

# CLI工具
def main():
    if len(sys.argv) != 2:
        print("使用方法: python quality_check.py <project_path>")
        sys.exit(1)
    
    project_path = sys.argv[1]
    checker = AutomatedQualityChecker(project_path)
    
    print("🔍 开始运行质量检查...")
    results = checker.run_all_checks()
    print(checker.generate_summary_report())

if __name__ == "__main__":
    main()
```

## 👥 第3层：团队采用验证

### 团队准备度评估

```python
# team_readiness_assessment.py
from dataclasses import dataclass
from typing import List, Dict
from enum import Enum

class SkillLevel(Enum):
    BEGINNER = 1
    INTERMEDIATE = 2
    ADVANCED = 3
    EXPERT = 4

@dataclass
class TeamMember:
    name: str
    python_skill: SkillLevel
    oop_skill: SkillLevel
    architecture_experience: SkillLevel
    ddd_knowledge: SkillLevel

class TeamReadinessAssessment:
    """团队DDD准备度评估工具"""
    
    def __init__(self):
        self.team_members: List[TeamMember] = []
        self.assessment_results = {}
    
    def add_team_member(self, member: TeamMember):
        """添加团队成员"""
        self.team_members.append(member)
    
    def assess_team_readiness(self) -> Dict[str, Any]:
        """评估团队准备度"""
        if not self.team_members:
            return {"error": "没有团队成员数据"}
        
        # 计算各技能的平均水平
        avg_python = sum(m.python_skill.value for m in self.team_members) / len(self.team_members)
        avg_oop = sum(m.oop_skill.value for m in self.team_members) / len(self.team_members)
        avg_arch = sum(m.architecture_experience.value for m in self.team_members) / len(self.team_members)
        avg_ddd = sum(m.ddd_knowledge.value for m in self.team_members) / len(self.team_members)
        
        # 评估准备度
        readiness_score = (avg_python * 0.2 + avg_oop * 0.3 + avg_arch * 0.3 + avg_ddd * 0.2)
        
        # 识别技能缺口
        skill_gaps = []
        if avg_python < 2.5:
            skill_gaps.append("Python编程技能需要提升")
        if avg_oop < 2.5:
            skill_gaps.append("面向对象设计技能需要加强")
        if avg_arch < 2.0:
            skill_gaps.append("架构设计经验不足")
        if avg_ddd < 1.5:
            skill_gaps.append("DDD知识需要系统学习")
        
        # 制定培训计划
        training_plan = self._create_training_plan(avg_python, avg_oop, avg_arch, avg_ddd)
        
        # 评估风险
        risks = self._assess_risks(readiness_score, skill_gaps)
        
        return {
            "readiness_score": readiness_score,
            "readiness_level": self._get_readiness_level(readiness_score),
            "skill_gaps": skill_gaps,
            "training_plan": training_plan,
            "risks": risks,
            "recommendations": self._get_recommendations(readiness_score)
        }
    
    def _create_training_plan(self, avg_python: float, avg_oop: float, 
                            avg_arch: float, avg_ddd: float) -> List[str]:
        """制定培训计划"""
        plan = []
        
        if avg_ddd < 2.0:
            plan.append("📚 第1周：DDD基础概念培训 (BEGINNER_FRIENDLY_GUIDE.md)")
            plan.append("📚 第2周：DDD实践练习 (QUICK_START.md)")
        
        if avg_oop < 2.5:
            plan.append("🎯 第3周：面向对象设计模式复习")
            plan.append("🎯 第4周：Python高级特性培训")
        
        if avg_arch < 2.0:
            plan.append("🏗️ 第5-6周：软件架构基础培训")
            plan.append("🏗️ 第7-8周：DDD架构实战练习")
        
        plan.append("🚀 第9-12周：项目实战和代码审查")
        
        return plan
    
    def _assess_risks(self, readiness_score: float, skill_gaps: List[str]) -> List[str]:
        """评估实施风险"""
        risks = []
        
        if readiness_score < 2.0:
            risks.append("🔴 高风险：团队整体技能不足，建议延期实施")
        elif readiness_score < 2.5:
            risks.append("🟡 中风险：需要充分的培训和指导")
        
        if len(skill_gaps) > 2:
            risks.append("⚠️ 技能缺口较多，建议分阶段实施")
        
        if "DDD知识需要系统学习" in skill_gaps:
            risks.append("📚 DDD概念理解不足，建议先进行理论培训")
        
        return risks
    
    def _get_readiness_level(self, score: float) -> str:
        """获取准备度等级"""
        if score >= 3.5:
            return "🏆 优秀 - 可以立即开始DDD实施"
        elif score >= 3.0:
            return "✅ 良好 - 简单培训后可以开始"
        elif score >= 2.5:
            return "⚠️ 一般 - 需要系统培训"
        elif score >= 2.0:
            return "🟡 不足 - 需要大量培训和准备"
        else:
            return "🔴 很低 - 建议推迟DDD实施"
    
    def _get_recommendations(self, score: float) -> List[str]:
        """获取实施建议"""
        if score >= 3.0:
            return [
                "可以选择中等复杂度的模块开始DDD实践",
                "建立代码审查流程确保质量",
                "定期进行技术分享和经验总结"
            ]
        elif score >= 2.5:
            return [
                "从最简单的模块开始DDD实践",
                "安排经验丰富的开发者做导师",
                "增加结对编程和代码审查频率"
            ]
        else:
            return [
                "暂缓DDD实施，专注于基础技能培训",
                "考虑外部顾问或培训资源",
                "从简单的重构开始逐步引入DDD概念"
            ]
    
    def generate_assessment_report(self) -> str:
        """生成评估报告"""
        if not self.team_members:
            return "❌ 请先添加团队成员信息"
        
        results = self.assess_team_readiness()
        
        report = f"""
👥 团队DDD准备度评估报告
================================
团队规模: {len(self.team_members)} 人
准备度得分: {results['readiness_score']:.1f}/4.0
准备度等级: {results['readiness_level']}

技能缺口:
{chr(10).join('• ' + gap for gap in results['skill_gaps']) if results['skill_gaps'] else '✅ 无明显技能缺口'}

培训计划:
{chr(10).join('• ' + item for item in results['training_plan'])}

风险评估:
{chr(10).join('• ' + risk for risk in results['risks']) if results['risks'] else '✅ 无重大风险'}

实施建议:
{chr(10).join('• ' + rec for rec in results['recommendations'])}
        """
        
        return report

# 使用示例
def example_assessment():
    assessment = TeamReadinessAssessment()
    
    # 添加团队成员
    assessment.add_team_member(TeamMember(
        name="Alice",
        python_skill=SkillLevel.ADVANCED,
        oop_skill=SkillLevel.ADVANCED,
        architecture_experience=SkillLevel.INTERMEDIATE,
        ddd_knowledge=SkillLevel.BEGINNER
    ))
    
    assessment.add_team_member(TeamMember(
        name="Bob", 
        python_skill=SkillLevel.INTERMEDIATE,
        oop_skill=SkillLevel.INTERMEDIATE,
        architecture_experience=SkillLevel.BEGINNER,
        ddd_knowledge=SkillLevel.BEGINNER
    ))
    
    print(assessment.generate_assessment_report())

if __name__ == "__main__":
    example_assessment()
```

## 🚀 第4层：生产就绪验证

### 部署检查清单

```python
# production_readiness_checker.py
import os
import subprocess
import requests
from pathlib import Path
from typing import Dict, List, Any

class ProductionReadinessChecker:
    """生产环境就绪验证工具"""
    
    def __init__(self, project_path: str, app_url: str = None):
        self.project_path = Path(project_path)
        self.app_url = app_url
        self.checks = {}
    
    def run_all_checks(self) -> Dict[str, Any]:
        """运行所有生产就绪检查"""
        self.checks["environment"] = self.check_environment_config()
        self.checks["security"] = self.check_security_config()
        self.checks["database"] = self.check_database_config()
        self.checks["monitoring"] = self.check_monitoring_setup()
        self.checks["performance"] = self.check_performance_config()
        self.checks["deployment"] = self.check_deployment_config()
        
        if self.app_url:
            self.checks["health"] = self.check_application_health()
        
        return self.checks
    
    def check_environment_config(self) -> Dict[str, Any]:
        """检查环境配置"""
        issues = []
        suggestions = []
        
        # 检查环境变量文件
        env_files = [".env", ".env.production", ".env.local"]
        found_env_files = [f for f in env_files if (self.project_path / f).exists()]
        
        if not found_env_files:
            issues.append("❌ 未找到环境变量配置文件")
        else:
            suggestions.append(f"✅ 找到环境配置文件: {', '.join(found_env_files)}")
        
        # 检查关键环境变量
        required_vars = [
            "DATABASE_URL",
            "SECRET_KEY", 
            "REDIS_URL",
            "LOG_LEVEL"
        ]
        
        missing_vars = [var for var in required_vars if not os.getenv(var)]
        if missing_vars:
            issues.append(f"❌ 缺少环境变量: {', '.join(missing_vars)}")
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions
        }
    
    def check_security_config(self) -> Dict[str, Any]:
        """检查安全配置"""
        issues = []
        suggestions = []
        
        # 检查是否有密钥硬编码
        python_files = list(self.project_path.rglob("*.py"))
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # 检查常见的安全问题
                if "password=" in content.lower() and "=" in content:
                    issues.append(f"⚠️ {file_path.name}: 可能包含硬编码密码")
                
                if "secret_key = " in content and "'" in content:
                    issues.append(f"⚠️ {file_path.name}: 可能包含硬编码密钥")
                    
            except Exception:
                pass
        
        # 检查HTTPS配置
        if self.app_url and not self.app_url.startswith("https://"):
            issues.append("❌ 生产环境应该使用HTTPS")
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions
        }
    
    def check_database_config(self) -> Dict[str, Any]:
        """检查数据库配置"""
        issues = []
        suggestions = []
        
        # 检查数据库迁移文件
        migration_dirs = ["migrations", "alembic", "db/migrations"]
        found_migrations = [d for d in migration_dirs if (self.project_path / d).exists()]
        
        if not found_migrations:
            issues.append("❌ 未找到数据库迁移目录")
        else:
            suggestions.append(f"✅ 找到迁移目录: {', '.join(found_migrations)}")
        
        # 检查数据库连接
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            if "sqlite" in database_url.lower():
                issues.append("⚠️ 生产环境不建议使用SQLite")
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions
        }
    
    def check_monitoring_setup(self) -> Dict[str, Any]:
        """检查监控配置"""
        issues = []
        suggestions = []
        
        # 检查日志配置
        log_config_files = ["logging.conf", "logging.yaml", "loguru_config.py"]
        found_log_configs = [f for f in log_config_files if (self.project_path / f).exists()]
        
        if not found_log_configs:
            issues.append("❌ 未找到日志配置文件")
        
        # 检查健康检查端点
        health_check_patterns = ["/health", "/ping", "/status"]
        
        # 搜索健康检查实现
        python_files = list(self.project_path.rglob("*.py"))
        found_health_check = False
        
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if any(pattern in content for pattern in health_check_patterns):
                        found_health_check = True
                        break
            except Exception:
                pass
        
        if not found_health_check:
            issues.append("❌ 未找到健康检查端点")
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions
        }
    
    def check_performance_config(self) -> Dict[str, Any]:
        """检查性能配置"""
        issues = []
        suggestions = []
        
        # 检查异步支持
        python_files = list(self.project_path.rglob("*.py"))
        has_async = False
        
        for file_path in python_files:
            try:
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                    if "async def" in content or "await " in content:
                        has_async = True
                        break
            except Exception:
                pass
        
        if has_async:
            suggestions.append("✅ 使用了异步编程模式")
        else:
            suggestions.append("💡 考虑使用异步模式提升性能")
        
        # 检查缓存配置
        redis_configured = os.getenv("REDIS_URL") is not None
        if redis_configured:
            suggestions.append("✅ 配置了Redis缓存")
        else:
            suggestions.append("💡 考虑配置Redis缓存")
        
        return {
            "passed": True,  # 性能配置是建议性的
            "issues": issues,
            "suggestions": suggestions
        }
    
    def check_deployment_config(self) -> Dict[str, Any]:
        """检查部署配置"""
        issues = []
        suggestions = []
        
        # 检查Docker配置
        docker_files = ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"]
        found_docker = [f for f in docker_files if (self.project_path / f).exists()]
        
        if found_docker:
            suggestions.append(f"✅ 找到Docker配置: {', '.join(found_docker)}")
        else:
            suggestions.append("💡 考虑添加Docker配置便于部署")
        
        # 检查依赖文件
        dep_files = ["requirements.txt", "pyproject.toml", "Pipfile"]
        found_deps = [f for f in dep_files if (self.project_path / f).exists()]
        
        if not found_deps:
            issues.append("❌ 未找到依赖配置文件")
        else:
            suggestions.append(f"✅ 找到依赖配置: {', '.join(found_deps)}")
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions
        }
    
    def check_application_health(self) -> Dict[str, Any]:
        """检查应用健康状态"""
        issues = []
        suggestions = []
        
        try:
            # 检查主页面
            response = requests.get(self.app_url, timeout=10)
            if response.status_code == 200:
                suggestions.append(f"✅ 应用响应正常 ({response.status_code})")
            else:
                issues.append(f"⚠️ 应用响应异常 ({response.status_code})")
            
            # 检查健康检查端点
            health_endpoints = ["/health", "/ping", "/status"]
            for endpoint in health_endpoints:
                try:
                    health_response = requests.get(f"{self.app_url}{endpoint}", timeout=5)
                    if health_response.status_code == 200:
                        suggestions.append(f"✅ 健康检查端点正常: {endpoint}")
                        break
                except requests.RequestException:
                    continue
            else:
                issues.append("⚠️ 未找到可用的健康检查端点")
                
        except requests.RequestException as e:
            issues.append(f"❌ 无法连接到应用: {e}")
        
        return {
            "passed": len(issues) == 0,
            "issues": issues,
            "suggestions": suggestions
        }
    
    def generate_readiness_report(self) -> str:
        """生成生产就绪报告"""
        if not self.checks:
            return "❌ 请先运行检查"
        
        passed_checks = sum(1 for check in self.checks.values() if check.get("passed", False))
        total_checks = len(self.checks)
        
        all_issues = []
        all_suggestions = []
        
        for check_name, check_result in self.checks.items():
            all_issues.extend(check_result.get("issues", []))
            all_suggestions.extend(check_result.get("suggestions", []))
        
        report = f"""
🚀 生产环境就绪验证报告
================================
通过检查: {passed_checks}/{total_checks}
总体就绪度: {"🏆 就绪" if passed_checks == total_checks else "⚠️ 需要改进" if passed_checks >= total_checks * 0.7 else "❌ 未就绪"}

检查详情:
环境配置: {"✅ 通过" if self.checks["environment"]["passed"] else "❌ 失败"}
安全配置: {"✅ 通过" if self.checks["security"]["passed"] else "❌ 失败"}
数据库配置: {"✅ 通过" if self.checks["database"]["passed"] else "❌ 失败"}
监控配置: {"✅ 通过" if self.checks["monitoring"]["passed"] else "❌ 失败"}
性能配置: {"✅ 通过" if self.checks["performance"]["passed"] else "❌ 失败"}
部署配置: {"✅ 通过" if self.checks["deployment"]["passed"] else "❌ 失败"}
{"应用健康: " + ("✅ 通过" if self.checks.get("health", {}).get("passed", False) else "❌ 失败") if "health" in self.checks else ""}

问题列表:
{chr(10).join(all_issues) if all_issues else "✅ 无问题"}

建议优化:
{chr(10).join(all_suggestions) if all_suggestions else "✅ 无建议"}

下一步行动:
{"可以部署到生产环境" if passed_checks == total_checks else
 "修复问题后可以部署" if passed_checks >= total_checks * 0.7 else
 "需要解决关键问题后再部署"}
        """
        
        return report

# CLI工具
def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="DDD生产就绪验证工具")
    parser.add_argument("project_path", help="项目路径")
    parser.add_argument("--url", help="应用URL (可选)")
    
    args = parser.parse_args()
    
    checker = ProductionReadinessChecker(args.project_path, args.url)
    
    print("🚀 开始生产就绪验证...")
    checker.run_all_checks()
    print(checker.generate_readiness_report())

if __name__ == "__main__":
    main()
```

## 📊 质量框架使用指南

### 快速使用流程

```bash
# 1. 概念理解验证 (15分钟)
python ddd_concept_checker.py

# 2. 代码质量检查 (自动化)
python quality_check.py ./my_project

# 3. 团队准备度评估 (一次性)
python team_readiness_assessment.py

# 4. 生产就绪验证 (部署前)
python production_readiness_checker.py ./my_project --url https://myapp.com
```

### CI/CD集成

```yaml
# .github/workflows/ddd_quality.yml
name: DDD Quality Check

on: [push, pull_request]

jobs:
  ddd-quality:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.11'
    
    - name: Install dependencies
      run: |
        pip install -r requirements.txt
        pip install mypy flake8 pytest pytest-cov
    
    - name: Run DDD Quality Checks
      run: |
        python tools/quality_check.py .
        
    - name: Run Production Readiness Check
      run: |
        python tools/production_readiness_checker.py .
```

## 🎯 成功指标

### 质量目标

- **第1层理解验证**: >70%概念掌握率
- **第2层代码质量**: >80%质量得分
- **第3层团队准备**: >2.5/4.0准备度得分  
- **第4层生产就绪**: 100%关键检查通过

### 持续改进

1. **每周**：运行自动化质量检查
2. **每月**：团队技能评估更新
3. **每季度**：质量框架优化改进
4. **每次发布**：生产就绪完整验证

这个4层验证框架确保你的DDD实现从概念理解到生产部署的全过程质量，大幅降低实施风险和提升成功率。