# Movimento — Ritmo Cardiologia (painel)

## Conceito
**Monitor cardíaco.** As coisas entram como um batimento: subida rápida e assentamento longo e suave.
O traço se desenha antes do conteúdo ficar parado, e os números "leem" até o valor, como num monitor.
Nada quica, nada flutua sozinho. Movimento é resposta a uma ação ou a chegada numa tela.

Sensação: precisa, calma, cara.

## Tokens (styles.css, `:root`)
| Token | Valor | Uso |
|---|---|---|
| `--dur-1` | 120ms | hover, pressão de botão |
| `--dur-2` | 200ms | troca de estado, check, abas |
| `--dur-3` | 340ms | entrada de linha, modal, toast |
| `--dur-4` | 700ms | contagem dos números |
| `--dur-traco` | 1400ms | traço de ECG desenhando |
| `--ease-sai` | cubic-bezier(.2,.8,.2,1) | padrão |
| `--ease-assenta` | cubic-bezier(.16,1,.3,1) | entradas (assentamento longo) |
| `--ease-bate` | cubic-bezier(.34,1.56,.64,1) | só feedback pequeno (check, contagem de aba) |
| `--escalona` | 28ms | atraso entre linhas, no máximo 10 linhas |

## Coreografia
| Onde | Gatilho | Técnica | Movimento reduzido |
|---|---|---|---|
| Entrada (login) | carregar | traço SVG desenhando + cartão subindo | traço já desenhado, sem subida |
| Troca de tela | navegar | View Transitions: cabeçalho fixo, conteúdo troca com 6px de subida | troca instantânea |
| Hoje: monitor do dia | chegar na tela | varredura do traço (uma vez) + números contando | valores finais, traço inteiro |
| Listas | chegar na tela | linhas assentam em sequência (28ms) | sem atraso |
| Abas | navegar | batida desliza até a aba e se redesenha | sem deslize |
| Jornada | soltar cartão / mudar etapa | View Transitions: o cartão viaja até a coluna nova | troca instantânea |
| Jornada | arrastar | cartão inclina 1,5° e ganha sombra | sem inclinação |
| Tarefas | marcar | check se desenha, linha risca e sai | check sem desenho |
| Toast com "Desfazer" | aparecer | barra de tempo encolhendo (6s) | barra parada |
| Ficha do paciente | abrir | traço desenha no ritmo da FC do paciente | traço inteiro |
| Modal e busca | abrir | escala .98→1 com fade | só fade |

## Registro de técnicas
- Desenho de traço SVG (stroke-dashoffset): login, monitor do dia, ficha, aba ativa
- Contagem numérica (rAF): monitor do dia, ficha
- View Transitions API: troca de tela, mudança de etapa na Jornada
- Escalonamento de linhas por CSS (`--i`): listas e tabelas
- Barra de tempo por transform scaleX: toast com desfazer
- Agenda (tema clínico claro): gaveta lateral desliza da direita (`gaveta-entra`/`gaveta-sai`); blocos viajam ao remarcar ou mudar status (View Transitions, `view-transition-name: ag-<id>`); fantasma tracejado mostra o horário durante o arrasto; linha do "agora" desliza a cada 30 s; barra da seção ativa no menu lateral cresce ao entrar.
