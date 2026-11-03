"use client";
import Link from "next/link";
import type { ChangeEvent } from "react";
import { useMemo, useState } from "react";
import Pagina from "@/components/Pagina";
import { cnpjOk, digs, maskCnpj, norm } from "@/lib/format";
import { auditar, mutate } from "@/lib/store";
import { PESC } from "@/lib/people";
import { toast } from "@/lib/toast";
import type { AppState } from "@/lib/types";

interface Rascunho {
  cnpj: string; cod: string; razao: string; fant: string; g: string; sit: string; cnae: string; porte: string; end: string; tel: string; mail: string;
}
const VAZIO: Rascunho = { cnpj: "", cod: "", razao: "", fant: "", g: "01", sit: "", cnae: "", porte: "", end: "", tel: "", mail: "" };

/** consulta pública (BrasilAPI); se falhar, o usuário preenche manualmente */
async function consultarCnpj(cnpj: string): Promise<Partial<Rascunho> | "naoencontrado" | null> {
  try {
    const r = await fetch("https://brasilapi.com.br/api/cnpj/v1/" + digs(cnpj));
    if (r.status === 404) return "naoencontrado";
    if (!r.ok) return null;
    const j = await r.json();
    const end = [j.descricao_tipo_de_logradouro, j.logradouro, j.numero, j.bairro, j.municipio && j.municipio + "/" + j.uf, j.cep].filter(Boolean).join(", ");
    return {
      razao: j.razao_social || "",
      fant: j.nome_fantasia || "",
      sit: j.descricao_situacao_cadastral || "",
      cnae: j.cnae_fiscal_descricao || "",
      porte: j.porte || "",
      end,
      tel: j.ddd_telefone_1 || "",
      mail: (j.email || "").toLowerCase(),
    };
  } catch {
    return null;
  }
}

