import os
import tempfile

os.environ.setdefault("GITIFY_DB_PATH", os.path.join(tempfile.gettempdir(), "gitify-test.db"))
os.environ.setdefault("GITIFY_CORS_ORIGINS", "http://localhost:5173")

import database
import main

database.init_db()

assert main.health_check()["status"] == "healthy"
assert database.get_user_progress("student") == []

print("backend smoke test passed")
