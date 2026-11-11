# Marco 2 + correções — o que mudou

## Correções pequenas
- Painel fiscal: os juros da dívida agora são anuais (antes eram mensais, somados a um saldo primário anual). Arquivos: engine/summary.ts e engine/fiscal.ts.
- Pesquisa: o rótulo deixou de dizer 'Bônus potencial' em tudo. Agora mostra o efeito real: crescimento potencial (Econômica e Tecnológica), bem-estar (Social), estabilidade (Militar) e instituições (Governamental).
- Pesquisa mais rápida: os custos foram divididos por ~4 (25 a 50 pontos, de 9 a 19 meses por projeto). Para voltar ao original, desfaça o 'cost' em src/data/research.ts.

## Marco 2 (motor)
- Risco-país contínuo (engine/risk.ts): calculado como desvio da âncora (dívida, déficit, inflação, reservas, instituições, crescimento e inadimplência). Sobe rápido, desce devagar. O rating virou rótulo dele, com histerese de 1 nível a cada 6 meses.
- Custo da dívida usa o desvio do risco-país.
- Fuga de capitais: se o risco-país sobe acima da âncora, o câmbio desvaloriza, as reservas caem e a confiança piora.
- Dívida em moeda estrangeira: a desvalorização aumenta o estoque da parcela externa (foreignDebtShare de cada país).
- O câmbio agora acompanha o diferencial de inflação (paridade parcial), senão a dívida externa nunca se corrigia.
- Crédito e inadimplência: juro real alto e desemprego elevam a inadimplência devagar; o excesso reduz crescimento e investimento e eleva o risco-país.
- Defasagem de 20% ao mês nos efeitos do juro real sobre crescimento e investimento.
- Saves passaram para a versão 2 (saves antigos pedem novo jogo).

## Interface
- Card de dívida mostra a nota e o risco-país em pontos-base.
- Nova coluna 'Inadimplência' na faixa de indicadores.
- Relatório do mês avisa fuga de capitais e inadimplência acima de 8%.
