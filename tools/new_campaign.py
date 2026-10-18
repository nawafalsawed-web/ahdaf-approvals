#!/usr/bin/env python3
"""Add a campaign to the approval platform from a folder of finished videos.

  python3 tools/new_campaign.py SLUG "العنوان" SRC_DIR --platforms tt,ig,snap [--client X] [--date "نوفمبر 2026"]

Makes 720p web copies + posters in campaigns/SLUG/, writes campaign.json (captions = file names,
edit them after), and adds the campaign to campaigns.json. Re-running on the same SLUG rebuilds media
but keeps the captions, goals and extra fields already in campaign.json.
Platforms: tt tiktok, ig instagram, snap snapchat, x, li linkedin.
"""
import argparse, json, os, re, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PLATS = {'tt', 'ig', 'snap', 'x', 'li'}
VIDEO = re.compile(r'\.(mp4|mov|m4v)$', re.I)


def probe(path, entries, stream='v:0'):
    out = subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', stream,
                                   '-show_entries', entries, '-of', 'default=nw=1:nk=1', path], text=True)
    return out.split()


def sdr_source(path, tmp):
    """iPhone HDR (HLG/PQ) looks washed out after a plain ffmpeg encode; avconvert tone-maps it."""
    trc = (probe(path, 'stream=color_transfer') or [''])[0]
    if trc not in ('arib-std-b67', 'smpte2084'):
        return path
    out = os.path.join(tmp, os.path.basename(path) + '.sdr.mov')
    subprocess.run(['avconvert', '-s', path, '-o', out, '-p', 'Preset1920x1080', '--replace'], check=True,
                   capture_output=True)
    return out


def build(src, dst_v, dst_c, tmp):
    s = sdr_source(src, tmp)
    d = float(subprocess.check_output(['ffprobe', '-v', 'error', '-show_entries', 'format=duration',
                                       '-of', 'csv=p=0', s], text=True))
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', s,
                    '-vf', 'scale=720:1280:force_original_aspect_ratio=decrease,pad=720:1280:(ow-iw)/2:(oh-ih)/2',
                    '-c:v', 'h264_videotoolbox', '-b:v', '1.8M', '-maxrate', '2.5M', '-profile:v', 'high',
                    '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', dst_v], check=True)
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-ss', str(min(d / 3, 4)), '-i', s, '-frames:v', '1',
                    '-vf', 'scale=540:-1', '-q:v', '3', dst_c], check=True)
    return round(d, 1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug'); ap.add_argument('title'); ap.add_argument('src')
    ap.add_argument('--platforms', default='tt,ig')
    ap.add_argument('--client', default=''); ap.add_argument('--date', default='')
    ap.add_argument('--status', default='active', choices=['active', 'archived'])
    a = ap.parse_args()
    if not re.fullmatch(r'[a-z0-9-]{2,40}', a.slug):
        sys.exit('slug: a-z 0-9 - only (2-40 chars), it is part of the link and the approval ids')
    plats = a.platforms.split(',')
    if not set(plats) <= PLATS:
        sys.exit(f'unknown platform in {plats}; use {sorted(PLATS)}')
    files = sorted(f for f in os.listdir(a.src) if VIDEO.search(f))
    if not files:
        sys.exit('no videos in ' + a.src)

    base = os.path.join(ROOT, 'campaigns', a.slug)
    os.makedirs(os.path.join(base, 'v'), exist_ok=True); os.makedirs(os.path.join(base, 'c'), exist_ok=True)
    cj = os.path.join(base, 'campaign.json')
    C = json.load(open(cj)) if os.path.exists(cj) else {}
    old = {it['i']: it for it in C.get('items', [])}
    items = []
    with tempfile.TemporaryDirectory() as tmp:
        for i, f in enumerate(files, 1):
            d = build(os.path.join(a.src, f), f'{base}/v/{i}.mp4', f'{base}/c/{i}.jpg', tmp)
            it = old.get(i, {'i': i, 't': os.path.splitext(f)[0]})
            it['d'] = d; items.append(it)
            print(f'{i:02d} {f} {d}s', flush=True)
    C.update({'title': a.title, 'client': a.client or C.get('client', ''), 'date': a.date or C.get('date', ''),
              'status': a.status, 'platforms': plats, 'items': items, 'rev': str(int(C.get('rev', '0')) + 1)})
    C.setdefault('intro', 'المحتوى معروض كما سيظهر على المنصات، جاهز للتعميد.')
    json.dump(C, open(cj, 'w'), ensure_ascii=False, indent=1)

    idx_path = os.path.join(ROOT, 'campaigns.json')
    idx = [c for c in json.load(open(idx_path)) if c['slug'] != a.slug]
    idx.insert(0, {'slug': a.slug, 'title': a.title, 'client': C['client'], 'date': C['date'], 'status': a.status,
                   'platforms': plats, 'count': len(items), 'cover': 'c/1.jpg'})
    json.dump(idx, open(idx_path, 'w'), ensure_ascii=False, indent=1)
    print(f'done: campaign.html?c={a.slug}')


if __name__ == '__main__':
    main()
