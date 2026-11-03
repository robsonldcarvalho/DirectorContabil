# Roteiro de migração: HTML estático → Next.js/React

Estratégia: **migração incremental** ("strangler"). O app já é um projeto Next.js de verdade; as telas
ainda não portadas continuam funcionando pelo motor original embutido, e cada módulo é trocado por React
quando estiver pronto — sem big-bang e sem perder dados no caminho.

## O que já é React / TypeScript

| Área | Situação | Onde |
|---|---|---|
| Dados, tipos e persistência (`gerp6`, backup `gerp6_bk`, validação, seed) | ✅ | `lib/types.ts`, `lib/store.ts` |
| Login (PBKDF2 compatível, bloqueio após 5 erros, "manter conectado", sessão) | ✅ | `lib/auth.ts`, `app/login` |
| Aviso de senha padrão + troca de senha | ✅ | `components/SenhaModal.tsx` |
| Permissões por página + abas do Radar (`can`, `modOk`, padrão por perfil) | ✅ | `lib/permissions.ts`, `lib/catalog.ts` |
| Shell: menu lateral por módulo, tema claro/escuro, menu do usuário, responsivo | ✅ | `components/Shell.tsx` |
| Tela inicial "mesa de comando" (busca, módulos, para hoje, gargalos, trilha) | ✅ | `app/(app)/inicio` |
| Troca rápida de empresa (F2) com destino (Radar/Gargalos/Tarefas/Cadastro) | ✅ | `components/Palette.tsx` |
| Cadastro › Pessoas (cards, filtros, ficha, vínculos, contato principal) | ✅ | `app/(app)/cadastro/pessoas`, `PersonDrawer` |
| Cadastro › Empresas (cadastro por CNPJ, honorário) | ✅ parcial | `app/(app)/cadastro/empresas` |
| Cadastro › Sócios | ✅ | `app/(app)/cadastro/socios` |
| Cadastro › Usuários + matriz de permissões | ✅ | `app/(app)/cadastro/usuarios`, `PermissionMatrix` |

## O que ainda roda no motor legado (iframe)

Gargalos, Tarefas e Radar (todas as páginas e abas do cliente). Eles funcionam como antes, com os mesmos
dados e permissões, mas dentro do shell React (menu, F2, login e usuário são do React).

## Pendências dentro do que já foi portado

- **Empresas**: gerenciar documentos da empresa (modal "Documentos") e importar sócios da consulta de CNPJ
  ainda não foram portados — hoje só existem no legado (`gerp6` preserva os dados).
- **Perfil do usuário**: editar foto/nome pelo menu do usuário (legado: "Editar perfil").
- **Radar › Perfil do cliente**: o card de pessoas ainda é o do legado; a ficha completa abre no React
  (o legado redireciona `cdFicha()/goCad()` para `/cadastro/pessoas?ficha=…`).
- **Cadastro automático de usuário** no primeiro login com senha `1234` (existia no legado) **foi removido
  de propósito**: qualquer pessoa com e-mail do domínio criava uma conta. Usuários agora só nascem em
  Cadastro › Usuários.

## Ordem sugerida para portar o resto

1. **Gargalos** (menor): `dash`, `mon`, `hoje` → listas e filtros sobre `S.items`. Remover `gargalos` do
   `LegacyFrame` quando as 3 telas + BI/Relatórios estiverem prontas.
2. **Tarefas**: matriz mensal por empresa (`S.tasks["<emp>|<ano>|<mês>"]` é um bitmask por tarefa).
3. **Radar**: começar por Dashboard e Clientes (lista), depois a ficha do cliente aba a aba
   (Vida, Reuniões, Visão geral, Perfil, Diagnóstico, Saúde, Oportunidades, Plano de ação, Histórico,
   Documentos, Dossiê). As rotas `/radar/rdc/<empresa>/<aba>` já existem — basta trocar o iframe pela página.

Para portar um módulo: crie as páginas em `src/app/(app)/<módulo>/…`, ajuste `motor: "react"` em
`lib/catalog.ts` (`MODULOS`) e apague o que sobrar do módulo em `public/legacy/index.html`.
Quando o último módulo sair, `public/legacy/`, `LegacyFrame` e `scripts/build-legacy.py` podem ser removidos.

## Próximo passo estrutural (fora desta etapa)

Hoje tudo é `localStorage`. Para multiusuário de verdade é preciso um backend (API + banco) e autenticação no
servidor: o `store.ts` é a única camada que lê/grava dados, então a troca fica concentrada ali
(`carregar`/`gravar`), e as permissões passam a ser validadas no servidor.

## Como o motor legado foi adaptado

`scripts/build-legacy.py` pega o HTML original e acrescenta, no fim do arquivo, o modo `?embed=1`:
esconde menu/login/barra do usuário, roteia por hash, avisa a tela atual por `postMessage`, entrega F2 e
Cadastro ao React e recarrega os dados quando o React grava. O restante do arquivo é o original, intacto.
