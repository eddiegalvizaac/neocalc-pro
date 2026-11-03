# Arquitetura técnica

- `src/main.tsx`: shell React, navegação, formulários, estado da sessão, fluxo de cofre e ações do usuário.
- `src/components.tsx`: gráficos SVG, tabela e linha do tempo.
- `src/clinical.ts`: funções matemáticas puras independentes da interface.
- `src/model.ts`: tipos e fábrica de dados simulados relativos à data atual.
- `src/storage.ts`: criptografia autenticada, serialização e IndexedDB v1.
- `src/*.test.ts`: testes matemáticos, criptográficos e integração IndexedDB em memória.
- `public/`: manifest, ícones e template do service worker.
- `scripts/finalize-pwa.mjs`: geração de precache do build e versão de cache.

## Fluxo local-first

A sessão inicial usa dados simulados em memória. Ao criar o cofre, o estado é cifrado e salvo como envelope `{version,salt,iv,data}` na object store `vault`, chave `state`. Leitura/gravação fecham a conexão IndexedDB após a transação. A derivação da chave usa PBKDF2 com salt aleatório; AES-GCM fornece confidencialidade e autenticidade do ciphertext. A senha não é salva nem enviada. O schema do banco e envelope são v1. Rascunhos são exclusivamente voláteis e não fazem parte de backups.

Cada mutação produz um estado e acrescenta evento na trilha. Dados são gravados antes de atualizar a tela quando o cofre está ativo; uma falha é exibida ao usuário. Não há fila de sincronização, API clínica ou credencial de nuvem. Histórico de ventilação e gasometria é append-only pela interface, mas o armazenamento local e backups não são invioláveis. Importação exige decriptação e confirmação, com validação estrutural básica; endurecimento do esquema e limites de arquivo são pendências antes do uso real.

## Riscos e próximos controles

Esta implementação é protótipo de engenharia. Exige revisão de segurança, modelo de ameaça institucional, CSP/headers conforme hospedagem, detecção de importações inconsistentes, proteção de concorrência entre abas, fluxo de recuperação documentado, testes de falha de disco/quota, revisão do gerenciamento de chaves, acessibilidade e LGPD. O bloqueio remove os dados clínicos e rascunhos do estado da sessão e a senha da referência do app, mas JavaScript não oferece garantia de apagamento físico da memória. Não coleta nomes, CPF ou prontuário; pseudonimização não equivale a anonimização.

## Publicação e instalação

Build estático; `dist/` não contém banco ou dados inseridos no dispositivo. Os dados demonstrativos no código são fictícios. O service worker usa network-first com fallback de cache local; assets e fontes são pré-carregados em instalação. Atualizações de cache dependem de conexão. Sem browser QA automatizado nesta entrega, a instalação e a experiência offline permanecem sujeitas à validação nos navegadores alvo.
