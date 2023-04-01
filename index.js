/* *
 * This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
 * Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
 * session persistence, api calls, and more.
 * */
const Alexa = require('ask-sdk-core');

const NightscoutBaseURL = 'https://YOURNIGHTSCOUT.fly.dev';

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'LaunchRequest';
    },
    handle(handlerInput) {
        const speakOutput = 'Sobre quando você gostaria de saber sua glicemia?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};


//get remote data
const getRemoteData = (url) => new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? require('https') : require('http');
    const request = client.get(url, (response) => {
        if (response.statusCode < 200 || response.statusCode > 299) {
            reject(new Error(`Failed with status code: ${response.statusCode}`));
        }
        const body = [];
        response.on('data', (chunk) => body.push(chunk));
        response.on('end', () => resolve(body.join('')));
    });
    request.on('error', (err) => reject(err));
});


//translate direction
const translateDirection = function (direction) {
    // https://xbarapp.com/docs/plugins/Web/nightscout.30s.js.html

    /*
    'NONE': '?',
    'DoubleUp': '⇈',
    'SingleUp': '↑',
    'FortyFiveUp': '↗',
    'Flat': '→',
    'FortyFiveDown': '↘',
    'SingleDown': '↓',
    'DoubleDown': '⇊',
    'NOT COMPUTABLE': '??',
    'RATE OUT OF RANGE': '⇕'
    */
    const directions = {
        DoubleUp: 'subindo muito rápido', //'⇈',
        SingleUp: 'subindo rápido', //'↑',
        FortyFiveUp: 'subindo', //'↗',
        Flat: 'estável', //'→',
        FortyFiveDown: 'caindo', //'↘',
        SingleDown: 'caindo rápido', //'↓',
        DoubleDown: 'caindo muito rápido', //'⇊',
    }

    return directions.hasOwnProperty(direction) ? directions[direction] : false;
}


//glicemia agora
const NowIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NowIntent';
    },
    async handle(handlerInput) {
        let speakOutput = 'sua glicemia agora...';

        await getRemoteData(`${NightscoutBaseURL}/api/v1/entries/current.json`)
            .then((response) => {
                const data = JSON.parse(response);

                //console.log(data);
                speakOutput = `o valor da sua glicemia é ${data[0].sgv}`;

                //direction
                const currentDirection = translateDirection(data[0].direction)
                if (currentDirection) {
                    speakOutput += `, ${currentDirection}`
                }

                //delta
                //const delta = parseFloat(data[0].delta).toFixed(2);
                //speakOutput += `, delta ${delta}`

            })
            .catch((err) => {
                console.log(`ERROR: ${err.message}`);
                speakOutput = 'Houve uma falha de comunicação com seu Nightscout. Código 1';
            });

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('gostaria de mais informações sobre outro período?')
            .getResponse();
    }

}


//glicemia futura
const NextIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'NextIntent';
    },
    async handle(handlerInput) {
        let speakOutput = 'sua glicemia futura ...';

        await getRemoteData(`${NightscoutBaseURL}/api/v2/properties`)
            .then((response) => {
                const data = JSON.parse(response);

                //console.log(data);
                const predictedQtd = data.ar2.forecast.predicted.length;

                if (predictedQtd) {
                    const predictedLast = data.ar2.forecast.predicted[predictedQtd - 1];
                    const predictedMgdl = predictedLast.mgdl;
                    const predictedTime = predictedQtd * 5;
                    speakOutput = `a previsão para os próximos ${predictedTime} minutos, é ${predictedMgdl}`;
                } else {
                    speakOutput = `Não encontrei dados para o valor futuro da glicemia.`;
                }


            })
            .catch((err) => {
                console.log(`ERROR: ${err.message}`);
                speakOutput = 'Houve uma falha de comunicação com seu Nightscout. Código 2';
            });

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('gostaria de mais informações sobre outro período?')
            .getResponse();
    }

}


