"""Tạo sẵn MP3 cho "máy chia ngữ pháp" (trang /grammar/home.html) bằng giọng Edge SunHi —
cùng giọng với hội thoại / bài nghe trong Kho giáo trình (tools/curriculum-tts/gen.py).

Cách dùng (cần Node + pip install edge-tts):
    python tools/grammar-tts/gen.py

- Danh sách câu lấy từ các từ gợi ý trong public/assets/js/grammar-conjugator-rules.js (qua list.js).
- MP3 lưu ở public/grammar/audio/<băm>.mp3, bảng tra public/grammar/audio/index.json: { "w": { "<câu>": "<file>" } }.
  Chạy lại chỉ tạo file còn thiếu và xoá file không còn dùng.
- Từ người học tự gõ (không có MP3) sẽ đọc qua tts-read.js: MP3 giáo trình → Google TTS.
"""
import asyncio, hashlib, json, os, subprocess, sys

import edge_tts

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(ROOT, 'public', 'grammar', 'audio')
VOICE = 'ko-KR-SunHiNeural'


def fname(text):
    return hashlib.sha1((VOICE + '|' + text).encode('utf-8')).hexdigest()[:16] + '.mp3'


async def make(text, path, sem):
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, VOICE).save(path + '.part')
                os.replace(path + '.part', path)
                return True
            except Exception as e:  # mạng chập chờn → thử lại
                if attempt == 3:
                    print('  LỖI', text, e)
                await asyncio.sleep(1.5 * (attempt + 1))
        return False


async def main():
    raw = subprocess.run(['node', os.path.join(HERE, 'list.js')], capture_output=True, check=True).stdout
    texts = json.loads(raw.decode('utf-8'))
    os.makedirs(OUT, exist_ok=True)
    index = {t: fname(t) for t in texts}
    todo = [(t, f) for t, f in index.items() if not os.path.exists(os.path.join(OUT, f))]
    print(f'{len(texts)} câu, cần tạo {len(todo)} MP3')
    sem = asyncio.Semaphore(6)
    ok = await asyncio.gather(*[make(t, os.path.join(OUT, f), sem) for t, f in todo])
    for (t, f), good in zip(todo, ok):
        if not good:
            index.pop(t, None)
    keep = set(index.values())
    for f in os.listdir(OUT):
        if f.endswith('.mp3') and f not in keep:
            os.remove(os.path.join(OUT, f))
    with open(os.path.join(OUT, 'index.json'), 'w', encoding='utf-8') as fh:
        json.dump({'w': index}, fh, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
    print('Xong:', sum(ok), 'file mới,', len(index), 'câu trong bảng tra')


asyncio.run(main())
