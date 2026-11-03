"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/Icons";
import { MODULOS } from "@/lib/catalog";
import { norm } from "@/lib/format";
import { feed, pulso, saudacao } from "@/lib/home";
import { can, firstView, inG, modOk } from "@/lib/permissions";
import { rotaPagina } from "@/lib/routes";
import { usuario, useApp } from "@/lib/store";
import type { AppState, ModuloId, User } from "@/lib/types";

interface Achado { tipo: string; t: string; s: string; href: string }

const ATALHOS: [string, ModuloId, string][] = [
  ["Central do dia", "garg", "hoje"],
  ["Painel de tarefas", "task", "task"],
  ["Pendências", "task", "pend"],
  ["Planos de ação", "radar", "rdd"],
  ["Dossiês de transição", "radar", "rdt"],
  ["Oportunidades", "radar", "rdo"],
  ["Pessoas", "cad", "cdp"],
  ["Empresas", "cad", "emp"],
];

function buscar(s: AppState, u: User, q: string, destinos: Achado[]): Achado[] {
  const n = norm(q).trim();
  if (!n) return [];
  const out = destinos.filter((x) => norm(x.t + " " + x.s).includes(n));
  s.companies
    .filter((c) => inG(u, c) && norm([c.n, c.cod, c.cnpj, c.fant].join(" ")).includes(n))
    .slice(0, 5)
    .forEach((c) => out.push({ tipo: "Empresa", t: c.n, s: (c.cod ? c.cod + " · " : "") + (c.cnpj || ""), href: modOk(u, "radar") ? rotaPagina("radar", "rdc", c.id) : "/cadastro/pessoas?empresa=" + c.id }));
  return out.slice(0, 8);
}

function Rosca({ partes }: { partes: [string, number, string][] }) {
  const C = 2 * Math.PI * 54;
  const tot = partes.reduce((a, p) => a + p[1], 0) || 1;
  let off = 0;
  return (
    <svg viewBox="0 0 140 140" width="140" height="140" role="img" aria-label="Distribuição por severidade">
      <circle cx="70" cy="70" r="54" fill="none" stroke="var(--ln)" strokeWidth="16" />
      {partes.map(([nome, v, cor]) => {
        const l = (C * v) / tot;
        const o = off;
        off += l;
        return v ? (
          <circle key={nome} cx="70" cy="70" r="54" fill="none" stroke={cor} strokeWidth="16" strokeDasharray={`${l} ${C - l}`} strokeDashoffset={-o} transform="rotate(-90 70 70)">
            <title>{nome + ": " + v + " · " + Math.round((v / tot) * 100) + "%"}</title>
          </circle>
        ) : null;
      })}
      <text x="70" y="68" textAnchor="middle" fontSize="26" fontWeight="800" fill="currentColor">{partes.reduce((a, p) => a + p[1], 0)}</text>
      <text x="70" y="86" textAnchor="middle" fontSize="10" fill="var(--mut)">em aberto</text>
    </svg>
  );
}

