#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
generate_ai_content.py — AI 考点生成工具
=========================================

为词库中的单词自动生成「高频考点」(high_freq_points) 和
「长难句解析」(sentence_analysis) 字段，并回写到 grade_X.json 词库文件。

三种生成方案（按优先级）：
  方案 A — OpenAI 兼容 API（--mode api --api-key KEY）
           支持 OpenAI 官方及任何 OpenAI 兼容端点（智谱 GLM 等），可用 --base-url 切换。
  方案 B — 免费 AI API
           • 智谱 GLM      : --mode glm   --api-key KEY
           • 讯飞星火 Spark : --mode spark --app-id ID --api-key KEY --api-secret SECRET
  方案 C — 模板规则生成（--mode template，无需 API）
           基于词性 (pos) 与单词长度自动生成考点内容。

用法示例：
  # 模板生成（离线，零依赖）
  python scripts/generate_ai_content.py --grade 13 --mode template

  # OpenAI API 生成
  python scripts/generate_ai_content.py --grade 13 --mode api --api-key sk-xxxx

  # 智谱 GLM 生成
  python scripts/generate_ai_content.py --grade 13 --mode glm --api-key your_glm_key

  # 讯飞星火生成
  python scripts/generate_ai_content.py --grade 13 --mode spark \
      --app-id your_app_id --api-key your_api_key --api-secret your_api_secret

  # 只处理前 N 个单词（调试用）
  python scripts/generate_ai_content.py --grade 13 --mode template --limit 5
