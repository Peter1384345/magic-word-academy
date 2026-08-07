# -*- coding: utf-8 -*-
"""
离线TTS服务 - 作为 Web 应用发音功能的备份方案

启动：python scripts/offline_tts_server.py
端口：8765
接口：GET /tts?word=hello&accent=us
      GET /health

TTS引擎（按优先级）：
  1. edge-tts  （微软Edge TTS，免费，质量好，需联网）
  2. pyttsx3   （完全离线，使用系统自带引擎）

依赖安装（按需）：
  pip install edge-tts
  pip install pyttsx3
"""
import sys
import asyncio
import os
import json
import tempfile
import traceback
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse, parse_qs

# 服务端口
PORT = 8765

# 检测可用的 TTS 引擎
try:
    import edge_tts
    HAS_EDGE_TTS = True
except ImportError:
    HAS_EDGE_TTS = False

try:
    import pyttsx3
    HAS_PYTTSX3 = True
except ImportError:
    HAS_PYTTSX3 = False


def check_engines():
    """检查 TTS 引擎安装情况并提示用户"""
    print("=" * 60)
    if not HAS_EDGE_TTS and not HAS_PYTTSX3:
        print("警告：未检测到任何 TTS 引擎！服务将启动但无法生成音频。")
        print("请至少安装以下其中一个：")
        print("  pip install edge-tts   （推荐，微软Edge TTS，需联网）")
        print("  pip install pyttsx3    （完全离线，使用系统引擎）")
        print("=" * 60)
        return False
    print("已检测到 TTS 引擎：")
    if HAS_EDGE_TTS:
        print("  - edge-tts  （优先使用）")
    if HAS_PYTTSX3:
        print("  - pyttsx3   （备选使用）")
    print("=" * 60)
    return True


async def generate_with_edge_tts(text, accent):
    """使用 edge-tts 生成 MP3 音频数据，返回 (bytes, content_type)"""
    # 美音使用 AriaNeural，英音使用 SoniaNeural
    voice = "en-US-AriaNeural" if accent == "us" else "en-GB-SoniaNeural"
    communicate = edge_tts.Communicate(text, voice)
    audio_data = bytearray()
    async for chunk in communicate.stream():
        if chunk["type"] == "audio":
            audio_data.extend(chunk["data"])
    if not audio_data:
        raise RuntimeError("edge-tts 未返回音频数据")
    return bytes(audio_data), "audio/mp3"


def generate_with_pyttsx3(text, accent):
    """使用 pyttsx3 生成 WAV 音频数据（保存到临时文件后读取），返回 (bytes, content_type)"""
    engine = pyttsx3.init()
    # 尝试选择对应口音的系统语音
    try:
        voices = engine.getProperty('voices')
        target = 'en-US' if accent == 'us' else 'en-GB'
        for voice in voices:
            vid = voice.id.replace('\\', '/')
            if target in vid or target.replace('-', '_') in vid:
                engine.setProperty('voice', voice.id)
                break
    except Exception:
        # 无法选择语音时使用默认值
        pass
    engine.setProperty('rate', 150)

    # 保存到临时文件
    tmp_path = os.path.join(tempfile.gettempdir(), f"offline_tts_{os.getpid()}.wav")
    try:
        engine.save_to_file(text, tmp_path)
        engine.runAndWait()
        with open(tmp_path, 'rb') as f:
            data = f.read()
        if not data:
            raise RuntimeError("pyttsx3 未生成音频数据")
        return data, "audio/wav"
    finally:
        try:
            engine.stop()
        except Exception:
            pass
        if os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except OSError:
                pass


def generate_tts(text, accent):
    """按优先级尝试 TTS 引擎生成音频，返回 (bytes, content_type)"""
    # 优先使用 edge-tts
    if HAS_EDGE_TTS:
        try:
            return asyncio.run(generate_with_edge_tts(text, accent))
        except Exception as e:
            print(f"[edge-tts] 生成失败：{e}，尝试 pyttsx3 ...")
    # 备选使用 pyttsx3
    if HAS_PYTTSX3:
        try:
            return generate_with_pyttsx3(text, accent)
        except Exception as e:
            print(f"[pyttsx3] 生成失败：{e}")
    raise RuntimeError("所有 TTS 引擎均不可用，请检查依赖安装")


class TTSRequestHandler(BaseHTTPRequestHandler):
    """处理 TTS 请求的 HTTP 处理器"""

    def _set_cors_headers(self):
        """设置 CORS 响应头，允许 localhost:5173 跨域请求"""
        self.send_header('Access-Control-Allow-Origin', 'http://localhost:5173')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')

    def do_OPTIONS(self):
        """处理 CORS 预检请求"""
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def do_GET(self):
        """处理 GET 请求"""
        parsed = urlparse(self.path)

        # 健康检查接口
        if parsed.path == '/health':
            self._send_json(200, {
                'status': 'ok',
                'edge_tts': HAS_EDGE_TTS,
                'pyttsx3': HAS_PYTTSX3,
            })
            return

        # TTS 接口：GET /tts?word=hello&accent=us
        if parsed.path != '/tts':
            self._send_json(404, {'error': 'Not Found', 'path': parsed.path})
            return

        params = parse_qs(parsed.query)
        word_list = params.get('word')
        if not word_list or not word_list[0]:
            self._send_json(400, {'error': '缺少参数 word'})
            return

        word = word_list[0]
        accent = (params.get('accent', ['us'])[0] or 'us').lower()
        if accent not in ('us', 'uk'):
            accent = 'us'

        try:
            audio_data, content_type = generate_tts(word, accent)
        except Exception as e:
            traceback.print_exc()
            self._send_json(500, {'error': f'TTS 生成失败：{e}'})
            return

        self.send_response(200)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(audio_data)))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(audio_data)

    def _send_json(self, status, payload):
        """发送 JSON 响应"""
        body = json.dumps(payload, ensure_ascii=False).encode('utf-8')
        self.send_response(status)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        """简化日志输出"""
        sys.stderr.write("[TTS] %s - %s\n" % (self.address_string(), fmt % args))


def main():
    print("=" * 60)
    print("  离线 TTS 服务（Web 发音功能备份方案）")
    print(f"  端口：{PORT}")
    print("  接口：GET /tts?word=hello&accent=us")
    print("  健康检查：GET /health")
    print("=" * 60)
    check_engines()

    server = ThreadingHTTPServer(('0.0.0.0', PORT), TTSRequestHandler)
    print(f"\n服务已启动：http://localhost:{PORT}")
    print("按 Ctrl+C 停止服务。")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n正在停止服务 ...")
        server.server_close()
        print("服务已停止。")


if __name__ == '__main__':
    main()
