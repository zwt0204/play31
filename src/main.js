import './style.css';
import { createLeaderboard } from './leaderboard.js';

const games = [
  ['引力投递', '轨道 · 时机'], ['反弹车间', '弹射 · 角度'], ['光束接线', '折射 · 路径'],
  ['悬浮叠塔', '平衡 · 建造'], ['一厘米飞行', '闪避 · 节奏'], ['磁极迷阵', '磁力 · 解谜'],
  ['纸飞机港', '滑翔 · 收集'], ['影子侦探', '光影 · 观察'], ['微型保龄', '物理 · 精准'],
  ['隧道变奏', '竞速 · 反应'], ['积木爆破', '连锁 · 爆破'], ['重力翻面', '平台 · 操控'],
  ['月球高尔夫', '抛物线 · 策略'], ['颜色潜航', '匹配 · 穿越'], ['风洞快递', '气流 · 导航'],
  ['弹簧城市', '跳跃 · 探索'], ['镜面追光', '反射 · 追逐'], ['齿轮合奏', '机械 · 节拍'],
  ['泡泡星球', '膨胀 · 生存'], ['峡谷速降', '俯冲 · 穿环'], ['零重力台球', '碰撞 · 预判'],
  ['方块变形记', '变形 · 通关'], ['声音迷宫', '回声 · 定位'], ['时间切片', '慢放 · 闪避'],
  ['行星清洁工', '环绕 · 收集'], ['霓虹钓鱼', '摆动 · 时机'], ['失控小火箭', '推力 · 着陆'],
  ['克隆赛跑', '记录 · 协作'], ['云端花园', '生长 · 布局'], ['黑洞食堂', '吞噬 · 取舍'],
  ['终点：烟花', '混合 · 庆典']
];

