#!/usr/bin/env python3
"""Propose reviewable Hebrew sentence levels for Kerem.

The scanner intentionally prints candidates for a human to curate. It uses the
same base-letter normalization as the browser app, then searches simple
kid-friendly sentence templates whose target words fit inside one seven-letter
board.
"""

from __future__ import annotations

import argparse
import itertools
import json
import re
import sys
import urllib.request

RAW_WORDLIST_URL = "https://raw.githubusercontent.com/eyaler/hebrew_wordlists/main/hspell_simple.txt"
FINAL_TO_BASE = {"ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ"}
BASE_TO_FINAL = {"כ": "ך", "מ": "ם", "נ": "ן", "פ": "ף", "צ": "ץ"}
NIKKUD_RE = re.compile(r"[\u0591-\u05C7]")
STRICT_HEBREW_RE = re.compile(r"^[א-ת]+$")

BUCKETS = {
    "person_m": ["אבא", "ילד", "תינוק"],
    "person_f": ["אמא", "אימא", "ילדה", "תינוקת"],
    "animal": ["חתול", "כלב", "ארנב", "סוס", "ציפור", "פרפר"],
    "object_m": ["כדור", "בלון", "ספר", "סיפור", "תפוח", "פרח", "תות"],
    "object_f": ["בננה", "מיטה", "גינה"],
    "verb_m": ["אוהב", "אוכל", "שותה", "רואה", "משחק", "יושב", "ישן", "קורא", "רוקד"],
    "verb_f": ["אוהבת", "אוכלת", "שותה", "רואה", "משחקת", "יושבת", "ישנה", "קוראת", "רוקדת"],
    "adj_m": ["קטן", "גדול", "שמח", "יפה", "חמוד", "מתוק", "ירוק", "כחול", "ורוד"],
    "adj_f": ["קטנה", "גדולה", "שמחה", "יפה", "חמודה", "מתוקה", "ירוקה", "כחולה", "ורודה"],
    "place": ["בית", "גינה", "חצר", "חדר", "שדה"],
}


def sanitize_word(word: str) -> str:
    cleaned = NIKKUD_RE.sub("", str(word or "").strip())
    if not STRICT_HEBREW_RE.match(cleaned):
        return ""
    return "".join(FINAL_TO_BASE.get(ch, ch) for ch in cleaned)


def to_final_display(word: str) -> str:
    chars = list(sanitize_word(word))
    if chars and chars[-1] in BASE_TO_FINAL:
        chars[-1] = BASE_TO_FINAL[chars[-1]]
    return "".join(chars)


def is_candidate(word: str) -> bool:
    return bool(word) and 3 <= len(word) <= 9 and 2 <= len(set(word)) <= 7


def read_corpus(args: argparse.Namespace) -> set[str]:
    if args.corpus_file:
        text = open(args.corpus_file, encoding="utf-8").read()
    else:
        with urllib.request.urlopen(args.corpus_url, timeout=30) as response:
            text = response.read().decode("utf-8")
    return {
        normalized
        for raw in re.split(r"\s+", text)
        if (normalized := sanitize_word(raw)) and is_candidate(normalized)
    }


def bucket_items(corpus: set[str]) -> dict[str, list[dict[str, str]]]:
    buckets: dict[str, list[dict[str, str]]] = {}
    for name, words in BUCKETS.items():
        rows = []
        for display in words:
            base = sanitize_word(display)
            if base in corpus:
                rows.append({"display": display, "base": base})
        buckets[name] = rows
    return buckets


def sentence_text(tokens: list[dict[str, str]]) -> str:
    pieces = []
    for token in tokens:
        if "text" in token:
            pieces.append(token["text"])
        elif "target" in token:
            pieces.append(f"{token.get('prefix', '')}{token['display']}")
    return " ".join(pieces)


def target_words(tokens: list[dict[str, str]]) -> list[str]:
    seen = set()
    targets = []
    for token in tokens:
        base = token.get("target")
        if base and base not in seen:
            seen.add(base)
            targets.append(base)
    return targets


def normalize_tokens(tokens: list[dict[str, str]]) -> list[dict[str, str]]:
    normalized = []
    for token in tokens:
        if "text" in token:
            normalized.append({"text": token["text"]})
            continue
        row = {"target": token["base"]}
        if token.get("prefix"):
            row["prefix"] = token["prefix"]
        normalized.append(row)
    return normalized