"""

import argparse
import csv
import hmac
import hashlib
import json
import os
import sys
import time
from base64 import b64encode
from datetime import datetime, timezone
from hashlib import sha256
from urllib.parse import urlencode, quote
from urllib.request import Request, urlopen
from urllib.error import URLError, HTTPError


# ---------------------------------------------------------------------------
# 路径工具
# ---------------------------------------------------------------------------

# 脚本位于 <project>/scripts/generate_ai_content.py
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.dirname(SCRIPT_DIR)

# 词库候选目录（按优先级查找）
WORD_DIRS = [
    os.path.join(PROJECT_ROOT, "src", "data", "words"),
    os.path.join(PROJECT_ROOT, "data", "words"),
]

# ECDICT 字典候选路径（可选，用于方案 C 的例句来源）
ECDICT_CANDIDATES = [
    os.path.join(PROJECT_ROOT, "data", "ecdict.csv"),
    os.path.join(PROJECT_ROOT, "data", "ECDICT.csv"),
    os.path.join(PROJECT_ROOT, "ecdict.csv"),
]


def resolve_word_file(grade):
    """根据年级定位词库 JSON 文件。"""
    fname = "grade_{}.json".format(grade)
    for d in WORD_DIRS:
        path = os.path.join(d, fname)
        if os.path.isfile(path):
            return path
    # 给出查找过的路径，便于排查
    raise FileNotFoundError(
        "未找到年级 {} 的词库文件 {}。已查找目录：{}".format(
            grade, fname, " / ".join(WORD_DIRS)
        )
    )


def load_words(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def save_words(path, words):
    """回写词库文件，保留 2 空格缩进与中文可读性，与现有文件风格一致。"""
    with open(path, "w", encoding="utf-8") as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
        f.write("\n")


# ---------------------------------------------------------------------------
# ECDICT 加载（可选）
# ---------------------------------------------------------------------------

def load_ecdict():
    """加载 ECDICT CSV（若存在），返回 {word: definition} 映射。"""
    for path in ECDICT_CANDIDATES:
        if not os.path.isfile(path):
            continue
        mapping = {}
        try:
            with open(path, "r", encoding="utf-8", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    word = (row.get("word") or "").strip().lower()
                    definition = (row.get("definition") or "").strip()
                    if word and definition:
                        mapping[word] = definition
            print("  [ECDICT] 已加载 {} 条释义：{}".format(len(mapping), path))
            return mapping
        except Exception as e:  # noqa: BLE001
            print("  [ECDICT] 加载失败 {}: {}".format(path, e), file=sys.stderr)
    return None


# ---------------------------------------------------------------------------
# 方案 C：模板规则生成（核心）
# ---------------------------------------------------------------------------

def _word_length_tag(word):
    """按单词长度分级，用于生成差异化考点。"""
    n = len(word)
    if n <= 4:
        return "short"
    if n <= 8:
        return "medium"
    return "long"


def template_high_freq_points(word, pos, translation):
    """根据词性 + 单词长度生成「高频考点」。"""
    w = word
    length = _word_length_tag(w)
    parts = []

    # 归一化词性（pos 形如 "n." "v." "adj." "adv." "n./v." 等，取首个识别到的）
    pos_lower = pos.lower().strip().rstrip(".")

    if "n" in pos_lower and "adj" not in pos_lower and "adv" not in pos_lower:
        # 名词
        parts.append("常考搭配：make use of {0}；a {0} of；{0}s 复数".format(w))
        if length == "long":
            parts.append("派生：相关形容词常加 -y/-al；{0}-related 相关的".format(w))
        else:
            parts.append("常见修饰：a good / great {0}".format(w))

    elif "v" in pos_lower and "adv" not in pos_lower:
        # 动词
        parts.append("常考搭配：{0} to do sth；{0} doing sth；{0} sth to sb".format(w))
        if length == "long":
            parts.append("派生：名词形式常加 -tion/-ment；动作者名词常加 -er/-or".format(w))
        else:
            parts.append("时态：{0}s 三单；{0}ed 过去式；{0}ing 进行时".format(w))

    elif "adj" in pos_lower:
        # 形容词
        parts.append("常考搭配：be {0} about；{0} enough to do；look / seem {0}".format(w))
        if length == "long":
            parts.append("派生：副词形式常加 -ly；名词形式常加 -ness/-ity；反义词常加 in-/un-".format(w))
        else:
            parts.append("比较级/最高级：可用 more/most {0}".format(w))

    elif "adv" in pos_lower:
        # 副词
        parts.append("常考搭配：{0} + 形容词/动词；{0} + adj.".format(w))
        if length == "long":
            parts.append("派生：对应形容词通常去 -ly；{0} speaking 就……而言".format(w))
        else:
            parts.append("位置：置于实义动词前 / 形容词前".format(w))

    else:
        # 兜底（含 n./v. 等复合词性）
        parts.append("常考搭配：make/use {0}；{0} to do / {0} doing".format(w))
        parts.append("词性：{}（注意一词多义）".format(pos))

    return "；".join(parts)


def template_sentence_analysis(word, pos, example_en, ecdict_def):
    """根据例句与词性生成「长难句解析」。

    优先使用 ECDICT 的 definition 字段；若无 ECDICT，则回退到单词自带的 example_en。
    """
    w = word
    w_lower = w.lower()
    pos_lower = pos.lower().strip().rstrip(".")

    # 选择用于分析的例句：优先 ECDICT definition（可能是短语），否则用 example_en
    source = ecdict_def or example_en or ""
    if not source:
        return "暂无例句，建议补充包含 {0} 的典型长难句。".format(w)

    # 判断单词在例句中的位置以推断语法成分
    tokens = source.replace(".", "").replace(",", "").split()
    token_lowers = [t.lower() for t in tokens]
    idx = -1
    for i, t in enumerate(token_lowers):
        if t == w_lower or t.startswith(w_lower):
            idx = i
            break

    role = ""
    if "n" in pos_lower and "adj" not in pos_lower and "adv" not in pos_lower:
        if idx == 0:
            role = "{0} 作主语".format(w)
        elif idx > 0 and token_lowers[idx - 1] in ("a", "an", "the", "my", "his", "her", "their", "our", "your"):
            role = "{0} 作宾语/表语（前有冠词/物主代词）".format(w)
        else:
            role = "{0} 作名词成分".format(w)
    elif "v" in pos_lower and "adv" not in pos_lower:
        if idx == 0:
            role = "{0} 作谓语（祈使句开头）".format(w)
        else:
            role = "{0} 作谓语动词".format(w)
    elif "adj" in pos_lower:
        role = "{0} 作定语/表语，修饰名词".format(w)
    elif "adv" in pos_lower:
        role = "{0} 作状语，修饰动词/形容词".format(w)
    else:
        role = "{0} 在句中担当 {1} 成分".format(w, pos)

    snippet = source if len(source) <= 120 else source[:117] + "..."
    return "例句：{0} ｜ {1}".format(snippet, role)


def generate_by_template(word_item, ecdict_map):
    """方案 C：模板生成单个单词的两个字段。"""
    word = word_item.get("word", "")
    pos = word_item.get("pos", "")
    translation = word_item.get("translation", "")
    example_en = word_item.get("example_en", "")
    ecdict_def = (ecdict_map or {}).get(word.lower())

    hfp = template_high_freq_points(word, pos, translation)
    sa = template_sentence_analysis(word, pos, example_en, ecdict_def)
    return hfp, sa


# ---------------------------------------------------------------------------
# 方案 A/B：AI API 调用
# ---------------------------------------------------------------------------

PROMPT_SYSTEM = (
    "你是一名资深英语教研专家，擅长提炼单词的高频考点与长难句解析。"
    "请严格以 JSON 格式输出，且只输出 JSON，包含两个字段：\n"
    '  "high_freq_points": 该单词的常考搭配、近义词、反义词、词形变化等，用中文简述；\n'
    '  "sentence_analysis": 包含该单词的典型长难句及语法解析，用中文简述。\n'
    "不要输出任何额外说明或 markdown 代码块标记。"
)


def _build_user_prompt(word_item):
    return (
        "单词：{word}\n"
        "音标(美)：{pu}\n"
        "音标(英)：{pk}\n"
        "释义：{tr}\n"
        "词性：{pos}\n"
        "例句(英)：{ee}\n"
        "例句(中)：{ec}\n"
        "年级：{grade}\n"
        "请为该单词生成 high_freq_points 与 sentence_analysis。"
    ).format(
        word=word_item.get("word", ""),
        pu=word_item.get("phonetic_us", ""),
        pk=word_item.get("phonetic_uk", ""),
        tr=word_item.get("translation", ""),
        pos=word_item.get("pos", ""),
        ee=word_item.get("example_en", ""),
        ec=word_item.get("example_cn", ""),
        grade=word_item.get("grade", ""),
    )


def _http_json(url, headers, body, timeout=30):
    """发起 POST JSON 请求并返回解析后的 JSON。"""
    data = json.dumps(body).encode("utf-8")
    req = Request(url, data=data, headers=headers, method="POST")
    with urlopen(req, timeout=timeout) as resp:
        raw = resp.read().decode("utf-8")
    return json.loads(raw)


def _extract_json_text(text):
    """从可能含 markdown 围栏的模型输出中提取 JSON 文本。"""
    t = text.strip()
    if t.startswith("```"):
        # 去掉 ```json 或 ``` 开头与结尾 ```
        t = t.split("\n", 1)[1] if "\n" in t else t
        if t.endswith("```"):
            t = t[: -3]
    return t.strip()


def _parse_ai_result(raw_text):
    """把模型返回的文本解析为 (high_freq_points, sentence_analysis)。"""
    try:
        obj = json.loads(_extract_json_text(raw_text))
        return str(obj.get("high_freq_points", "")).strip(), str(obj.get("sentence_analysis", "")).strip()
    except (ValueError, TypeError):
        return "", ""


def call_openai_compatible(word_item, api_key, base_url, model):
    """方案 A：OpenAI 兼容 Chat Completions 接口。"""
    url = "{}/chat/completions".format(base_url.rstrip("/"))
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer {}".format(api_key),
    }
    body = {
        "model": model,
        "messages": [
            {"role": "system", "content": PROMPT_SYSTEM},
            {"role": "user", "content": _build_user_prompt(word_item)},
        ],
        "temperature": 0.6,
    }
    data = _http_json(url, headers, body)
    text = data.get("choices", [{}])[0].get("message", {}).get("content", "")
    return _parse_ai_result(text)


def call_glm(word_item, api_key):
    """方案 B-1：智谱 GLM（OpenAI 兼容）。"""
    return call_openai_compatible(
        word_item,
        api_key=api_key,
        base_url="https://open.bigmodel.cn/api/paas/v4",
        model="glm-4-flash",
    )


def _spark_auth_url(api_key, api_secret):
    """生成讯飞星火 WebSocket/HTTP 鉴权 URL（简化版，用于 HTTP 调用）。"""
    host = "spark-api.xf-yun.com"
    path = "/v3.5/chat/completions"
    now = datetime.now(timezone.utc).strftime("%a, %d %b %Y %H:%M:%S GMT")
    signature_origin = (
        "host: {host}\n"
        "date: {date}\n"
        "GET {path} HTTP/1.1"
    ).format(host=host, date=now, path=path)
    signature_sha = hmac.new(
        api_secret.encode("utf-8"), signature_origin.encode("utf-8"), digestmod=sha256
    ).digest()
    signature = b64encode(signature_sha).decode("utf-8")
    authorization_origin = (
        'api_key="{ak}", algorithm="hmac-sha256", '
        'headers="host date request-line", signature="{sig}"'
    ).format(ak=api_key, sig=signature)
    authorization = b64encode(authorization_origin.encode("utf-8")).decode("utf-8")
    return "https://{}{}?{}".format(host, path, urlencode({"authorization": authorization, "date": now}))


def call_spark(word_item, app_id, api_key, api_secret):
    """方案 B-2：讯飞星火 HTTP 调用。"""
    url = _spark_auth_url(api_key, api_secret)
    headers = {"Content-Type": "application/json"}
    body = {
        "header": {"app_id": app_id, "uid": "magic-word-academy"},
        "parameter": {"chat": {"domain": "generalv3.5", "temperature": 0.6, "max_tokens": 512}},
        "payload": {
            "message": {
                "text": [
                    {"role": "system", "content": PROMPT_SYSTEM},
                    {"role": "user", "content": _build_user_prompt(word_item)},
                ]
            }
        },
    }
    data = _http_json(url, headers, body)
    text = (
        data.get("payload", {})
        .get("choices", {})
        .get("text", [{}])[0]
        .get("content", "")
    )
    return _parse_ai_result(text)


# ---------------------------------------------------------------------------
# 单词处理主流程
# ---------------------------------------------------------------------------

def process_words(words, mode, args, ecdict_map):
    """遍历单词列表，逐个生成并回填两个字段。返回 (更新数, 失败数)。"""
    total = len(words)
    updated = 0
    failed = 0
    limit = args.limit or total

    for i, item in enumerate(words):
        if i >= limit:
            break
        word = item.get("word", "?")
        hfp, sa = "", ""

        try:
            if mode == "template":
                hfp, sa = generate_by_template(item, ecdict_map)
            elif mode == "api":
                hfp, sa = call_openai_compatible(
                    item, args.api_key, args.base_url, args.model
                )
            elif mode == "glm":
                hfp, sa = call_glm(item, args.api_key)
            elif mode == "spark":
                hfp, sa = call_spark(item, args.app_id, args.api_key, args.api_secret)
            else:
                print("  [跳过] 未知模式：{}".format(mode), file=sys.stderr)
                break
        except HTTPError as e:
            failed += 1
            print("  [失败] {} (HTTP {})".format(word, e.code), file=sys.stderr)
            # API 失败时回退到模板，保证流程不中断
            hfp, sa = generate_by_template(item, ecdict_map)
        except (URLError, ValueError, KeyError, TypeError) as e:
            failed += 1
            print("  [失败] {} ({})".format(word, e), file=sys.stderr)
            hfp, sa = generate_by_template(item, ecdict_map)

        if hfp:
            item["high_freq_points"] = hfp
        if sa:
            item["sentence_analysis"] = sa
        updated += 1

        # API 模式下适当限速，避免触发频率限制
        if mode in ("api", "glm", "spark") and i < limit - 1:
            time.sleep(args.sleep)

        if (i + 1) % 10 == 0 or i == 0:
            print("  [进度] {}/{}  当前：{}".format(i + 1, min(limit, total), word))

    return updated, failed


# ---------------------------------------------------------------------------
# 命令行入口
# ---------------------------------------------------------------------------

def build_parser():
    p = argparse.ArgumentParser(
        description="为词库单词自动生成「高频考点」与「长难句解析」字段。",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    p.add_argument("--grade", type=int, required=True, help="目标年级，如 13")
    p.add_argument(
        "--mode",
        choices=["template", "api", "glm", "spark"],
        default="template",
        help="生成方案：template(模板,默认) / api(OpenAI兼容) / glm(智谱) / spark(讯飞)",
    )
    p.add_argument("--api-key", default=None, help="API 密钥（api / glm / spark 模式需要）")
    p.add_argument("--api-secret", default=None, help="讯飞星火 API Secret（spark 模式需要）")
    p.add_argument("--app-id", default=None, help="讯飞星火 APP ID（spark 模式需要）")
    p.add_argument("--base-url", default="https://api.openai.com/v1", help="OpenAI 兼容端点（api 模式）")
    p.add_argument("--model", default="gpt-4o-mini", help="模型名称（api 模式）")
    p.add_argument("--limit", type=int, default=None, help="只处理前 N 个单词（调试用）")
    p.add_argument("--sleep", type=float, default=0.5, help="API 调用间隔秒数（默认 0.5）")
    p.add_argument("--dry-run", action="store_true", help="只输出不回写文件")
    return p


def main():
    args = build_parser().parse_args()

    # 参数校验
    if args.mode in ("api", "glm") and not args.api_key:
        print("错误：{} 模式需要 --api-key".format(args.mode), file=sys.stderr)
        sys.exit(2)
    if args.mode == "spark" and not all([args.app_id, args.api_key, args.api_secret]):
        print("错误：spark 模式需要 --app-id、--api-key、--api-secret", file=sys.stderr)
        sys.exit(2)

    # 定位并读取词库
    try:
        word_path = resolve_word_file(args.grade)
    except FileNotFoundError as e:
        print("错误：{}".format(e), file=sys.stderr)
        sys.exit(1)

    print("词库文件：{}".format(word_path))
    words = load_words(word_path)
    print("共 {} 个单词，模式：{}".format(len(words), args.mode))

    # 方案 C 可选加载 ECDICT
    ecdict_map = load_ecdict() if args.mode == "template" else None

    # 执行生成
    updated, failed = process_words(words, args.mode, args, ecdict_map)

    # 回写或预览
    if args.dry_run:
        preview_n = min(args.limit or len(words), 3)
        print("\n[dry-run] 未回写文件。前 {} 个预览：".format(preview_n))
        for item in words[:preview_n]:
            print("  · {} | high_freq_points: {} | sentence_analysis: {}".format(
                item.get("word"), item.get("high_freq_points"), item.get("sentence_analysis")))
    else:
        save_words(word_path, words)
        print("\n已回写：{}".format(word_path))

    print("完成：更新 {} 个，失败 {} 个（失败项已回退模板生成）。".format(updated, failed))


if __name__ == "__main__":
    main()