const playableDetails = {
  1: {
    description: '规划多行星航线，借助引力弹弓完成太空订单。',
    instruction: '拖动画面调整方向，长按蓄力后松开发射。管理燃料与货物耐久，连续完成 5 笔轨道订单。',
    control: '拖动瞄准 · 按住蓄力',
    rules: [
      '拖动画面调整航向，让黄色预测线靠近发光目标环。',
      '按住底部按钮增加推力，松开后发射；力度越大，消耗燃料越多。',
      '利用行星引力改变航线，在时间和三次机会耗尽前送达 5 笔订单。'
    ]
  },
  2: {
    description: '抓准横向移动的红球，让它落在弹板上并反弹击箱。',
    instruction: '红球会在中间轨道上左右移动。观察它下方的投影线，对准底部发光弹板后点击释放。',
    control: '对准弹板 · 点击释放',
    rules: [
      '红球沿横向轨道移动，垂直投影线表示它将要落下的位置。',
      '投影线进入底部发光弹板时点击；球会真实下落，再反弹击中顶部货箱。',
      '越接近弹板中心得分越高；落在弹板外会损失一次机会。'
    ]
  },
  3: {
    description: '转动当前发光镜面，让光束一段一段接到终点。',
    instruction: '只需点击当前带光环的镜面。每次旋转 45°，让白色镜面与黄色参考线重合；对齐后会自动锁定下一面。',
    control: '点击当前发光镜面',
    rules: [
      '找到有黄色光环和箭头的镜面，它是当前需要操作的一面。',
      '每点一次旋转 45°；让白色镜面与半透明黄色参考线完全重合。',
      '对齐后镜面会锁定并得分，光束自动进入下一面；连续对齐还有额外加分。'
    ]
  },
  4: { description: '抓准横向移动的瞬间，把方块稳稳叠高。', instruction: '点击放下移动中的方块。重叠越整齐，下一层保留的面积越大。', control: '点击放下方块' },
  5: { description: '驾驶一厘米飞船，从桌面障碍之间穿过去。', instruction: '移动鼠标或使用 A/D、左右方向键控制飞船；手机直接左右拖动。', control: '鼠标移动 · A/D 左右' },
  6: {
    description: '切换能量球磁极，利用吸引与排斥穿过偏移出口。',
    instruction: '点击切换红蓝磁极：红极把球推向右侧，蓝极把球推向左侧。提前观察迎面而来的出口。',
    control: '点击切换磁力方向',
    rules: [
      '红蓝磁体会同时吸引与排斥能量球，球上的箭头显示当前受力方向。',
      '点击切换磁极：红极向右加速，蓝极向左加速。',
      '让球对准迎面而来的发光出口，同时不要撞上两侧边界。'
    ]
  },
  7: { description: '操控纸飞机穿过云层中的连续航门。', instruction: '移动鼠标或使用 WASD/方向键控制飞机；手机在画面中拖动。', control: '鼠标移动 · WASD' },
  8: {
    description: '移动黄色灯光，让黑色影子覆盖屏幕上的黄色目标。',
    instruction: '左右拖动灯光，观察黑影如何变形。黑影覆盖黄色轮廓时会变绿，保持一秒完成锁定。',
    control: '左右拖灯 · A/D',
    rules: [
      '黄色球是灯光，紫色物体会在右侧屏幕上留下黑色影子。',
      '左右拖动灯光，让黑影逐渐覆盖始终可见的黄色目标轮廓。',
      '对齐后黑影会变绿；保持到底部锁定条填满即可得分。'
    ]
  },
  9: { description: '沿发光球道拖出方向和力度，撞倒尽可能多的球瓶。', instruction: '从保龄球上按住向后拖动，瞄准线与力度条会同时变化；松手后滚向瓶阵。', control: '从球上拖动 · 松手投球' },
  10: { description: '在不断变形的霓虹隧道里保持航线。', instruction: '移动鼠标或使用 A/D、左右方向键穿过缺口；速度会逐渐提升。', control: '鼠标移动 · A/D 左右' },
  11: { description: '点击相邻的同色方块，引发一次 3D 连锁爆破。', instruction: '直接点击两个以上相连的同色方块。一次消除越多，达到 20 分目标越快。', control: '点击同色方块爆破' },
  12: { description: '一键翻转重力，让能量球移动到来临光环所在的平台。', instruction: '观察远处光环位于上方还是下方，提前点击切换重力，让能量球落到同一侧。', control: '点击翻转上下重力' },
  13: { description: '在低重力月面上控制抛物线，连续把球送进移动洞口。', instruction: '从球上按住向后拖动；方向决定落点，力度决定抛物高度。球太高时会飞过洞口。', control: '从球上拖动 · 松手击球' },
  14: { description: '切换潜航器颜色，穿过迎面而来的同色水门。', instruction: '观察最前方水门颜色，点击依次切换红、黄、青；颜色一致时才能安全通过。', control: '点击切换当前颜色' },
  15: { description: '借助风力，把快递送进漂浮的收件环。', instruction: '按住增强风力让包裹上升，松开后滑翔。连续穿环即可加分。', control: '按住送风 · 松开滑翔' },
  16: { description: '踩着弹簧屋顶，在微缩城市里向上攀登。', instruction: '点击触发下一次弹跳，落在屋顶中央可获得更高弹力。', control: '点击触发弹跳' },
  17: {
    description: '旋转中央镜面，用反射光持续追踪移动目标。',
    instruction: '在画面中按住并上下拖动镜面，让黄色反射光锁定右侧目标；保持到锁定环填满即可得分。',
    control: '上下拖镜 · W/S',
    rules: [
      '手指或鼠标按住画面，上下拖动，改变中央镜面的反射角度。',
      '让黄色反射光落在右侧移动光球上，并持续保持到锁定进度填满。',
      '目标会逐渐加速并缩小；长时间没有完成锁定会损失一次机会。'
    ]
  },
  18: {
    description: '敲准三枚咬合齿轮的同步点，把机械噪声演奏成节拍。',
    instruction: '观察当前亮起的齿轮。发光节拍栓转进顶部绿色同步框时点击；连续命中会加速，完美卡点可得双分。',
    control: '节拍栓进框时点击',
    rules: [
      '黄色光环会指出当前齿轮，只有这枚齿轮上的发光节拍栓需要关注。',
      '节拍栓进入齿轮顶部绿色同步框时点击；越靠近正中央，得分越高。',
      '每次命中会切换到下一枚齿轮并逐渐提速；提前敲击或漏过同步框都会损失一次机会。'
    ]
  },
  19: {
    description: '控制泡泡呼吸般膨胀与收缩，在尖刺星环之间寻找刚好的尺寸。',
    instruction: '按住让泡泡膨胀，松开让它收缩。迎面环门的亮色内圈就是目标大小，在穿越瞬间让泡泡轮廓与它重合。',
    control: '按住膨胀 · 松开收缩',
    rules: [
      '观察最近的发光环门，它的内圈大小就是这一次需要匹配的泡泡尺寸。',
      '按住画面或底部按钮让泡泡膨胀，松开后会持续收缩；底部尺寸条同步显示当前大小。',
      '穿越时尺寸越接近环门得分越高；过大或过小都会碰到尖刺，连续成功后环门会加速。'
    ]
  },
  20: {
    description: '驾驶滑翔机冲下峡谷，左右上下穿进不断逼近的发光环门。',
    instruction: '拖动或按方向键控制滑翔机。环门会沿峡谷两侧岩壁之间飘移，在穿越瞬间让机体穿过环心；越靠近中心分越高。',
    control: '拖动穿环 · WASD',
    rules: [
      '峡谷两侧岩壁不断向后掠过，前方会出现发光环门，沿河道左右上下偏移。',
      '移动鼠标或手指拖动滑翔机；电脑也可用 WASD / 方向键。',
      '机体穿过环门得分，擦中心可得双分；撞偏或漏过环门会损失一次机会，连续成功后俯冲加速。'
    ]
  },
  21: {
    description: '在无重力轨道舱里预判碰撞，把漂浮目标球送进四座捕获口。',
    instruction: '从暖白母球上按住并向后拖动，激光线会预演首次碰撞或一次舱壁反弹；松手击球，把彩色目标球撞进发光捕获口。',
    control: '从母球拖动 · 松手击球',
    rules: [
      '从暖白母球上按住并反向拖动：拖得越远，击球力度越大。',
      '虚线会显示首次目标碰撞；没有直接目标时，会预演一次舱壁反弹。',
      '彩色目标球进入任意发光捕获口即可得分；空杆或母球入舱会损失一次机会。'
    ]
  },
  22: {
    description: '你不能移动，只能把自己折叠成门洞允许的轮廓。',
    instruction: '点击循环切换立方体、横向薄片和纵向高柱。观察最近门洞的轮廓，在穿越瞬间变成相同形态。',
    control: '点击切换方块形态',
    rules: [
      '点击画面或底部按钮，依次切换立方体、横向薄片、纵向高柱。',
      '最近门洞的发光轮廓就是需要匹配的形态；底部进度条显示它逼近的距离。',
      '形态一致即可穿过并得分；形态错误或最后一刻仍在变形会损失一次机会。'
    ]
  },
  23: {
    description: '墙壁只有在声音扫过时才会出现，拖动声呐球穿过黑暗迷宫。',
    instruction: '声呐球会周期发出青色回声环。记住被照亮的墙和通道，在回声消失后拖动球抵达绿色信标。',
    control: '拖动探索 · WASD',
    rules: [
      '青色声波会自动从球的位置扩散，经过的墙体会短暂显形并产生回声。',
      '点击或拖动画面移动声呐球；电脑也可用 WASD / 方向键沿通道探索。',
      '碰到隐藏墙会损失一次机会；抵达绿色信标即可得分，随后迷宫会重新生成。'
    ]
  },
  24: {
    description: '按住时间切片冻结横向机关，让前进中的方块穿过正在变化的缺口。',
    instruction: '机关会不断左右变形。按住底部按钮只冻结它们的横向时间，方块仍会继续前进；松开后时间恢复。',
    control: '按住冻结机关 · 松开恢复',
    rules: [
      '发光缺口会沿左右方向移动，方块会自动向前穿过连续门框。',
      '按住按钮消耗时间能量，冻结机关的横向变化；前进速度不会停止。',
      '穿过缺口得分；冻结能量耗尽或方块撞上门框会损失一次机会。'
    ]
  },
  25: {
    description: '切换内外轨道，清理漂浮废料，同时避开会反弹的红色卫星。',
    instruction: '清洁无人机沿轨道自动运行。点击切换内外轨道，让青色废料进入清理范围，红色卫星则必须错开。',
    control: '点击切换轨道',
    rules: [
      '无人机沿当前轨道绕行，青色废料和红色卫星会从不同轨道经过。',
      '点击在内轨和外轨之间切换；只有同一轨道的青色废料会被吸入。',
      '收集废料得分；撞上同轨道的红色卫星会损失一次机会。'
    ]
  },
  26: {
    description: '让霓虹鱼钩在摆动的瞬间落下，抓住水面下正在变速的鱼。',
    instruction: '鱼钩会在上方摆动。观察目标鱼的横向位置，点击底部按钮下钩，命中后鱼钩会自动收回。',
    control: '点击下钩 · 自动收线',
    rules: [
      '鱼钩沿霓虹线左右摆动，不同颜色的鱼有不同游速和深度。',
      '点击下钩后鱼钩会垂直落下；横向对准目标鱼即可抓到。',
      '抓到鱼得分；落空会损失一次机会，收线完成后才能再次下钩。'
    ]
  },
  27: {
    description: '控制失控小火箭的推力，在燃料有限时减速并稳稳落到平台。',
    instruction: '火箭会持续下坠。按住按钮点燃推力，降低下落速度；松开节省燃料，落地时速度和位置都要合格。',
    control: '按住推力 · 松开节省燃料',
    rules: [
      '火箭持续受到重力影响，速度会随着下坠不断增加。',
      '按住按钮消耗燃料并提供向上推力；松开后燃料缓慢回充。',
      '以低速落在绿色平台得分；撞击过快或偏离平台会损失一次机会。'
    ]
  },
  28: {
    description: '让下一圈的克隆复演你的跳跃节奏，多名跑者同时越过同步门。',
    instruction: '点击按钮让当前跑者跳跃。每圈结束后，上一圈的点击时间会变成克隆动作，后续同步门需要更多跑者同时在空中。',
    control: '点击跳跃 · 记录节奏',
    rules: [
      '每圈有四道门；第一圈只需当前跑者跳过，后续圈会加入上一圈的克隆。',
      '点击记录跳跃时间；克隆会在下一圈精确复演这组节奏。',
      '门上的标记表示需要同时起跳的跑者数量；少一名就会失误。'
    ]
  },
  29: {
    description: '在九朵云上布局种子，让相邻植物互相生长并开出花。',
    instruction: '点击空云格播种。每次播种会让相邻植物成长，开花后自动收获并得分；规划邻接关系，避免只种孤立位置。',
    control: '点击空云格播种',
    rules: [
      '点击空云格种下一枚种子；上下左右相邻的植物会一起成长。',
      '植物成长到第三阶段会开花，短暂绽放后自动收获并得分。',
      '点击已有植物会浪费一次机会；先观察相邻关系再布局。'
    ]
  },
  30: {
    description: '切换黑洞事件视界，吞下食物或把危险重物弹离吸积盘。',
    instruction: '物体会不断向中心坠落。点击切换事件视界大小：打开吞噬青绿食物，关闭让危险红色重物擦边弹开。',
    control: '点击开关事件视界',
    rules: [
      '青绿色物体值得吞噬，红色重物会让黑洞失稳；两者都会沿吸积盘靠近中心。',
      '打开事件视界扩大捕获范围，适合吞食物；看到红色重物时点击关闭，让它弹开。',
      '吞下食物得分；吞下红色重物会损失一次机会，错过食物不会扣分。'
    ]
  },
  31: {
    description: '把最后一枚烟花送到目标高度，在城市上空完成 PLAY / 31 的庆典。',
    instruction: '按住画面蓄力，松手发射小火箭；升空后点击，在绿色目标环附近引爆，连续命中会绽放更大的烟花。',
    control: '按住蓄力 · 松手发射 · 点击引爆',
    rules: [
      '按住画面蓄力，力度决定火箭上升高度；松手后火箭会自动升空。',
      '升空时绿色目标环显示理想引爆高度，点击画面立即引爆烟花。',
      '越靠近目标环得分越高；过早或错过高度会浪费一次机会。'
    ]
  }
};