export default function Inicio() {
  const s = useApp();
  const router = useRouter();
  const [agora, setAgora] = useState<Date | null>(null);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);

  useEffect(() => {
    setAgora(new Date());
    const t = setInterval(() => setAgora(new Date()), 15_000);
    return () => clearInterval(t);
  }, []);

  const u = s ? usuario(s) : null;
  const mods = useMemo(() => (u ? MODULOS.filter((m) => modOk(u, m.id)).map((m) => ({ ...m, v: firstView(u, m.id) || m.primeira })) : []), [u]);
  const atalhos = useMemo(() => (u ? ATALHOS.filter((a) => can(u, a[2])) : []), [u]);
  const destinos: Achado[] = useMemo(
    () => [
      ...mods.map((m) => ({ tipo: "Ir para", t: m.nome, s: m.desc, href: rotaPagina(m.id, m.v) })),
      ...atalhos.map((a) => ({ tipo: "Ir para", t: a[0], s: "Atalho", href: rotaPagina(a[1], a[2]) })),
    ],
    [mods, atalhos],
  );

  if (!s || !u) return null;
  const achados = buscar(s, u, q, destinos);
  const itens = feed(s, u);
  const p = pulso(s, u);
  const total = p.partes.reduce((a, x) => a + x[1], 0);
  const trilha = (s.trail || []).slice(0, 4);
  const hora = agora ? agora.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) : "";
  const data = agora ? agora.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" }) : "";

  return (
    <div className="home">
      <section className="hero" aria-label="Boas-vindas">
        <small>Director Contábil</small>
        <h1>{saudacao(agora?.getHours())}, {u.n.split(" ")[0]}.</h1>
        <div className="meta">
          <span className="h">{hora}</span>
          <span>{data.charAt(0).toUpperCase() + data.slice(1)}</span>
        </div>
        <div className="find">
          <input
            type="search"
            value={q}
            placeholder="Buscar empresa, página ou atalho…  (ou aperte F2 para trocar de empresa)"
            aria-label="Buscar"
            onChange={(e) => { setQ(e.target.value); setSel(0); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") { e.preventDefault(); setSel((sel + 1) % Math.max(1, achados.length)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((sel - 1 + achados.length) % Math.max(1, achados.length)); }
              else if (e.key === "Enter" && achados[sel]) router.push(achados[sel].href);
            }}
          />
          {q.trim() && (
            <div className="res" role="listbox">
              {achados.length ? achados.map((a, i) => (
                <Link key={a.tipo + a.t + i} href={a.href} className={i === sel ? "on" : ""} role="option" aria-selected={i === sel}>
                  <i>{a.tipo}</i><b>{a.t}</b><span className="mut sm">{a.s}</span>
                </Link>
              )) : <div className="mut">Nada encontrado. Tente o nome de uma empresa, “pessoas” ou “tarefas”.</div>}
            </div>
          )}
        </div>
      </section>

      <section className="hgrid" aria-label="Módulos">
        {mods.map((m) => (
          <Link key={m.id} href={rotaPagina(m.id, m.v)} className="mcard">
            <span className="ic"><Icon name={m.id} /></span>
            <b>{m.nome}</b>
            <span className="mut">{m.desc}</span>
          </Link>
        ))}
      </section>

      <div className="hcols">
        <section className="card" aria-label="Para hoje">
          <h3>Para hoje</h3>
          {itens.length ? itens.map((it, i) => (
            <Link key={i} href={it.href} className="fitem">
              <i style={{ background: it.cor }} />
              <span><small>{it.k}</small><b>{it.t}</b><span className="mut sm">{it.m}</span></span>
            </Link>
          )) : <div className="mut" style={{ padding: "10px 0" }}>Nada urgente por aqui. Bom trabalho! ✨</div>}
        </section>
        <section className="card" aria-label={p.titulo}>
          <h3>{p.titulo}</h3>
          {total ? (
            <div className="donut">
              <Rosca partes={p.partes} />
              <ul>{p.partes.map(([n, v, c]) => <li key={n}><i style={{ background: c }} /> {n}: <b>{v}</b></li>)}</ul>
            </div>
          ) : <div className="mut" style={{ padding: "10px 0" }}>Nenhum gargalo em aberto.</div>}
          {can(u, "dash") && <p style={{ marginBottom: 0 }}><Link href={p.href} className="tag">Abrir painel →</Link></p>}
        </section>
      </div>

      {trilha.length > 0 && (
        <section className="card" aria-label="Continue de onde parou">
          <h3>Continue de onde parou</h3>
          <div className="quick">
            {trilha.map((t) => (
              <Link key={t.k} className="chip" href={rotaPagina(t.m as ModuloId, t.v, t.c)}>{t.l}</Link>
            ))}
          </div>
        </section>
      )}

      <section className="card" aria-label="Atalhos">
        <h3>Atalhos</h3>
        <div className="quick">
          {atalhos.map((a) => <Link key={a[0]} className="chip" href={rotaPagina(a[1], a[2])}>{a[0]}</Link>)}
          <button type="button" className="chip" onClick={() => window.dispatchEvent(new Event("gerp:f2"))}>⇄ Trocar empresa <kbd>F2</kbd></button>
        </div>
      </section>
    </div>
  );
}
