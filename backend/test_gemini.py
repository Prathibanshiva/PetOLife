from dotenv import load_dotenv
load_dotenv()
import os, json, urllib.request, urllib.error

key = os.getenv("GEMINI_API_KEY", "")
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={key}"
body = {
    "contents": [{"parts": [{"text": 'Reply with this exact JSON and nothing else: {"signals":[{"type":"event","text":"Mango was seen for a routine checkup on 2026-08-25.","source_record_ids":[7]}]}'}]}],
    "generationConfig": {"temperature": 0.4, "maxOutputTokens": 512}
}
data = json.dumps(body).encode("utf-8")
req = urllib.request.Request(url, data=data, headers={"Content-Type": "application/json"}, method="POST")
try:
    with urllib.request.urlopen(req, timeout=30) as resp:
        result = json.loads(resp.read().decode("utf-8"))
        text = result["candidates"][0]["content"]["parts"][0]["text"]
        print("SUCCESS:", text[:400])
except urllib.error.HTTPError as e:
    print("HTTP Error:", e.code, e.read().decode()[:500])
except Exception as e:
    print("Error:", type(e).__name__, str(e))
