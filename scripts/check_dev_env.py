from __future__ import annotations

import sys
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent.parent
BE_ENV = ROOT / "native-e-commerce-be" / ".env"
FE_ENV = ROOT / "native-e-commerce" / ".env"


def load_dotenv(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.is_file():
        return out
    text = path.read_text(encoding="utf-8")
    for raw in text.splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        if "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        val = val.strip().strip('"').strip("'")
        if key:
            out[key] = val
    return out


def print_ok(msg: str) -> None:
    print(f"  [OK]   {msg}")


def print_warn(msg: str) -> None:
    print(f"  [WARN] {msg}")


def print_fail(msg: str) -> None:
    print(f"  [FAIL] {msg}")


def is_https_url(url: str) -> bool:
    try:
        p = urlparse(url)
        return p.scheme.lower() == "https" and bool(p.netloc)
    except Exception:
        return False


def check_backend(d: dict[str, str]) -> bool:
    print("\n=== native-e-commerce-be (.env) ===")
    ok = True

    required = [
        "DATABASE_URL",
        "SECRET_KEY",
        "VNPAY_TMN_CODE",
        "VNPAY_HASH_SECRET",
        "VNPAY_PAYMENT_URL",
    ]
    for key in required:
        v = (d.get(key) or "").strip()
        if not v:
            print_fail(f"Missing or empty: {key}")
            ok = False
        else:
            print_ok(key)

    db = (d.get("DATABASE_URL") or "").strip()
    if db and not db.lower().startswith(("postgresql://", "postgres://")):
        print_warn("DATABASE_URL should be postgresql:// or postgres://")
    if db:
        print_ok("DATABASE_URL looks like Postgres")

    pay = (d.get("VNPAY_PAYMENT_URL") or "").strip()
    if pay:
        if "vnpayment" not in pay.lower():
            print_warn("VNPAY_PAYMENT_URL usually contains vnpayment (sandbox/production)")
        if not pay.lower().startswith("https://"):
            print_warn("VNPAY_PAYMENT_URL should use https://")

    pub = (d.get("VNPAY_PUBLIC_RETURN_BASE") or "").strip().rstrip("/")
    if not pub:
        print_warn(
            "VNPAY_PUBLIC_RETURN_BASE empty - Expo exp:// return will fail create-payment-url. "
            "Set ngrok HTTPS base (e.g. https://xxx.ngrok-free.dev)."
        )
    else:
        if not is_https_url(pub):
            print_fail("VNPAY_PUBLIC_RETURN_BASE must be a valid https:// URL")
            ok = False
        else:
            bridge = f"{pub}/api/v1/orders/vnpay-bridge"
            print_ok(f"VNPAY_PUBLIC_RETURN_BASE (bridge: {bridge})")

    if not (d.get("VNPAY_CLIENT_IP") or "").strip():
        print_warn("VNPAY_CLIENT_IP empty - backend will try auto LAN IP")

    mock = (d.get("VNPAY_ALLOW_MOCK") or "").strip().lower() in ("1", "true", "yes")
    if mock:
        print_ok("VNPAY_ALLOW_MOCK enabled (demo fake callback; disable in production)")

    return ok


def check_frontend(d: dict[str, str]) -> bool:
    print("\n=== native-e-commerce (.env) ===")
    ok = True
    sid = (d.get("EXPO_PUBLIC_STORE_ID") or "").strip()
    if not sid:
        print_fail("Missing EXPO_PUBLIC_STORE_ID")
        ok = False
    else:
        print_ok(f"EXPO_PUBLIC_STORE_ID={sid}")

    api = (d.get("EXPO_PUBLIC_API_URL") or "").strip()
    if not api:
        print_warn(
            "EXPO_PUBLIC_API_URL empty - dev may infer from Metro; release builds must set it."
        )
    else:
        if not api.lower().startswith("http"):
            print_fail("EXPO_PUBLIC_API_URL must be http:// or https://")
            ok = False
        else:
            print_ok("EXPO_PUBLIC_API_URL")
        if "/api/v1" not in api.rstrip("/"):
            print_warn("EXPO_PUBLIC_API_URL usually ends with /api/v1")

    port = (d.get("EXPO_PUBLIC_DEV_API_PORT") or "").strip()
    if port:
        print_ok(f"EXPO_PUBLIC_DEV_API_PORT={port}")

    if (d.get("EXPO_PUBLIC_VNPAY_MOCK") or "").strip().lower() in ("1", "true", "yes"):
        print_ok("EXPO_PUBLIC_VNPAY_MOCK enabled (pair with VNPAY_ALLOW_MOCK on API)")

    return ok

def main() -> int:
    print(f"Repo: {ROOT}")

    if not BE_ENV.is_file():
        print_fail(f"Missing file: {BE_ENV}")
        return 1
    if not FE_ENV.is_file():
        print_warn(f"Missing file: {FE_ENV} (backend only)")

    be = load_dotenv(BE_ENV)
    fe = load_dotenv(FE_ENV) if FE_ENV.is_file() else {}

    be_ok = check_backend(be)
    fe_ok = check_frontend(fe) if fe else True

    print()
    if be_ok and fe_ok:
        print("Result: required checks passed (see WARN above if any).")
        return 0
    print("Result: fix required FAIL items in .env and re-run.")
    return 1


if __name__ == "__main__":
    sys.exit(main())