const publishedGameCount = 31;
const now = new Date();
const requestedMonth = new URLSearchParams(window.location.search).get('month');
const monthMatch = requestedMonth?.match(/^(\d{4})-(\d{2})$/);
const seriesYear = monthMatch ? Number(monthMatch[1]) : now.getFullYear();
const requestedMonthNumber = monthMatch ? Number(monthMatch[2]) : now.getMonth() + 1;
const seriesMonth = requestedMonthNumber >= 1 && requestedMonthNumber <= 12
  ? requestedMonthNumber
  : now.getMonth() + 1;
const monthKey = `${seriesYear}-${String(seriesMonth).padStart(2, '0')}`;
const monthLabel = `${seriesYear}年${seriesMonth}月`;
const monthDayCount = new Date(seriesYear, seriesMonth, 0).getDate();
const monthlyGames = games.slice(0, monthDayCount);
const requestedDay = Number(new URLSearchParams(window.location.search).get('day'));
const selectedDay = Number.isInteger(requestedDay) && requestedDay >= 1 && requestedDay <= publishedGameCount ? requestedDay : 1;
const selectedGame = games[selectedDay - 1];
const selectedDetails = playableDetails[selectedDay];
const selectedDayLabel = String(selectedDay).padStart(2, '0');
const meterLabels = {
  1: '发射力度', 2: '反弹时机', 3: '接线进度', 4: '落点窗口',
  5: '航行状态', 6: '磁力位置', 7: '航线状态', 8: '影子匹配',
  9: '投球力度', 10: '隧道速度', 11: '连锁能量', 12: '重力方向',
  13: '击球力度', 14: '当前颜色', 15: '风力高度', 16: '弹跳时机', 17: '追光锁定',
  18: '同步窗口', 19: '泡泡尺寸', 20: '穿环准度', 21: '击球力度', 22: '门洞距离',
  23: '声波半径', 24: '时间能量', 25: '轨道位置', 26: '鱼钩准度', 27: '燃料余量',
  28: '同步进度', 29: '云田占用', 30: '事件视界', 31: '烟花高度'
};
const canvasPrimaryDays = new Set([3, 5, 7, 8, 9, 10, 11, 13, 17, 20, 21, 23, 29, 31]);
const canvasPrimary = canvasPrimaryDays.has(selectedDay);
const gestureIcons = { 3: '◎', 5: '↔', 7: '↕', 8: '↔', 9: '⌁', 10: '↔', 11: '◎', 13: '⌁', 17: '↕', 20: '↗', 21: '⌁', 23: '◉', 29: '✣', 31: '✦' };
const buttonIcons = { 2: '↓', 4: '▬', 6: '↔', 12: '↕', 14: '●', 15: '≈', 16: '↑', 18: '♪', 19: '○', 22: '▦', 24: '◫', 25: '↺', 26: '⌁', 27: '↑', 28: '↑', 30: '●' };
const canvasControlLabels = {
  3: ['点击发光镜面', '点击发光镜面'],
  5: ['鼠标移动 / A D', '左右拖动飞船'],
  7: ['鼠标移动 / WASD', '拖动纸飞机'],
  8: ['左右拖灯 / A D', '左右拖动灯光'],
  9: ['从球上拖动投球', '从球上拖动投球'],
  10: ['鼠标移动 / A D', '左右拖动穿越'],
  11: ['点击同色方块', '点击同色方块'],
  13: ['从球上拖动击球', '从球上拖动击球'],
  17: ['上下拖镜 / W S', '上下拖动镜面'],
  20: ['鼠标移动 / WASD', '拖动滑翔机穿环'],
  21: ['从母球拖动击球', '从母球拖动击球'],
  23: ['点击移动 / WASD', '拖动声呐球探索'],
  24: ['按住空格或按钮冻结机关', '按住底部按钮冻结机关'],
  25: ['点击或按空格切换轨道', '点击底部按钮切换轨道'],
  26: ['点击或按空格下钩', '点击底部按钮下钩'],
  27: ['按住空格或按钮提供推力', '按住底部按钮提供推力'],
  28: ['点击或按空格跳跃', '点击底部按钮跳跃'],
  30: ['点击或按空格切换事件视界', '点击底部按钮切换视界']
};
const [desktopControl, mobileControl] = canvasControlLabels[selectedDay] || [selectedDetails.control, selectedDetails.control];
const platformTips = {
  1: ['鼠标拖动瞄准，空格键蓄力', '手指拖动瞄准，按住底部蓄力'],
  2: ['鼠标点击或空格键释放', '直接点击画面释放'],
  3: ['点击发光镜面，空格也可旋转', '点击当前发光镜面'],
  4: ['鼠标点击或空格落下', '点击画面落下方块'],
  5: ['移动鼠标，或按 A/D、左右方向键', '手指左右拖动飞船'],
  6: ['鼠标点击或空格切换磁极', '点击画面切换磁极'],
  7: ['移动鼠标，或按 WASD/方向键', '手指在画面中拖动'],
  8: ['按住鼠标左右拖灯，或按 A/D', '按住画面左右拖动灯光'],
  9: ['从球上按住拖动，松开投球', '从球上按住拖动，松开投球'],
  10: ['移动鼠标，或按 A/D、左右方向键', '手指左右拖动飞行器'],
  11: ['鼠标直接点击同色方块', '手指直接点击同色方块'],
  12: ['鼠标点击或空格翻转重力', '点击画面翻转重力'],
  13: ['从球上按住拖动，松开击球', '从球上按住拖动，松开击球'],
  14: ['鼠标点击或空格切换颜色', '点击画面切换颜色'],
  15: ['按住鼠标按钮或空格送风', '按住底部按钮送风'],
  16: ['鼠标点击或空格触发弹跳', '点击画面触发弹跳'],
  17: ['按住鼠标上下拖镜，或按 W/S', '按住画面上下拖动镜面'],
  18: ['鼠标点击或按空格敲击', '点击画面或底部按钮敲击'],
  19: ['按住鼠标或空格膨胀，松开收缩', '按住画面或底部按钮膨胀'],
  20: ['移动鼠标，或按 WASD / 方向键', '手指在画面中拖动滑翔机'],
  21: ['从暖白母球上按住拖动，松开击球', '从暖白母球上按住拖动，松开击球'],
  22: ['鼠标点击或按空格切换形态', '点击画面或底部按钮切换形态'],
  23: ['点击画面移动，或使用 WASD / 方向键', '在画面中点击或拖动声呐球'],
  24: ['按住空格或按钮冻结机关', '按住底部按钮冻结机关'],
  25: ['点击或按空格切换轨道', '点击底部按钮切换轨道'],
  26: ['点击或按空格下钩', '点击底部按钮下钩'],
  27: ['按住空格或按钮提供推力', '按住底部按钮提供推力'],
  28: ['点击或按空格跳跃', '点击底部按钮跳跃'],
  29: ['点击云格播种', '点击空云格播种'],
  30: ['点击或按空格切换事件视界', '点击底部按钮切换视界'],
  31: ['按住画面蓄力，松手发射，升空后点击引爆', '按住画面蓄力，松手发射，点击引爆']
};
const [desktopTip, mobileTip] = platformTips[selectedDay];
document.title = `Day ${selectedDayLabel} · ${selectedGame[0]} | 一日一游`;
document.querySelector('meta[name="description"]')?.setAttribute('content', selectedDetails.description);
const rules = selectedDetails.rules || [
  `操作：${selectedDetails.control}。`,
  `目标：${selectedDetails.description}`,
  '在三次机会耗尽前达到页面显示的目标进度，连续成功可以获得额外分数。'
];

