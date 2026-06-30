# Changelog - Waitless

## [0.4.0] - 2026-06-18

### Alterado

- RF-029 simplificado: aviso flutuante informativo (`ProtectionAdvisory`) no admin ? sem detec??o de adblock, sem modal bloqueante.

### Removido

- Probes (BlockAdBlock, DOM bait, Google), instrumenta??o de transporte, latch, `useFirestoreHealth`, modais bloqueantes, `IntegrityBanner`, deps `adblock-detect-react` e `blockadblock`, script `test:adblock`, QA `/adblock-probe-test.html`.

### Adicionado

- `ProtectionAdvisory` com **Entendido** (dismiss por sess?o) e **Saiba mais** (expande detalhes).
- Flag `NEXT_PUBLIC_SHOW_PROTECTION_ADVISORY` para testar em localhost.

## [0.3.44] - 2026-06-18

### Corrigido

- RF-029: modal permanecia aberto com Shields OFF ? `confirmAdBlockRecovery` limpa latch antes do SDK (grace + relatch se falhar).
- `waitForFirestoreClientRecovery` com retries estendidos (~10s) e reset de rede mais longo para Brave reconectar.
- `permission-denied` em probe de leitura passa a contar como conex?o OK (Firestore respondeu).

## [0.3.43] - 2026-06-18

### Corrigido

- RF-029: modal n?o fecha mais com Shields ON ? `confirmAdBlockRecovery` exige `waitForFirestoreClientRecovery` antes de limpar latch.
- Removido fechamento passivo do modal s? por probe XHR isolado.
- Probe Firestore est?vel (dupla amostra ~300ms) reduz falso positivo no modo transporte.

### Adicionado

- `RecoveryStatus.clientOk` e mensagem `adBlockerRecoveryClientPending` no modal.
- Teste stable probe em `ad-blocker-recovery.test.ts`.

## [0.3.42] - 2026-06-18

### Corrigido

- RF-029: recovery Brave Shields ? gate de transporte n?o exige probes Google/DOM quando monitor BAB inativo.
- Grace period (~2,5s) na instrumenta??o evita re-latch durante confirm de recovery.
- `finalizeFirestoreTransportRecovery` limpa latch de forma idempotente.

### Adicionado

- Feedback visual no modal ap?s retry falho (Firestore vs extens?o).
- `resolveRecoveryProbeClear`, `publishRecoveryProbeDebug`, testes `firestore-transport-grace.test.ts`.

## [0.3.41] - 2026-06-18

### Corrigido

- RF-029: recovery n?o re-latchava ap?s sucesso ? `clearFirestoreTransportLatchSilent` agora limpa `sessionStorage` e flag de janela.
- Modal fecha ao desativar Brave Shields: polling de auto-recovery (~3s) enquanto modal aberto (monitor BAB n?o detecta Shields).

## [0.3.40] - 2026-06-18

### Corrigido

- RF-029: modal fecha ao desativar uBlock ? latch stale n?o bloqueia mais pre-check de recovery.
- Monitor BAB bidirecional: `onNotDetected` dispara auto-recovery com debounce (~500ms).

### Adicionado

- `attemptAdBlockRecoveryFromClearProbes` ? recovery completo quando probes ativos passam.
- Testes `adblock-auto-recovery.test.ts`.

### Alterado

- `runRecoveryAdBlockCheck.clear` usa apenas `isRecoveryProbeClear` (latch s? em `firestoreBlocked` diagn?stico).
- `tryCloseModalAfterTransportClear` delega a auto-recovery quando latch ainda ativo.

## [0.3.39] - 2026-06-18

### Corrigido

- RF-029: bypass residual do retry ? `CLEARED_EVENT` intermedi?rio n?o fecha modal durante `confirmAdBlockRecovery`.
- Google img bait (`doubleclick`) passa a contar em `reachable` do probe de extens?o.
- `runRecoveryAdBlockCheck` falha quando latch/window de transporte ainda bloqueado, mesmo com XHR pontual OK.

### Adicionado

