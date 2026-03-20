#!/bin/bash
# ============================================================
# start.sh — Startup script for DS-160 Worker
# Starts Xvfb virtual display so Chrome runs with HEADLESS=false
# (headless Chrome is detectable by anti-bot systems)
# ============================================================

# Start Xvfb virtual display (1920x1080, 24-bit color)
Xvfb :99 -screen 0 1920x1080x24 -nolisten tcp &
export DISPLAY=:99

# Wait for Xvfb to be ready
sleep 1

echo "✅ Xvfb display :99 ready"

# Run the Node.js entrypoint (pass all arguments)
exec node "$@"
