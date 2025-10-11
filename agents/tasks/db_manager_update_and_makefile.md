Task: db_manager.py Update + Makefile Snippet

Context: Automate DB tasks (init, migrate, export) with a small manager and build script targets.

10-point prompt:
1) Implement `db_manager.py` with commands: init, migrate, backup, export.
2) Add argparse CLI with helpful `--help` output and examples.
3) Wire migrations to run `schema.sql` and versioned patches safely.
4) Provide a Makefile or cross-platform scripts for common tasks.
5) Add environment variable support for paths and modes.
6) Include logging to console and optional file.
7) Validate commands with a tiny test database fixture.
8) Document usage in README with copy-paste commands.
9) Keep dependencies minimal; prefer stdlib where possible.
10) Add a CI step to run `db_manager.py --help` and a smoke test.