const gameCards = monthlyGames.map((game, index) => {
  const day = String(index + 1).padStart(2, '0');
  const dayNumber = index + 1;
  const isPlayable = dayNumber <= publishedGameCount;
  const state = dayNumber === selectedDay ? 'today' : isPlayable ? 'published' : 'locked';
  const stateText = dayNumber === selectedDay ? '正在玩' : isPlayable ? '现在可玩' : '待解锁';
  const tag = isPlayable ? 'a' : 'article';
  const link = isPlayable ? ` href="?month=${monthKey}&day=${dayNumber}#play"` : '';
  return `
    <${tag} class="game-card ${state}" data-day="${day}"${link}>
      <div class="card-top"><span>DAY ${day}</span><span class="state">${stateText}</span></div>
      <div class="game-thumb thumb-${(index % 6) + 1}" aria-hidden="true"><i></i><b></b></div>
      <h3>${game[0]}</h3>
      <p>${game[1]}</p>
    </${tag}>`;
}).join('');

document.querySelector('#app').innerHTML = `
  <main>
    <section class="game-hero" id="play">
      <canvas id="game-canvas" aria-label="${selectedGame[0]} 3D 游戏画面"></canvas>
      <div class="topbar">
        <a class="brand" href="#play" aria-label="一日一游首页">
          <span class="brand-mark">1×${monthDayCount}</span>
          <span>一日一游</span>
        </a>
        <div class="topbar-actions">
          <button class="rules-trigger" id="rules-trigger" type="button">玩法<span>说明</span></button>
          <button class="leaderboard-trigger" id="leaderboard-trigger" type="button">排行</button>
          <a class="calendar-link" href="#calendar" aria-label="查看${monthLabel}全部${monthDayCount}款游戏">
            <span class="grid-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
            <span class="calendar-link-copy"><strong>全部 ${monthDayCount} 款</strong><small>${monthLabel}</small></span>
            <span class="calendar-arrow" aria-hidden="true">↓</span>
          </a>
        </div>
      </div>

      <div class="game-info">
        <p class="eyebrow"><span>DAY ${selectedDayLabel}</span> / ${monthDayCount} DAYS OF 3D PLAY</p>
        <h1>${selectedGame[0]}</h1>
        <p class="tagline">${selectedDetails.description}</p>
      </div>

      <div class="hud" aria-live="polite">
        <div><span>得分</span><strong id="score">000</strong></div>
        <div><span>目标</span><strong id="goal">0 / 8</strong></div>
        <div><span>剩余</span><strong id="lives">● ● ●</strong></div>
      </div>

      <div class="game-toast" id="game-toast" aria-live="polite"></div>
      <div class="gesture-hint" id="gesture-hint" hidden>
        <span>${gestureIcons[selectedDay] || '◎'}</span>
        <div><small>在游戏画面中操作</small><strong><span class="platform-control-desktop">${desktopControl}</span><span class="platform-control-mobile">${mobileControl}</span></strong></div>
      </div>

      <aside class="rules-panel" id="rules-panel" hidden aria-labelledby="rules-title">
        <button class="rules-close" id="rules-close" type="button" aria-label="关闭玩法说明">×</button>
        <p class="eyebrow">HOW TO PLAY · DAY ${selectedDayLabel}</p>
        <h2 id="rules-title">${selectedGame[0]}</h2>
        <p class="rules-summary">${selectedDetails.description}</p>
        <ol>
          ${rules.map((rule, index) => `<li><span>${String(index + 1).padStart(2, '0')}</span><p>${rule}</p></li>`).join('')}
        </ol>
        <div class="rules-tip"><span>电脑</span>${desktopTip}<br><span>手机</span>${mobileTip}</div>
        <button class="rules-ready" id="rules-ready" type="button">知道了，开始挑战</button>
      </aside>

      <aside class="leaderboard-panel" id="leaderboard-panel" hidden aria-labelledby="leaderboard-title">
        <button class="leaderboard-close" id="leaderboard-close" type="button" aria-label="关闭排行榜">×</button>
        <p class="eyebrow">DAY ${selectedDayLabel} · HIGH SCORES</p>
        <h2 id="leaderboard-title">${selectedGame[0]}排行</h2>
        <div class="my-game-ranking">
          <div><span>你的最高分</span><strong id="my-best-score">0</strong></div>
          <div><span>本关排名</span><strong id="my-game-rank">--</strong></div>
        </div>
        <ol class="ranking-list game-ranking-list" id="game-ranking-list"></ol>
        <p class="ranking-status" data-ranking-status>正在连接排行服务…</p>
      </aside>

      <div class="game-controls ${canvasPrimary ? 'canvas-primary' : ''}">
        <div class="power-wrap">
          <span>${meterLabels[selectedDay]}</span>
          <div class="power-track"><i id="power-fill"></i></div>
        </div>
        <button id="launch-button" class="launch-button${canvasPrimary ? ' guide-only' : ''}" type="button" ${canvasPrimary ? 'aria-disabled="true" tabindex="-1"' : ''}>
          <span class="launch-icon">${canvasPrimary ? gestureIcons[selectedDay] : buttonIcons[selectedDay] || '↑'}</span>
          <span><span class="platform-control-desktop">${desktopControl}</span><span class="platform-control-mobile">${mobileControl}</span></span>
        </button>
      </div>

      <div class="start-screen" id="start-screen">
        <div class="start-index">${selectedDayLabel}</div>
        <p>MONTH ${String(seriesMonth).padStart(2, '0')} EXPERIMENT</p>
        <h2>${selectedGame[0]}</h2>
        <p class="start-copy">${selectedDetails.instruction}</p>
        <div class="player-identity"><span>你的全站统一代号</span><strong data-player-name>生成中…</strong></div>
        <div class="start-actions">
          <button id="start-button" type="button">开始游戏 <span>→</span></button>
          <a class="secondary-calendar-link" href="#calendar">查看本月全部 ${monthDayCount} 款</a>
        </div>
      </div>

      <div class="result-panel" id="result-panel" hidden>
        <p>本轮得分</p>
        <strong id="final-score">0</strong>
        <span id="result-copy">再试一次，找到轨道的节奏。</span>
        <div class="start-actions">
          <button id="restart-button" type="button">再来一局</button>
          <button id="result-ranking-button" class="secondary-ranking-button" type="button">查看本关排行</button>
          <a class="secondary-calendar-link" href="#calendar">浏览其他 ${publishedGameCount - 1} 款已发布游戏</a>
        </div>
      </div>

      <div class="scroll-cue" aria-hidden="true"><span></span>${monthDayCount} 天游戏目录</div>
    </section>

    <section class="manifesto" aria-label="系列介绍">
      <div class="section-label">PLAY / ${monthDayCount}</div>
      <div class="manifesto-copy">
        <p>这个月，${monthDayCount} 个小世界。</p>
        <h2>每天只做一件好玩的事。</h2>
        <p>每款游戏都能在一分钟内上手，也能在分享出去之前多玩一局。这里记录从灵感、建模到发布的全部过程。</p>
      </div>
      <div class="series-stats">
        <div><strong>${monthDayCount}</strong><span>款原创游戏</span></div>
        <div><strong>01</strong><span>每天一个链接</span></div>
        <div><strong>60s</strong><span>单局轻体验</span></div>
      </div>
    </section>

    <section class="global-ranking-section" id="ranking" aria-labelledby="global-ranking-title">
      <div class="global-ranking-heading">
        <div>
          <p class="eyebrow">MOST PLAYED · LIVE</p>
          <h2 id="global-ranking-title">全站游玩次数榜</h2>
          <p>同一代号在全部游戏中的开局次数会累计到这里。</p>
        </div>
        <div class="my-global-ranking">
          <span>你的全站代号</span>
          <strong data-player-name>生成中…</strong>
          <div><span>游玩 <b id="my-total-plays">0</b> 次</span><span>排名 <b id="my-global-rank">--</b></span></div>
        </div>
      </div>
      <ol class="ranking-list global-ranking-list" id="global-ranking-list"></ol>
      <p class="ranking-status" data-ranking-status>正在连接排行服务…</p>
    </section>

    <section class="calendar-section" id="calendar">
      <div class="calendar-heading">
        <div>
          <p class="eyebrow">THE FULL COLLECTION</p>
          <h2>${monthDayCount} 天游戏日历</h2>
        </div>
        <div class="calendar-meta">
          <label for="month-picker">系列月份</label>
          <input id="month-picker" type="month" value="${monthKey}" />
          <p>每天 20:00 解锁新游戏<br><span>收藏页面，明天继续。</span></p>
        </div>
      </div>
      <div class="filter-row" aria-label="游戏分类">
        <button class="active" type="button" data-filter="all">全部 ${monthDayCount}</button>
        <button type="button" data-filter="week">第一周</button>
        <button type="button" data-filter="today">已发布 ${publishedGameCount}</button>
      </div>
      <div class="game-grid">${gameCards}</div>
    </section>

    <footer>
      <div class="brand"><span class="brand-mark">1×${monthDayCount}</span><span>一日一游</span></div>
      <p>每天一个 3D 小游戏。<br>下一局，明晚见。</p>
      <a href="#play">回到顶部 ↑</a>
    </footer>
  </main>
`;

