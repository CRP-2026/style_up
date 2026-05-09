#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import json
import os
import time
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import pandas as pd
import requests
from dotenv import load_dotenv

HF_API_URL = "https://router.huggingface.co/hf-inference/models/openai/clip-vit-base-patch32"
HF_TIMEOUT_SECONDS = 30
HF_SLEEP_SECONDS = 1.5


def is_valid_url(raw: str) -> bool:
    try:
        u = urlparse((raw or "").strip())
        return u.scheme in {"http", "https"} and bool(u.netloc)
    except Exception:
        return False


def read_input_rows(csv_path: Path) -> list[dict[str, str]]:
    df = pd.read_csv(csv_path, usecols=["id", "name", "image_url"])
    df = df.dropna(subset=["id", "name", "image_url"])
    df["id"] = df["id"].astype(str).str.strip()
    df["name"] = df["name"].astype(str).str.strip()
    df["image_url"] = df["image_url"].astype(str).str.strip()
    df = df[(df["id"] != "") & (df["name"] != "")]
    df = df[df["image_url"].apply(is_valid_url)]
    return df.to_dict(orient="records")


def load_checkpoint(meta_path: Path) -> dict[str, Any]:
    if not meta_path.exists():
        return {"source": "jewelry_items.csv", "model": HF_API_URL, "items": []}
    raw = json.loads(meta_path.read_text(encoding="utf-8"))
    # Backward-compatible: allow previous list-only format.
    if isinstance(raw, list):
        return {"source": "jewelry_items.csv", "model": HF_API_URL, "items": raw}
    if isinstance(raw, dict):
        raw.setdefault("source", "jewelry_items.csv")
        raw.setdefault("model", HF_API_URL)
        raw.setdefault("items", [])
        return raw
    return {"source": "jewelry_items.csv", "model": HF_API_URL, "items": []}


def save_checkpoint(meta_path: Path, payload: dict[str, Any]) -> None:
    meta_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def fetch_image_bytes(image_url: str, timeout: int = HF_TIMEOUT_SECONDS) -> bytes:
    resp = requests.get(image_url, timeout=timeout)
    resp.raise_for_status()
    return resp.content


def image_to_base64(image_bytes: bytes) -> str:
    return base64.b64encode(image_bytes).decode("utf-8")


def normalize_embedding(raw: Any) -> list[float]:
    if isinstance(raw, list) and raw and isinstance(raw[0], (int, float)):
        return [float(x) for x in raw]
    if isinstance(raw, list) and len(raw) == 1 and isinstance(raw[0], list):
        nested = raw[0]
        if nested and isinstance(nested[0], (int, float)):
            return [float(x) for x in nested]
    raise ValueError(f"Unexpected embedding response: {type(raw).__name__}")


def get_hf_vector(image_url: str, hf_token: str) -> list[float]:
    image_bytes = fetch_image_bytes(image_url)
    _ = image_to_base64(image_bytes)  # keep explicit base64 step for traceability
    headers = {
        "Authorization": f"Bearer {hf_token}",
        "Content-Type": "image/jpeg",
    }
    resp = requests.post(HF_API_URL, headers=headers, data=image_bytes, timeout=HF_TIMEOUT_SECONDS)
    resp.raise_for_status()
    return normalize_embedding(resp.json())


def main() -> None:
    script_dir = Path(__file__).resolve().parent
    # Ưu tiên đọc biến từ database/.env để tránh phụ thuộc current working directory.
    load_dotenv(script_dir / ".env")
    load_dotenv()

    parser = argparse.ArgumentParser(description="Build jewelry AI metadata with HF Inference API.")
    parser.add_argument(
        "--csv",
        default="database/dataMauTrenMang/shoes_dim.csv",
        help="Path to the input CSV",
    )
    parser.add_argument(
        "--output",
        default="database/metadata_jewelry.json",
        help="Checkpoint/output JSON path",
    )
    parser.add_argument(
        "--force-rebuild",
        action="store_true",
        help="Build lại từ đầu, bỏ qua checkpoint cũ trong output.",
    )
    parser.add_argument(
        "--max-items",
        type=int,
        default=0,
        help="Giới hạn số item để test nhanh (0 = toàn bộ).",
    )
    args = parser.parse_args()

    hf_token = os.getenv("HF_TOKEN", "").strip()
    if not hf_token:
        raise ValueError("Thiếu HF_TOKEN. Hãy tạo file .env và set HF_TOKEN=...")

    csv_path = Path(args.csv)
    if not csv_path.exists():
        raise FileNotFoundError(f"CSV không tồn tại: {csv_path}")

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rows = read_input_rows(csv_path)
    if args.max_items > 0:
        rows = rows[: args.max_items]

    checkpoint = {"source": "jewelry_items.csv", "model": HF_API_URL, "items": []} if args.force_rebuild else load_checkpoint(output_path)
    checkpoint["model"] = HF_API_URL
    done_ids = {str(x.get("id")) for x in checkpoint.get("items", []) if x.get("id")}
    pending = [r for r in rows if r["id"] not in done_ids]
    total = len(rows)
    done_now = total - len(pending)

    print(f"Tổng hợp lệ: {total} | Đã có checkpoint: {done_now} | Còn lại: {len(pending)}")

    for row in pending:
        shoe_id = row["id"]
        shoe_name = row["name"]
        image_url = row["image_url"]
        idx = done_now + 1
        try:
            vector = get_hf_vector(image_url=image_url, hf_token=hf_token)
            record = {
                "id": shoe_id,
                "name": shoe_name,
                "image_url": image_url,
                "vector": vector,
                "processed_at": int(time.time()),
            }
            checkpoint["items"].append(record)
            save_checkpoint(output_path, checkpoint)
            done_now += 1
            print(f"[{idx}/{total}] Da xu ly: {shoe_name}")
        except Exception as exc:
            print(f"[{idx}/{total}] Loi voi {shoe_id} ({shoe_name}): {exc}")
        finally:
            # Chống rate-limit theo yêu cầu.
            time.sleep(HF_SLEEP_SECONDS)

    print(f"Hoan tat. Da luu: {output_path}")


if __name__ == "__main__":
    main()
