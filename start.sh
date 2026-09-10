#!/usr/bin/env bash
set -e
cd backend
exec gunicorn app:app --bind 0.0.0.0:${PORT:-5000}