//glicemia passada
const PrevIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'PrevIntent';
    },
    async handle(handlerInput) {
        let speakOutput = 'sua glicemia passada...';
        let bgTargetTop = 0;
        let bgTargetBottom = 0;
        let hasTargets = false;

        //targets
        await getRemoteData(`${NightscoutBaseURL}/api/v1/status.json`)
            .then((response) => {
                const data = JSON.parse(response);
                bgTargetTop = data.settings.thresholds.bgTargetTop;
                bgTargetBottom = data.settings.thresholds.bgTargetBottom;
                hasTargets = true;
            })
            .catch((err) => {
                console.log(`ERROR: ${err.message}`);
                speakOutput = 'Houve uma falha de comunicação com seu Nightscout. Código 3';
            });


        //values
        if (hasTargets) {

            await getRemoteData(`${NightscoutBaseURL}/api/v1/entries/sgv.json?count=300`)
                .then((response) => {
                    const data = JSON.parse(response);

                    //list valuues
                    const sgvList = data.map((x) => {
                        //console.log(x.sgv);
                        return x.sgv;
                    });

                    //sum sgvs
                    const sgvTotal = sgvList.reduce((a, b) => a + b, 0);

                    //sgv medium
                    const sgvMed = Math.round(sgvTotal / sgvList.length);

                    //sgv on targets 
                    const sgvOnTargetList = sgvList.filter(sgv => {
                        return (sgv >= bgTargetBottom && sgv <= bgTargetTop);
                    });

                    //percent in target
                    const percentInTarget = Math.round(((100 * sgvOnTargetList.length) / sgvList.length));

                    //speak
                    speakOutput = `Nas últimas 24 horas, sua glicemia média foi ${sgvMed}. ${percentInTarget}% no alvo.`



                })
                .catch((err) => {
                    console.log(`ERROR: ${err.message}`);
                    speakOutput = 'Houve uma falha de comunicação com seu Nightscout. Código 4';
                });


        }

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt('gostaria de mais informações sobre outro período?')
            .getResponse();
    }

}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'You can say hello to me! How can I help?';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && (Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.CancelIntent'
                || Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.StopIntent');
    },
    handle(handlerInput) {
        const speakOutput = 'Até!';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .getResponse();
    }
};
/* *
 * FallbackIntent triggers when a customer says something that doesn’t map to any intents in your skill
 * It must also be defined in the language model (if the locale supports it)
 * This handler can be safely added but will be ingnored in locales that do not support it yet 
 * */
const FallbackIntentHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest'
            && Alexa.getIntentName(handlerInput.requestEnvelope) === 'AMAZON.FallbackIntent';
    },
    handle(handlerInput) {
        const speakOutput = 'Desculpe, não sei sobre isso. Por favor tente novamente.';

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};
/* *
 * SessionEndedRequest notifies that a session was ended. This handler will be triggered when a currently open 
 * session is closed for one of the following reasons: 1) The user says "exit" or "quit". 2) The user does not 
 * respond or says something that does not match an intent defined in your voice model. 3) An error occurs 
 * */
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        console.log(`~~~~ Session ended: ${JSON.stringify(handlerInput.requestEnvelope)}`);
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse(); // notice we send an empty response
    }
};
/* *
 * The intent reflector is used for interaction model testing and debugging.
 * It will simply repeat the intent the user said. You can create custom handlers for your intents 
 * by defining them above, then also adding them to the request handler chain below 
 * */
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return Alexa.getRequestType(handlerInput.requestEnvelope) === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = Alexa.getIntentName(handlerInput.requestEnvelope);
        const speakOutput = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speakOutput)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
    }
};
/**
 * Generic error handling to capture any syntax or routing errors. If you receive an error
 * stating the request handler chain is not found, you have not implemented a handler for
 * the intent being invoked or included it in the skill builder below 
 * */
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        const speakOutput = 'Desculpe, tive problemas para fazer o que você pediu. Por favor, tente novamente.';
        console.log(`~~~~ Error handled: ${JSON.stringify(error)}`);

        return handlerInput.responseBuilder
            .speak(speakOutput)
            .reprompt(speakOutput)
            .getResponse();
    }
};

/**
 * This handler acts as the entry point for your skill, routing all request and response
 * payloads to the handlers above. Make sure any new handlers or interceptors you've
 * defined are included below. The order matters - they're processed top to bottom 
 * */
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        NowIntentHandler,
        NextIntentHandler,
        PrevIntentHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        FallbackIntentHandler,
        SessionEndedRequestHandler,
        IntentReflectorHandler)
    .addErrorHandlers(
        ErrorHandler)
    .withCustomUserAgent('sample/hello-world/v1.2')
    .lambda();