import tempfile
import time
import unittest
from pathlib import Path

from server import leaderboard


class LeaderboardIdentityTests(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        leaderboard.DB_PATH = Path(self.temp_dir.name) / "leaderboard.sqlite3"
        leaderboard._init_db()

    def tearDown(self):
        self.temp_dir.cleanup()

    def make_session_old_enough(self, session_id):
        with leaderboard.DB_LOCK, leaderboard._connect() as connection:
            connection.execute(
                "UPDATE game_sessions SET started_at = ? WHERE session_id = ?",
                (time.time() - 1, session_id),
            )

    def move_last_play_outside_debounce(self, token, day):
        with leaderboard.DB_LOCK, leaderboard._connect() as connection:
            player = leaderboard._player_for_token(connection, token)
            connection.execute(
                "UPDATE player_games SET last_play_at = ? WHERE player_id = ? AND day = ?",
                (time.time() - 3, player["id"], day),
            )

    def play_and_score(self, token, day, score):
        session = leaderboard.start_play(leaderboard.PlayRequest(token=token, day=day))
        self.make_session_old_enough(session["session_id"])
        return leaderboard.submit_score(
            leaderboard.ScoreRequest(
                token=token,
                session_id=session["session_id"],
                day=day,
                score=score,
            )
        )

    def test_one_identity_accumulates_plays_but_keeps_scores_per_game(self):
        identity = leaderboard.create_or_restore_session(leaderboard.SessionRequest())
        restored = leaderboard.create_or_restore_session(
            leaderboard.SessionRequest(token=identity["token"])
        )
        self.assertEqual(restored["name"], identity["name"])
        self.assertFalse(restored["is_new"])

        self.play_and_score(identity["token"], day=1, score=120)
        self.play_and_score(identity["token"], day=2, score=70)
        self.move_last_play_outside_debounce(identity["token"], day=1)
        self.play_and_score(identity["token"], day=1, score=150)

        day_one = leaderboard.get_leaderboards(day=1, x_play31_token=identity["token"])
        day_two = leaderboard.get_leaderboards(day=2, x_play31_token=identity["token"])

        self.assertEqual(day_one["me"]["name"], identity["name"])
        self.assertEqual(day_one["me"]["plays"], 3)
        self.assertEqual(day_one["global"][0]["plays"], 3)
        self.assertEqual(len(day_one["game"]), 1)
        self.assertEqual(day_one["game"][0]["score"], 150)
        self.assertEqual(day_one["game"][0]["plays"], 2)
        self.assertEqual(day_two["game"][0]["score"], 70)
        self.assertEqual(day_two["game"][0]["plays"], 1)


if __name__ == "__main__":
    unittest.main()
