"""Tạo sẵn MP3 phát âm cho giáo trình (từ vựng + hội thoại + bài nghe) bằng giọng Edge TTS.

Cách dùng (cần: pip install edge-tts):
    python tools/curriculum-tts/gen.py <giao-trinh.json> [<giao-trinh-2.json> ...]

- File giáo trình là bản xuất "vht-curriculum" (hoặc file bài nghe "vht-curriculum-listening").
- Từ vựng đọc bằng SunHi; câu hội thoại phân vai theo speakers.json
  (F = SunHi, M = InJoon).
- MP3 lưu ở public/lesson/audio/<băm>.mp3 (tên băm theo giọng + câu,
  nên chạy lại chỉ tạo file còn thiếu). Bảng tra public/lesson/audio/index.json:
      { "w": { "<từ>": "<file>" }, "d": { "<nhân vật>|<câu>": "<file>" } }
  Trang học (curriculum-learn.js) tra bảng này trước, không có thì đọc bằng giọng trình duyệt.
"""
import asyncio, hashlib, json, os, re, sys

import edge_tts

sys.stdout.reconfigure(encoding="utf-8", errors="replace")

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OUT = os.path.join(ROOT, 'public', 'lesson', 'audio')
VOICES = {'F': 'ko-KR-SunHiNeural', 'M': 'ko-KR-InJoonNeural'}
NARRATION = re.compile(r'^\(.*\)$')


def fname(voice, text):
    return hashlib.sha1((voice + '|' + text).encode('utf-8')).hexdigest()[:16] + '.mp3'


async def make(voice, text, path, sem):
    async with sem:
        for attempt in range(4):
            try:
                await edge_tts.Communicate(text, voice).save(path + '.part')
                os.replace(path + '.part', path)
                return True
            except Exception as e:  # mạng chập chờn → thử lại
                if attempt == 3:
                    print('  LỖI', voice, text, e)
                await asyncio.sleep(1.5 * (attempt + 1))
        return False


async def main(files):
    speakers = json.load(open(os.path.join(os.path.dirname(__file__), 'speakers.json'), encoding='utf-8'))
    os.makedirs(OUT, exist_ok=True)
    idx_path = os.path.join(OUT, 'index.json')
    index = json.load(open(idx_path, encoding='utf-8')) if os.path.exists(idx_path) else {'w': {}, 'd': {}}
    jobs = {}  # file -> (voice, text)
    for f in files:
        cur = json.load(open(f, encoding='utf-8'))
        for les in cur['lessons']:
            for w in les.get('words', []):
                t = (w.get('word') or '').strip()
                if t:
                    fn = fname(VOICES['F'], t); index['w'][t] = fn; jobs[fn] = (VOICES['F'], t)
            for d in les.get('dialogues', []) + les.get('listening', []):
                for ln in d.get('lines', []):
                    t = (ln.get('kr') or '').strip()
                    if not t or NARRATION.match(t):
                        continue
                    s = (ln.get('s') or '').strip()
                    v = VOICES[speakers.get(s, 'F')]
                    fn = fname(v, t); index['d'][s + '|' + t] = fn; jobs[fn] = (v, t)
    todo = [(fn, v, t) for fn, (v, t) in jobs.items() if not os.path.exists(os.path.join(OUT, fn))]
    print(f'{len(jobs)} câu/từ, cần tạo {len(todo)} file')
    sem = asyncio.Semaphore(4)
    ok = await asyncio.gather(*(make(v, t, os.path.join(OUT, fn), sem) for fn, v, t in todo))
    # bỏ khỏi bảng tra những file không tạo được để trang học dùng giọng dự phòng
    for k in ('w', 'd'):
        index[k] = {key: fn for key, fn in sorted(index[k].items()) if os.path.exists(os.path.join(OUT, fn))}
    with open(idx_path, 'w', encoding='utf-8') as fp:
        json.dump(index, fp, ensure_ascii=False, separators=(',', ':'))
    print(f'Xong: tạo mới {sum(ok)}/{len(todo)}; bảng tra có {len(index["w"])} từ, {len(index["d"])} câu hội thoại')


if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    asyncio.run(main(sys.argv[1:]))
