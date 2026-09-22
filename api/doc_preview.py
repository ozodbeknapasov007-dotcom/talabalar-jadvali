# -*- coding: utf-8 -*-
from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs, unquote
import json
import os
import io
import zipfile
import base64
import urllib.request
import urllib.parse
import mimetypes

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        params = parse_qs(parsed.query)
        file_name = params.get('file', [''])[0].strip()

        if not file_name:
            self.send_response(400)
            self.send_header('Content-Type', 'application/json; charset=utf-8')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            self.wfile.write(json.dumps({"success": False, "error": "Fayl nomi ko'rsatilmadi"}).encode('utf-8'))
            return

        token = os.environ.get('GITHUB_TOKEN', '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')
        repo_owner = 'OzodbekNapasov'
        repo_name = 'Talabalar-ro-yhati'

        images = []
        
        # 1. Avval mahalliy files/ papkasidan qidiramiz
        for base in [os.getcwd(), os.path.dirname(os.path.dirname(os.path.abspath(__file__)))]:
            local_path = os.path.join(base, 'files', file_name)
            if os.path.exists(local_path):
                try:
                    with open(local_path, 'rb') as f:
                        content_bytes = f.read()
                    with zipfile.ZipFile(io.BytesIO(content_bytes), 'r') as z:
                        for name in z.namelist():
                            if name.startswith('word/media/') and not name.endswith('/'):
                                img_data = z.read(name)
                                mime, _ = mimetypes.guess_type(name)
                                if not mime: mime = 'image/jpeg'
                                b64 = base64.b64encode(img_data).decode('utf-8')
                                images.append(f"data:{mime};base64,{b64}")
                    if images:
                        break
                except Exception:
                    pass

        # 2. Agar lokal diskda topilmasa, GitHub API orqali olamiz
        if not images:
            try:
                enc_name = urllib.parse.quote(file_name)
                url = f"https://api.github.com/repos/{repo_owner}/{repo_name}/contents/files/{enc_name}"
                req = urllib.request.Request(url, headers={
                    'Authorization': f'token {token}',
                    'User-Agent': 'Vercel-Doc-Preview',
                    'Accept': 'application/vnd.github.v3+json'
                })
                with urllib.request.urlopen(req, timeout=25) as resp:
                    data = json.loads(resp.read().decode('utf-8'))
                    if 'content' in data:
                        content_bytes = base64.b64decode(data['content'])
                        with zipfile.ZipFile(io.BytesIO(content_bytes), 'r') as z:
                            for name in z.namelist():
                                if name.startswith('word/media/') and not name.endswith('/'):
                                    img_data = z.read(name)
                                    mime, _ = mimetypes.guess_type(name)
                                    if not mime: mime = 'image/jpeg'
                                    b64 = base64.b64encode(img_data).decode('utf-8')
                                    images.append(f"data:{mime};base64,{b64}")
            except Exception as e:
                pass

        self.send_response(200)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'public, max-age=3600')
        self.end_headers()
        self.wfile.write(json.dumps({
            "success": True if images else False,
            "filename": file_name,
            "filepath": f"files/{file_name}",
            "images": images
        }).encode('utf-8'))
