# NeoCalc Pro — auditoria técnica da versão inicial

Data: 3 de novembro de 2026 (America/Sao_Paulo). Versão de origem: **0.1.0**, commit `f0918c115666804844320ba9fe5dbc248d62f1a2`. Versão corrigida: **0.1.1**.

**Resultado: funcionalidades aprovadas no ambiente automatizado descrito abaixo; validação em navegadores e dispositivos permanece pendente. O aplicativo continua restrito a pacientes fictícios e não está autorizado para uso assistencial.** Não foi acessado o cofre de nenhum dispositivo do usuário. Todos os testes criam bancos isolados em memória e usam dados simulados.

## Ambiente e evidências

- Linux x64, Node.js **24.22.1**, React **19.3.1**, TypeScript **5.9.3**, Vite **6.4.5**.
- Testes de interface: Vitest **4.1.12**, Testing Library e **JSDOM 26.1.0**. JSDOM simula o DOM; não pinta a interface, não implementa o motor de layout de Chrome/Safari e não equivale a um navegador ou dispositivo.
- Persistência: **fake-indexeddb 6.2.7**, com abertura/fechamento de conexões e remontagem da interface. Criptografia executada de verdade pela Web Crypto do Node, sem simular AES-GCM ou PBKDF2.
- Service worker: execução em sandbox JavaScript com rede e CacheStorage simulados; inspeção do manifest, PNGs e recursos efetivamente gerados no build.
- Regressão inicial: os 8 testes anteriores passaram. Cinco novos testes falharam na versão anterior: IO com NaN/Infinity, idade fracionária, eixo temporal do gráfico, histórico truncado e indicação indevida de offline. Esses testes foram mantidos e passaram após as correções.
- Resultado final: **72 testes aprovados — 29 de lógica/armazenamento, 38 de interface/sessão/componentes e 5 do worker/build; zero falhas. TypeScript e build de produção aprovados.**
- Comando integrado: `npm test` executa lógica/armazenamento, interface, verificação de tipos, build e testes do service worker. Resultado e contagem estão em `RESULTADOS-TESTES.txt`, entregue junto ao relatório.
- `npm audit`: **0 vulnerabilidades conhecidas reportadas** na consulta final. Isso se limita à base de avisos do npm no momento da consulta; não é prova de ausência de vulnerabilidades.

## Resultado por item solicitado

| Item | Resultado | Evidência e limite |
| --- | --- | --- |
| 1. Botões e menus | Aprovados em DOM simulado | Nove seções, marca, perfil, menu móvel, ações rápidas, troca de paciente, filtros, formulários, comparação, calculadoras e configurações exercitados. A aparência e o toque real não foram testados. |
| 2. Pacientes fictícios | Aprovados no ambiente automatizado | Criar, editar peso/diagnóstico/observações, pesquisar, arquivar, reativar, excluir com confirmação, excluir o último paciente e reabrir o cofre. IndexedDB foi simulado, não o banco de Safari/Chrome real. |
| 3. Gasometrias seriadas | Aprovadas no ambiente automatizado | Coletas fora de ordem são ordenadas; comparação de pH/PCO₂ confere; campos opcionais ausentes permanecem ausentes; seleção não atravessa pacientes. Comparação percentual e de todos os indicadores não foi acrescentada nesta auditoria. |
| 4. Gráficos e ventilação | Aprovados quanto aos dados/DOM | Cinco indicadores conferidos contra os registros, eixo proporcional ao tempo, pontos únicos/zeros/ausentes, parâmetros vigentes por cópia histórica e suporte atual no painel. Sem aprovação visual em navegador real. |
| 5. Idades e TIG | Aritmética aprovada | Limiares gestacionais, dias completos, zero de idade corrigida, fuso e ano bissexto, entradas inválidas; TIG comparada a um oráculo dimensional em 252 combinações. Não equivale a validação clínica. |
| 6. Android, iPhone e computador | **Pendente** | Nenhum aparelho físico, emulador de Android/iOS, Chrome, Edge ou Safari foi efetivamente utilizado. Houve somente execução Linux/Node/JSDOM e revisão estática do CSS responsivo. |
| 7. Segurança local | Controles corrigidos e testados; riscos residuais abaixo | Cifragem, senha errada, adulteração, importação, bloqueio, concorrência, falha de gravação, exclusão e ausência de escritas no localStorage verificadas. Sem pentest ou auditoria independente. |
| 8. PWA instalável/offline | **Não confirmado** | Manifest, ícones, precache e fallback passaram em testes simulados. Nenhuma instalação, navegação em modo avião ou persistência real de navegador foi testada. A interface passou a declarar essa limitação. |
| 9. Correções e retestes | Executados | Testes de regressão, fluxos completos, tipos, build e service worker compõem o comando integrado. |

