# 一日一游 · PLAY / 31

连续一个月，每天发布一款可以在手机和电脑浏览器中游玩的 3D 小游戏。

当前已实现 Day 01–16，Day 17 之后作为待解锁日历展示。线上地址：

https://zwt.qzz.io/play31/

## 已实现玩法

- Day 01：引力投递
- Day 02：反弹车间
- Day 03：光束接线
- Day 04：悬浮叠塔
- Day 05：一厘米飞行
- Day 06：磁极迷阵
- Day 07：纸飞机港
- Day 08：影子侦探
- Day 09：微型保龄
- Day 10：隧道变奏
- Day 11：积木爆破
- Day 12：重力翻面
- Day 13：月球高尔夫
- Day 14：颜色潜航
- Day 15：风洞快递
- Day 16：弹簧城市

每款游戏拥有独立链接，例如：

```text
https://zwt.qzz.io/play31/?day=8
```

月份也可以通过查询参数指定，页面会自动按照 28、29、30 或 31 天展示日历：

```text
https://zwt.qzz.io/play31/?month=2028-02&day=8
```

## 本地开发

```bash
npm install
npm run dev
```

生产构建：

```bash
npm run build
```

## 技术栈

- Vite
- Three.js
- 原生 JavaScript、CSS
- Cloudflare Tunnel

系列选题、公众号文章模板和发布节奏参见 [SERIES_PLAN.md](./SERIES_PLAN.md)。
