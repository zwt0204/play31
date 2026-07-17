from __future__ import annotations

import hashlib
import os
import random
import re
import secrets
import sqlite3
import threading
import time
from pathlib import Path

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field


router = APIRouter(prefix="/api/play31", tags=["play31"])

DB_PATH = Path(os.getenv("PLAY31_LEADERBOARD_DB", "/root/game/data/play31_leaderboard.sqlite3"))
TOKEN_RE = re.compile(r"^[A-Za-z0-9_-]{32,128}$")
DB_LOCK = threading.RLock()

ADJECTIVES = (
    "闪光", "月面", "迷你", "漂浮", "霓虹", "勇敢", "安静", "高速", "软糖", "弹跳",
    "幸运", "透明", "星际", "微光", "旋转", "云端", "像素", "午夜", "清醒", "好奇",
)
NOUNS = (
    "水獭", "海豹", "信鸽", "狐狸", "鲸鱼", "浣熊", "企鹅", "松鼠", "飞船", "陀螺",
    "火箭", "行星", "灯塔", "纸鸢", "齿轮", "蘑菇", "弹簧", "海星", "月兔", "蜂鸟",
)


class SessionRequest(BaseModel):
    token: str | None = Field(default=None, max_length=128)


class PlayRequest(BaseModel):
    token: str = Field(min_length=32, max_length=128)
    day: int = Field(ge=1, le=31)


class ScoreRequest(BaseModel):
    token: str = Field(min_length=32, max_length=128)
    session_id: str = Field(min_length=24, max_length=128)
    day: int = Field(ge=1, le=31)
    score: int = Field(ge=0, le=100_000)


def _connect() -> sqlite3.Connection:
    connection = sqlite3.connect(DB_PATH, timeout=5)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    connection.execute("PRAGMA busy_timeout = 5000")
    return connection