- `recoveryInFlightRef` no hook ? bloqueia `tryCloseModalAfterTransportClear` durante recheck.
- `clearFirestoreTransportLatchSilent` + `finalizeFirestoreTransportRecovery` ? CLEARED s? ap?s p?s-check OK.
- Testes de corrida `ad-blocker-recovery-race.test.ts`.

### Alterado

- Instrumenta??o cache bust `?v=0.3.39`; `window.__waitlessBuild` em `?adblock_debug=1`.

## [0.3.38] - 2026-06-18

### Corrigido

- RF-029: retry "J? desativei" n?o bypassa com uBlock ON ? `isRecoveryProbeClear` exige extens?o + Firestore.
- Modal n?o fecha passivamente quando transporte limpa sem probe ativo.

### Adicionado

- `ad-blocker-recovery-gate.ts` ? gate central do recovery.
- `adblock-extension-monitor.ts` ? monitor persistente BlockAdBlock (`onDetected`/`onNotDetected` ~3s).
- Testes: matriz `isRecoveryProbeClear`, monitor, sem?ntica de sync do hook.

### Alterado

- `confirmAdBlockRecovery` ? pre/pos-check com probe completo; re-latch se extens?o ou Firestore falhar ap?s clear.
- `useFirestoreHealth` ? `tryCloseModalAfterTransportClear` no evento cleared; monitor invalida recovery falsa.

## [0.3.37] - 2026-06-19

### Corrigido

- RF-029: recovery "Ja desativei" valida apenas canal Firestore (nao exige extensao off se long-polling OK).
- Modal fecha quando transporte limpa via evento, sem polling React duplicado.

### Alterado

- Gate adblock 100% reativo (eventos + useSyncExternalStore); removidos setInterval 500ms duplicados.
- `shouldShowTransportBlockModal`: modal so por transporte/latch (extensao -> IntegrityBanner).

### Refatorado

- IntegrityBanner: lazy mount do hook adblock-detect-react.

---

## [0.3.36] - 2026-06-19

### Adicionado

- `[Feature]` Integra??o da biblioteca `adblock-detect-react` para detec??o de integridade do DOM com maior precis?o contra falsos positivos (`IntegrityBanner` advisory no admin).

### Corrigido

- `[Fix]` Habilitado `experimentalForceLongPolling` na inst?ncia do Firebase (`initializeFirestore`) para garantir conectividade em tempo real em navegadores com bloqueadores severos.

### Alterado

- RF-029: modal bloqueante apenas para falha de transporte Firestore; extens?o adblock ? banner advisory.

---

## [0.3.35] - 2026-06-19

### Alterado

- RF-029: retry "Ja desativei" roda teste ativo explicito; modal some se passar e nao reabre por checks background; bloqueio live reabre.

---

## [0.3.34] - 2026-06-19

### Corrigido

- RF-029: recovery ignora latch stale; modal some apos desativar uBlock.
- Google bait: script primario (img diagnostico only); DOM bait sem offsetParent false positive.

---

## [0.3.33] - 2026-06-19

### Corrigido

- Google bait fetch: `no-cors` evita falso positivo CORS e erros no console; recovery apos desativar uBlock.

---

## [0.3.32] - 2026-06-19

### Corrigido

- RF-029: bypass no retry com uBlock ativo ? recovery usa check ativo (extensao multi-sinal + Firestore XHR) antes de limpar latch.
- Probes: DOM bait, Google script/img/fetch, BlockAdBlock via `/js/waitless-bab.js` fail-closed.

---

## [0.3.31] - 2026-06-19

### Alterado

- RF-029: probe dedicado de extensao (BlockAdBlock + Google bait) independente do Firestore.
- Check de extensao atrasado ~3s no admin; retry exige extensao clear + transporte.
- QA: `/adblock-probe-test.html` com teste for?ado; `public/js/waitless-bab.js`.

---

## [0.3.30] - 2026-06-19

### Alterado

- RF-029: modal AdBlock so apos erro real de transporte Firestore (reativo); probes proativos removidos do load e intervalo 8s.
- Probes (BlockAdBlock + canal) permanecem apenas no retry manual; syncAdBlockDetection nao seta blocked por falha de probe.

