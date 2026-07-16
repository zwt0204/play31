import './style.css';

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
  1: { description: '规划多行星航线，借助引力弹弓完成太空订单。', instruction: '拖动画面调整方向，长按蓄力后松开发射。管理燃料与货物耐久，连续完成 5 笔轨道订单。', control: '拖动瞄准 · 按住蓄力' },
  2: { description: '在移动挡板间连续反弹，击中顶部货箱。', instruction: '观察弹板位置，点击释放小球。连续反弹次数越多，得分越高。', control: '点击释放弹球' },
  3: { description: '旋转镜面，让光束依次点亮三个节点。', instruction: '点击场景中的镜面改变方向，在步数耗尽前接通所有能量节点。', control: '点击镜面旋转' },
  4: { description: '抓准横向移动的瞬间，把方块稳稳叠高。', instruction: '点击放下移动中的方块。重叠越整齐，下一层保留的面积越大。', control: '点击放下方块' },
  5: { description: '驾驶一厘米飞船，从桌面障碍之间穿过去。', instruction: '在画面中左右拖动飞船，避开迎面而来的积木和文具。', control: '左右拖动飞船' },
  6: { description: '切换磁极，把能量球引导到出口。', instruction: '点击切换红蓝磁极。同性相斥、异性相吸，别让能量球碰到边界。', control: '点击切换磁极' },
  7: { description: '操控纸飞机穿过云层中的连续航门。', instruction: '在画面中拖动控制飞行方向，连续穿过航门获得连击分。', control: '拖动控制纸飞机' },
  8: { description: '转动灯光，让物体投下指定形状的影子。', instruction: '左右拖动灯光调整角度，当影子与目标轮廓重合时保持一秒。', control: '拖动调整灯光' },
  9: { description: '拖出方向和力度，一球击倒微型瓶阵。', instruction: '从保龄球向后拖动进行瞄准，松手后滚动。尽量一次击倒更多球瓶。', control: '拖动瞄准 · 松手投球' },
  10: { description: '在不断变形的霓虹隧道里保持航线。', instruction: '左右拖动飞行器穿过缺口。速度会逐渐提升，碰撞三次后结束。', control: '左右拖动穿越缺口' },
  11: { description: '击中核心方块，引发一次漂亮的连锁爆破。', instruction: '点击发射脉冲。相邻同色方块会连锁爆开，用更少次数清空目标。', control: '点击方块发射脉冲' },
  12: { description: '一键翻转重力，在上下平台之间奔跑。', instruction: '点击切换重力方向，让角色落在安全平台上并避开尖刺。', control: '点击翻转重力' },
  13: { description: '在低重力月面上，用最少杆数进洞。', instruction: '从月球向后拖动设置方向和力量，松手击球。注意月球重力更小。', control: '拖动瞄准 · 松手击球' },
  14: { description: '切换潜航器颜色，穿过对应颜色的水门。', instruction: '点击依次切换红、黄、青三种颜色，只能穿过同色水门。', control: '点击切换颜色' },
  15: { description: '借助风力，把快递送进漂浮的收件环。', instruction: '按住增强风力让包裹上升，松开后滑翔。连续穿环即可加分。', control: '按住送风 · 松开滑翔' },
  16: { description: '踩着弹簧屋顶，在微缩城市里向上攀登。', instruction: '点击触发下一次弹跳，落在屋顶中央可获得更高弹力。', control: '点击触发弹跳' }
};

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
const selectedDay = Number.isInteger(requestedDay) && requestedDay >= 1 && requestedDay <= 16 ? requestedDay : 1;
const selectedGame = games[selectedDay - 1];
const selectedDetails = playableDetails[selectedDay];
const selectedDayLabel = String(selectedDay).padStart(2, '0');
const meterLabels = {
  1: '发射力度', 2: '反弹时机', 3: '接线进度', 4: '落点窗口',
  5: '航行状态', 6: '磁极状态', 7: '航线状态', 8: '影子匹配',
  9: '投球力度', 10: '隧道速度', 11: '连锁能量', 12: '重力方向',
  13: '击球力度', 14: '当前颜色', 15: '风力高度', 16: '弹跳时机'
};
document.title = `Day ${selectedDayLabel} · ${selectedGame[0]} | 一日一游`;
document.querySelector('meta[name="description"]')?.setAttribute('content', selectedDetails.description);

const gameCards = monthlyGames.map((game, index) => {
  const day = String(index + 1).padStart(2, '0');
  const dayNumber = index + 1;
  const isPlayable = dayNumber <= 16;
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
        <a class="calendar-link" href="#calendar" aria-label="查看${monthLabel}全部${monthDayCount}款游戏">
          <span class="grid-icon" aria-hidden="true"><i></i><i></i><i></i><i></i></span>
          <span class="calendar-link-copy"><strong>全部 ${monthDayCount} 款</strong><small>${monthLabel}</small></span>
          <span class="calendar-arrow" aria-hidden="true">↓</span>
        </a>
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

      <div class="game-controls">
        <div class="power-wrap">
          <span>${meterLabels[selectedDay]}</span>
          <div class="power-track"><i id="power-fill"></i></div>
        </div>
        <button id="launch-button" class="launch-button" type="button">
          <span class="launch-icon">↑</span>
          <span>${selectedDetails.control}</span>
        </button>
      </div>

      <div class="start-screen" id="start-screen">
        <div class="start-index">${selectedDayLabel}</div>
        <p>MONTH ${String(seriesMonth).padStart(2, '0')} EXPERIMENT</p>
        <h2>${selectedGame[0]}</h2>
        <p class="start-copy">${selectedDetails.instruction}</p>
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
          <a class="secondary-calendar-link" href="#calendar">浏览其他 15 款已发布游戏</a>
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
        <button type="button" data-filter="today">已发布 16</button>
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
      card.hidden = filter === 'today' ? index > 15 : filter === 'week' ? index > 6 : false;
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
    toast: document.querySelector('#game-toast')
};

if (selectedDay === 1) {
  import('./orbitGame.js').then(({ createOrbitGame }) => createOrbitGame(gameUi));
} else {
  import('./dailyGames.js').then(({ createDailyGame }) => createDailyGame(selectedDay, gameUi));
}
