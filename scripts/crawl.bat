@echo off
cd /d "c:\Users\mysuni_newsletter_pjt2"
"C:\Program Files\nodejs\node.exe" scripts/run-crawl.js >> logs\crawl.log 2>&1
