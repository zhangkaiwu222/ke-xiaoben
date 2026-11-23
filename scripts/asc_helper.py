"""ASC API helper（带重试，401 多为间歇性）。"""
import json, os, subprocess, time
import jwt

KEY_ID = "5Q5D8MM52M"
ISSUER = "eee92558-8a20-44d9-9ca3-49dbf97b9d15"
APP_ID = "6832416586"
KEY = open("secrets/AuthKey_5Q5D8MM52M.p8").read()
ENV = dict(os.environ, HTTPS_PROXY="http://127.0.0.1:7890")
BASE = "https://api.appstoreconnect.apple.com/v1"


def _tok():
    now = int(time.time())
    return jwt.encode(
        {"iss": ISSUER, "iat": now, "exp": now + 1200, "aud": "appstoreconnect-v1"},
        KEY, algorithm="ES256", headers={"kid": KEY_ID, "typ": "JWT"},
    )


def api(path, method="GET", body=None, retries=6):
    url = BASE + path
    last = None
    for i in range(retries):
        cmd = ["curl", "-s", "-X", method, url, "-H", "Authorization: Bearer " + _tok()]
        if body is not None:
            cmd += ["-H", "Content-Type: application/json", "-d", json.dumps(body)]
        out = subprocess.run(cmd, capture_output=True, text=True, env=ENV).stdout
        try:
            d = json.loads(out) if out.strip() else {}
        except Exception:
            d = {"raw": out[:300]}
        errs = d.get("errors")
        if not errs:
            return d
        last = d
        if errs[0].get("status") not in ("401", "500", "502", "503"):
            return d
        time.sleep(2)
    return last