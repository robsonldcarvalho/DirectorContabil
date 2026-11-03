"use client";
import { useState } from "react";
import Pagina from "@/components/Pagina";
import { dfmt } from "@/lib/format";
import { nomeEmpresa, vincularSocio } from "@/lib/people";
import { mutate } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { AppState } from "@/lib/types";

const QUALIFICACOES = ["Sócio", "Sócio-Administrador", "Administrador", "Procurador"];

function Conteudo({ s }: { s: AppState }) {
  const [n, setN] = useState("");
  const [doc, setDoc] = useState("");
  const [c, setC] = useState(String(s.companies[0]?.id ?? ""));
  const [q, setQ] = useState("Sócio");
  const [d, setD] = useState("");

  function salvar() {
    if (!n.trim()) return toast("Informe o nome do sócio.");
    if (!c) return toast("Escolha a empresa.");
    mutate((st) => vincularSocio(st, n.trim(), doc.trim(), Number(c), q, d));
    setN(""); setDoc(""); setD("");
    toast("✔ Vínculo salvo");
  }

  return (
    <>
      <div className="top"><h2>Sócios</h2></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Cadastrar ou vincular sócio</h3>
        <div className="form">
          <div>
            <label className="lb" htmlFor="sn">Nome</label>
            <input id="sn" className="inp" list="socios-lista" value={n} onChange={(e) => setN(e.target.value)} />
            <datalist id="socios-lista">{s.partners.map((p) => <option key={p.id} value={p.n} />)}</datalist>
          </div>
          <div><label className="lb" htmlFor="sd">CPF ou CNPJ</label><input id="sd" className="inp" placeholder="Opcional" value={doc} onChange={(e) => setDoc(e.target.value)} /></div>
          <div>
            <label className="lb" htmlFor="sc">Empresa</label>
            <select id="sc" className="inp" value={c} onChange={(e) => setC(e.target.value)}>{s.companies.map((x) => <option key={x.id} value={x.id}>{x.n} · G{x.g}</option>)}</select>
          </div>
          <div>
            <label className="lb" htmlFor="sq">Qualificação</label>
            <select id="sq" className="inp" value={q} onChange={(e) => setQ(e.target.value)}>{QUALIFICACOES.map((z) => <option key={z}>{z}</option>)}</select>
          </div>
          <div><label className="lb" htmlFor="se">Data de entrada</label><input id="se" className="inp" type="date" value={d} onChange={(e) => setD(e.target.value)} /></div>
          <div style={{ alignSelf: "end" }}><button className="btn" type="button" onClick={salvar}>Salvar vínculo</button></div>
        </div>
      </div>
      <div className="card tw">
        <table className="t">
          <thead><tr><th>Sócio</th><th>Documento</th><th>Empresas vinculadas</th><th>Vincular</th></tr></thead>
          <tbody>
            {s.partners.map((p) => {
              const livres = s.companies.filter((x) => !p.vs.some((v) => v.c === x.id));
              return (
                <tr key={p.id}>
                  <td>{p.n}</td>
                  <td>{p.doc || "—"}</td>
                  <td>
                    {p.vs.map((v) => (
                      <span className="tag" key={v.c} style={{ display: "inline-block", margin: 2 }}>
                        {nomeEmpresa(s, v.c)} · {v.q || v.fn}{v.d ? " · desde " + dfmt(v.d) : ""}{" "}
                        <button type="button" aria-label="Desvincular" style={{ border: 0, background: "none", cursor: "pointer", color: "inherit" }} onClick={() => mutate((st) => { const x = st.partners.find((z) => z.id === p.id)!; x.vs = x.vs.filter((z) => z.c !== v.c); })}>✕</button>
                      </span>
                    ))}
                    {!p.vs.length && "—"}
                  </td>
                  <td>
                    {livres.length > 0 && (
                      <select className="inp" aria-label={"Vincular " + p.n} value="" onChange={(e) => { const id = Number(e.target.value); if (id) mutate((st) => { st.partners.find((z) => z.id === p.id)!.vs.push({ c: id, q: "Sócio", d: "" }); }); }}>
                        <option value="">Vincular a…</option>
                        {livres.map((x) => <option key={x.id} value={x.id}>{x.n}</option>)}
                      </select>
                    )}
                  </td>
                </tr>
              );
            })}
            {!s.partners.length && <tr><td colSpan={4} className="mut">Nenhum sócio cadastrado ainda.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function SociosPage() {
  return <Pagina chave="soc">{(s) => <Conteudo s={s} />}</Pagina>;
}
