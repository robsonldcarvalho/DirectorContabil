# Director Contábil · ERP (Next.js)

ERP do escritório — **Gargalos, Tarefas, Radar e Cadastro** — migrado do HTML estático para um projeto
**Next.js (App Router) + React + TypeScript**.

> Estado da migração: base, login, permissões, menu, início, troca de empresa (F2) e **Cadastro completo**
> já são React. **Gargalos, Tarefas e Radar** ainda rodam no motor original, embutido no projeto
> (mesmos dados, mesma sessão). Veja [`MIGRATION.md`](./MIGRATION.md) para o roteiro de portar cada módulo.

## Como rodar

Requisitos: Node 18.18+ (recomendado 20 ou 22).

```bash
npm install
npm run dev        # http://localhost:3000
```

Produção:

```bash
npm run build
npm run start
```

Verificação de tipos: `npm run typecheck`.

### Acesso inicial

Os dados de partida vêm de `src/data/seed.json` (as mesmas 86 empresas e 3 usuários do HTML original).

| Usuário | E-mail | Perfil | Senha inicial |
|---|---|---|---|
| Gestor | gestor@directorcontabil.com | Gestor (tudo) | `1234` |
| Angélica | angelica@directorcontabil.com | Colaborador · Grupo 01 | `1234` |
| Viviane | viviane@directorcontabil.com | Colaborador · Grupo 02 | `1234` |

No primeiro acesso o sistema pede para trocar a senha padrão.

> **Já usava o HTML?** Os dados do HTML ficam no `localStorage` do navegador, por domínio. Para levar para
> cá, abra o HTML antigo, copie o valor da chave `gerp6` (DevTools › Application › Local Storage) e cole
> na mesma chave em `http://localhost:3000`. O formato é idêntico.

## Estrutura

```
public/legacy/index.html     motor original (Gargalos, Tarefas, Radar) em modo embutido (?embed=1)
scripts/build-legacy.py      regenera o arquivo acima a partir do HTML original
src/
  app/
    layout.tsx, globals.css  casca HTML, tema claro/escuro, paleta Director
    page.tsx                 "/" → decide entre /login e /inicio
    login/                   login (e-mail @directorcontabil.com + senha)
    (app)/layout.tsx         área logada: AuthGate + Shell (menu, F2, toasts)
    (app)/inicio/            tela inicial "mesa de comando"
    (app)/cadastro/          Pessoas · Empresas · Sócios · Usuários (React)
    (app)/[mod]/[[...rest]]  /gargalos, /tarefas, /radar → motor legado em iframe
  components/                Shell, Palette (F2), PersonDrawer (ficha), PermissionMatrix, LegacyFrame…
  lib/
    types.ts                 modelo de dados (mesmo JSON do legado)
    store.ts                 store único + persistência em localStorage["gerp6"]
    auth.ts                  PBKDF2-SHA256 (compatível com os hashes do legado), bloqueio por tentativas
    permissions.ts, catalog.ts  catálogo de páginas/abas, can(), modOk(), padrão por perfil
    people.ts                pessoas + sócios, vínculos com empresas, contato principal
    routes.ts, home.ts       URLs ↔ páginas, "para hoje", rosca de gargalos, trilha
  data/seed.json             dados de partida
```

## Rotas

| Rota | O que abre |
|---|---|
| `/login` | Entrar |
| `/inicio` | Mesa de comando: saudação, busca, módulos, "para hoje", gargalos, trilha, atalhos |
| `/cadastro/pessoas` · `/empresas` · `/socios` · `/usuarios` | Cadastro (React) |
| `/gargalos/<pagina>` | `dash`, `mon`, `hoje`, `bi`, `rel`, `cfg` (legado) |
| `/tarefas/<pagina>[/<empresa>]` | `task`, `proc`, `pend`, `rel`, `horas`, `bi`, `cfg` (legado) |
| `/radar/<pagina>[/<empresa>[/<aba>]]` | ex.: `/radar/rdc/12/perfil` abre o Perfil do cliente 12 (legado) |

**F2** em qualquer tela abre a troca rápida de empresa (inclusive quando o foco está dentro do legado).

## Como o React e o legado convivem

1. O legado fica em `public/legacy/index.html` e abre dentro de um `<iframe>` do mesmo domínio.
2. Os dois leem e gravam a **mesma chave** `localStorage["gerp6"]` e a mesma sessão (`sessionStorage["glg"]`).
3. A navegação vai por hash (`#/radar/rdc/12/perfil`); o legado avisa por `postMessage` a cada tela e o
   React mantém URL e menu lateral em sincronia.
4. O React relê o `localStorage` antes de cada gravação (`mutate()` em `lib/store.ts`) para nunca
   sobrescrever o que o legado salvou — e o legado recarrega quando o React grava.

## Limitações conhecidas

- Os dados continuam **só no navegador** (localStorage), como no HTML original. Não há backend ainda.
- As permissões restringem a **interface**; sem servidor, não são uma barreira de segurança real.
- A consulta de CNPJ usa a BrasilAPI direto do navegador; se estiver indisponível, preencha manualmente.
