#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="/root/game"
LOG_FILE="$PROJECT_DIR/data/day19-codex.log"
STATUS_FILE="$PROJECT_DIR/data/day19-codex.status"
TARGET="2026-07-19 19:00:00"
TARGET_EPOCH="$(TZ=Asia/Shanghai date -d "$TARGET" +%s)"
export PATH="/root/.nvm/versions/node/v20.20.2/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

mkdir -p "$PROJECT_DIR/data"
printf 'scheduled_for=%s Asia/Shanghai\n' "$TARGET" > "$STATUS_FILE"

while :; do
  now="$(date +%s)"
  remaining=$((TARGET_EPOCH - now))
  if (( remaining <= 0 )); then
    break
  fi
  if (( remaining < 60 )); then
    sleep "$remaining"
  else
    sleep 60
  fi
done

cd "$PROJECT_DIR"
printf 'started_at=%s\n' "$(date -Is)" >> "$STATUS_FILE"

PROMPT=$(cat <<'EOF'
在当前 /root/game 项目中实现并发布 Day 19「泡泡星球」。这是一个已经上线 1-18 天的 Vite + Three.js 项目。

要求：
- 先阅读现有 main.js、dailyGames.js、style.css、leaderboard.js 和 README，沿用现有架构与排行榜接口。
- 把 Day 19 做成真正可玩的 3D 小游戏，而不是静态展示：泡泡在带有气流和障碍的微型星球轨道中移动，玩家通过按住/松开控制泡泡膨胀与收缩，躲避尖刺并穿过发光环，连续成功提高节奏和分数。玩法必须有明确目标、生命、成功/失败反馈。
- 同时支持手机和电脑：手机点击/按住底部按钮，电脑鼠标按住或空格；开始页、玩法说明、HUD、操作提示必须直观且不遮挡移动端主场景。
- 完成 Day 19 的标题、简介、操作、规则、计分标签、按钮图标、可玩日历链接和已发布数量文案；排行榜沿用全站统一匿名用户身份。
- 使用 frontend-design 的审美约束：3D 场景要有清楚的主目标、克制但有辨识度的材质和灯光，避免用大段文字覆盖游戏区。
- 运行 npm run build、node --check、git diff --check，并使用 Playwright 或同等方式在手机和桌面尺寸实际开始一局，确认无控制台错误、无横向溢出。
- 更新 README 或 SERIES_PLAN 中的已实现天数。
- 提交信息使用 `feat: add Day 19 bubble planet game`，然后执行 `git push origin main`。
- 不要提交 data/ 下的 SQLite 用户数据库，不要修改或清空现有排行榜数据。
- 最后在 /root/game/data/day19-codex.status 追加完成时间、提交号和验证结果，并在最终回复中简要说明改动。
EOF
)

/root/.nvm/versions/node/v20.20.2/bin/codex exec --dangerously-bypass-approvals-and-sandbox -C "$PROJECT_DIR" "$PROMPT" >> "$LOG_FILE" 2>&1
printf 'finished_at=%s\ncommit=%s\n' "$(date -Is)" "$(git -C "$PROJECT_DIR" rev-parse --short HEAD)" >> "$STATUS_FILE"
