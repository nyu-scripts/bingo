#!/usr/bin/env python3
"""Dev server with correct MIME types for VS Code port forwarding."""
import http.server

http.server.SimpleHTTPRequestHandler.extensions_map.update({
    ".js": "application/javascript",
    ".css": "text/css",
    ".html": "text/html",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".json": "application/json",
})

if __name__ == "__main__":
    http.server.test(HandlerClass=http.server.SimpleHTTPRequestHandler, port=8000)
