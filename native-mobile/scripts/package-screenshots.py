from pathlib import Path
import html
import json
import math
import zipfile
from PIL import Image, ImageDraw, ImageFont

root = Path(__file__).resolve().parents[1]
folder = root / 'screenshots'
screens = json.loads((folder / 'screens.json').read_text(encoding='utf-8'))
font_root = root / 'assets' / 'fonts'
title_font = ImageFont.truetype(str(font_root / 'font-6.ttf'), 25)
label_font = ImageFont.truetype(str(font_root / 'font-2.ttf'), 16)
small_font = ImageFont.truetype(str(font_root / 'font-0.ttf'), 15)
sheet_names = []
for batch in range(math.ceil(len(screens) / 6)):
    selected = screens[batch * 6:(batch + 1) * 6]
    width, cell_w, phone_w, phone_h = 1080, 344, 318, 688
    row_h = 758
    rows = math.ceil(len(selected) / 3)
    canvas = Image.new('RGB', (width, 112 + rows * row_h + 18), '#eef4fa')
    draw = ImageDraw.Draw(canvas)
    draw.text((25, 23), 'OHOINDIA · Native app screen previews', font=title_font, fill='#142344')
    draw.text((25, 62), f'Phone-sized React Native previews · Sample data · Sheet {batch + 1}', font=small_font, fill='#58708a')
    for offset, screen in enumerate(selected):
        col, row = offset % 3, offset // 3
        x, y = 24 + col * cell_w, 112 + row * row_h
        draw.rounded_rectangle((x, y, x + phone_w + 4, y + phone_h + 4), radius=18, fill='#cdd9e6')
        screenshot = Image.open(folder / screen['file']).convert('RGB')
        screenshot = screenshot.resize((phone_w, phone_h), Image.Resampling.LANCZOS)
        canvas.paste(screenshot, (x + 2, y + 2))
        text = f'{batch * 6 + offset + 1:02d}  {screen["title"]}'
        words, lines, current = text.split(), [], ''
        for word in words:
            next_line = (current + ' ' + word).strip()
            if draw.textlength(next_line, font=label_font) > phone_w:
                lines.append(current)
                current = word
            else:
                current = next_line
        if current:
            lines.append(current)
        for line_no, line in enumerate(lines):
            draw.text((x + 3, y + phone_h + 16 + line_no * 21), line, font=label_font, fill='#142344')
    sheet_name = f'overview-{batch + 1:02d}.jpg'
    canvas.save(folder / sheet_name, quality=94, optimize=True)
    sheet_names.append(sheet_name)

cards = '\n'.join(
    f'<figure><a href="{screen["file"]}" target="_blank"><img src="{screen["file"]}" alt="{html.escape(screen["title"])}" loading="lazy"></a><figcaption>{i + 1:02d} · {html.escape(screen["title"])}</figcaption></figure>'
    for i, screen in enumerate(screens)
)
index = f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OHOINDIA native app screenshots</title><style>
*{{box-sizing:border-box}}body{{margin:0;background:#f2f6fa;color:#142344;font:15px system-ui,sans-serif}}header{{padding:35px 4vw;background:#142f55;color:white}}h1{{margin:0 0 10px;font-size:30px}}p{{max-width:900px;line-height:1.6;color:#bed6e7}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;max-width:1500px;margin:auto;padding:30px}}figure{{margin:0;background:white;border-radius:16px;padding:12px;border:1px solid #dbe4ef}}img{{width:100%;display:block;border-radius:10px;border:1px solid #e5ebf3}}figcaption{{padding:14px 4px 5px;font-weight:650}}a{{color:#008bb8}}
</style></head><body><header><h1>OHOINDIA · Native app screenshots</h1><p>{len(screens)} phone-sized previews of the React Native components, using sample data. Click any image to open it at full size. These are browser previews, not Android emulator captures; native map and operating-system dialogs are not represented.</p></header><main>{cards}</main></body></html>'''
(folder / 'index.html').write_text(index, encoding='utf-8')
archive = root / 'native-app-screenshots.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as bundle:
    for artifact in sorted(folder.iterdir()):
        if artifact.suffix.lower() in {'.png', '.jpg', '.html', '.json'}:
            bundle.write(artifact, Path('oho-native-screenshots') / artifact.name)
print(f'Packaged {len(screens)} screenshots, {len(sheet_names)} overview sheets, gallery and ZIP.')
print(str(archive))