---

## [0.3.29] - 2026-06-19

### Alterado

- RF-029: sinal generico de adblock migrado para biblioteca BlockAdBlock (DOM bait via npm bundle).
- Removidos probes custom Google bait, script secreto e DOM cosmetic; mantidos canal Firestore Listen + transport latch.

---

## [0.3.28] - 2026-06-19

### Corrigido

- Retry "Ja desativei" fecha modal quando adblock desativado: clear latch antes de verificar transporte; re-verificacao pos-clear em vez de exigir Firestore client ready.
- Retry com adblock ainda ativo continua mantendo modal (re-latch se transporte falhar apos clear).

---

## [0.3.27] - 2026-06-19

### Corrigido

- Retry "Ja desativei" nao fecha modal se adblock ainda ativo: exige Firestore client ready antes de clear latch.
- Transporte ainda bloqueado apos recovery impede dismiss falso positivo dos probes.

---

## [0.3.26] - 2026-06-19

### Corrigido

- Logs Firestore sem userId no console (PII removida; diagnostico so em dev).
- Recovery pos-adblock revalida App Check antes de reset de rede Firestore.
- useClients trata permission-denied sem unhandled rejection.

---

## [0.3.25] - 2026-06-19

### Alterado

- Modal AdBlock nao some automaticamente ao desativar Shields; apenas check inicial (adblock off) ou botao retry.

---

## [0.3.24] - 2026-06-19

### Alterado

- AdBlock no admin: banner sticky substituido por modal flutuante bloqueante (overlay + dialog centralizado).

---

## [0.3.23] - 2026-06-19

### Corrigido

- Banner reage de novo a ERR_BLOCKED_BY_CLIENT (sinais de transporte + health).
- Auto-hide quando bloqueio cessa: sync limpa health sem clicar retry.
- Retry reconecta Firestore sem recarregar pagina.

---

## [0.3.22] - 2026-06-19

### Corrigido

- Google ad bait: `fetch` com `mode: no-cors` (CORS em prod gerava falso positivo com Shields OFF).
- Instrumentacao: Performance API ignora entries anteriores ao load; poll para apos recovery.
- Banner: `adBlockActive` deriva de `health` apos recovery (nao re-liga por sinal stale).

---

## [0.3.21] - 2026-06-19

### Corrigido

- Recovery AdBlock impossivel: `confirmAdBlockRecovery` usava `detectAdBlockActive()` que incluia latch em `active`.
- Auto-recovery quando Shields desativado: probes rodam a cada 2s enquanto latched; banner some sem clicar retry.
- Retry nao depende mais de `probeMemberRead` (permission-denied) para limpar latch.

---

## [0.3.20] - 2026-06-19

### Corrigido

- Banner AdBlock nao aparecia: latch notifica React via syncTransportLatchFromStorage e listener BLOCKED_EVENT.
- Monitoracao admin independente de member.companyId; poll 500ms no gate.
- Fallback global na instrumentacao (error, unhandledrejection, Performance API).
- Cache bust waitless-firestore-instrumentation.js?v=0.3.20.

---
## [0.3.19] ? 2026-06-19

### Corrigido

- Banner AdBlock sumia em produ??o (Brave/uBlock): latch sticky em `sessionStorage` impede false clear quando probes passam mas Listen real foi bloqueado.
- Instrumenta??o n?o apaga mais sinal em respostas 2xx de canal; recovery s? via "Tentar novamente" com Firestore online.
- Banner n?o dismiss?vel enquanto transporte latched; `confirmAdBlockRecovery()` valida probes + `waitForFirestoreClient`.

---

## [0.3.18] - 2026-06-18

### Corrigido

- Banner AdBlock n?o aparecia com `ERR_BLOCKED_BY_CLIENT`: instrumenta??o n?o limpava sinal em requests App Check/auth bem-sucedidos; `markSnapshotConnected` apagava blocked em snapshot de cache.
- Detec??o usa `transportBlocked OR probes`; hook reage ao sinal de transporte em <500ms.
- Probe Firestore real (sem header `X-Waitless-Probe`) complementa o probe diagn?stico.

