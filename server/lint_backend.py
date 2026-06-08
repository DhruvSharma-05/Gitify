from pathlib import Path

failures = []

for path in Path("server").glob("*.py"):
    if path.name in {"lint_backend.py", "test_smoke.py"}:
        continue
    text = path.read_text(encoding="utf-8")
    if "shell=True" in text:
        failures.append(f"{path}: shell=True is not allowed")
    if "http://localhost:8000" in text or "127.0.0.1:8000" in text:
        failures.append(f"{path}: hardcoded backend URL is not allowed")

if failures:
    raise SystemExit("\n".join(failures))

print("backend lint passed")
