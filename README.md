# NeoCalc Pro — v0.1.0

PWA React + TypeScript para demonstração de apoio profissional em Neonatologia. **Versão de desenvolvimento: somente dados simulados; não usar em assistência.** Esta entrega implementa a estrutura da fase 1 e uma base funcional do NeoMonitor; não representa a conclusão das seis fases nem validação clínica.

## Executar e testar

Requisitos: Node.js 22+ e npm. Na pasta do projeto:

```sh
npm ci
npm run dev
npm test
npm run build
```

O build estático fica em `dist/`. Sirva por HTTPS (ou localhost) para IndexedDB, Web Crypto e service worker. `npm run dev` não registra o service worker; teste a PWA usando o build de produção. Não há backend de dados clínicos, analytics ou sincronização em nuvem.

## Disponível

- Navegação em português, responsiva, painel individual e troca de paciente ativo.
- Calculadoras de idade corrigida, idade pós-menstrual, classificação gestacional, TIG, IO arterial e taxa de volume prescrito, com fórmulas e limites visíveis.
- NeoMonitor: cadastro pseudônimo, peso e diagnóstico editáveis, pesquisa, arquivamento, reativação e exclusão confirmada por código.
- Gasometrias arteriais, venosas e capilares: séries cronológicas, seleção de múltiplas coletas, deltas absolutos de pH e PCO₂, gráficos de pH, PCO₂, bicarbonato, BE e lactato. Valores opcionais ausentes não são convertidos em zero. Percentual de pH não é apresentado.
- Ventilação: modalidade, FiO₂, PIP, PEEP, MAP de vias aéreas, FR e motivo. Histórico acrescentado, sem edição silenciosa. Gasometrias novas recebem cópia do registro ventilatório anterior à coleta, se existir. Alterações inseridas posteriormente não reescrevem essa cópia.
- Rascunhos em memória por formulário e paciente: fechar e reabrir preserva campos na mesma sessão desbloqueada. Rascunhos não são persistidos, são apagados ao bloquear e não resistem ao recarregamento.
- Cofre IndexedDB cifrado (AES-256-GCM), PBKDF2-SHA256/600.000 iterações, salt e IV aleatórios por gravação, senha mínima de 12 caracteres, chave não exportável e senha apenas em memória. Cofre existente exige desbloqueio ao abrir o app.
- Bloqueio após 5 minutos de inatividade; exportação/importação de backup criptografado com a senha atual, confirmação antes de substituir dados e trilha local de alterações.
- Manifest, ícones PNG, precache dos assets locais e service worker com versão derivada do build; fontes distribuídas localmente.

## Uso e persistência

Ao abrir pela primeira vez, aparecem três pacientes **simulados**, mantidos só na memória. Em Configurações, crie um cofre para salvar o estado atual no dispositivo. Se já houver cofre, informe a senha para abri-lo; não há redefinição ou recuperação de senha. Exporte backups regularmente. O código RN não torna os dados anônimos: idade, datas, diagnósticos e eventos podem permitir reidentificação.

O app não promete segurança institucional ou conformidade LGPD por implementar criptografia. Dispositivo desbloqueado, extensões maliciosas, comprometimento do navegador e XSS podem expor dados durante o uso. A trilha local não é inviolável. Exclusão é lógica no IndexedDB; não garante apagamento físico de SSD, backups do sistema ou arquivos já exportados. Sem auditoria de segurança independente nesta versão.

## Instalar como PWA

1. Hospede `dist/` em HTTPS e abra com conexão para completar o cache inicial.
2. Android/Chrome: menu → Instalar aplicativo.
3. iPhone/Safari: Compartilhar → Adicionar à Tela de Início.
4. Desktop/Chrome ou Edge: ícone de instalação na barra de endereços.
5. Reabra e teste em modo avião. A hospedagem privada pode exigir autenticação inicial; valide offline no dispositivo real.

Os navegadores podem remover IndexedDB e caches sob pressão de armazenamento. Navegação privada tem persistência limitada. Em Configurações, solicite persistência ao navegador e mantenha backups externos criptografados.

## Não disponível / próximas fases

- Catálogo e cálculos de medicação: bloqueados até cadastro farmacológico autorizado e revisão clínica, com dose de ataque/manutenção, função renal/hepática, vias e dupla conferência.
- Curvas PIG/AIG/GIG, velocidade ponderal longitudinal, necessidades hídricas, eletrólitos, misturas de glicose, leite/fortificantes e nutrição parenteral.
- OSI, ventilação minuto, volumes correntes, parâmetros específicos de HFOV, FR medida, SpO₂, EtCO₂/TcCO₂, comparação gráfica combinada de ventilação/gases.
- Campos adicionais de gasometria (eletrólitos, saturação medida, temperatura e FiO₂), limites críticos configuráveis e alertas clínicos.
- PDF com controle de acesso, edição completa de dados de nascimento, admissão explícita, diagnósticos múltiplos e correções clínicas versionadas.
- Percentuais de variação quando apropriados, vínculo explícito entre cada ajuste e gases antes/depois, validação profunda do esquema de importação e migrações além do schema v1.
- Testes de interface, acessibilidade por leitor de tela, integração no navegador, instalação e offline em Android/iOS reais; revisão clínica e de segurança externas.

## Evidência e validação

`src/clinical.ts` contém funções puras. TIG e taxa de volume são relações dimensionais; IO é apresentado como cálculo matemático, sem metas terapêuticas. Idade corrigida usa referência convencional de 40 semanas. Classificação gestacional: OMS, *Preterm birth*, 10 maio 2023, https://www.who.int/news-room/fact-sheets/detail/preterm-birth (prematuro <37s; extremo <28s; muito prematuro 28–<32s; moderado/tardio 32–<37s). A categoria a termo/pós-termo é descritiva; não classifica subgrupos de termo precoce/pleno/tardio.

Não são fornecidos limites universais de normalidade. Testes automatizados verificam aritmética, limites de entrada, exigência de amostra arterial no IO, criptografia, adulteração e persistência IndexedDB simulada. Esses testes não equivalem a validação clínica.

Consulte `docs/ARQUITETURA.md` e `docs/VALIDACAO.md`.
