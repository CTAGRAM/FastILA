"""Threaded static file server with sensible MIME for .jsx → application/javascript."""
import http.server
import socketserver
import mimetypes
import sys

mimetypes.add_type('application/javascript', '.jsx')
mimetypes.add_type('application/javascript', '.mjs')

class Handler(http.server.SimpleHTTPRequestHandler):
    # Quiet logs
    def log_message(self, format, *args):
        return
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

class ThreadedServer(socketserver.ThreadingMixIn, http.server.HTTPServer):
    daemon_threads = True
    allow_reuse_address = True

if __name__ == '__main__':
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 5173
    with ThreadedServer(('', port), Handler) as s:
        print(f'Serving on http://localhost:{port}')
        s.serve_forever()
