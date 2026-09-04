# Meu Ateliê

PWA local para gestão de um ateliê. Pedidos, clientes, estoque, financeiro,
precificação, orçamentos e catálogo funcionam sem servidor e os dados ficam no
`localStorage` do aparelho.

## Desenvolvimento

```bash
npm install
npm run dev
```

No Mac, abra `http://localhost:5173`. Para testar pelo iPhone na mesma rede,
use o endereço `Network` exibido pelo Vite, por exemplo
`http://192.168.0.102:5173`.

## Build de produção

```bash
npm run build
npm run preview
```

Os arquivos prontos ficam em `dist/`.

## Instalação no iPhone

O modo PWA completo (instalação e uso offline) exige que `dist/` seja servido
por HTTPS. Depois de abrir o endereço HTTPS no Safari:

1. Toque em **Compartilhar**.
2. Selecione **Adicionar à Tela de Início**.
3. Confirme em **Adicionar**.

Não é necessário Xcode, certificado Apple ou publicação na App Store.

## Dados e backup

- As informações ficam apenas no navegador do aparelho.
- Em **Configurações > Exportar dados**, salve um backup antes de limpar os
  dados do Safari ou trocar de iPhone.
- Em outro aparelho, use **Restaurar backup** para importar o arquivo JSON.
