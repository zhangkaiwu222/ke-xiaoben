"""修复 3.1.2 拒绝：在 App 描述里补上 Apple 标准 EULA 链接（每个本地化）。"""
import sys, json
sys.path.insert(0, 'scripts')
from asc_helper import api

VERSION = "b7f4ad81-4601-40ea-9d43-d6c5b082f47e"  # 1.0.1（被拒版本，可直接编辑后重提）
EULA = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/"

APPEND = {
    "zh-Hans": (
        "\n\n使用条款 (EULA)：" + EULA + "\n"
        "隐私政策：https://zhangkaiwu222.github.io/ke-xiaoben/privacy/"
    ),
    "en-US": (
        "\n\nTerms of Use (EULA): " + EULA + "\n"
        "Privacy Policy: https://zhangkaiwu222.github.io/ke-xiaoben/privacy/"
    ),
}

locs = api("/appStoreVersions/%s/appStoreVersionLocalizations" % VERSION).get("data", [])
for loc in locs:
    a = loc["attributes"]
    code = a["locale"]
    desc = a.get("description") or ""
    if EULA in desc:
        print(code, "已含 EULA 链接，跳过")
        continue
    new_desc = desc.rstrip() + APPEND[code]
    r = api("/appStoreVersionLocalizations/%s" % loc["id"], "PATCH", {"data": {
        "type": "appStoreVersionLocalizations", "id": loc["id"],
        "attributes": {"description": new_desc}}})
    if "errors" in r:
        print(code, "FAIL", json.dumps(r, ensure_ascii=False)[:400])
    else:
        print(code, "OK，描述长度", len(desc), "->", len(new_desc))
