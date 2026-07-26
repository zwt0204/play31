# 一日一游 · PLAY / 31

> **31 / 31 已完结。** 连续一个月，每天发布一款可以在手机和电脑浏览器中直接游玩的原创 3D 小游戏。

[立即游玩](https://zwt.qzz.io/play31/) · [查看系列计划](./SERIES_PLAN.md)

![Status](https://img.shields.io/badge/status-31%20%2F%2031%20completed-d9ff43?style=flat-square&labelColor=111511)
![Three.js](https://img.shields.io/badge/Three.js-0.178-111511?style=flat-square)
![Vite](https://img.shields.io/badge/Vite-7-646cff?style=flat-square)
![Mobile](https://img.shields.io/badge/mobile-touch%20ready-54e0d6?style=flat-square)

线上地址：

https://zwt.qzz.io/play31/

31 款游戏均使用 Three.js 实时渲染，并具备明确通关目标、得分、三次机会、连击、最佳成绩、成功/失败反馈和移动端触控操作。Day 21 的零重力台球额外使用 `cannon-es` 进行刚体碰撞。

首次进入会生成持久化随机玩家代号，首页展示总游玩次数榜，每款游戏展示独立最高分榜。排行榜服务暂时不可用时，本地游戏与浏览器内最佳成绩仍可正常运行。

同一浏览器中的所有游戏共用一个服务端匿名身份和随机代号。外层排行榜按该身份在全部游戏中的累计开局次数排序；单关排行榜按该身份在当前游戏中的历史最高分排序，每位玩家每关只占一行。

## 项目完成情况

- [x] Day 01–31 全部实现，不含预告占位关卡
- [x] 31 套独立玩法、目标与操作说明
- [x] 桌面端鼠标/键盘操作
- [x] 手机端触控操作和响应式 HUD
- [x] 每关得分、生命、连击、成功/失败与重新开始
- [x] 浏览器本地最佳成绩
- [x] 全站统一匿名玩家代号
- [x] 全站累计游玩次数榜
- [x] 每关独立最高分榜
- [x] 28、29、30、31 天月份日历适配
- [x] 生产构建与线上部署

## 31 天完整游戏表

| Day | 游戏 | 核心机制 | 主要操作 | 通关目标 |
| ---: | --- | --- | --- | ---: |
| 01 | 引力投递 | 引力弹弓与轨道投递 | 拖动瞄准，按住蓄力 | 完成 5 笔订单 |
| 02 | 反弹车间 | 落点时机与弹板反射 | 对准弹板，点击释放 | 8 分 |
| 03 | 光束接线 | 镜面旋转与光路连接 | 点击当前发光镜面 | 9 分 |
| 04 | 悬浮叠塔 | 移动方块重叠裁切 | 点击放下方块 | 10 分 |
| 05 | 一厘米飞行 | 横向闪避 | 拖动或 A/D | 10 分 |
| 06 | 磁极迷阵 | 磁力吸引与排斥 | 点击切换磁极 | 10 分 |
| 07 | 纸飞机港 | 双轴滑翔穿门 | 拖动或 WASD | 10 分 |
| 08 | 影子侦探 | 光源位置与影子匹配 | 左右拖动灯光 | 8 分 |
| 09 | 微型保龄 | 方向、力度与刚体碰撞 | 从球上拖动后松手 | 12 分 |
| 10 | 隧道变奏 | 加速隧道闪避 | 左右拖动或 A/D | 10 分 |
| 11 | 积木爆破 | 同色连锁消除 | 点击相邻同色方块 | 20 分 |
| 12 | 重力翻面 | 上下重力切换 | 点击翻转重力 | 10 分 |
| 13 | 月球高尔夫 | 低重力抛物线 | 从球上拖动后松手 | 6 分 |
| 14 | 颜色潜航 | 三色状态匹配 | 点击切换颜色 | 10 分 |
| 15 | 风洞快递 | 风力升降与滑翔 | 按住送风，松开滑翔 | 10 分 |
| 16 | 弹簧城市 | 弹跳时机与落点 | 点击触发弹跳 | 8 分 |
| 17 | 镜面追光 | 动态反射追踪 | 上下拖动镜面 | 8 分 |
| 18 | 齿轮合奏 | 三齿轮节拍同步 | 节拍栓进框时点击 | 14 分 |
| 19 | 泡泡星球 | 尺寸控制与环门匹配 | 按住膨胀，松开收缩 | 12 分 |
| 20 | 峡谷速降 | 四向俯冲穿环 | 拖动或 WASD | 12 分 |
| 21 | 零重力台球 | 无重力碰撞与舱壁反弹 | 从母球拖动后松手 | 8 分 |
| 22 | 方块变形记 | 三种形态匹配门洞 | 点击切换形态 | 10 分 |
| 23 | 声音迷宫 | 周期声呐与记忆寻路 | 拖动或 WASD | 5 分 |
| 24 | 时间切片 | 局部冻结机关 | 按住冻结，松开恢复 | 10 分 |
| 25 | 行星清洁工 | 内外轨道切换 | 点击切换轨道 | 10 分 |
| 26 | 霓虹钓鱼 | 摆动瞄准与垂直下钩 | 点击下钩 | 8 分 |
| 27 | 失控小火箭 | 推力、燃料与软着陆 | 按住提供推力 | 6 分 |
| 28 | 克隆赛跑 | 记录并复演跳跃节奏 | 点击跳跃 | 12 分 |
| 29 | 云端花园 | 邻接生长与布局 | 点击空云格播种 | 8 分 |
| 30 | 黑洞食堂 | 事件视界开关与取舍 | 点击切换事件视界 | 10 分 |
| 31 | 终点：烟花 | 蓄力升空与定高引爆 | 蓄力、发射、点击引爆 | 12 分 |

## 本地开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

构建产物位于 `dist/`。Vite 的生产基础路径为 `/play31/`。

### 排行榜服务

前端默认请求：

```text
/api/play31/session
/api/play31/plays
/api/play31/scores
/api/play31/leaderboards
```

后端路由定义在 `server/leaderboard.py`，需要挂载到 FastAPI 应用：

```python
from fastapi import FastAPI
from server.leaderboard import router as play31_router

app = FastAPI()
app.include_router(play31_router)
```

安装后端依赖并启动宿主 FastAPI 应用。排行榜默认使用：

```text
data/play31_leaderboard.sqlite3
```

也可以通过环境变量覆盖：

```bash
export PLAY31_LEADERBOARD_DB=/absolute/path/play31.sqlite3
```

如果只启动 Vite，31 款游戏仍可游玩，但服务端匿名身份与排行榜会显示离线，本地最佳成绩保存在浏览器 `localStorage`。

## 匿名身份与排行榜设计

- 浏览器首次访问时，服务端生成随机 Token 与随机中文代号。
- 服务端只保存 Token 的 SHA-256 哈希，不保存原始 Token。
- 同一浏览器的 31 款游戏共用一个匿名身份。
- 全站榜按照 31 款游戏累计开局次数排序。
- 单关榜按照该关历史最高分排序，每位玩家每关只占一行。
- 开局接口包含 2 秒防抖；成绩只能提交一次，并校验局时范围。
- 过期游戏 Session 会自动清理。

## 项目结构

```text
.
├── index.html
├── src/
│   ├── main.js            # 日历、31 关文案、页面与交互入口
│   ├── orbitGame.js       # Day 01 独立轨道投递实现
│   ├── dailyGames.js      # Day 02–31 的游戏机制
│   ├── leaderboard.js     # 匿名身份与排行榜前端
│   └── style.css
├── server/
│   └── leaderboard.py     # FastAPI + SQLite 排行榜路由
├── tests/
│   └── test_leaderboard.py
├── scripts/               # 应用和 Cloudflare Tunnel 启动脚本
├── supervisor/            # Supervisor 示例配置
├── SERIES_PLAN.md
└── vite.config.js
```

## 验证

前端生产构建：

```bash
npm run build
```

排行榜单元测试需要 FastAPI 与 Pydantic 运行环境：

```bash
python -m unittest tests/test_leaderboard.py
```

## 技术栈

- Vite
- Three.js
- 原生 JavaScript、CSS
- Cloudflare Tunnel
- FastAPI + SQLite 排行榜

## 直接链接与月份参数

每款游戏拥有稳定链接，例如：

```text
https://zwt.qzz.io/play31/?day=21
```

月份可以通过查询参数指定。页面会根据目标月份自动显示 28、29、30 或 31 天：

```text
https://zwt.qzz.io/play31/?month=2028-02&day=8
```

`day` 目前只接受 1–31；当目标月份少于 31 天时，日历会按该月天数截取游戏集合。

## 系列完结

项目从 Day 01 的《引力投递》开始，在 Day 31 的《终点：烟花》结束。当前不再依赖每日解锁任务，31 款游戏已经全部公开，可以从首页日历或 `?day=N` 直接进入。

系列选题、公众号文章模板和发布节奏参见 [SERIES_PLAN.md](./SERIES_PLAN.md)。