const filterButtons = document.querySelectorAll('[data-filter]');
const cards = document.querySelectorAll('.game-card');

filterButtons.forEach((button) => {
  button.addEventListener('click', () => {
    filterButtons.forEach((item) => item.classList.remove('active'));
    button.classList.add('active');
    const filter = button.dataset.filter;
    cards.forEach((card, index) => {
      card.hidden = filter === 'today' ? index >= publishedGameCount : filter === 'week' ? index > 6 : false;
    });
  });
});

document.querySelector('#month-picker').addEventListener('change', (event) => {
  if (!event.target.value) return;
  const url = new URL(window.location.href);
  url.searchParams.set('month', event.target.value);
  url.hash = 'calendar';
  window.location.assign(url);
});

const rulesPanel = document.querySelector('#rules-panel');
const leaderboardPanel = document.querySelector('#leaderboard-panel');
window.play31Paused = false;
const setOverlay = (panel = null) => {
  rulesPanel.hidden = panel !== rulesPanel;
  leaderboardPanel.hidden = panel !== leaderboardPanel;
  const paused = Boolean(panel);
  window.play31Paused = paused;
  window.dispatchEvent(new CustomEvent('play31:pause', { detail: paused }));
};
document.querySelector('#rules-trigger').addEventListener('click', () => setOverlay(rulesPanel));
document.querySelector('#rules-close').addEventListener('click', () => setOverlay());
document.querySelector('#rules-ready').addEventListener('click', () => setOverlay());

