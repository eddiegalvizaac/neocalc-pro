# Validação reproduzível — 0.1.1

Use apenas pacientes fictícios. Ambiente efetivamente utilizado: Linux x64, Node.js 24.22.1, npm 11.9.0. Outras versões e navegadores não foram certificados.

```sh
npm ci
npm test
```

O comando integrado executa, na ordem:

1. `npm run test:unit` — cálculos, limites, mutações de registros, validação, criptografia e IndexedDB simulado.
2. `npm run test:ui` — Vitest/Testing Library/JSDOM, navegação, CRUD fictício, gasometrias, ventilação, backup, importação e sessão.
3. `npm run build` — TypeScript em código e testes, build de produção e geração do precache.
4. `npm run test:pwa` — sandbox JavaScript do service worker e conferência dos arquivos gerados. Exige build atualizado.

`npm audit` consulta os avisos conhecidos das dependências. Não substitui auditoria de código ou teste de invasão. Vitest é usado em modo `run`, sem API de teste publicada. A publicação contém somente assets estáticos, não inclui node_modules nem servidores de desenvolvimento/teste.

Os limites de aceitação matemática são definidos nos testes em `src/clinical.test.ts`: dias completos, limiares gestacionais, marco de 280 dias e equivalência dimensional da TIG em 252 combinações. Não há limites terapêuticos inferidos desses testes.

Testes de segurança incluem senha incorreta, adulteração de dados/salt/IV, esquema inválido autenticado, formato v1 legado, concorrência, bloqueio durante operações assíncronas, quota de gravação, perda de cofre, memória visível e texto importado sem interpretação de HTML. Dados e IDB são simulados; a criptografia usa Web Crypto real do Node.

O relatório completo está em `AUDITORIA.md`. Permanecem pendentes testes em Chrome/Safari reais, Android/iPhone físicos, instalação, modo avião, descarte de armazenamento, acessibilidade real, revisão clínica, avaliação institucional/LGPD e auditoria independente de segurança. Não usar estes testes como autorização assistencial.
