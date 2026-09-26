#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Собирает cloudflare-worker.js из src/worker-template.js, src/admin.html и src/admin.js.

Запуск: python3 build-worker.py
Результат вставляется целиком в Cloudflare Dashboard → Workers → pmt-visitor-log → Edit code.
"""
import json
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent
SRC = ROOT / "src"


def escape(value: str) -> str:
    return json.dumps(value, ensure_ascii=False)[1:-1]


def main() -> None:
    template = (SRC / "worker-template.js").read_text(encoding="utf-8")
    admin_html = (SRC / "admin.html").read_text(encoding="utf-8")
    admin_js = (SRC / "admin.js").read_text(encoding="utf-8")
    for marker, value in (
        ("__ADMIN_HTML__", admin_html),
        ("__ADMIN_JS__", admin_js),
    ):
        if marker not in template:
            raise SystemExit(f"marker {marker} not found in template")
        template = template.replace(marker, escape(value))
    if "__" in template.replace("__proto__", ""):
        for leftover in ("__ADMIN_HTML__", "__ADMIN_JS__"):
            if leftover in template:
                raise SystemExit(f"unresolved marker {leftover}")
    (ROOT / "cloudflare-worker.js").write_text(template, encoding="utf-8")
    print(f"cloudflare-worker.js: {len(template)} bytes")


if __name__ == "__main__":
    main()
