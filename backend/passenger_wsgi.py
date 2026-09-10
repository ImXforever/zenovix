"""cPanel Passenger entry point (Setup Python App → Application startup file).

In cPanel set:
  Application root:        zenovix_chat_api   (or your folder name)
  Application URL:         /  or  /chat  (a path or subdomain)
  Application startup file: passenger_wsgi.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app import app as application  # noqa: E402
