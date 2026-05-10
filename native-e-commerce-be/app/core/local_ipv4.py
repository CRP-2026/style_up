from __future__ import annotations

import socket

"""Phát hiện IPv4 LAN/outbound của máy chạy API"""


def get_preferred_outbound_ipv4() -> str | None:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.settimeout(0.25)
            s.connect(("8.8.8.8", 80))
            ip, _ = s.getsockname()
        if ip and not ip.startswith("127."):
            return ip
    except OSError:
        pass
    return None
