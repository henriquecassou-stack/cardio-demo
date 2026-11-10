# Ritmo Cardiologia — painel do consultório (demonstração)

Mesmas funções do painel da Premium Curitiba, adaptadas para um consultório de cardiologia,
no formato de demonstração do OdontoIA: abre direto no navegador, entra com qualquer senha,
os dados são de exemplo e ficam só no navegador de quem abre. "Recomeçar do zero" (menu ⋯) volta ao início.

| Premium Curitiba (loja) | Ritmo Cardiologia (consultório) |
|---|---|
| Visão geral | Hoje: números do dia, "Precisa de atenção", tarefas até amanhã, novos contatos, espaço dos laudos |
| Funil de vendas | Jornada do paciente: Novo contato → Consulta marcada → Exames → Retorno (arrastar e soltar) |
| Negociação + proposta | Jornada do paciente: histórico, exame de interesse, orçamento (convênio/desconto/parcelas), próximos passos, concluir ou "não seguiu" com motivo |
| Proposta impressa | Orçamento impresso / PDF |
| Clientes | Pacientes: ficha com fatores de risco, alerta clínico, última PA/FC, remédios, exclusão LGPD |
| Estoque | Exames e consultas: preço, duração, convênio, preparo, status (Disponível, Agenda cheia, Pausado, Arquivado) |
| Anúncios (Mercado Livre e Meta) | Divulgação: Doctoralia e link de WhatsApp para o Perfil da Empresa no Google, aviso da Resolução CFM 2.336/2023 |
| Loja (configurações) | Consultório: contato, CRM/RQE, troca de senha |
| Busca Ctrl+K | Busca Ctrl+K (pacientes, exames, ações) |

**Sem site por enquanto:** a vitrine do site, o destaque e a descrição dos exames para o site, o Pixel do Meta
e os textos do site nas configurações foram retirados. Os pedidos chegam por WhatsApp, telefone, Instagram e Doctoralia.

## Abrir no computador

Precisa de um servidor simples (os arquivos usam módulos JavaScript):

```bash
python -m http.server 5178 --directory cardio-demo
```

Depois abra http://localhost:5178.

## Publicar para mostrar aos clientes

Igual ao OdontoIA: suba a pasta `cardio-demo` num repositório do GitHub e ative o GitHub Pages
(Settings → Pages → branch `main`, pasta raiz). Não precisa de build.