---

## [0.3.17] ? 2026-06-18

### Alterado

- Detec??o de AdBlock refeita: **inactive** s? quando Google ad bait (204/200), canal Firestore Listen (status ? 0) e token `waitless-cleared-v1` do script isca passam juntos.
- UI admin: banner dismiss?vel quando adblock ativo; modal bloqueante removido (mantido s? App Check).
- Testes: `npm run test:adblock` (vitest + baseline de rede). P?gina dev `/adblock-probe-test.html`.

---

## [0.3.16] ? 2026-06-18

### Adicionado

- Banner inteligente `AdBlockerBanner` (n?o bloqueante) para sinais leves: script isca, honeypot CSS ou fila offline >8s.
- Classifica??o **hard** vs **soft** em `ad-blocker-detection.ts` (`isHardBlocked`, `isSoftAdvisory`).
- Telemetria de QA: `?adblock_debug=1` exp?e `window.__waitlessAdBlockerDebug`.
- Flag `NEXT_PUBLIC_ADBLOCKER_MODE=strict|advisory` (advisory: s? banner, sem modal bloqueante).

### Alterado

- Probe de canal Firestore: XHR cors (status 0 = bloqueado) em vez de `fetch no-cors`.
- Listen probe usa `companies/{companyId}/queue` com `limit(1)` e exige snapshot do servidor.
- `collectAdBlockerLayerState()` unifica as tr?s camadas; `companyId` propagado pelo gate.
- Sinal de transporte n?o ? mais apagado quando `getDoc` passa ou canal probe retorna OK.

### Corrigido

- Falsos negativos com Brave/uBlock: probes `no-cors` sempre resolviam; instrumenta??o XHR marca `status === 0` diretamente.
- `syncAdBlockerSignalFromChannelProbe` deixou de chamar `clearFirestoreNetworkBlocked()` prematuramente.

---

## [0.3.15] ? 2026-06-18

### Adicionado

- Detec??o tripla de bloqueador de an?ncios no painel admin (script isca, honeypot CSS, monitoramento fetch/XHR nos canais Firestore).
- Modal bloqueante `AdBlockerModal` com instru??es para Brave/uBlock e bot?es de retry/reload.
- Flag `NEXT_PUBLIC_ENFORCE_ADBLOCKER_GATE` para testar o gate em localhost.

### Alterado

- Escopo do gate expandido para todo `/admin/*` (exceto rotas de auth/onboarding).

### Corrigido

- Modal de bloqueador n?o aparecia: `firestoreClientReady` (`getDoc`) suprimia detec??o enquanto o canal Listen permanecia bloqueado; probe Listen restaurado.

---

## [0.3.0] ? 2026-06-09

### Adicionado

- **P?gina Clientes** (`/admin/customers`) com listagem Mini-CRM e a??o Entrar na fila.
- **Analytics** (`/admin/analytics`) ? atendimentos hoje, tempo m?dio, fila atual.
- **AdminShell** compartilhado ? menu mobile e Adicionar Cliente funcionam em todas as p?ginas admin.
- **Favicon** (`logo-icon.svg`, `icon.tsx`, `apple-icon.tsx`).
- Bot?o **WhatsApp** (wa.me) no card Aguardando.
- **Upload de logo** via Firebase Storage + sugest?o de cor da logo (API).
- **Multi-staff** ? convites por e-mail com signup `?invite={id}`.
- **Cloud Functions** ? custom claims, cleanup `publicQueue` completed, webhook WhatsApp.
- Rotas **WhatsApp Business API** (`/api/whatsapp/send`, `/api/whatsapp/webhook`).
- Estado **Atendimento conclu?do** na tela do cliente.
- Modal **Detalhes** no card Em Atendimento.
- `docs/REQUIREMENTS.md` e `.env.example`.

### Alterado

