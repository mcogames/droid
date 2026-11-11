# Droid Tycoon v28.9 — Redesign visual e navegação

## Objetivo
Modernizar a apresentação e tornar a navegação mais intuitiva, mantendo a identidade escura do Droid Tycoon e usando as cores já presentes no projeto.

## Alterações
- Nova camada visual independente em `visual-refresh.css`.
- Navegação lateral reorganizada visualmente, com grupos mais claros e destaque neon suave na seção ativa.
- Barra superior refinada, com melhor apresentação das ações, conta ativa, pesquisa e estado da sincronização.
- Botões principais com neon verde-menta; ações secundárias com azul; ações destrutivas com vermelho; filtros e seleções ativas com verde-menta.
- Campos de formulário com estados de foco mais evidentes.
- Cards, painéis, modais e notificações com acabamento mais moderno e contraste aprimorado.
- Navegação móvel em formato flutuante, com estados ativos mais claros.
- Atalho `+ Droid` corrigido visualmente: botão na barra superior em desktop e botão flutuante acima da navegação em dispositivos móveis.
- Respeito à preferência do sistema por movimento reduzido.

## Compatibilidade
- Nenhuma alteração em `app.js`, `data.js`, `drive-backup.js`, `traits.js` ou nos módulos funcionais.
- Nenhuma alteração no formato do banco de dados, inventário, histórico, contas, backups ou sincronização.
- O novo CSS é carregado depois das folhas existentes para atuar somente como camada de apresentação.

## Publicação
Enviar `index.html` atualizado e adicionar `visual-refresh.css` ao mesmo diretório dos demais arquivos CSS. Não remover arquivos existentes.