## Erros corrigidos

| Problema anterior | Correção e verificação |
| --- | --- |
| Gráfico dava o mesmo espaço a intervalos de um e nove dias | Eixo X usa timestamps; teste confirma a razão 1/10 em coletas nos dias 0, 1 e 10. Valores/amostras/unidades são identificados nos pontos. |
| Histórico exibia só quatro eventos | Painel mantém resumo de quatro; página Histórico mostra todos os eventos disponíveis. |
| IO aceitava NaN/Infinity; idade pós-natal fracionária era silenciosamente arredondada | Validação explícita de finitude, dias inteiros e capacidade numérica. IO continua exigindo amostra arterial. Fórmulas e limiares corretos foram preservados. |
| Resultado antigo podia permanecer após mudar entradas da calculadora | Resultado é limpo ao editar e antes de recalcular; erros não deixam uma resposta anterior parecer atual. Taxa de volume também rejeita duração zero e valores não finitos. |
| Campos numéricos ausentes podiam virar zero por coerção | Leitura numérica explícita; validação de dados aplicada também fora do HTML. Zero legítimo em campo permitido continua sendo zero. |
| Senha/estado poderiam sobreviver a uma conclusão assíncrona posterior ao bloqueio | Senha apenas em referência volátil; geração de sessão e verificações após awaits impedem publicação de dados e entrega de backup depois do bloqueio. Transação que já iniciou pode terminar no disco, mas só é conferida após novo desbloqueio. |
| Timer em aba suspensa podia renovar o prazo antes de conferir expiração | Deadline verificado em foco, visibilidade e atividade; testes simulam suspensão, cinco minutos e reinício do prazo. |
| Duas gravações podiam sobrescrever uma à outra | Operações simultâneas na sessão são recusadas; IndexedDB compara e grava a revisão atomicamente. Conflito de outra aba bloqueia a sessão para recarregar. |
| Importação só conferia duas arrays | Validação de envelope, bytes, nonce/salt, versão, esquema, IDs únicos, datas, unidades/campos numéricos e limites de tamanho antes da substituição confirmada. Backup inválido não altera o cofre. |
| Falhas de exclusão/importação/arquivamento/persistência podiam ficar sem tratamento | Promessas tratadas; sucesso só fecha formulário após salvar. Falha de quota mantém valores e permite tentar novamente. Controles do formulário ficam desabilitados durante a gravação. |
| Sugestão de código por contagem podia colidir depois de excluir um paciente | Sugestão procura um código livre; duplicatas continuam proibidas. |
| Importação/exclusão podia deixar seleção ou rascunho associado ao paciente errado | Paciente ativo é reconciliado com a lista; seleção é limpa nas trocas; rascunhos são isolados e apagados no bloqueio. |
| Exclusão mantinha detalhes clínicos do paciente nos textos de auditoria | Exclusão confirmada remove os detalhes da trilha daquele código e mantém apenas o evento de exclusão, além da trilha dos demais pacientes. Interface descreve exclusão lógica, sem prometer apagamento físico. |
| Cofre ausente ao desbloquear poderia gerar um cofre vazio | Ausência é informada e não substituída silenciosamente. Acesso à demonstração é separado e não altera o cofre existente. |
| Validação mais forte poderia impedir acesso a senhas antigas válidas | Abertura e recifragem preservam a semântica de credenciais v1, incluindo Unicode; a política de nova senha é aplicada apenas à criação. Formato criptográfico v1 preservado. |
| Registros simulados não traziam snapshots e podiam aparecer no futuro antes de certo horário | Fixtures continuam fictícias; recebem cópias dos parâmetros vigentes e seus horários não ultrapassam o relógio atual. |
| Service worker guardava qualquer GET da origem, inclusive futuras rotas privadas ou respostas de login | Cache limitado à lista de recursos estáticos; queries, APIs, backups e autenticação não são interceptados. Redirecionamentos e HTML sem marcador do aplicativo não são aceitos como shell. |
| Atualização apagava caches de outros apps e podia assumir controle de abas antigas | Limpeza restrita ao prefixo NeoCalc; ativação não é forçada em abas abertas. Hash inclui manifest, recursos e código do worker. |
| “Disponível offline” dependia apenas de `navigator.onLine` | Texto agora informa somente o estado online/offline do navegador; instalação e offline seguem explicitamente não confirmados. Falha no registro do worker gera aviso. |
| Marca sem acesso por teclado e modal sem contenção de foco | Marca é botão, modal recebe foco, suporta Escape/Tab e devolve foco; conteúdo de fundo fica inert. Campos móveis ajustados para 16px no CSS para evitar zoom automático de entrada no Safari; resultado visual ainda não testado. |

