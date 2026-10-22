from pathlib import Path
import json,re,html,math
from PIL import Image,ImageDraw,ImageFont
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(__file__).resolve().parent
ASSETS=ROOT/"assets/images/qa-thumbs-pastel-20261022"
SOURCE=Path(r"C:\Users\owner\Pictures\beetle-qa-pastel-20261022/source")
OUT.joinpath("before").mkdir(exist_ok=True)
items=json.loads(OUT.joinpath("colors.json").read_text(encoding="utf-8-sig"))
source=ROOT.joinpath("test-tools.html").read_text(encoding="utf-8")
cards={}
for card in re.findall(r'<a class="tool-card"[^>]*>.*?</a>',source,re.S):
 match=re.search(r'qa-thumbs-v2/([^"/]+)\.webp',card)
 if not match: continue
 desc=re.search(r'class="tool-desc">(.*?)</p>',card,re.S)
 if desc: cards[match.group(1)]=html.unescape(desc.group(1))
assert len(items)==14 and all(item["slug"] in cards for item in items)
for i,item in enumerate(items):
 for j in [i-1 if i%3 else -1,i-3]:
  if j>=0: assert item["color"]!=items[j]["color"],"repeated neighboring color"
 p=ASSETS/(item["slug"]+".png")
 with Image.open(p) as im:
  assert abs(im.width/im.height-16/9)<.02
  rgb=im.convert("RGB")
  rgb.resize((1200,675),Image.Resampling.LANCZOS).save(p.with_suffix(".jpg"),quality=88,optimize=True)
  rgb.resize((720,405),Image.Resampling.LANCZOS).save(p.with_suffix(".webp"),quality=86,method=6)
 with Image.open(SOURCE/(item["slug"]+".png")) as im:
  im.convert("RGB").resize((720,405),Image.Resampling.LANCZOS).save(OUT/"before"/(item["slug"]+".webp"),quality=82,method=6)
fontdir=Path("C:/Windows/Fonts")
def font(n,bold=False):return ImageFont.truetype(str(fontdir/("meiryob.ttc" if bold else "meiryo.ttc")),n)
def wrapped(draw,text,f,width):
 lines=[];line=""
 for token in re.findall(r"[A-Za-z0-9_]+(?:[._-][A-Za-z0-9_]+)*|.",text):
  if draw.textlength(line+token,font=f)>width:
   if token in "。、，．！？）］」』" and line: lines.append(line[:-1]);line=line[-1]+token
   else: lines.append(line);line=token
  else:line+=token
 if line:lines.append(line)
 return lines
W=1040;LEFT=86;CW=276;GAP=20;TOP=142;CH=400;ROWS=math.ceil(len(items)/3)
im=Image.new("RGB",(W,TOP+ROWS*(CH+GAP)+32),"#f8f6f2");d=ImageDraw.Draw(im)
d.text((LEFT,26),"検証ツール ｜ 背景5色の改善案",font=font(27,True),fill="#082336")
legend=[("淡い水色","#E5F0F7"),("ミント","#E7F2E8"),("薄桃","#F7E6E8"),("ラベンダー","#EEE8F7"),("クリーム","#FBF2D9")]
for n,(name,color) in enumerate(legend):
 x=LEFT+n*156
 d.rounded_rectangle((x,85,x+22,107),5,fill=color,outline="#d3d8de")
 d.text((x+32,82),name,font=font(14),fill="#647582")