def templates(buckets: dict[str, list[dict[str, str]]]):
    for person in buckets["person_m"]:
        for verb in buckets["verb_m"]:
            for obj, adj in itertools.chain(
                itertools.product(buckets["object_m"], buckets["adj_m"]),
                itertools.product(buckets["animal"], buckets["adj_m"]),
            ):
                yield [
                    {**person, "target": person["base"]},
                    {**verb, "target": verb["base"]},
                    {**obj, "target": obj["base"]},
                    {**adj, "target": adj["base"]},
                ]
                for place in buckets["place"]:
                    yield [
                        {**person, "target": person["base"]},
                        {**verb, "target": verb["base"]},
                        {**obj, "target": obj["base"]},
                        {**adj, "target": adj["base"]},
                        {**place, "target": place["base"], "prefix": "ב"},
                    ]
        for verb in [row for row in buckets["verb_m"] if row["base"] in {"קורא", "רוקד", "יושב"}]:
            for obj in buckets["object_m"] + buckets["animal"]:
                for adj in buckets["adj_m"]:
                    yield [
                        {**person, "target": person["base"]},
                        {**verb, "target": verb["base"]},
                        {"text": "על"} if verb["base"] == "קורא" else {"text": "עם"},
                        {**obj, "target": obj["base"]},
                        {**adj, "target": adj["base"]},
                    ]

    for person in buckets["person_f"]:
        for verb in buckets["verb_f"]:
            for obj, adj in itertools.chain(
                itertools.product(buckets["object_f"], buckets["adj_f"]),
                itertools.product(buckets["object_m"], buckets["adj_m"]),
                itertools.product(buckets["animal"], buckets["adj_m"]),
            ):
                yield [
                    {**person, "target": person["base"]},
                    {**verb, "target": verb["base"]},
                    {**obj, "target": obj["base"]},
                    {**adj, "target": adj["base"]},
                ]
                for place in buckets["place"]:
                    yield [
                        {**person, "target": person["base"]},
                        {**verb, "target": verb["base"]},
                        {**obj, "target": obj["base"]},
                        {**adj, "target": adj["base"]},
                        {**place, "target": place["base"], "prefix": "ב"},
                    ]
        for verb in [row for row in buckets["verb_f"] if row["base"] in {"קוראת", "ישנה"}]:
            for obj in buckets["object_m"] + buckets["object_f"]:
                for adj in buckets["adj_m"] + buckets["adj_f"]:
                    yield [
                        {**person, "target": person["base"]},
                        {**verb, "target": verb["base"]},
                        {"text": "על"} if verb["base"] == "קוראת" else {"text": "ליד"},
                        {**obj, "target": obj["base"]},
                        {**adj, "target": adj["base"]},
                    ]


def score_candidate(tokens: list[dict[str, str]], targets: list[str], bonus_count: int) -> float:
    text = sentence_text(tokens)
    drawable = sum(any(word in text for word in group) for group in [
        ["תות", "בננה", "פרח", "כדור"],
        ["בית", "גינה", "חצר", "שדה"],
        ["סוס", "חתול", "כלב", "פרפר"],
        ["קורא", "רוקד", "ישן", "אוהב"],
    ])
    return len(targets) * 90 + len(text) * 1.5 + min(bonus_count, 120) * 0.25 + drawable * 18


def propose(args: argparse.Namespace) -> list[dict[str, object]]:
    corpus = read_corpus(args)
    buckets = bucket_items(corpus)
    rows = []
    seen = set()
    for tokens in templates(buckets):
        targets = target_words(tokens)
        if not (args.min_targets <= len(targets) <= args.max_targets):
            continue
        letters = sorted(set("".join(targets)))
        if len(letters) > args.max_letters:
            continue
        key = tuple(targets)
        if key in seen:
            continue
        seen.add(key)
        bonus_words = sorted(word for word in corpus if set(word) <= set(letters))
        if len(bonus_words) < args.min_bonus:
            continue
        center = max(letters, key=lambda letter: sum(letter in word for word in targets))
        rows.append({
            "score": round(score_candidate(tokens, targets, len(bonus_words)), 2),
            "sentence": sentence_text(tokens),
            "center": center,
            "letters": [letter for letter in letters if letter != center],
            "targetWords": targets,
            "sentenceTokens": normalize_tokens(tokens),
            "bonusCount": len(bonus_words),
            "sampleBonusWords": [to_final_display(word) for word in bonus_words[: args.sample_bonus]],
        })
    return sorted(rows, key=lambda row: (-row["score"], row["sentence"]))[: args.limit]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--corpus-url", default=RAW_WORDLIST_URL)
    parser.add_argument("--corpus-file")
    parser.add_argument("--limit", type=int, default=20)
    parser.add_argument("--min-targets", type=int, default=4)
    parser.add_argument("--max-targets", type=int, default=6)
    parser.add_argument("--max-letters", type=int, default=7)
    parser.add_argument("--min-bonus", type=int, default=20)
    parser.add_argument("--sample-bonus", type=int, default=12)
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    rows = propose(args)
    if args.json:
        print(json.dumps(rows, ensure_ascii=False, indent=2))
        return 0

    for idx, row in enumerate(rows, 1):
        print(f"{idx}. {row['sentence']}  score={row['score']}  bonus={row['bonusCount']}")
        print(f"   center={row['center']} letters={''.join(row['letters'])}")
        print(f"   targets={' '.join(to_final_display(word) for word in row['targetWords'])}")
        print(f"   sample={', '.join(row['sampleBonusWords'])}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
