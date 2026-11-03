"use client";
import { useState } from "react";
import type { ChangeEvent } from "react";
import Avatar from "@/components/Avatar";
import Pagina from "@/components/Pagina";
import PermissionMatrix from "@/components/PermissionMatrix";
import { pwSet, validarEmail } from "@/lib/auth";
import { SETORES } from "@/lib/catalog";
import { DOMINIO } from "@/lib/config";
import { accDiff } from "@/lib/permissions";
import { auditar, mutate, usuario } from "@/lib/store";
import { toast } from "@/lib/toast";
import type { AppState, Perfil, User } from "@/lib/types";

interface Form {
  id: number;
  n: string;
  s: string;
  s2: string;
  g: string;
  r: Perfil;
  email: string;
  senha: string;
}
const NOVO: Form = { id: 0, n: "", s: SETORES[0], s2: "", g: "01", r: "user", email: "", senha: "" };

const emailPadrao = (n: string) =>
  n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "") + DOMINIO;

function Conteudo({ s }: { s: AppState }) {
  const eu = usuario(s);
  const [f, setF] = useState<Form>(NOVO);
  const [acc, setAcc] = useState<Record<string, boolean>>({});
  const [apagar, setApagar] = useState(0);
  const [erro, setErro] = useState("");
  const [busy, setBusy] = useState(false);
  const editando = f.id !== 0;
  /* usuário "de referência" p/ calcular o padrão do perfil escolhido */
  const ref = { ...(s.users.find((u) => u.id === f.id) || ({ id: 0, n: f.n, s: f.s, r: f.r, g: f.g, email: f.email } as User)), r: f.r } as User;

  const editar = (u: User) => {
    setF({ id: u.id, n: u.n, s: u.s, s2: (u.ss || [])[1] || "", g: u.g, r: u.r, email: u.email, senha: "" });
    setAcc({ ...(u.acc || {}) });
    setErro("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const limpar = () => { setF(NOVO); setAcc({}); setErro(""); };

  async function salvar() {
    setErro("");
    const n = f.n.trim();
    if (!n) return setErro("Informe o nome.");
    const email = (f.email.trim() || emailPadrao(n)).toLowerCase();
    const e = validarEmail(email);
    if (e) return setErro(e);
    if (s.users.some((x) => x.email.toLowerCase() === email && x.id !== f.id)) return setErro("Este e-mail já está em uso.");
    if (f.senha && f.senha.trim().length < 4) return setErro("A senha precisa ter ao menos 4 caracteres.");
    if (editando) {
      const atual = s.users.find((u) => u.id === f.id)!;
      if (atual.r === "gestor" && f.r !== "gestor" && s.users.filter((u) => u.r === "gestor").length < 2) return setErro("Mantenha pelo menos um gestor.");
    }
    setBusy(true);
    const tmp = { id: f.id } as User;
    if (f.senha) await pwSet(tmp, f.senha);
    else if (!editando) await pwSet(tmp, "1234");
    const ss = f.s2 && f.s2 !== f.s ? [f.s, f.s2] : [f.s];
    const diff = f.r === "gestor" ? {} : accDiff(ref, acc);
    mutate((st) => {
      if (editando) {
        const u = st.users.find((x) => x.id === f.id)!;
        Object.assign(u, { n, s: f.s, ss, g: f.g, r: f.r, email, acc: diff });
        if (tmp.ph) { u.salt = tmp.salt; u.ph = tmp.ph; u.def = tmp.def; delete u.pin; }
        auditar(st, "Alterou", "Usuário " + n);
      } else {
        st.users.push({ id: Date.now(), n, s: f.s, ss, g: f.g, r: f.r, email, acc: diff, salt: tmp.salt, ph: tmp.ph, def: tmp.def });
        auditar(st, "Cadastrou", "Usuário " + n);
      }
    });
    setBusy(false);
    toast(editando ? "✔ Usuário atualizado" : "✔ Usuário criado (senha padrão: 1234)");
    limpar();
  }

  function excluir(u: User) {
    if (u.id === eu.id) return toast("Você não pode excluir o próprio usuário.");
    if (u.r === "gestor" && s.users.filter((x) => x.r === "gestor").length < 2) return toast("Mantenha pelo menos um gestor.");
    mutate((st) => { st.users = st.users.filter((x) => x.id !== u.id); auditar(st, "Excluiu", "Usuário " + u.n); });
    setApagar(0);
    toast("Usuário excluído");
  }

  const set = (k: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value } as Form);

  return (
    <>
      <div className="top"><h2>Usuários</h2></div>
      <div className="card" style={{ marginBottom: 16 }}>
        <h3>{editando ? "Editar usuário" : "Novo usuário"}</h3>
        <div className="form">
          <div><label className="lb" htmlFor="un">Nome</label><input id="un" className="inp" value={f.n} onChange={set("n")} /></div>
          <div><label className="lb" htmlFor="us">Setor</label><select id="us" className="inp" value={f.s} onChange={set("s")}>{SETORES.map((z) => <option key={z}>{z}</option>)}</select></div>
          <div><label className="lb" htmlFor="us2">Setor adicional (opcional)</label><select id="us2" className="inp" value={f.s2} onChange={set("s2")}><option value="">Nenhum</option>{SETORES.map((z) => <option key={z}>{z}</option>)}</select></div>
          <div><label className="lb" htmlFor="ug">Grupo</label><select id="ug" className="inp" value={f.g} onChange={set("g")}><option value="01">Grupo 01</option><option value="02">Grupo 02</option><option value="ambos">Todos os grupos</option></select></div>
          <div><label className="lb" htmlFor="ur">Perfil</label><select id="ur" className="inp" value={f.r} onChange={set("r")}><option value="user">Colaborador</option><option value="gestor">Gestor</option></select></div>
          <div><label className="lb" htmlFor="ue">E-mail de acesso</label><input id="ue" className="inp" type="email" placeholder={f.n ? emailPadrao(f.n) : "nome" + DOMINIO} value={f.email} onChange={set("email")} /></div>
          <div><label className="lb" htmlFor="up">{editando ? "Nova senha (opcional)" : "Senha inicial"}</label><input id="up" className="inp" type="password" autoComplete="new-password" placeholder={editando ? "Deixe em branco para manter" : "Padrão: 1234"} value={f.senha} onChange={set("senha")} /></div>
        </div>
        <div style={{ marginTop: 16 }}>
          {f.r === "gestor" ? (
            <div className="mut sm">O perfil Gestor sempre tem acesso a todas as páginas — não há o que configurar.</div>
          ) : (
            <PermissionMatrix user={ref} draft={acc} onChange={setAcc} />
          )}
        </div>
        <div className="lerr" role="alert" style={{ marginTop: 8 }}>{erro}</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button className="btn" type="button" onClick={salvar} disabled={busy}>{editando ? "Salvar alterações" : "Criar usuário"}</button>
          {editando && <button className="btn g" type="button" onClick={limpar}>Cancelar</button>}
        </div>
      </div>

      <div className="card">
        {s.users.map((u) => (
          <div className="userrow" key={u.id}>
            <Avatar k={"u" + u.id} nome={u.n} />
            <div style={{ minWidth: 0 }}>
              <b>{u.n}</b> {u.r === "gestor" ? <span className="tag">Gestor</span> : <span className="tag">Colaborador</span>}
              <div className="mut sm">{(u.ss || [u.s]).join(" + ")} · {u.g === "ambos" ? "Todos os grupos" : "Grupo " + u.g} · {u.email}{u.def ? " · senha padrão" : ""}</div>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <button className="btn g sm" type="button" onClick={() => editar(u)}>Editar</button>
              {apagar === u.id ? (
                <>
                  <button className="btn sm" type="button" onClick={() => excluir(u)}>Confirmar</button>
                  <button className="btn g sm" type="button" onClick={() => setApagar(0)}>Não</button>
                </>
              ) : (
                <button className="btn g sm" type="button" onClick={() => setApagar(u.id)}>Excluir</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

export default function UsuariosPage() {
  return <Pagina chave="usr">{(s) => <Conteudo s={s} />}</Pagina>;
}