const leaderboard = createLeaderboard({
  day: selectedDay,
  elements: {
    playerNames: document.querySelectorAll('[data-player-name]'),
    statuses: document.querySelectorAll('[data-ranking-status]'),
    globalList: document.querySelector('#global-ranking-list'),
    gameList: document.querySelector('#game-ranking-list'),
    myTotalPlays: document.querySelector('#my-total-plays'),
    myGlobalRank: document.querySelector('#my-global-rank'),
    myBestScore: document.querySelector('#my-best-score'),
    myGameRank: document.querySelector('#my-game-rank')
  }
});
const openLeaderboard = () => {
  setOverlay(leaderboardPanel);
  leaderboard.refresh();
};
document.querySelector('#leaderboard-trigger').addEventListener('click', openLeaderboard);
document.querySelector('#result-ranking-button').addEventListener('click', openLeaderboard);
document.querySelector('#leaderboard-close').addEventListener('click', () => setOverlay());

const gestureHint = document.querySelector('#gesture-hint');
if (canvasPrimary) {
  document.querySelector('#start-button').addEventListener('click', () => {
    gestureHint.hidden = false;
    requestAnimationFrame(() => gestureHint.classList.add('show'));
    window.setTimeout(() => gestureHint.classList.remove('show'), 4200);
  });
  document.querySelector('#game-canvas').addEventListener('pointerdown', () => {
    gestureHint.classList.remove('show');
  });
}

