#!/usr/bin/env python3
"""
Generate publication-quality ARCHITECTURE.pdf from ARCHITECTURE.md using Headless Chrome.
Pre-renders Markdown via Python's markdown library and renders Mermaid diagrams over a transient local HTTP server.
"""

import os
import sys
import time
import threading
import subprocess
import socket
from http.server import HTTPServer, SimpleHTTPRequestHandler
import markdown

BASE_DIR = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
MD_FILE = os.path.join(BASE_DIR, "ARCHITECTURE.md")
PDF_FILE = os.path.join(BASE_DIR, "ARCHITECTURE.pdf")
HTML_FILE = os.path.join(BASE_DIR, "architecture_render.html")

with open(MD_FILE, "r", encoding="utf-8") as f:
    md_text = f.read()

# Convert markdown to HTML with tables, code, etc.
raw_html = markdown.markdown(
    md_text,
    extensions=["extra", "tables", "fenced_code", "toc"]
)

# Convert ```mermaid fenced code into <pre class="mermaid">
# Python markdown outputs <pre><code class="language-mermaid">...</code></pre>
raw_html = raw_html.replace(
    '<pre><code class="language-mermaid">',
    '<pre class="mermaid" style="background:#f8fafc; color:#0f172a; border:1px solid #cbd5e1; border-radius:8px; padding:16px;">'
).replace(
    '<pre><code class="mermaid">',
    '<pre class="mermaid" style="background:#f8fafc; color:#0f172a; border:1px solid #cbd5e1; border-radius:8px; padding:16px;">'
)

html_document = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Vision — Architecture & Technical Specification</title>
  <!-- Mermaid -->
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <!-- KaTeX -->
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.css">
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/katex.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/katex@0.16.8/dist/contrib/auto-render.min.js"></script>
  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    @page {{
      size: A4 portrait;
      margin: 18mm 16mm 18mm 16mm;
      @bottom-right {{
        content: counter(page);
      }}
    }}
    body {{
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background-color: #ffffff;
      font-size: 10pt;
      margin: 0;
      padding: 0;
    }}
    h1, h2, h3, h4 {{
      color: #0f172a;
      font-weight: 700;
      page-break-after: avoid;
    }}
    h1 {{
      font-size: 20pt;
      border-bottom: 2.5px solid #0284c7;
      padding-bottom: 8px;
      margin-top: 0;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }}
    h2 {{
      font-size: 14pt;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 6px;
      margin-top: 24px;
      margin-bottom: 10px;
      color: #0369a1;
      letter-spacing: -0.01em;
      page-break-after: avoid;
    }}
    h3 {{
      font-size: 12pt;
      margin-top: 18px;
      margin-bottom: 8px;
      color: #0f172a;
      page-break-after: avoid;
    }}
    h4 {{
      font-size: 10.5pt;
      margin-top: 14px;
      margin-bottom: 6px;
      color: #334155;
    }}
    p, li {{
      font-size: 10pt;
      color: #334155;
    }}
    ul, ol {{
      padding-left: 20px;
      margin-top: 6px;
      margin-bottom: 10px;
    }}
    li {{
      margin-bottom: 4px;
    }}
    blockquote {{
      margin: 12px 0;
      padding: 10px 16px;
      background: #f0fdf4;
      border-left: 4px solid #10b981;
      color: #065f46;
      border-radius: 4px;
      font-size: 10pt;
    }}
    blockquote p {{
      margin: 4px 0;
      color: #065f46;
    }}
    code {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      background-color: #f1f5f9;
      color: #0f172a;
      padding: 2px 4px;
      border-radius: 4px;
      border: 1px solid #e2e8f0;
    }}
    pre {{
      background: #0f172a;
      color: #f8fafc;
      padding: 12px 14px;
      border-radius: 6px;
      overflow-x: auto;
      font-family: 'JetBrains Mono', monospace;
      font-size: 8.5pt;
      line-height: 1.45;
      page-break-inside: avoid;
      margin: 12px 0;
    }}
    pre code {{
      background: transparent;
      color: #f8fafc;
      padding: 0;
      border: none;
    }}
    table {{
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 9pt;
      page-break-inside: avoid;
    }}
    th, td {{
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }}
    th {{
      background-color: #f1f5f9;
      color: #0f172a;
      font-weight: 600;
    }}
    tr:nth-child(even) td {{
      background-color: #f8fafc;
    }}
    .mermaid {{
      text-align: center;
      margin: 14px 0;
      page-break-inside: avoid;
    }}
    hr {{
      border: 0;
      height: 1px;
      background: #cbd5e1;
      margin: 22px 0;
    }}
  </style>
</head>
<body>
  {raw_html}

  <script>
    mermaid.initialize({{
      startOnLoad: true,
      theme: 'neutral',
      flowchart: {{ useMaxWidth: true, htmlLabels: true, curve: 'basis' }}
    }});

    renderMathInElement(document.body, {{
      delimiters: [
        {{left: '$$', right: '$$', display: true}},
        {{left: '$', right: '$', display: false}}
      ],
      throwOnError: false
    }});
  </script>
</body>
</html>
"""

with open(HTML_FILE, "w", encoding="utf-8") as f:
    f.write(html_document)

# Find free port
sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
sock.bind(("", 0))
port = sock.getsockname()[1]
sock.close()

class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass

server = HTTPServer(("127.0.0.1", port), lambda *args: QuietHandler(*args, directory=BASE_DIR))
server_thread = threading.Thread(target=server.serve_forever, daemon=True)
server_thread.start()

print(f"🚀 Started temporary HTTP server on port {port}")
time.sleep(0.5)

chrome_bin = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
target_url = f"http://127.0.0.1:{port}/architecture_render.html"

cmd = [
    chrome_bin,
    "--headless",
    "--disable-gpu",
    "--no-sandbox",
    "--disable-dev-shm-usage",
    "--run-all-compositor-stages-before-draw",
    "--virtual-time-budget=6000",
    f"--print-to-pdf={PDF_FILE}",
    "--print-to-pdf-no-header",
    target_url,
]

print("⏳ Rendering ARCHITECTURE.pdf via Chrome Headless...")
res = subprocess.run(cmd, capture_output=True, text=True)

server.shutdown()
if os.path.exists(HTML_FILE):
    os.remove(HTML_FILE)

if os.path.exists(PDF_FILE):
    size_kb = round(os.path.getsize(PDF_FILE) / 1024, 2)
    print(f"🎉 SUCCESS: Generated ARCHITECTURE.pdf ({size_kb} KB) at {PDF_FILE}")
else:
    print(f"❌ Error generating PDF: {res.stderr}")
    sys.exit(1)
