"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import Avatar from "@/components/Avatar";
import Pagina from "@/components/Pagina";
import PersonDrawer from "@/components/PersonDrawer";
import { digs, semGrupo, waUrl } from "@/lib/format";
import { empresasSemContato, filtrar, funcoesUsadas, nomeEmpresa, PES, PESC, vFn } from "@/lib/people";
import type { AppState, Pes } from "@/lib/types";

function Card({ s, x, abrir }: { s: AppState; x: Pes; abrir: (k: string) => void }) {
  const r = x.r;
  const vs = r.vs || [];
  const w = waUrl(r.wpp || r.tel);
  return (
    <article className="pc" tabIndex={0} role="button" aria-label={"Abrir ficha de " + r.n} onClick={() => abrir(x.k)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(x.k); } }}>
      <div className="h">
        <Avatar k={x.k} nome={r.n} size={44} />
        <div style={{ minWidth: 0 }}>
          <b className="n">{r.n}</b>
          <div className="mut sm">{r.cargo || (x.s ? "Sócio" : "Sem cargo informado")}</div>
        </div>
      </div>
      <div className="emp">
        {vs.slice(0, 2).map((v) => (
          <div className="lin" key={v.c}><span>{semGrupo(nomeEmpresa(s, v.c))}</span><em>{vFn(v)}{v.prin ? " ★" : ""}</em></div>
        ))}
        {!vs.length && <div className="mut sm">Sem empresa vinculada</div>}
        {vs.length > 2 && <div className="mut sm">+{vs.length - 2} empresa{vs.length > 3 ? "s" : ""}</div>}
      </div>
      <div className="acts" onClick={(e) => e.stopPropagation()}>
        {w && <a href={w} target="_blank" rel="noopener noreferrer" aria-label={"WhatsApp de " + r.n}>WhatsApp</a>}
        {r.em && <a href={"mailto:" + r.em} aria-label={"E-mail de " + r.n}>E-mail</a>}
        {r.tel && <a href={"tel:" + digs(r.tel)} aria-label={"Ligar para " + r.n}>Ligar</a>}
      </div>
    </article>
  );
}

function Conteudo({ s }: { s: AppState }) {
  const sp = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [funcao, setFuncao] = useState("");
  const [empresa, setEmpresa] = useState(sp.get("empresa") || "");
  const [ficha, setFicha] = useState<string | null>(sp.get("ficha"));

  /* vindo do F2 / do Radar (?empresa=…  ?ficha=…) */
  useEffect(() => {
    const e = sp.get("empresa");
    if (e !== null) setEmpresa(e);
    const f = sp.get("ficha");
    if (f !== null) setFicha(f);
  }, [sp]);

  const fechar = () => {
    setFicha(null);
    if (sp.get("ficha") !== null) router.replace("/cadastro/pessoas");
  };

  const P = PES(s);
  const lista = filtrar(s, { q, funcao, empresa });
  const semPessoa = empresasSemContato(s).length;
  const comPrincipal = s.companies.filter((c) => PESC(s, c.id).some((x) => x.prin)).length;
  const socios = P.filter((x) => (x.r.vs || []).some((v) => /Sócio/.test(vFn(v)))).length;
  const funcoes = funcoesUsadas(s);
  const K = (n: string | number, l: string) => <div className="kpi"><b>{n}</b><span>{l}</span></div>;

  return (
    <>
      <div className="top">
        <h2>Pessoas</h2>
        <button className="btn" type="button" onClick={() => setFicha("")}>＋ Nova pessoa</button>
      </div>
      <div className="kpis">
        {K(P.length, "pessoas cadastradas")}
        {K(socios, "sócios")}
        {K(comPrincipal + " de " + s.companies.length, "empresas com contato principal")}
        {K(semPessoa, "empresas sem pessoa vinculada")}
      </div>
      <div className="toolbar">
        <input className="inp" type="search" placeholder="Buscar por nome, cargo, e-mail, telefone ou empresa" aria-label="Buscar pessoas" value={q} onChange={(e) => setQ(e.target.value)} />
        <select className="inp" aria-label="Filtrar por empresa" value={empresa} onChange={(e) => setEmpresa(e.target.value)}>
          <option value="">Todas as empresas</option>
          {s.companies.map((c) => <option key={c.id} value={c.id}>{c.n}</option>)}
        </select>
      </div>
      <div className="chips" style={{ margin: "10px 0 14px" }} role="group" aria-label="Filtrar por função">
        {[["", "Todas"], ...funcoes.map((f) => [f, f]), ...(P.some((x) => !(x.r.vs || []).length) ? [["-", "Sem empresa"]] : [])].map(([v, l]) => (
          <button key={v} type="button" className={"chip " + (funcao === v ? "on" : "")} aria-pressed={funcao === v} onClick={() => setFuncao(v)}>{l}</button>
        ))}
      </div>
      {lista.length ? (
        <div className="pgrid">{lista.map((x) => <Card key={x.k} s={s} x={x} abrir={setFicha} />)}</div>
      ) : (
        <div className="card empty">
          <b style={{ fontSize: 16 }}>Nenhuma pessoa encontrada</b>
          <div className="mut" style={{ margin: "6px 0 14px" }}>{P.length ? "Ajuste a busca ou os filtros." : "Cadastre a primeira pessoa para montar as fichas."}</div>
          {!P.length && <button className="btn" type="button" onClick={() => setFicha("")}>＋ Nova pessoa</button>}
        </div>
      )}
      {ficha !== null && <PersonDrawer key={ficha} s={s} k={ficha} onClose={fechar} onSaved={(k) => setFicha(k)} />}
    </>
  );
}

export default function PessoasPage() {
  return (
    <Pagina chave="cdp">
      {(s) => (
        <Suspense fallback={null}>
          <Conteudo s={s} />
        </Suspense>
      )}
    </Pagina>
  );
}
