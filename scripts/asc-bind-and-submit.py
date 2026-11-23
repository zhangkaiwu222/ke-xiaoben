"""把版本 1.0.1 与两个订阅绑定到同一个审核提交批次。
用法: python .cm-research/bind-and-submit.py [--submit]
默认只绑定不提交，加 --submit 才真正提审。
"""
import sys, json
sys.path.insert(0, 'scripts')
from asc_helper import api, APP_ID

VERSION = "b7f4ad81-4601-40ea-9d43-d6c5b082f47e"
SUBS = ["6832451442", "6832451341"]
# reviewSubmissionItems 只接受「版本」资源：subscriptionVersions / subscriptionGroupVersions
GROUP_VERSION = "43a856ec-f52c-4756-9770-09effcb7775d"
DO_SUBMIT = "--submit" in sys.argv


def show(tag, r):
    if "errors" in r:
        print(tag, "FAIL", json.dumps(r, ensure_ascii=False)[:900])
        return False
    print(tag, "OK")
    return True


# 1) 复用处于 READY_FOR_REVIEW/UNRESOLVED_ISSUES 的批次，否则新建
d = api("/apps/%s/reviewSubmissions" % APP_ID)
open_rs = [s for s in d.get("data", [])
           if s["attributes"].get("state") in ("READY_FOR_REVIEW", "UNRESOLVED_ISSUES", "WAITING_FOR_REVIEW")]
if open_rs:
    rs = open_rs[0]["id"]
    print("复用已有批次", rs, open_rs[0]["attributes"].get("state"))
else:
    r = api("/reviewSubmissions", "POST", {"data": {
        "type": "reviewSubmissions",
        "attributes": {"platform": "IOS"},
        "relationships": {"app": {"data": {"type": "apps", "id": APP_ID}}}}})
    if not show("创建审核批次", r):
        sys.exit(1)
    rs = r["data"]["id"]
    print("批次 ID:", rs)

# 2) 已存在的 items
existing = api("/reviewSubmissions/%s/items" % rs).get("data", [])
print("现有条目数:", len(existing))


def add_item(rel_name, rel_type, rid, label):
    body = {"data": {"type": "reviewSubmissionItems",
                     "relationships": {
                         "reviewSubmission": {"data": {"type": "reviewSubmissions", "id": rs}},
                         rel_name: {"data": {"type": rel_type, "id": rid}}}}}
    r = api("/reviewSubmissionItems", "POST", body)
    if show("加入 " + label, r):
        return True
    # 已在批次中视为成功
    txt = json.dumps(r, ensure_ascii=False)
    if "STATE_ERROR" in txt and ("already" in txt.lower() or "IN_REVIEW" in txt):
        print("   （可能已存在）")
    return False


add_item("appStoreVersion", "appStoreVersions", VERSION, "版本 1.0.1")

# 订阅群组版本（首个订阅群组必须随版本提审）
add_item("subscriptionGroupVersion", "subscriptionGroupVersions", GROUP_VERSION, "订阅群组版本 课消本 Pro")

# 各订阅的版本资源
for sid in SUBS:
    vs = api("/subscriptions/%s/versions" % sid).get("data", [])
    if not vs:
        print("订阅无版本资源", sid); continue
    vid = vs[0]["id"]
    add_item("subscriptionVersion", "subscriptionVersions", vid, "订阅版本 " + sid)

# 3) 校验批次内容
print("\n=== 批次条目 ===")
it = api("/reviewSubmissions/%s/items" % rs).get("data", [])
for x in it:
    print(" ", x["id"][:40], x["attributes"])
print("条目总数:", len(it))
print("REVIEW_SUBMISSION_ID=" + rs)

if DO_SUBMIT:
    r = api("/reviewSubmissions/%s" % rs, "PATCH", {"data": {
        "type": "reviewSubmissions", "id": rs, "attributes": {"submitted": True}}})
    show("提交审核", r)
    print(json.dumps(api("/reviewSubmissions/%s" % rs).get("data", {}).get("attributes", {}), ensure_ascii=False))
else:
    print("\n（未提交。确认无误后加 --submit 执行提审）")