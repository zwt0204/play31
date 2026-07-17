const TOKEN_KEY = 'play31-player-token';
const API_ROOT = '/api/play31';

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    cache: 'no-store',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const error = new Error(payload.detail || `HTTP ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return response.json();
}

function rankingRow(item, metric) {
  const row = document.createElement('li');
  row.className = `ranking-row${item.is_me ? ' is-me' : ''}`;

  const rank = document.createElement('span');
  rank.className = 'ranking-position';
  rank.textContent = String(item.rank).padStart(2, '0');

  const player = document.createElement('div');
  const name = document.createElement('strong');
  name.textContent = item.name;
  const detail = document.createElement('small');
  detail.textContent = item.is_me ? '这是你' : metric === 'score' ? `${item.plays} 局` : '匿名玩家';
  player.append(name, detail);

  const value = document.createElement('b');
  value.textContent = metric === 'score' ? String(item.score) : `${item.plays} 次`;
  row.append(rank, player, value);
  return row;
}

function renderList(element, items, metric, emptyText) {
  if (!element) return;
  if (!items?.length) {
    const empty = document.createElement('li');
    empty.className = 'ranking-empty';
    empty.textContent = emptyText;
    element.replaceChildren(empty);
    return;
  }
  element.replaceChildren(...items.map((item) => rankingRow(item, metric)));
}

export function createLeaderboard({ day, elements }) {
  let identityPromise = null;
  let identity = null;
  let activePlay = null;

  function setStatus(message, failed = false) {
    elements.statuses?.forEach((element) => {
      element.textContent = message;
      element.classList.toggle('failed', failed);
    });
  }

  function renderIdentity(player) {
    elements.playerNames?.forEach((element) => { element.textContent = player.name; });
  }

  function render(data) {
    renderList(elements.globalList, data.global, 'plays', '还没有游玩记录，快来拿下第一名。');
    renderList(elements.gameList, data.game, 'score', '这一关还没有成绩，你可以成为第一名。');
    if (!data.me) return;
    elements.myTotalPlays.textContent = String(data.me.plays);
    elements.myGlobalRank.textContent = data.me.global_rank ? `#${data.me.global_rank}` : '--';
    elements.myBestScore.textContent = String(data.me.best_score);
    elements.myGameRank.textContent = data.me.game_rank ? `#${data.me.game_rank}` : '--';
  }

  async function ensureIdentity(forceNew = false) {
    if (identity && !forceNew) return identity;
    if (identityPromise && !forceNew) return identityPromise;
    identityPromise = (async () => {
      const storedToken = forceNew ? null : localStorage.getItem(TOKEN_KEY);
      const player = await request('/session', {
        method: 'POST',
        body: JSON.stringify({ token: storedToken })
      });
      localStorage.setItem(TOKEN_KEY, player.token);
      identity = player;
      renderIdentity(player);
      setStatus(player.is_new ? '已生成你的随机玩家代号' : '排行数据已更新');
      return player;
    })().catch((error) => {
      identityPromise = null;
      setStatus('排行服务暂时离线，不影响本地游戏', true);
      throw error;
    });
    return identityPromise;
  }

  async function refresh() {
    try {
      const player = await ensureIdentity();
      const data = await request(`/leaderboards?day=${day}`, {
        headers: { 'X-Play31-Token': player.token }
      });
      render(data);
      return data;
    } catch {
      return null;
    }
  }

  function startRound() {
    const play = { startedAt: performance.now(), sessionPromise: null };
    activePlay = play;
    play.sessionPromise = (async () => {
      try {
        const player = await ensureIdentity();
        const session = await request('/plays', {
          method: 'POST',
          body: JSON.stringify({ token: player.token, day })
        });
        refresh();
        return session;
      } catch (error) {
        if (error.status === 401) {
          localStorage.removeItem(TOKEN_KEY);
          identity = null;
          identityPromise = null;
        }
        return null;
      }
    })();
  }

  async function endRound(score) {
    const play = activePlay;
    if (!play) return;
    activePlay = null;
    const remaining = 550 - (performance.now() - play.startedAt);
    if (remaining > 0) await wait(remaining);
    const session = await play.sessionPromise;
    if (!session) return;
    try {
      const player = await ensureIdentity();
      const data = await request('/scores', {
        method: 'POST',
        body: JSON.stringify({ token: player.token, session_id: session.session_id, day, score: Math.max(0, Math.round(score)) })
      });
      render(data);
      setStatus('本局成绩已进入排行榜');
    } catch (error) {
      setStatus(error.status === 409 ? '本局成绩已记录' : '成绩同步失败，本地最佳成绩仍会保留', true);
    }
  }

  ensureIdentity().then(refresh).catch(() => {});
  return { refresh, startRound, endRound };
}
