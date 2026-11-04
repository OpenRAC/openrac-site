#!/usr/bin/env python3
"""Rewrites data/index.json from the files under data/."""
from common import build_index

if __name__ == "__main__":
    print("index changed" if build_index() else "index unchanged")
