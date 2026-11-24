#!/bin/sh
# Cloudflare Pages build: copy only the public site into dist/ (tests, scripts and workflow files stay out).
set -e
rm -rf dist && mkdir -p dist
cp -r index.html 404.html privacy.html disclaimer.html engine.js sw.js robots.txt sitemap.xml _headers assets guides rules dist/
echo "Built dist/ with $(find dist -type f | wc -l) files"