const gameUi = {
    canvas: document.querySelector('#game-canvas'),
    startButton: document.querySelector('#start-button'),
    launchButton: document.querySelector('#launch-button'),
    restartButton: document.querySelector('#restart-button'),
    startScreen: document.querySelector('#start-screen'),
    resultPanel: document.querySelector('#result-panel'),
    scoreElement: document.querySelector('#score'),
    goalElement: document.querySelector('#goal'),
    livesElement: document.querySelector('#lives'),
    powerFill: document.querySelector('#power-fill'),
    finalScore: document.querySelector('#final-score'),
    resultCopy: document.querySelector('#result-copy'),
    toast: document.querySelector('#game-toast'),
    gestureHint,
    onRoundStart: () => {
      document.querySelector('.game-hero').classList.add('is-playing');
      leaderboard.startRound();
    },
    onRoundEnd: (score) => {
      document.querySelector('.game-hero').classList.remove('is-playing');
      leaderboard.endRound(score);
    }
};

gameUi.startButton.disabled = true;
gameUi.startButton.setAttribute('aria-busy', 'true');
const markGameReady = () => {
  gameUi.startButton.disabled = false;
  gameUi.startButton.removeAttribute('aria-busy');
};

if (selectedDay === 1) {
  import('./orbitGame.js')
    .then(({ createOrbitGame }) => createOrbitGame(gameUi))
    .then(markGameReady);
} else {
  import('./dailyGames.js')
    .then(({ createDailyGame }) => createDailyGame(selectedDay, gameUi))
    .then(markGameReady);
}
