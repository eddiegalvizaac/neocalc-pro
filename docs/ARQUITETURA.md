# Arquitetura técnica — 0.1.1

- `src/main.tsx`: entrada React, fontes locais, CSS e registro do service worker com tratamento de erro.
- `src/App.tsx`: navegação, formulários e estados de apresentação. Separado da entrada para testar sem executar montagem global.
- `src/useSession.ts`: ciclo de vida do cofre, senha volátil, deadline de inatividade, proteção de operações em andamento, estado e importação/exportação.
- `src/records.ts`: mutações puras de pacientes/eventos e seleção de séries; validações independentes do HTML.
- `src/validation.ts`: validação estrita e normalização de pacientes, gasometrias, ventilação e trilha.
- `src/storage.ts`: envelope v1, Web Crypto, importação limitada e transações IndexedDB com revisão atômica.
- `src/clinical.ts`: cálculos matemáticos puros e validações de entrada, sem metas ou prescrição.
- `src/components.tsx`: tabelas, gráficos SVG proporcionais ao tempo e linha do tempo completa ou resumida.
- `src/model.ts`: tipos e fixtures explicitamente simuladas.
- `src/*.test.ts`: lógica, criptografia, dados e integração IndexedDB simulada.
- `tests/`: interface e sessão com JSDOM; não contém teste em navegador real.
- `public/` e `scripts/finalize-pwa.mjs`: manifest, ícones e worker com lista explícita e versão por conteúdo.
- `scripts/pwa.test.mjs`: testes em sandbox do worker e conferência do build.

## Persistência e compatibilidade

Banco `neocalc-vault`, versão 1, object store `vault`, chave `state`. O envelope mantém `{version:1,salt,iv,data}` e recebe a propriedade opcional `revision` nas gravações. Envelope antigo sem revisão é lido como revisão 0; criptografia não mudou. Leitura de estado exige autenticação do ciphertext e validação do esquema. Nenhum teste acessa o cofre de um navegador do usuário.

Transação readwrite lê a revisão e grava o próximo envelope somente se o valor ainda corresponder ao esperado. Essa operação é atômica no IndexedDB; incompatibilidade bloqueia a sessão para recarregar. A revisão é metadado de concorrência, não trilha inviolável. Operações simultâneas na mesma sessão são recusadas. Abas não sincronizam automaticamente a interface.

A senha é referência volátil da sessão e a chave é derivada não exportável para cada cifra/decifra. Credenciais v1 mantêm a semântica de abertura antiga; novas senhas devem ter pelo menos 12 caracteres Unicode, não ser só espaços e não exceder 1024 unidades UTF-16. Isto não mede entropia. Não há rotação de senha. Dados clínicos e rascunhos saem do estado do app ao bloquear; não se promete apagamento físico da memória JavaScript.

Uma geração de sessão e um deadline impedem que uma operação concluída depois do bloqueio republique registros ou entregue um backup. Transação já iniciada pode terminar no disco; dados só reaparecem após desbloqueio. Falhas de gravação não atualizam o estado de registros e deixam o formulário para nova tentativa. Se o cofre desaparecer enquanto bloqueado, um banco vazio não é salvo silenciosamente; demonstração volátil fica disponível separadamente.

Estado, envelopes e arquivos têm limites técnicos. Importação não mescla: valida, confirma e substitui. Histórico gasométrico/ventilatório não é editado silenciosamente; gás novo recebe cópia dos parâmetros vigentes. Exclusão confirmada remove detalhes do paciente e sua trilha, preserva os demais pacientes e registra um evento de exclusão. Não elimina backups externos ou páginas antigas do dispositivo.

## Worker e entrega

Somente recursos estáticos explicitamente gerados entram no cache. APIs, queries, backups e autenticação são excluídos. Shell exige marcador do app; redirecionamentos e páginas de login não são aceitos como shell. Atualização aguarda o ciclo normal de fechamento das abas; limpeza restringe-se a caches NeoCalc. Fontes são locais. O registro do worker e a disponibilidade real dependem do navegador e da autenticação da hospedagem.

Instalação e offline não foram testados em navegador. A revisão não certifica LGPD, segurança institucional ou uso assistencial. Consulte `AUDITORIA.md` para riscos, evidências e matriz de dispositivos.