- `publicQueue` mant?m status `completed` (cleanup tardio via Function).
- Firestore Rules: owner-only para settings; cole??o `invites`.
- `prefers-reduced-motion` global e em componentes animados.

---

## [0.2.0] ? 2026-06-09

### Adicionado

- **Rebrand completo** para identidade Waitless (Navy `#0A1B3F` + Laranja `#FF6600`).
- Tema **claro padr?o** com op??o **escuro** via `next-themes` (toggle em Configura??es).
- Tipografia **Poppins** para t?tulos + **Inter** para corpo.
- Componente `Logo` e ?cone `public/logo-icon.svg`.
- Tela p?blica do cliente em `/q/[token]` com posi??o, ETA, progresso visual e bottom nav.
- Cole??o Firestore `publicQueue/{token}` com leitura an?nima e sync em tempo real.
- Bot?o **Copiar link** ativo no card Aguardando.
- **White-label b?sico** em `/admin/settings`: tagline, cor de destaque, URL da logo.
- Valida??o **WCAG** de contraste ao salvar cor de destaque (`src/lib/utils/contrast.ts`).

### Alterado

- Tokens CSS migrados de Obsidian Queue (violeta) para paleta Waitless.
- Sidebar, login, signup e onboarding usam logo oficial.
- `useQueue` sincroniza snapshots p?blicos quando a fila waiting muda.

### Seguran?a

- Firestore Rules: `publicQueue` leg?vel por qualquer um; escrita restrita ao staff do tenant.

---

## [0.1.2] ? 2026-06-08

### Corrigido

- Posi??o na fila agora usa **Firestore transaction** ? elimina race condition em adi??es simult?neas.
- Badge **AO VIVO** rastreia conex?o de cada listener separadamente (waiting + in_service).
- Busca Mini-CRM limpa resultados stale ao apagar o termo de busca.

### Adicionado

- Bot?o **Copiar link** desabilitado com tooltip no card Aguardando (placeholder v0.1 conforme UX.md).
- Verifica??o **anti-duplicata**: cliente j? em `waiting` n?o entra novamente na fila.
- Classe `ClientAlreadyInQueueError` com mensagem localizada para a recep??o.

### Otimizado

- `React.memo` em `WaitingCard`, `InServiceCard` e `QueueColumn`.
- Handlers memoizados com `useCallback` no dashboard admin.
- Timer centralizado via hook `useNow` ? 1 interval em vez de N por card em atendimento.
- ETA calculado dinamicamente no frontend (`position ? avgServiceTimeMin`).

---

## [0.1.1] ? 2026-06-08

### Adicionado

- Login e cadastro com **Google** (`signInWithPopup`) nas p?ginas `/admin/login` e `/admin/signup`.
- P?gina `/admin/onboarding` para concluir cadastro de usu?rios Google sem estabelecimento.
- Componente `GoogleAuthButton` e mensagens de erro localizadas para auth.
- `refreshSession()` no `AuthContext` para recarregar member/company ap?s cadastro Google.

---

## [0.1.0] ? 2026-06-08

### Adicionado

- Scaffold Next.js 16 + TypeScript + Tailwind CSS v4 + Framer Motion + Firebase SDK.
- Projeto Firebase `waitless-queue-saas`.
- Firestore Security Rules multi-tenant e ?ndices compostos.
- Documenta??o viva: PRODUCT, ARCHITECTURE, UX, USABILITY, DESIGN_SYSTEM.
- Dashboard admin fiel ao mockup Stitch (Sidebar, SearchBar, Kanban).
- Auth: signup de estabelecimento + login staff.
- Mini-CRM: busca por WhatsApp/nome, modal Add Customer.
- Fila funcional: CRUD entries, transi??es waiting/in_service/completed.
- Listeners Firestore em tempo real (2 queries por sess?o admin).
- Badge "AO VIVO" indicando conex?o ativa.

### Fora de escopo (pr?ximas vers?es)

- Extra??o autom?tica de cores da logo.
- Integra??o WhatsApp Business API.
- Abas Filas / Hist?rico / Perfil na tela do cliente.
