"""Reproducible phone artwork. Run: python FCM/tools/make_phone_art.py

Original employee art: FCM/imggen/generate.py (outside repository), TELEMARKETER
prompt, composed as e_telemarketer_final.png; original integration source:
FCM/imggen/integrate_media_line.py -> resize 289x450, JPEG quality 90.
Original phone composition: sibling FCM/imggen/phone_compose.py, grey-blue
#A6CBCB, white number circle. Those user-owned tools/assets remain read-only.
This generator uses the checked-in legacy JPEG as its immutable source, changes
only the employee ability-text rectangle, and changes only the token badge.
All locales previously shared one English card; new Chinese/English artwork
is explicit, while old saves still use the original employee/token images.
"""
from pathlib import Path
import json
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
IMAGES = ROOT / 'static/FCM/images'
ZH = '放置电话或更低级的广告，持续时间3回合'
SCALE = 4

def employee(lines, font_path, filename):
    source = Image.open(IMAGES / 'e_telemarketer_legacy.jpg').convert('RGB')
    image = source.resize((289*SCALE,450*SCALE),Image.Resampling.LANCZOS)
    # Reuse the card's own blank paper texture. No illustration, promotion,
    # badge, salary, title, or unrelated asset is regenerated.
    for y in range(300,354):
        image.paste(image.crop((40*SCALE,(355+(y-300)%16)*SCALE,251*SCALE,(356+(y-300)%16)*SCALE)),(40*SCALE,y*SCALE))
    draw = ImageDraw.Draw(image)
    size = 18*SCALE
    while True:
        font=ImageFont.truetype(font_path,size)
        if max(draw.textlength(line,font=font) for line in lines) <= 242*SCALE: break
        size -= 1
    for i,line in enumerate(lines):
        draw.text((144.5*SCALE,(313+i*24)*SCALE),line,font=font,anchor='mt',fill=(25,25,22))
    image.resize((289,450),Image.Resampling.LANCZOS).save(IMAGES/filename,quality=95,subsampling=0)

def tokens():
    for group in range(4):
        image=Image.open(IMAGES/'marketing30.jpg').convert('RGB').resize((800,400),Image.Resampling.LANCZOS)
        draw=ImageDraw.Draw(image)
        cx,cy,d=172*SCALE,30*SCALE,44*SCALE
        draw.ellipse((cx-d/2,cy-d/2,cx+d/2,cy+d/2),fill='white')
        text=f'{6+group}.5'; size=23*SCALE
        while True:
            font=ImageFont.truetype('C:/Windows/Fonts/arialbd.ttf',size)
            box=draw.textbbox((0,0),text,font=font)
            if box[2]-box[0]<=d*.74: break
            size-=1
        draw.text((cx-(box[2]-box[0])/2-box[0],cy-(box[3]-box[1])/2-box[1]),text,font=font,fill=(17,17,17))
        image.resize((200,100),Image.Resampling.LANCZOS).save(IMAGES/f'marketing_phone_{65+10*group}_v1.jpg',quality=95,subsampling=0)

def main():
    legacy=IMAGES/'e_telemarketer_legacy.jpg'
    if not legacy.exists(): legacy.write_bytes((IMAGES/'e_telemarketer.jpg').read_bytes())
    employee(['放置电话或更低级的广告，','持续时间3回合'],'C:/Windows/Fonts/simsun.ttc','e_telemarketer.jpg')
    employee(['Place phone or lower-level','advertising, duration 3 turns'],'C:/Windows/Fonts/times.ttf','e_telemarketer_en.jpg')
    tokens()
    print(json.dumps({'ability':ZH,'employeeSize':[289,450],'phoneSize':[200,100],'groups':[6.5,7.5,8.5,9.5],'countPerGroup':3},ensure_ascii=False))

if __name__=='__main__': main()
