# Droid Tycoon — Guia de Habilidades v27

Atualização preparada em **20/10/2026** a partir da v26. Site estático para GitHub Pages/Cloudflare Pages. **Não foi publicado automaticamente**.

## Como publicar sem perder dados

1. **ANTES DE TUDO:** abra a versão atual do site, acesse **Configurações** e baixe o **backup JSON de todas as contas**. Guarde esse arquivo fora do navegador, por exemplo no computador. Se usa Google Drive, confirme a situação da sincronização e guarde também o JSON local.
2. No GitHub, entre no repositório atual e guarde uma cópia dos arquivos existentes ou use um commit/tag de segurança.
3. **Recomendado para atualizar a v26:** utilize `Droid_Tycoon_Atualizacao_Guia_Habilidades_v27.zip` e substitua os **cinco arquivos** na raiz do repositório: `index.html`, `styles.css`, `app.js`, `drive-backup.js`, e adicione `traits.js`. Não mexa em `data.js` nem `favicon.svg` se já personalizou esses arquivos.
4. Se precisar de instalação totalmente nova, o pacote **Completo** contém todos os sete arquivos. Coloque o conteúdo da pasta diretamente na raiz do site, não uma subpasta nem o ZIP fechado. O arquivo `README_PUBLICACAO_v27.md` não é necessário para a execução.
5. Após o deploy, abra o site em uma aba anônima e confira se a aba **Guia de Habilidades** abre. Na aba normal do navegador (com seus dados), confira a contagem da **Minha Base**, as contas e as receitas antes de cadastrar habilidades.
6. O primeiro acesso na v27 cria unidades individuais para os totais existentes e guarda no armazenamento local uma cópia do cadastro antigo, se houver dados da v26. **Ainda assim, faça o backup JSON externo antes de atualizar.**
7. Faça primeiro um teste simples: escolha uma unidade, informe uma habilidade, marque uma favorita e confira o resultado no ranking. Depois registre um teste pessoal ou uma tentativa, sempre com os custos observados no jogo.

## O que há na v27

- Base de 100 droids, 6 caminhos e requisitos antigos preservados; 17 fusões especiais preservadas.
- Identificação individual por unidade, apelido opcional, favorito e histórico de habilidades.
- Catálogo comunitário de 26 habilidades, quatro classificações e habilidades exclusivas dos icônicos; combinações permitidas por categoria.
- Avaliação explicada por função, alternativas, probabilidades **estimadas de primeira leitura** e cenários acumulados ilustrativos; nenhuma habilidade sem comprovação é chamada de Perfeita.
- C-3PO: fabricação e créditos avaliados separadamente, **efeitos sobre as estações ainda em análise**.
- Ranking por conta, candidatos de primeira habilidade, favoritos e proteção informativa de futuras necessidades de Rebirth.
- Saldo opcional por conta, custos de tentativas e descontos mediante custo informado, histórico de testes pessoais, seleção de unidades específicas para venda, fusão e evolução.
- Fusão e evolução arquivam as unidades usadas e criam o resultado com habilidade **Não verificada**.
- Exportação/importação compatível com backup por conta ou geral e integração Google Drive preservada.

## Regra de custo atualizada no patch 1.35.1

Desde 20/10/2026, **droids icônicos usam Cristais Nova** ao sortear habilidades; **não icônicos usam créditos**. Valores de referência de 200 Nova para icônicos vêm da documentação comunitária. O preço exato em créditos **não foi confirmado em tabela atualizada**, portanto é preenchido manualmente ao registrar uma tentativa; se deixado vazio, não ocorre desconto no saldo. Digite valores como `200`, `500M`, `2B` ou `3T`.

Fontes de consulta (independentes, exceto patch notes reportadas pela comunidade):
- https://droidex.dubtrackr.win/guides/droid-tycoon-droid-traits/
- https://droidex.dubtrackr.win/guides/droid-tycoon-companions-droid-types/
- https://www.reddit.com/r/StarWarsDroidTycoon/comments/1xagnej/patch_notes_v1351/

## Limites e cuidados

- A progressão e os requisitos de 720 entradas vêm dos arquivos **v26 (referência v1.34.0)**. O patch v1.35.0 anunciou alteração no **Caminho 6**; a lista específica ainda precisa ser reconferida. Não mudamos esses requisitos às cegas para evitar corromper sua progressão.
- A página **não lê o inventário dentro do Fortnite**. Toda venda, fusão, evolução, habilidade, gasto e teste é lançado **manualmente**.
- As recomendações qualitativas são apoio à decisão com dados conhecidos e hipóteses separadas; o jogo pode alterar os efeitos e probabilidades. Probabilidades de reroll podem diferir das de primeira leitura.
- Backup no Drive depende das credenciais do usuário e de acesso real às APIs; **não foi possível testar upload ou conflito entre aparelhos** neste ambiente. Por segurança, faça o backup JSON local antes da primeira sincronização com a versão nova.
- A abertura da interface no navegador automatizado foi bloqueada pelo ambiente; a lógica foi submetida a testes JavaScript simulados. Valide o layout em celular e desktop após publicar.
- Em especial, a versão v27 arquiva as unidades individuais consumidas. Não use o comando **Editar quantidade** para simular evolução de um droid com habilidade valiosa: use **Evoluí** e escolha a unidade corretamente.

## Testes executados

- `node --check` em `app.js`, `traits.js`, `drive-backup.js`: sem erro de sintaxe.
- Simulação em Node VM: migração do inventário v26, integridade de quantidades, catálogo, elegibilidade, cálculo de chances, perfil, favoritos, duas funções do C-3PO, histórico de tentativas, descontos de Nova/créditos, testes pessoais, fusões com 3 IDs distintos, evolução com arquivo histórico, exportação/importação e páginas de guia.
- **Regressão v26 → v27:** 36 cenários de Caminho/Ciclo. Exatamente as mesmas quantidades de reserva/venda e pendências do ciclo, os mesmos requisitos e os mesmos custos de evolução para os droids testados.

## Voltar à v26, se necessário

Reponha os arquivos antigos do GitHub (ou use o pacote original v26) e recupere o backup JSON que você baixou **antes** da atualização. A v26 não reconhece habilidades individuais e pode perdê-las ao salvar: não use a v26 para manipular dados v27 esperando preservar novas informações.
