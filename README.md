# NeoCalc Pro — v0.1.1

PWA React + TypeScript para demonstração de apoio profissional em Neonatologia. **Versão de desenvolvimento: somente dados simulados; não usar em assistência.** Esta entrega implementa a estrutura da fase 1 e uma base funcional do NeoMonitor; não representa a conclusão das seis fases nem validação clínica.

## Executar e testar

Ambiente testado: Node.js 24.22.1 e npm 11.9.0 em Linux x64. Outras versões não foram verificadas. Na pasta do projeto:

```sh
npm ci
npm run dev
npm test
npm run build
```

`npm test` agora inclui testes de lógica, interface em JSDOM, build e testes simulados do service worker. Veja `docs/AUDITORIA.md` para os resultados e a matriz de plataformas. Nenhum Android, iPhone ou navegador real foi utilizado; instalação e offline continuam não confirmados.

O build estático fica em `dist/`. Sirva por HTTPS (ou localhost) para IndexedDB, Web Crypto e service worker. `npm run dev` não registra o service worker; teste a PWA usando o build de produção. Não há backend de dados clínicos, analytics ou sincronização em nuvem.

## Disponível

- Navegação em português, responsiva, painel individual e troca de paciente ativo.
- Calculadoras de idade corrigida, idade pós-menstrual, classificação gestacional, TIG, IO arterial e taxa de volume prescrito, com fórmulas e limites visíveis.
- NeoMonitor: cadastro pseudônimo, peso e diagnóstico editáveis, pesquisa, arquivamento, reativação e exclusão lógica confirmada por código, sem prometer apagamento físico.
- Gasometrias arteriais, venosas e capilares: séries cronológicas, seleção de múltiplas coletas, deltas absolutos de pH e PCO₂, gráficos de pH, PCO₂, bicarbonato, BE e lactato com eixo proporcional ao tempo. Valores opcionais ausentes não são convertidos em zero. Percentual de pH não é apresentado.
- Ventilação: modalidade, FiO₂, PIP, PEEP, MAP de vias aéreas, FR e motivo. Histórico acrescentado, sem edição silenciosa. Gasometrias novas recebem cópia do registro ventilatório anterior à coleta, se existir. Alterações inseridas posteriormente não reescrevem essa cópia.
- Rascunhos em memória nos formulários de cadastro/edição de paciente, gasometria e ventilação, isolados por paciente: fechar e reabrir preserva campos na mesma sessão desbloqueada. Rascunhos não são persistidos, são apagados ao bloquear e não resistem ao recarregamento.
- Cofre IndexedDB cifrado (AES-256-GCM), PBKDF2-SHA256/600.000 iterações, salt e IV aleatórios por gravação, política de nova senha com mínimo de 12 caracteres, chave não exportável e senha apenas em memória. Credenciais v1 antigas continuam legíveis; senha antiga fraca continua fraca e não há rotação implementada. Cofre existente exige desbloqueio ao abrir o app.
- Bloqueio após 5 minutos de inatividade; exportação/importação de backup criptografado com a senha atual, confirmação antes de substituir dados e trilha local de alterações.
- Manifest, ícones PNG, lista explícita de precache dos assets locais e service worker com versão derivada do conteúdo; fontes locais. Comportamento validado somente em sandbox, sem aprovação de instalação/offline em aparelhos.
- Revisão atômica de gravações evita sobrescrita acidental entre abas; conflitos exigem reabrir o cofre, sem sincronização automática. Importações possuem esquema estrito e limites de tamanho.

## Uso e persistência

Ao abrir pela primeira vez, aparecem três pacientes **simulados**, mantidos só na memória. Em Configurações, crie um cofre para salvar o estado atual no dispositivo. Se já houver cofre, informe a senha para abri-lo; não há redefinição ou recuperação de senha. Exporte backups regularmente. O código RN não torna os dados anônimos: idade, datas, diagnósticos e eventos podem permitir reidentificação.

A exclusão remove também os detalhes da trilha daquele código, mantendo um evento de exclusão. Arquivos de backup e cópias fora do app não são apagados.

O app não promete segurança institucional ou conformidade LGPD por implementar criptografia. Dispositivo desbloqueado, extensões maliciosas, comprometimento do navegador e XSS podem expor dados durante o uso. A trilha local não é inviolável. Exclusão é lógica no IndexedDB; não garante apagamento físico de SSD, backups do sistema ou arquivos já exportados. Sem auditoria de segurança independente nesta versão.

## Instalar como PWA

1. Hospede `dist/` em HTTPS e abra com conexão para completar o cache inicial.
2. Android/Chrome: menu → Instalar aplicativo.
3. iPhone/Safari: Compartilhar → Adicionar à Tela de Início.
4. Desktop/Chrome ou Edge: ícone de instalação na barra de endereços.
5. Feche todas as abas para permitir a ativação da atualização, reabra e teste em modo avião com dados fictícios. A hospedagem privada pode exigir autenticação inicial. Este roteiro de instalação e offline ainda não foi executado em dispositivo real.

Os navegadores podem remover IndexedDB e caches sob pressão de armazenamento. Navegação privada tem persistência limitada. Em Configurações, solicite persistência ao navegador e mantenha backups externos criptografados.

## Não disponível / próximas fases

- Catálogo e cálculos de medicação: bloqueados até cadastro farmacológico autorizado e revisão clínica, com dose de ataque/manutenção, função renal/hepática, vias e dupla conferência.
- Curvas PIG/AIG/GIG, velocidade ponderal longitudinal, necessidades hídricas, eletrólitos, misturas de glicose, leite/fortificantes e nutrição parenteral.
- OSI, ventilação minuto, volumes correntes, parâmetros específicos de HFOV, FR medida, SpO₂, EtCO₂/TcCO₂, comparação gráfica combinada de ventilação/gases.
- Campos adicionais de gasometria (eletrólitos, saturação medida, temperatura e FiO₂), limites críticos configuráveis e alertas clínicos.
- PDF com controle de acesso, edição completa de dados de nascimento, admissão explícita, diagnósticos múltiplos e correções clínicas versionadas.
- Percentuais de variação quando apropriados, vínculo explícito entre cada ajuste e gases antes/depois, migrações além do schema v1.
- Testes de interface em JSDOM foram implementados. Permanecem pendentes acessibilidade por leitor de tela, layout e integração no navegador, instalação e offline em Android/iOS reais; revisão clínica e de segurança externas.

## Evidência e validação

`src/clinical.ts` contém funções puras. TIG e taxa de volume são relações dimensionais; IO é apresentado como cálculo matemático, sem metas terapêuticas. Idade corrigida usa referência convencional de 40 semanas. Classificação gestacional: OMS, *Preterm birth*, 10 maio 2023, https://www.who.int/news-room/fact-sheets/detail/preterm-birth (prematuro <37s; extremo <28s; muito prematuro 28–<32s; moderado/tardio 32–<37s). A categoria a termo/pós-termo é descritiva; não classifica subgrupos de termo precoce/pleno/tardio.

Não são fornecidos limites universais de normalidade. Testes automatizados verificam aritmética, limites de entrada, amostra arterial no IO, interface em DOM simulado, criptografia, adulteração, concorrência, bloqueio, persistência IndexedDB e cache simulados. Esses testes não equivalem a validação clínica.

Consulte `docs/ARQUITETURA.md` e `docs/VALIDACAO.md`.