htmlcards=[]
sheet=Image.new("RGB",(W,124+ROWS*205+28),"#f8f6f2");sd=ImageDraw.Draw(sheet)
sd.text((LEFT,24),"検証ツール ｜ 背景5色の改善案",font=font(27,True),fill="#082336")
sd.text((LEFT,74),"カードごとに固定した淡い配色",font=font(16),fill="#647582")
for i,item in enumerate(items):
 slug=item["slug"];title=item["title"];desc=cards[slug]
 x=LEFT+(i%3)*(CW+GAP);y=TOP+(i//3)*(CH+GAP)
 d.rounded_rectangle((x,y,x+CW,y+CH),12,fill="white",outline="#e4e0d8",width=1)
 with Image.open(ASSETS/(slug+".jpg")) as image:
  thumb=image.resize((CW,155),Image.Resampling.LANCZOS)
 mask=Image.new("L",(CW,CH),0);ImageDraw.Draw(mask).rounded_rectangle((0,0,CW-1,CH-1),12,fill=255)
 panel=Image.new("RGB",(CW,CH),"white");panel.paste(thumb,(0,0));im.paste(panel,(x,y),mask)
 yy=y+173
 for line in wrapped(d,title,font(14,True),CW-40):
  d.text((x+20,yy),line,font=font(14,True),fill="#082336");yy+=23
 yy+=14
 for line in wrapped(d,desc,font(14),CW-40):
  d.text((x+20,yy),line,font=font(14),fill="#7b858d");yy+=25
 assert yy<y+CH-40,(slug,yy,y)
 d.text((x+20,y+CH-43),"詳しく見る →",font=font(14,True),fill="#c65133")
 sy=124+(i//3)*205
 sheet.paste(thumb,(x,sy))
 sd.text((x,sy+162),title,font=font(13,True),fill="#082336")
 htmlcards.append('<article><img data-slug="'+slug+'" src="../../assets/images/qa-thumbs-pastel-20261022/'+slug+'.webp" alt="'+html.escape(title)+'" width="720" height="405"><div><h2>'+html.escape(title)+'</h2><p>'+html.escape(desc)+'</p><span>詳しく見る →</span></div></article>')
im.save(OUT/"overview.png")
sheet.save(OUT/"thumbnails.png")
css="*{box-sizing:border-box}body{margin:0;background:#f8f6f2;color:#082336;font-family:Meiryo,sans-serif}main{max-width:868px;margin:36px auto}h1{font-size:28px}header p{color:#647582}.controls{display:flex;gap:10px;margin:24px 0}button{border:1px solid #c6ced2;background:white;color:#082336;border-radius:6px;padding:10px 18px;font:inherit;cursor:pointer}button[aria-pressed=true]{background:#082336;color:white}.legend{display:flex;flex-wrap:wrap;gap:18px;margin-bottom:24px}.legend span{display:flex;align-items:center;font-size:13px;gap:7px}.legend i{width:18px;height:18px;border:1px solid #d3d8de;border-radius:4px}.grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}article{background:white;border:1px solid #e4e0d8;border-radius:12px;overflow:hidden;display:flex;flex-direction:column}article img{display:block;width:100%;height:auto;aspect-ratio:16/9}article div{padding:20px;display:flex;flex-direction:column;flex:1;min-height:242px}h2{font-size:14px;margin:0}article p{font-size:14px;line-height:1.8;color:#7b858d}article span{margin-top:auto;padding-top:15px;font-size:13px;font-weight:bold;color:#c65133}@media(max-width:600px){main{margin:24px 16px}h1{font-size:22px}.grid{grid-template-columns:1fr}article{flex-direction:row}article img{width:104px;flex-shrink:0;object-fit:contain;align-self:flex-start}article div{padding:16px;min-height:0}article p{font-size:13px}}"
js="document.querySelectorAll('[data-version]').forEach(b=>b.addEventListener('click',()=>{const before=b.dataset.version==='before';document.querySelectorAll('[data-version]').forEach(x=>x.setAttribute('aria-pressed',x===b?'true':'false'));document.querySelectorAll('img[data-slug]').forEach(img=>{img.src=(before?'before/':'../../assets/images/qa-thumbs-pastel-20261022/')+img.dataset.slug+'.webp';});}));"
legendhtml="".join('<span><i style="background:'+color+'"></i>'+name+'</span>' for name,color in legend)
OUT.joinpath("index.html").write_text('<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>検証ツール 背景5色の比較</title><style>'+css+'</style><main><header><h1>検証ツール｜背景5色の改善案</h1><p>同じ文字・モチーフを保ち、背景に変化を付けた14枚です。</p></header><div class="controls"><button data-version="after" aria-pressed="true">変更後：淡い5色</button><button data-version="before" aria-pressed="false">変更前：ベージュ</button></div><div class="legend">'+legendhtml+'</div><section class="grid">'+"".join(htmlcards)+'</section></main><script>'+js+'</script></html>',encoding="utf-8")
webpbytes=sum((ASSETS/(x["slug"]+".webp")).stat().st_size for x in items)
result={"cards":14,"palette":5,"webp_bytes":webpbytes,"webp_size":[720,405],"jpg_size":[1200,675],"overview_size":list(im.size)}
OUT.joinpath("verification.json").write_text(json.dumps(result,indent=2),encoding="utf-8")
print(json.dumps(result))

