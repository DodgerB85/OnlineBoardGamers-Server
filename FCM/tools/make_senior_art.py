"""Lossless SBD ability-text update; original JPEG is immutable artwork source.
Only (27,326)-(264,378) is replaced. PNG preserves every other decoded pixel,
including title, illustration, salary and 1x. Chinese/English follow phone cards.
Run: python FCM/tools/make_senior_art.py (Pillow required).
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops
import json
ROOT=Path(__file__).resolve().parents[1]
IMAGES=ROOT/'static/FCM/images'
BOX=(27,326,264,378)
COPY={
 'zh':['放置房屋、花园、公寓或 OUT 标记','OUT 仅限无需求的房屋或公寓，','建筑保留原位'],
 'en':['Place a house, garden, apartment','or OUT marker','OUT: only houses or apartments with no demand;','buildings stay in place.']}
def main():
    source=Image.open(IMAGES/'e_senior_business_developer_x1.jpg').convert('RGB')
    report=[]
    for lang,lines in COPY.items():
        image=source.copy();x0,y0,x1,y1=BOX;scale=4
        patch=Image.new('RGB',((x1-x0)*scale,(y1-y0)*scale))
        # Reuse the blank paper strip immediately below the old description.
        for y in range(y1-y0):
            strip=source.crop((x0,375+(y%3),x1,376+(y%3))).resize(((x1-x0)*scale,scale))
            patch.paste(strip,(0,y*scale))
        draw=ImageDraw.Draw(patch)
        fontpath='C:/Windows/Fonts/simsun.ttc' if lang=='zh' else 'C:/Windows/Fonts/times.ttf'
        size=(13 if lang=='zh' else 12)*scale
        while True:
            font=ImageFont.truetype(fontpath,size)
            if max(draw.textlength(line,font=font) for line in lines)<=patch.width-4*scale:break
            size-=1
        step=(y1-y0)/len(lines)
        for n,line in enumerate(lines):draw.text((patch.width/2,(n*step+1)*scale),line,font=font,anchor='mt',fill=(25,25,22))
        image.paste(patch.resize((x1-x0,y1-y0),Image.Resampling.LANCZOS),(x0,y0))
        file=IMAGES/f'e_senior_business_developer_x1_out_{lang}.png';image.save(file)
        difference=ImageChops.difference(source,image);difference.paste((0,0,0),BOX)
        assert difference.getbbox() is None
        report.append({'language':lang,'image':file.name,'lines':lines,'fontSize':size/scale,'outsideAbilityBoxPixelsIdentical':True,'size':image.size,'box':BOX})
    print(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
