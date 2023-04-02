# alexa-nightscout-skill

Alexa skill para leiutura de dados do Nightscout

## Exemplos de uso

**Glicemia atual:**

    - Alexa, minha glicemia
    - Sobre quando você gostaria de saber sua glicemia?
    - Agora
    - O valor da sua glicemia é 150, subindo.

**Glicemias passadas:**

    - Alexa, minha glicemia
    - Sobre quando você gostaria de saber sua glicemia?
    - Passado
    - Nas últimas 24 horas, sua glicemia média foi 136. 75% no alvo.

**Glicemias futuras (previsão):**

    - Alexa, minha glicemia
    - Sobre quando você gostaria de saber sua glicemia?
    - Futuro
    - A previsão para os próximos 30 minutos, é 165

## Tutorial - Crie Sua Primeira Skill Para Alexa

<https://www.youtube.com/watch?v=GvzyVHDANfU>

## Invocation name

minha glicemia

## Intents

#### NowIntent

Utterances:

* agora
* qual o valor
* quanto está
* presente
* sobre o presente
* este momento
* neste momento

#### NextIntent

Utterances:

* futuro
* sobre o futuro
* próximos minutos
* breve
* em breve

#### PrevIntent

Utterances:

* passado
* do passado
* anteriormente
* últimas horas

## Atenção

Lembre de mudar o endereço do seu Nighscout (**NightscoutBaseURL**) na linha 8 do arquivo index.js
