#!/usr/bin/env python3
"""
DB Manager utility for common operations.

Commands:
  init            Initialize db/survey.sqlite with v2 schema
  migrate_v1      Migrate legacy submissions to v2 tables (idempotent)
  backup          Copy db/survey.sqlite to db/backup/survey-<timestamp>.sqlite
  export_safe     Run export-safe-data (CSV path) and DB safe export
  export_typed    Run typed exporter using schema/survey_schema.json
  validate        Run export/schema validations (JS validators)
"""
import argparse
import os
import shutil
import subprocess
import sys
from datetime import datetime

ROOT = os.path.dirname(os.path.dirname(__file__))
DB_DIR = os.path.join(ROOT, 'db')
DB_PATH = os.path.join(DB_DIR, 'survey.sqlite')

def run(cmd, cwd=None):
    print('> ' + ' '.join(cmd))
    r = subprocess.run(cmd, cwd=cwd)
    if r.returncode != 0:
        sys.exit(r.returncode)

def cmd_init(args):
    run([sys.executable, os.path.join(ROOT, 'tools', 'init_survey_db.py')])

def cmd_migrate_v1(args):
    env = os.environ.copy()
    env['SURVEY_DB_PATH'] = DB_PATH
    run([sys.executable, os.path.join(ROOT, 'agents', 'logic', 'sqlite-service', 'migrate_v1_to_v2.py')])

def cmd_backup(args):
    if not os.path.exists(DB_PATH):
        print('DB not found at', DB_PATH)
        sys.exit(1)
    dst_dir = os.path.join(DB_DIR, 'backup')
    os.makedirs(dst_dir, exist_ok=True)
    ts = datetime.now().strftime('%Y%m%d-%H%M%S')
    dst = os.path.join(dst_dir, f'survey-{ts}.sqlite')
    shutil.copy2(DB_PATH, dst)
    print('Backup written to', dst)

def cmd_export_safe(args):
    # Prefer DB safe export
    run([sys.executable, os.path.join(ROOT, 'tools', 'export_safe_from_db.py')])

def cmd_export_typed(args):
    run([sys.executable, os.path.join(ROOT, 'tools', 'export_typed_from_db.py')])

def cmd_validate(args):
    # Validate exports
    run(['node', os.path.join(ROOT, 'tools', 'validate-exports.js')])
    # Validate schema/specs
    run(['node', os.path.join(ROOT, 'tools', 'spec_validate.js')])

def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest='cmd', required=True)
    sub.add_parser('init')
    sub.add_parser('migrate_v1')
    sub.add_parser('backup')
    sub.add_parser('export_safe')
    sub.add_parser('export_typed')
    sub.add_parser('validate')
    args = ap.parse_args()
    if args.cmd == 'init': cmd_init(args)
    elif args.cmd == 'migrate_v1': cmd_migrate_v1(args)
    elif args.cmd == 'backup': cmd_backup(args)
    elif args.cmd == 'export_safe': cmd_export_safe(args)
    elif args.cmd == 'export_typed': cmd_export_typed(args)
    elif args.cmd == 'validate': cmd_validate(args)

if __name__ == '__main__':
    main()