function Conteudo({ s }: { s: AppState }) {
  const [d, setD] = useState<Rascunho>(VAZIO);
  const [msg, setMsg] = useState("Informe o CNPJ para preencher os dados automaticamente.");
  const [busca, setBusca] = useState("");
  const set = (k: keyof Rascunho) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setD({ ...d, [k]: e.target.value });

  async function buscar() {
    if (!cnpjOk(d.cnpj)) return setMsg("CNPJ inválido. Confira os 14 dígitos.");
    if (s.companies.some((c) => digs(c.cnpj) === digs(d.cnpj))) return setMsg("Este CNPJ já está cadastrado.");
    setMsg("Consultando…");
    const r = await consultarCnpj(d.cnpj);
    if (r === "naoencontrado") return setMsg("CNPJ não encontrado na base pública.");
    if (!r) return setMsg("A consulta automática não está disponível agora. Preencha os campos manualmente.");
    setD((x) => ({ ...x, ...r }));
    setMsg("Dados preenchidos (Receita Federal via BrasilAPI). Revise e escolha o grupo.");
  }

  function salvar() {
    if (!cnpjOk(d.cnpj)) return setMsg("Informe um CNPJ válido.");
    if (!(d.razao || d.fant)) return setMsg("Informe a razão social ou o nome fantasia.");
    if (s.companies.some((c) => digs(c.cnpj) === digs(d.cnpj))) return setMsg("Este CNPJ já está cadastrado.");
    mutate((st) => {
      const id = Date.now();
      st.companies.push({
        id, cod: d.cod, cnpj: maskCnpj(d.cnpj), n: d.fant || d.razao, razao: d.razao, sit: d.sit,
        seg: [d.cnae, d.porte].filter(Boolean).join(" · ") || "—", end: d.end, tel: d.tel, mail: d.mail, g: d.g, docs: [],
      });
      auditar(st, "Cadastrou", "Empresa " + (d.fant || d.razao));
    });
    setD(VAZIO);
    setMsg("Informe o CNPJ para preencher os dados automaticamente.");
    toast("✔ Empresa cadastrada");
  }

  const lista = useMemo(() => {
    const q = norm(busca).trim();
    return s.companies.filter((c) => !q || norm([c.n, c.cod, c.cnpj].join(" ")).includes(q));
  }, [s.companies, busca]);

  const F = (k: keyof Rascunho, l: string, w = false) => (
    <div className={w ? "w" : ""}><label className="lb" htmlFor={"e_" + k}>{l}</label><input id={"e_" + k} className="inp" value={d[k]} onChange={set(k)} /></div>
  );

  return (
    <>
      <div className="top"><h2>Empresas</h2></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>Nova empresa</h3>
        <div className="form">
          <div className="w">
            <label className="lb" htmlFor="e_cnpj">CNPJ</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input id="e_cnpj" className="inp" inputMode="numeric" placeholder="00.000.000/0000-00" value={d.cnpj} onChange={(e) => setD({ ...d, cnpj: maskCnpj(e.target.value) })} onKeyDown={(e) => e.key === "Enter" && buscar()} />
              <button className="btn" type="button" onClick={buscar}>Buscar dados</button>
            </div>
            <div className="mut sm" style={{ marginTop: 4 }} role="status">{msg}</div>
          </div>
          {F("cod", "Código")}{F("razao", "Razão social")}{F("fant", "Nome fantasia")}
          <div><label className="lb" htmlFor="e_g">Grupo</label><select id="e_g" className="inp" value={d.g} onChange={set("g")}><option value="01">Grupo 01</option><option value="02">Grupo 02</option></select></div>
          {F("sit", "Situação cadastral")}{F("cnae", "Atividade principal (CNAE)")}{F("porte", "Porte e regime")}{F("end", "Endereço", true)}{F("tel", "Telefone")}{F("mail", "E-mail")}
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
          <button className="btn" type="button" onClick={salvar}>Salvar empresa</button>
          <button className="btn g" type="button" onClick={() => setD(VAZIO)}>Limpar</button>
        </div>
      </div>

      <div className="toolbar" style={{ gridTemplateColumns: "1fr" }}>
        <input className="inp" type="search" placeholder="Buscar empresa por nome, código ou CNPJ" aria-label="Buscar empresa" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      <div className="card tw" style={{ marginTop: 10 }}>
        <table className="t">
          <thead><tr><th>Cód.</th><th>Empresa</th><th>CNPJ</th><th>Grupo</th><th>Situação</th><th>Pessoas</th><th>Honorário mensal (R$)</th><th>Documentos</th></tr></thead>
          <tbody>
            {lista.map((c) => (
              <tr key={c.id}>
                <td>{c.cod || "—"}</td>
                <td>{c.n}</td>
                <td>{c.cnpj || "—"}</td>
                <td>{c.g === "ambos" ? "Ambos" : "Grupo " + c.g}</td>
                <td>{c.sit || "—"}</td>
                <td>
                  {PESC(s, c.id).map((p, i) => (
                    <span key={p.k}>{i ? ", " : ""}<Link href={"/cadastro/pessoas?ficha=" + p.k} style={{ color: "var(--ac2)", fontWeight: 600 }}>{p.r.n.split(" ")[0]}</Link> <span className="mut sm">({p.fn})</span></span>
                  ))}
                  {!PESC(s, c.id).length && "—"}
                </td>
                <td>
                  <input className="inp" type="number" min={0} step={10} style={{ width: 110 }} aria-label={"Honorário mensal de " + c.n} defaultValue={c.fee || ""} onBlur={(e) => { const v = Number(e.target.value) || 0; if (v !== (c.fee || 0)) mutate((st) => { st.companies.find((z) => z.id === c.id)!.fee = v; }); }} />
                </td>
                <td>{(c.docs || []).length}</td>
              </tr>
            ))}
            {!lista.length && <tr><td colSpan={8} className="mut">Nenhuma empresa encontrada.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function EmpresasPage() {
  return <Pagina chave="emp">{(s) => <Conteudo s={s} />}</Pagina>;
}
