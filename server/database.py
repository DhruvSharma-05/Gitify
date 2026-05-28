import sqlite3
import os
import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), "gitify.db")

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE NOT NULL,
        created_at TEXT NOT NULL
    )
    """)
    
    # Create progress table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS progress (
        user_id INTEGER,
        lesson_id INTEGER,
        completed BOOLEAN NOT NULL CHECK (completed IN (0, 1)),
        score INTEGER NOT NULL,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, lesson_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    # Create exercise_attempts table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS exercise_attempts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        lesson_id INTEGER,
        status TEXT NOT NULL,
        commands_run TEXT,
        timestamp TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    # Create checkpoints table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS checkpoints (
        user_id INTEGER,
        lesson_id INTEGER,
        subtask_id TEXT,
        completed BOOLEAN NOT NULL CHECK (completed IN (0, 1)),
        updated_at TEXT NOT NULL,
        PRIMARY KEY (user_id, lesson_id, subtask_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
    """)
    
    # Seed default user if not exists
    cursor.execute("SELECT id FROM users WHERE username = 'student'")
    if not cursor.fetchone():
        now = datetime.datetime.now().isoformat()
        cursor.execute("INSERT INTO users (username, created_at) VALUES (?, ?)", ("student", now))
        
    conn.commit()
    conn.close()

def get_user_progress(username="student"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get user id
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return []
        
    user_id = user["id"]
    cursor.execute("SELECT lesson_id, completed, score, updated_at FROM progress WHERE user_id = ?", (user_id,))
    rows = cursor.fetchall()
    
    conn.close()
    return [{"lesson_id": r["lesson_id"], "completed": bool(r["completed"]), "score": r["score"]} for r in rows]

def update_user_progress(lesson_id, completed, score, username="student"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get user id
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return False
        
    user_id = user["id"]
    now = datetime.datetime.now().isoformat()
    
    cursor.execute("""
    INSERT INTO progress (user_id, lesson_id, completed, score, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, lesson_id) DO UPDATE SET
        completed = excluded.completed,
        score = excluded.score,
        updated_at = excluded.updated_at
    """, (user_id, lesson_id, 1 if completed else 0, score, now))
    
    conn.commit()
    conn.close()
    return True

def log_exercise_attempt(lesson_id, status, commands_run="", username="student"):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return
        
    user_id = user["id"]
    now = datetime.datetime.now().isoformat()
    
    cursor.execute("""
    INSERT INTO exercise_attempts (user_id, lesson_id, status, commands_run, timestamp)
    VALUES (?, ?, ?, ?, ?)
    """, (user_id, lesson_id, status, commands_run, now))
    
    conn.commit()
    conn.close()

def get_user_checkpoints(lesson_id, username="student"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return {}
    user_id = user["id"]
    cursor.execute("SELECT subtask_id, completed FROM checkpoints WHERE user_id = ? AND lesson_id = ?", (user_id, lesson_id))
    rows = cursor.fetchall()
    conn.close()
    return {r["subtask_id"]: bool(r["completed"]) for r in rows}

def save_user_checkpoint(lesson_id, subtask_id, completed, username="student"):
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT id FROM users WHERE username = ?", (username,))
    user = cursor.fetchone()
    if not user:
        conn.close()
        return False
    user_id = user["id"]
    now = datetime.datetime.now().isoformat()
    cursor.execute("""
    INSERT INTO checkpoints (user_id, lesson_id, subtask_id, completed, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, lesson_id, subtask_id) DO UPDATE SET
        completed = excluded.completed,
        updated_at = excluded.updated_at
    """, (user_id, lesson_id, subtask_id, 1 if completed else 0, now))
    conn.commit()
    conn.close()
    return True

