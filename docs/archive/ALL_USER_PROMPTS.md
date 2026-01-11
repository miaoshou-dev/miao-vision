# 完整用户问题记录 - Miao Vision 项目

**项目**: miaoshou-vision (Evidence.dev 风格的 Markdown 报告系统)
**技术栈**: Svelte 5, DuckDB-WASM, Mosaic vgplot, Monaco Editor

---

## Phase 1: Markdown 驱动的报告生成

### 问题 1
请完成'Markdown 驱动的报告生成' ，请先列出todo ，i will check first

### 问题 2
go buddy

---

## Phase 2: SQL 到 Chart 的自动链接

### 问题 3
根据上下文，我需要将"```sql SELECT * FROM table_1764839625319 LIMIT 10 ```" 转换为一个数据集，```chart type: bar data: query_result x: column_x y: column_y title: Your Chart Title ``` 变成图表在markdown preview时，pls list the todo first,i will check

### 问题 4
go buddy

---

## Phase 3: Chart 位置对应问题

### 问题 5
现在又一个问题，chart 渲染后与markdown源文件位置不对应，你需要怎么优化，不要先进行编辑代码，先列出todo

### 问题 6
go buddy

---

## Phase 4: Chart 和 SQL Block 渲染问题

### 问题 7
there has two issue 1. chart block seem like not ref sql block data 2. sql block and chart block do not render correct

### 问题 8
请教个问题，sql sales_data， sql后面的变量是如何实现解析的？

### 问题 9
1.修改author 可以立刻显示chart，点击excute按钮没反应；2 OriginCityName

---

## Phase 5: 编辑后结果不更新问题

### 问题 10
仍然有一个issue，编辑sql 或 chart 块，chart 和query result 不变化，先分析原因，列出修改todo

### 问题 11
go

### 问题 12
问题仍然存在 'Found 0 placeholders, 2 blocks in report'

---

## Phase 6: Chart 第一次不显示问题 (当前 Session)

### 问题 13
现在chart 不显示了

### 问题 14
点击两次会出来，为什么1次不出来

### 问题 15
这个问题sql block没问题，chart有这个问题

### 问题 16
你能把这个session里的所有我给你的prompt 写入到一个文档吗，不包括日志和的你的输出

### 问题 17
你能把这个工程我给你的prompt都拿出来吗

### 问题 18
你还记得初始化工程时的prompt吗

### 问题 19
我希望你每次都把这个项目我给你的prompt更新到ALL_USER_PROMPTS.md

---

## Phase 7: 功能规划与下一步

### 问题 20
评估下现有功能，与evidence.dev的距离，当然我知道很大，看看下一步该实现什么？你有什么建议，不要急着编码，先列出功能

### 问题 21
轻量级工具 ， 1，2，3，4，都想做，个人数据分析

### 问题 22
先做 1，2，3 ;ui 简约风格（类似 Evidence.dev）;数据量 10000;图表Histogram这一种即可；
工程上markdown 和 data vision 包括chart BigValue是不同的模块，注意每个ts文件的大小，不要过高 超出500行 要给我提示

### 问题 23
先不做重构，BigValue 独立卡片,DataTable 虚拟滚动 A，Histogram bin 数量 20 default

---

## 问题总结

### 功能实现类
1. Markdown 驱动的报告生成系统
2. SQL 查询结果转换为数据集
3. Chart 配置自动生成图表

### Bug 修复类
1. Chart 渲染位置不对应 Markdown 源文件位置
2. Chart 不引用 SQL block 数据
3. SQL/Chart block 渲染不正确
4. 点击 Execute 按钮没反应
5. 编辑 SQL/Chart 块后结果不更新
6. Placeholder 找不到（'Found 0 placeholders'）
7. Chart 第一次点击不显示，需要点击两次

### 技术咨询类
1. SQL 后面的变量名是如何解析的（如 `sql sales_data`）

### 文档管理类
1. 请求记录 session 中的所有 prompts
2. 请求记录整个项目的所有 prompts
3. 询问初始化工程时的 prompt
4. 要求自动更新 prompt 记录文档

---

## 开发流程特点

用户的工作流程：
1. 提出需求/问题
2. 要求先列出 TODO（"pls list the todo first, i will check"）
3. 确认后用 "go buddy" 或 "go" 批准执行
4. 发现问题后立即反馈
5. 通过日志协助调试
6. 重视项目文档和历史记录

---

**总计**: 22 个用户输入
**主要语言**: 中英混合（中文描述 + 英文技术术语）
**最后更新**: 2025-12-05

---

## 相关文档

- `FEATURE_ROADMAP.md` - 功能路线图与 Evidence.dev 对比
- `NEXT_FEATURES_TODO.md` - 下一阶段详细开发计划（已过时）
- `IMPLEMENTATION_PLAN.md` - ⭐ 当前实施计划（Phase 1: BigValue + DataTable + Histogram）
- `CURRENT_STATUS.md` - 当前调试状态
- `COMPLETE_DEBUG_STEPS.md` - 完整调试步骤
- `DEBUG_QUICK_TEST.md` - 快速测试指南
