#!/bin/bash
# LawFlow Auto Commit & Push Script

echo "Starting automated git push loop for LawFlow..."

while true; do
    git add .
    TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
    git commit -m "chore(stream): incremental judicial state update - $TIMESTAMP" 2>/dev/null || true
    git push origin main 2>/dev/null || true
    sleep 5
done