def _init_db() -> None:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    with DB_LOCK, _connect() as connection:
        connection.execute("PRAGMA journal_mode = WAL")
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS players (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                token_hash TEXT NOT NULL UNIQUE,
                display_name TEXT NOT NULL UNIQUE,
                play_count INTEGER NOT NULL DEFAULT 0,
                created_at REAL NOT NULL,
                last_seen REAL NOT NULL
            );

            CREATE TABLE IF NOT EXISTS player_games (
                player_id INTEGER NOT NULL,
                day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 31),
                plays INTEGER NOT NULL DEFAULT 0,
                best_score INTEGER NOT NULL DEFAULT 0,
                last_play_at REAL,
                updated_at REAL NOT NULL,
                PRIMARY KEY (player_id, day),
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS game_sessions (
                session_id TEXT PRIMARY KEY,
                player_id INTEGER NOT NULL,
                day INTEGER NOT NULL CHECK(day BETWEEN 1 AND 31),
                started_at REAL NOT NULL,
                submitted_at REAL,
                score INTEGER,
                FOREIGN KEY (player_id) REFERENCES players(id) ON DELETE CASCADE
            );

            CREATE INDEX IF NOT EXISTS idx_players_plays
                ON players(play_count DESC, created_at ASC);
            CREATE INDEX IF NOT EXISTS idx_games_day_score
                ON player_games(day, best_score DESC, updated_at ASC);
            CREATE INDEX IF NOT EXISTS idx_sessions_player_day
                ON game_sessions(player_id, day, started_at DESC);
            """
        )
        connection.execute("DELETE FROM game_sessions WHERE started_at < ?", (time.time() - 7 * 86400,))


def _token_hash(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def _valid_token(token: str | None) -> bool:
    return bool(token and TOKEN_RE.fullmatch(token))


def _player_for_token(connection: sqlite3.Connection, token: str) -> sqlite3.Row:
    if not _valid_token(token):
        raise HTTPException(status_code=401, detail="玩家身份无效，请刷新页面重试")
    player = connection.execute(
        "SELECT id, display_name, play_count FROM players WHERE token_hash = ?",
        (_token_hash(token),),
    ).fetchone()
    if player is None:
        raise HTTPException(status_code=401, detail="玩家身份已失效，请刷新页面重试")
    return player


def _new_name(connection: sqlite3.Connection) -> str:
    for _ in range(80):
        name = f"{random.choice(ADJECTIVES)}{random.choice(NOUNS)}{secrets.randbelow(90) + 10}"
        exists = connection.execute("SELECT 1 FROM players WHERE display_name = ?", (name,)).fetchone()
        if exists is None:
            return name
    return f"游戏玩家{secrets.token_hex(4).upper()}"


def _leaderboards(connection: sqlite3.Connection, day: int, player_id: int | None = None) -> dict:
    global_rows = connection.execute(
        """
        SELECT id, display_name, play_count
        FROM players
        WHERE play_count > 0
        ORDER BY play_count DESC, created_at ASC
        LIMIT 10
        """
    ).fetchall()
    game_rows = connection.execute(
        """
        SELECT p.id, p.display_name, g.best_score, g.plays
        FROM player_games AS g
        JOIN players AS p ON p.id = g.player_id
        WHERE g.day = ? AND g.best_score > 0
        ORDER BY g.best_score DESC, g.updated_at ASC
        LIMIT 10
        """,
        (day,),
    ).fetchall()

    global_rank = 0
    previous_plays = None
    global_items = []
    for index, row in enumerate(global_rows):
        if row["play_count"] != previous_plays:
            global_rank = index + 1
            previous_plays = row["play_count"]
        global_items.append(
            {
                "rank": global_rank,
                "name": row["display_name"],
                "plays": row["play_count"],
                "is_me": row["id"] == player_id,
            }
        )

    game_rank = 0
    previous_score = None
    game_items = []
    for index, row in enumerate(game_rows):
        if row["best_score"] != previous_score:
            game_rank = index + 1
            previous_score = row["best_score"]
        game_items.append(
            {
                "rank": game_rank,
                "name": row["display_name"],
                "score": row["best_score"],
                "plays": row["plays"],
                "is_me": row["id"] == player_id,
            }
        )

    result = {
        "day": day,
        "global": global_items,
        "game": game_items,
        "me": None,
    }

    if player_id is not None:
        player = connection.execute(
            "SELECT display_name, play_count FROM players WHERE id = ?", (player_id,)
        ).fetchone()
        game = connection.execute(
            "SELECT best_score, plays FROM player_games WHERE player_id = ? AND day = ?",
            (player_id, day),
        ).fetchone()
        global_rank = connection.execute(
            """
            SELECT 1 + COUNT(*)
            FROM players
            WHERE play_count > (SELECT play_count FROM players WHERE id = ?)
            """,
            (player_id,),
        ).fetchone()[0]
        best_score = game["best_score"] if game else 0
        game_rank = None
        if best_score > 0:
            game_rank = connection.execute(
                """
                SELECT 1 + COUNT(*)
                FROM player_games
                WHERE day = ? AND best_score > ?
                """,
                (day, best_score),
            ).fetchone()[0]
        result["me"] = {
            "name": player["display_name"],
            "plays": player["play_count"],
            "global_rank": global_rank if player["play_count"] > 0 else None,
            "best_score": best_score,
            "game_plays": game["plays"] if game else 0,
            "game_rank": game_rank,
        }
    return result


@router.get("/health")
def leaderboard_health() -> dict:
    with DB_LOCK, _connect() as connection:
        connection.execute("SELECT 1").fetchone()
    return {"ok": True}


@router.post("/session")
def create_or_restore_session(payload: SessionRequest) -> dict:
    now = time.time()
    with DB_LOCK, _connect() as connection:
        if _valid_token(payload.token):
            player = connection.execute(
                "SELECT id, display_name, play_count FROM players WHERE token_hash = ?",
                (_token_hash(payload.token or ""),),
            ).fetchone()
            if player is not None:
                connection.execute("UPDATE players SET last_seen = ? WHERE id = ?", (now, player["id"]))
                return {
                    "token": payload.token,
                    "name": player["display_name"],
                    "plays": player["play_count"],
                    "is_new": False,
                }

        token = secrets.token_urlsafe(36)
        name = _new_name(connection)
        connection.execute(
            """
            INSERT INTO players(token_hash, display_name, play_count, created_at, last_seen)
            VALUES (?, ?, 0, ?, ?)
            """,
            (_token_hash(token), name, now, now),
        )
        return {"token": token, "name": name, "plays": 0, "is_new": True}


@router.post("/plays")
def start_play(payload: PlayRequest) -> dict:
    now = time.time()
    with DB_LOCK, _connect() as connection:
        player = _player_for_token(connection, payload.token)
        game = connection.execute(
            "SELECT last_play_at FROM player_games WHERE player_id = ? AND day = ?",
            (player["id"], payload.day),
        ).fetchone()

        if game and game["last_play_at"] and now - game["last_play_at"] < 2:
            recent = connection.execute(
                """
                SELECT session_id FROM game_sessions
                WHERE player_id = ? AND day = ? AND submitted_at IS NULL
                ORDER BY started_at DESC LIMIT 1
                """,
                (player["id"], payload.day),
            ).fetchone()
            if recent:
                return {"session_id": recent["session_id"], "counted": False}
            session_id = secrets.token_urlsafe(30)
            connection.execute(
                "INSERT INTO game_sessions(session_id, player_id, day, started_at) VALUES (?, ?, ?, ?)",
                (session_id, player["id"], payload.day, now),
            )
            return {"session_id": session_id, "counted": False}

        session_id = secrets.token_urlsafe(30)
        connection.execute(
            "INSERT INTO game_sessions(session_id, player_id, day, started_at) VALUES (?, ?, ?, ?)",
            (session_id, player["id"], payload.day, now),
        )
        connection.execute(
            "UPDATE players SET play_count = play_count + 1, last_seen = ? WHERE id = ?",
            (now, player["id"]),
        )
        connection.execute(
            """
            INSERT INTO player_games(player_id, day, plays, best_score, last_play_at, updated_at)
            VALUES (?, ?, 1, 0, ?, ?)
            ON CONFLICT(player_id, day) DO UPDATE SET
                plays = plays + 1,
                last_play_at = excluded.last_play_at,
                updated_at = excluded.updated_at
            """,
            (player["id"], payload.day, now, now),
        )
        return {"session_id": session_id, "counted": True}


@router.post("/scores")
def submit_score(payload: ScoreRequest) -> dict:
    now = time.time()
    with DB_LOCK, _connect() as connection:
        player = _player_for_token(connection, payload.token)
        session = connection.execute(
            """
            SELECT player_id, day, started_at, submitted_at
            FROM game_sessions WHERE session_id = ?
            """,
            (payload.session_id,),
        ).fetchone()
        if session is None or session["player_id"] != player["id"] or session["day"] != payload.day:
            raise HTTPException(status_code=400, detail="本局记录无效")
        if session["submitted_at"] is not None:
            raise HTTPException(status_code=409, detail="本局成绩已经提交")
        if now - session["started_at"] < 0.5:
            raise HTTPException(status_code=400, detail="本局时间过短")
        if now - session["started_at"] > 1800:
            raise HTTPException(status_code=400, detail="本局记录已过期")

        connection.execute(
            "UPDATE game_sessions SET submitted_at = ?, score = ? WHERE session_id = ?",
            (now, payload.score, payload.session_id),
        )
        connection.execute(
            """
            UPDATE player_games
            SET best_score = MAX(best_score, ?),
                updated_at = CASE WHEN ? > best_score THEN ? ELSE updated_at END
            WHERE player_id = ? AND day = ?
            """,
            (payload.score, payload.score, now, player["id"], payload.day),
        )
        return _leaderboards(connection, payload.day, player["id"])


@router.get("/leaderboards")
def get_leaderboards(day: int = 1, x_play31_token: str | None = Header(default=None)) -> dict:
    if day < 1 or day > 31:
        raise HTTPException(status_code=422, detail="day must be between 1 and 31")
    with DB_LOCK, _connect() as connection:
        player_id = None
        if _valid_token(x_play31_token):
            player = connection.execute(
                "SELECT id FROM players WHERE token_hash = ?", (_token_hash(x_play31_token or ""),)
            ).fetchone()
            if player:
                player_id = player["id"]
        return _leaderboards(connection, day, player_id)


_init_db()
