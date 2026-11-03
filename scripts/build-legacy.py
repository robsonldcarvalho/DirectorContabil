#!/usr/bin/env python3
"""
Gera public/legacy/index.html a partir do HTML original (Gargalos_ERP.html)
acrescentando o "modo embutido" (?embed=1) usado pelo Next.js.

Uso:  python3 scripts/build-legacy.py caminho/para/Gargalos_ERP.html
(o arquivo gerado já está versionado em public/legacy/index.html; rode de novo só se o legado mudar)
"""
import pathlib, sys

src = pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "Gargalos_ERP.html")
out = pathlib.Path(__file__).resolve().parent.parent / "public" / "legacy" / "index.html"
s = src.read_text(encoding="utf-8")

CSS = """<style id="embedcss">
/* modo embutido: o menu, o login e a barra do usuário agora são do React */
html.embed #side,html.embed #sdhb,html.embed #sdov,html.embed #login,html.embed #home,html.embed .ub,html.embed #svbar{display:none!important}
html.embed .app{grid-template-columns:minmax(0,1fr)!important}
html.embed .app.hr{grid-template-columns:minmax(0,1fr) 340px!important}
html.embed #main{padding-top:20px!important}
</style>
"""

JS = r"""<script id="embedjs">
/* ===== Modo embutido (?embed=1): ponte com o app Next.js (mesmo domínio) ===== */
(function(){
 if(!/[?&]embed=1/.test(location.search)||parent===window)return;
 document.documentElement.classList.add("embed");
 try{sessionStorage.setItem("glg","1")}catch(x){}
 try{if(!S.auth)S.auth=true}catch(x){}
 var lg=document.getElementById("login");if(lg){lg.hidden=true}
 var send=function(m){try{parent.postMessage(m,"*")}catch(x){}};
 /* F2 e Cadastro são telas do React */
 csOpen=function(){send({t:"gerp-f2"})};
 goCad=function(k){send({t:"gerp-cad",k:k||""})};
 cdFicha=function(k){send({t:"gerp-cad",k:k||""})};
 /* #/<módulo>/<página>[/<empresa>[/<aba>]] */
 function ap(){
  var h=location.hash.replace(/^#\/?/,"");if(!h)return;
  var p=h.split("/"),m=p[0],v=p[1];if(!m||!v)return;
  S.mod=m;view=v;MO=false;try{MV=0;SUM=null;DOC=0}catch(x){}
  if(m=="radar"){if(v=="rdc"){RDC=p[2]?+p[2]:0;if(p[3])RDT=p[3]}}
  else if(m=="task"){TC=p[2]?+p[2]:0}
  else if(m=="garg"){F=Object.assign({},F,{c:p[2]?String(p[2]):""})}
  save();render();window.scrollTo(0,0)}
 /* a cada tela desenhada, avisa o React (URL + menu lateral) */
 var _r=render;
 render=function(){
  var r=_r.apply(this,arguments);
  try{
   var c=0,tab="";
   if(S.mod=="radar"&&view=="rdc"&&RDC){c=+RDC;tab=RDT||""}
   else if(S.mod=="task"&&TC){c=+TC}
   else if(S.mod=="garg"&&F&&F.c){c=+F.c}
   send({t:"gerp-nav",mod:S.mod,view:view,c:c,tab:tab})
  }catch(x){}
  return r};
 window.addEventListener("hashchange",ap);
 window.addEventListener("message",function(ev){var d=ev.data||{};if(d.t=="gerp-theme"){setTheme(d.theme);render()}else if(d.t=="gerp-reload"){S=load();render()}});
 window.addEventListener("storage",function(ev){if(ev.key=="gerp6"){S=load();render()}});
 ap();
})();
</script>
"""

end = "</style>\n</body>"
assert s.count(end) == 1, "marcador de fim do arquivo não encontrado"
s = s.replace(end, "</style>\n" + CSS + JS + "</body>")
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(s, encoding="utf-8")
print("gerado", out, len(s), "bytes")
