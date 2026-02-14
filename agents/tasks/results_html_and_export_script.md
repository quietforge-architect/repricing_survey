Task: Results HTML + Updated Export Script

Context: Build a simple `results.html` for viewing aggregated results and update `export_safe_data.py` to power it.

10-point prompt:
1) Define safe aggregates (counts, averages) that exclude any PII.
2) Extend `export_safe_data.py` to emit JSON summary files.
3) Include timestamps and version tags in the exported JSON.
4) Create a lightweight `results.html` that loads JSON and renders charts/tables.
5) Use vanilla JS or a tiny chart library to avoid heavy deps.
6) Provide an offline mode (file://) and hosted mode (static server).
7) Document update cadence and where exported files are stored.
8) Add a make/script target to regenerate results on demand.
9) Include a sample JSON and screenshot in docs for reference.
10) Validate large datasets render within reasonable time in the browser.