## Conferência matemática

- **IPM em dias** = `IG_semanas × 7 + IG_dias + idade_pós_natal_dias_completos`.
- **Idade corrigida de referência** = `IPM − 280 dias`. Valores negativos mostram o tempo até 40 semanas. A aplicabilidade clínica da correção por prematuridade depende do contexto; esta é a convenção matemática implementada, não uma nova recomendação terapêutica.
- Exemplos testados: 29s3d + 12 dias → **31s1d** de IPM e **−8s6d** de idade corrigida; 32s0d + 56 dias → **40s0d**, idade corrigida zero.
- **TIG** = `glicose (%) × 10 × taxa (mL/h) ÷ [peso (kg) × 60]`, em mg/kg/min. Oráculo independente converte g/100 mL → mg/mL e mL/h → mL/min.
- Exemplos testados: 10%, 3 mL/h, 1 kg → **5 mg/kg/min**; 12,5%, 2,4 mL/h, 0,5 kg → **10 mg/kg/min**.
- Limiares de classificação testados em 28, 32, 37 e 42 semanas; limites técnicos de entrada mantidos em 22s0d–44s6d. Esses limites não são valores universais de normalidade. Nenhuma dose, meta de glicemia ou necessidade hídrica é inferida.

## Segurança: o que foi verificado e o que resta

Verificado: AES-256-GCM com nonce de 12 bytes e salt de 16 bytes aleatórios; PBKDF2-SHA256/600.000 iterações; chave derivada não exportável; somente envelope cifrado e metadados técnicos no IndexedDB; senha não gravada em localStorage, IndexedDB, cache ou backup. Testes de senha errada e adulteração de ciphertext, salt e IV falham corretamente. Não há envio de registros, analytics ou sincronização em nuvem no código da aplicação. Texto importado é renderizado pelo React sem interpretar HTML no caso de teste de injeção.

Riscos/limites ainda existentes:

1. **Sessão desbloqueada:** scripts maliciosos na mesma origem, extensões, malware, acesso físico e inspeção de memória podem expor dados. JavaScript não garante zerar senhas, cópias de dados ou memória criptográfica; nenhuma implementação local elimina esse risco.
2. **Senhas e recuperação:** tamanho não mede entropia; use frase-senha forte e exclusiva. Senhas fracas antigas continuam legíveis por compatibilidade e permanecem fracas. Não há troca de senha, recuperação automática nem proteção contra tentativa offline de um backup roubado.
3. **Persistência:** IndexedDB real, quotas, modo privado, descarte de armazenamento e recuperação após falha do processo não foram testados em navegadores. Backup autorizado continua necessário; não há recuperação se senha e backup forem perdidos.
4. **Exclusão:** remove logicamente registros e detalhes da trilha do paciente no cofre ativo. Não apaga arquivos exportados, backups do sistema, páginas antigas de SSD ou cópias fora do app. Um evento com código pseudônimo permanece; pseudonimização não equivale a anonimização.
5. **Abas e auditoria:** revisão evita sobrescrita acidental ao gravar; não oferece sincronização. Outra aba pode continuar mostrando estado anterior até bloquear/reabrir. Banco, revisão e trilha locais não são invioláveis contra alguém com controle do dispositivo.
6. **Hospedagem:** autenticação privada de Sites e cofre local são controles distintos. Cabeçalhos/CSP da publicação, integridade da cadeia de entrega, logout e interação da autenticação com o service worker ainda precisam de inspeção em navegador. Não foi executado pentest.
7. **Importação:** validação estrita e limites técnicos agora existem (arquivo até 10 MiB; conteúdo cifrado até 2.000.000 bytes). A importação aceita a senha atual e substitui após confirmação; não faz mesclagem nem recuperação de esquemas futuros.
8. **Relógio e clínica:** idades e ordenação dependem do relógio do dispositivo e das entradas. Sem validação clínica externa, revisão institucional, avaliação LGPD ou autorização assistencial.

## Dispositivos, instalação e offline: registro explícito

| Plataforma | Efetivamente testada? |
| --- | --- |
| Android físico / Chrome Android | **Não. Nenhum modelo utilizado.** |
| iPhone físico / Safari iOS | **Não. Nenhum modelo utilizado.** |
| Emulador Android / simulador iOS | **Não.** |
| Chrome, Edge, Firefox ou Safari em computador | **Não. Nenhum navegador real utilizado.** |
| Linux x64 + Node/JSDOM | **Sim**, apenas lógica, DOM simulado, criptografia e persistência simulada. |
| Instalação como PWA | **Não testada.** |
| Modo avião / service worker em navegador real | **Não testado.** |
| Cache/fallback em sandbox de teste | **Sim**, sem equivalência a uma instalação real. |

O ambiente não disponibiliza `cua_repl.js`. A [habilidade Sites — SKILL.md](skill://plugin_connector_1p_689987207de08191979cf68eca2941c6/sites/SKILL.md) determina: “If `cua_repl.js` is unavailable, skip browser QA: do not start a preview server, install a browser, or improvise another browser-control path.” Essa é a razão para não instalar/improvisar outro navegador neste ambiente e manter as verificações reais pendentes.

Próxima verificação de plataforma: abrir com conexão, cadastrar somente fictícios, confirmar backup, fechar todas as abas para ativar a atualização, instalar em Android e iOS reais, reabrir em modo avião, desbloquear, criar/editar/excluir, reiniciar e comparar registros. Testar também atualização de versão, sessão privada, teclado numérico, leitor de tela, rotação, perda de armazenamento e bloqueio após suspensão. Este roteiro **não foi executado** nesta entrega.

## Funcionalidades preservadas e pendências de produto

Foram preservados os módulos, a navegação, o visual e as fórmulas matemáticas corretas. Não foram ativados catálogo farmacológico, doses, curvas PIG/AIG/GIG, nutrição parenteral, eletrólitos, alertas críticos, PDF, HFOV completo ou sugestões de ajustes ventilatórios. Permanecem pendências da primeira versão, dependentes de implementação e validação próprias; não são apresentados como aprovados nesta auditoria.

**Conclusão:** versão inicial mais consistente e com regressões cobertas, ainda um ambiente de desenvolvimento exclusivamente fictício. Não declarar Android/iPhone, instalação, offline ou uso assistencial como prontos com base nestes resultados.
