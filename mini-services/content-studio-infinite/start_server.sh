#!/bin/bash
cd /home/z/my-project/mini-services/content-studio-infinite
export PATH="$HOME/.local/bin:$PATH"
exec python3 server_simple.py
