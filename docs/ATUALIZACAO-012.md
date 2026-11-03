# NeoCalc Pro 0.1.2 — datas e acesso público

Solicitação do usuário: substituir a digitação da idade pós-natal por uma referência com a data de hoje e resolver o bloqueio ainda visível na captura do domínio antigo.

## Alteração entregue

- Nascimento é preenchido a partir do paciente ativo, quando existente.
- Avaliação é preenchida com data/hora atuais, editáveis.
- Botão “Usar data de hoje” atualiza a referência ao horário atual.
- Idade pós-natal em dias completos é derivada automaticamente de períodos de 24 horas. Horários são mantidos para não introduzir uma diferença de um dia ao usar apenas a virada do calendário.
- Avaliação anterior ao nascimento ou datas ausentes/inválidas não geram resultado. Editar entradas limpa o resultado anterior.
- IG, IPM, idade corrigida, TIG, NeoMonitor, cofre e os demais módulos foram preservados. Ajustar datas na calculadora não altera o paciente cadastrado.

## Evidência de testes

A suíte anterior foi mantida, com o caso de interface de idade adaptado às entradas por data/hora. Foram acrescentados três testes de cálculo por datas (fronteira de 24 horas, fuso/ano bissexto e entradas inválidas) e um teste de interface de preenchimento com hoje, atualização e rejeição de avaliação anterior. O log desta versão está em `RESULTADOS-TESTES-012.txt`.

Resultado desta rodada: **76 testes aprovados (32 de lógica/armazenamento, 39 de interface/sessão e 5 de worker/build), sem falhas; tipos e build aprovados.**

Os resultados de auditoria 0.1.1 permanecem disponíveis como histórico. Nenhum aparelho ou navegador real foi utilizado nesta versão. Instalação e offline em dispositivos continuam sem validação prática.

## Publicação e privacidade

A configuração do domínio antigo aparece como pública na plataforma, mas a captura do usuário comprova que o acesso ainda foi negado. Não há login ChatGPT/GitHub implementado no React: a negação ocorre na hospedagem. O projeto foi preparado para publicação estática independente em Netlify ou Vercel, com instruções em `HOSPEDAGEM-PUBLICA.md` e um ZIP contendo o site pronto.

Um link alternativo de demonstração e eventual prazo de validade são informados no chat conforme o retorno efetivo da hospedagem. Um prazo temporário não é tratado como publicação definitiva.

O novo domínio não compartilha automaticamente o IndexedDB do domínio antigo. Não foram copiados bancos de navegador, credenciais ou registros clínicos reais. Somente dados simulados integram o build. Uso assistencial permanece não autorizado.
