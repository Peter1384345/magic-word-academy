#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""process_ecdict.py - ECDICT word database grading tool.

Reads ecdict.csv/stardict.csv, classifies words into grades 1-17 by exam
tags (zk/gk/cet4/cet6/ielts) and frequency (frq) / Collins stars, then
writes JSON files to src/data/words/grade_X.json.

Grading:
  grade 1-6   primary : no exam tags, sorted by frq asc (most common first)
  grade 7-9   junior  : tag has zk (zhongkao)
  grade 10-12 senior  : tag has gk (gaokao)
  grade 13    cet4    : tag has cet4
  grade 14    cet6    : tag has cet6
  grade 15-17 ielts   : tag has ielts

Each grade targets 500 words; shortages filled from reserve pool.
No word appears in two grades (assigned to highest exam level).
"""
import csv
import json
import os
import re
import sys

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(SCRIPT_DIR)
OUTPUT_DIR = os.path.join(PROJECT_DIR, "src", "data", "words")
TARGET_PER_GRADE = 500
EXAM_TAGS = {"zk", "gk", "cet4", "cet6", "ky", "ielts", "toefl", "gre", "sat"}
WORD_RE = re.compile(r"^[A-Za-z][A-Za-z\-]*$")
FRQ_INF = 99999999


def find_csv():
    candidates = [
        os.path.join(PROJECT_DIR, "ecdict-repo", "ecdict.csv"),
        os.path.join(PROJECT_DIR, "ecdict-repo", "stardict.csv"),
        os.path.join(PROJECT_DIR, "ecdict.csv"),
        os.path.join(PROJECT_DIR, "stardict.csv"),
        os.path.join(PROJECT_DIR, "node_modules", "ecdict", "data", "ecdict.csv"),
        os.path.join(PROJECT_DIR, "node_modules", "ecdict", "data", "stardict.csv"),
    ]
    for path in candidates:
        if os.path.isfile(path) and os.path.getsize(path) > 0:
            return path
    return None


def safe_int(value, default=0):
    if value is None:
        return default
    value = str(value).strip()
    if not value:
        return default
    try:
        return int(value)
    except ValueError:
        return default


def parse_tags(tag_field):
    if not tag_field:
        return set()
    return {t.strip().lower() for t in str(tag_field).split(" ") if t.strip()}


def has_exam_tag(tags):
    return bool(tags & EXAM_TAGS)


def wrap_phonetic(phonetic):
    if not phonetic:
        return ""
    p = str(phonetic).strip()
    if not p:
        return ""
    if not p.startswith("/"):
        p = "/" + p
    if not p.endswith("/"):
        p = p + "/"
    return p


def extract_pos(pos_field, translation):
    if pos_field and str(pos_field).strip():
        return str(pos_field).strip()
    if translation:
        m = re.match(r"^([a-zA-Z]+)\.", str(translation))
        if m:
            return m.group(1) + "."
    return ""


def make_entry(row, grade, tag):
    word = str(row.get("word", "")).strip()
    phonetic = wrap_phonetic(row.get("phonetic", ""))
    translation = str(row.get("translation", "")).strip()
    pos = extract_pos(row.get("pos", ""), translation)
    return {
        "word": word,
        "phonetic_us": phonetic,
        "phonetic_uk": phonetic,
        "translation": translation,
        "pos": pos,
        "example_en": "",
        "example_cn": "",
        "high_freq_points": "",
        "sentence_analysis": "",
        "grade": grade,
        "tag": tag,
    }


def grade_to_tag(grade):
    if grade <= 6:
        return "primary"
    elif grade <= 9:
        return "junior"
    elif grade <= 12:
        return "senior"
    elif grade == 13:
        return "cet4"
    elif grade == 14:
        return "cet6"
    else:
        return "ielts"


def key_frq_asc(row):
    frq = safe_int(row.get("frq"), FRQ_INF)
    if frq <= 0:
        frq = FRQ_INF
    return frq


def key_collins_frq(row):
    collins = safe_int(row.get("collins"), 0)
    frq = safe_int(row.get("frq"), FRQ_INF)
    if frq <= 0:
        frq = FRQ_INF
    return (-collins, frq)


def load_rows(csv_path):
    rows = []
    seen_words = set()
    with open(csv_path, "r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            word = str(row.get("word", "")).strip()
            if not word or not WORD_RE.match(word):
                continue
            lw = word.lower()
            if lw in seen_words:
                continue
            seen_words.add(lw)
            rows.append(row)
    return rows


def classify_pool(row):
    tags = parse_tags(row.get("tag", ""))
    if "ielts" in tags:
        return "ielts"
    if "cet6" in tags:
        return "cet6"
    if "cet4" in tags:
        return "cet4"
    if "gk" in tags:
        return "gk"
    if "zk" in tags:
        return "zk"
    if has_exam_tag(tags):
        return "other"
    return "primary"


def main():
    csv_path = find_csv()
    if not csv_path:
        print("[ERROR] ECDICT CSV not found.")
        print("Tried paths under ecdict-repo/ and node_modules/ecdict/data/")
        return 1

    print("[1/4] Reading CSV: " + csv_path)
    rows = load_rows(csv_path)
    print("      Valid entries: " + str(len(rows)))

    print("[2/4] Classifying by exam tags")
    pools = {
        "ielts": [], "cet6": [], "cet4": [],
        "gk": [], "zk": [], "primary": [], "other": [],
    }
    for row in rows:
        pools[classify_pool(row)].append(row)
    for k in ["ielts", "cet6", "cet4", "gk", "zk", "primary", "other"]:
        print("      " + k + ": " + str(len(pools[k])))

    print("[3/4] Assigning words to grades")
    grade_entries = {g: [] for g in range(1, 18)}
    consumed_ids = set()

    bands = [
        ("ielts", [15, 16, 17], key_collins_frq),
        ("cet6", [14], key_collins_frq),
        ("cet4", [13], key_collins_frq),
        ("gk", [10, 11, 12], key_collins_frq),
        ("zk", [7, 8, 9], key_collins_frq),
        ("primary", [1, 2, 3, 4, 5, 6], key_frq_asc),
    ]

    reserve = []
    for pool_name, grades, skey in bands:
        candidates = [r for r in pools[pool_name] if id(r) not in consumed_ids]
        sorted_rows = sorted(candidates, key=skey)
        for i, g in enumerate(grades):
            start = i * TARGET_PER_GRADE
            end = start + TARGET_PER_GRADE
            chunk = sorted_rows[start:end]
            tag = grade_to_tag(g)
            grade_entries[g] = [make_entry(r, g, tag) for r in chunk]
            for r in chunk:
                consumed_ids.add(id(r))
        leftover = sorted_rows[len(grades) * TARGET_PER_GRADE:]
        reserve.extend(leftover)

    reserve.extend(pools["other"])
    reserve.extend(r for r in pools["primary"] if id(r) not in consumed_ids)
    reserve.sort(key=key_frq_asc)
    reserve_consumed = set()

    for g in range(1, 18):
        need = TARGET_PER_GRADE - len(grade_entries[g])
        if need <= 0:
            continue
        print("      grade " + str(g) + " short, filling " + str(need))
        filled = 0
        for r in reserve:
            if filled >= need:
                break
            if id(r) in consumed_ids or id(r) in reserve_consumed:
                continue
            tag = grade_to_tag(g)
            grade_entries[g].append(make_entry(r, g, tag))
            reserve_consumed.add(id(r))
            consumed_ids.add(id(r))
            filled += 1
        if filled < need:
            print("      [WARN] grade " + str(g) + " still short " + str(need - filled))

    print("[4/4] Writing JSON to " + OUTPUT_DIR)
    if not os.path.isdir(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR, exist_ok=True)

    total = 0
    for g in range(1, 18):
        entries = grade_entries[g]
        out_path = os.path.join(OUTPUT_DIR, "grade_" + str(g) + ".json")
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(entries, f, ensure_ascii=False, indent=2)
        total += len(entries)
        print("      grade_" + str(g) + ".json : " + str(len(entries)) + " words")

    print("\nDone! Total " + str(total) + " words, grades 1-17.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
