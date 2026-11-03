# NeoCalc Pro: acesso público e publicação independente

Versão 0.1.2 — 3 de novembro de 2026. Somente pacientes fictícios; uso assistencial não autorizado.

## Diagnóstico do acesso em chatgpt.site

O primeiro bloqueio coincidia com a política `custom`, permitindo somente o proprietário. A política foi alterada para `public`, revisão 2, e a plataforma confirmou esse estado. A captura enviada posteriormente pelo usuário mostra que o bloqueio continuou. Portanto, a alteração de permissões não demonstrou acesso público funcional. O código React não exige ChatGPT ou GitHub; a tela de negação é da camada de hospedagem. Não foi possível comprovar a causa restante nem testar anonimamente esse domínio pela rede do executor.

Não use a confirmação de uma configuração como prova de acesso externo. Uma publicação em outro domínio evita a dependência desse controle de acesso. O aplicativo é estático: HTML, CSS, JavaScript e fontes locais, sem servidor clínico ou sincronização.

## Nova calculadora de idade

“Idade e crescimento” usa data/hora do nascimento e data/hora da avaliação. A avaliação inicia com o horário atual do dispositivo e o botão “Usar data de hoje” atualiza esse valor. O nascimento vem do paciente ativo quando disponível. A idade pós-natal é derivada automaticamente em períodos completos de 24 horas. IG, IPM e idade corrigida mantêm suas fórmulas. Ajustar datas na calculadora não altera o cadastro do paciente.

## Netlify sem repositório GitHub (opção simples)

1. Baixe `NeoCalc-Pro-site-publico.zip`, disponível em `entregas/` na nova publicação. Descompacte-o. A pasta a enviar deve conter `index.html`, `assets/`, `sw.js` e `manifest.webmanifest` diretamente dentro dela.
2. Acesse **https://app.netlify.com/drop** no navegador. Entre ou crie uma conta sua no Netlify; essa conta é somente para administrar a hospedagem. Os visitantes do aplicativo não precisam de conta.
3. Arraste a pasta descompactada para a área de publicação. Aguarde o Netlify gerar o endereço HTTPS `https://<nome-gerado>.netlify.app`.
4. Nas configurações do projeto, mantenha a proteção de visitantes/senha de publicação desativada para este aplicativo de demonstração. Abra o endereço de produção em janela anônima e confirme que aparece o NeoCalc Pro.
5. Compartilhe o endereço HTTPS de produção. Para atualizar, faça um novo envio da pasta gerada por `npm run build` no mesmo projeto Netlify, preservando o domínio.

O ZIP é um build estático pronto. Não é necessário executar npm no Netlify Drop, instalar Git ou conectar GitHub. Não envie o ZIP de código-fonte como se fosse o site pronto; o Drop precisa da pasta de build com `index.html` na raiz.

## Netlify a partir do código-fonte

O arquivo `netlify.toml` está pronto: Node 24, comando `npm run build`, saída `dist`. Se conectar um repositório próprio ao Netlify, use essas opções. Para gerar localmente, com Node 24:

```sh
npm ci
npm test
```

`npm test` inclui o build. Para gerar somente a versão distribuível depois dos testes: `npm run build`. Publique somente o conteúdo de `dist/`; não envie .git, .env, node_modules, arquivos de cofre ou backups.

## Vercel

O arquivo `vercel.json` está pronto para Vite, build `npm run build` e saída `dist`. Com uma conta própria no Vercel e a pasta do código-fonte aberta no terminal:

```sh
npm ci
npm test
npx vercel login
npx vercel --prod
```

Escolha seu projeto/escopo quando o CLI solicitar, use o preset Vite e publique para produção. Se o projeto tiver “Deployment Protection” habilitado, ajuste a proteção da URL de produção para acesso público. A autenticação de administração do Vercel não precisa ser compartilhada com colegas.

A publicação no Netlify/Vercel precisa da ação do proprietário na conta dele; nenhuma credencial foi solicitada, criada ou embutida no aplicativo. Não foram simulados um deploy nessas contas nem um endereço que ainda não existe.

## Link de demonstração ShipStatic

Uma publicação ShipStatic pode oferecer acesso HTTPS imediato sem login de visitantes. Se o serviço retornar prazo de expiração, o link é temporário. Para mantê-lo na mesma hospedagem, o proprietário precisa usar o link privado de reivindicação retornado pelo serviço e concluir a associação a uma conta. Esse link de reivindicação não deve ser publicado com o app nem compartilhado com os colegas.

O prazo e o endereço efetivamente retornados são informados no chat. Não trate um link temporário como hospedagem definitiva. Netlify Drop é a opção acima para obter uma URL estável administrada pelo proprietário.

## Dados locais e troca de domínio

IndexedDB e o cofre pertencem à origem do navegador. Um domínio novo não lê nem copia automaticamente o cofre do endereço antigo. Cada visitante inicia com dados fictícios e pode criar um cofre local próprio. Para transferir apenas registros fictícios, exporte o backup criptografado no endereço antigo e importe no novo com a senha correspondente. O ZIP publicado não contém o cofre do navegador.

Instalação PWA, modo avião, persistência e layout em Android/iPhone reais continuam pendentes de teste. Os testes de lógica, DOM simulado, criptografia e cache não equivalem à validação em aparelhos nem à autorização assistencial.
