
const axios = require('axios');
const config=require("../config/configs");

var numberOfParties;
var numberOfPollingStations;
var numberOfSuscribers;


// return the percentages of the candidates
function calculatePercentages(tab){
    var sum=0;
    var percentages = [];
    for(var i=0; i<tab.length; i++){
        sum+=tab[i];
    }
    for(var i=0; i<tab.length; i++){
        percentages[i] = (tab[i]/sum)*100;
    }
    return percentages;
}


// First level of result in our problem
function firstLevelResult(partyPvList){
    var sum = [];
    for(var i=0; i<numberOfParties; i++){
        sum.push(0);
    }
    partyPvList.forEach(function(item){
        for(var i=0; i<numberOfParties; i++){
            sum[i] += item.voices[i];
        }
    });
    return sum;
}


// Extract the indice of the max element of the tab
function indiceBigElement(tab){
    var indice=0;
    var test = tab[0];
    for(var i=1; i<tab.length; i++){
        if(tab[i]>=test){
            test = tab[i];
            indice = i;
        }
    }
    return indice;
}


// Equality between two tabs
function equals(tab1,tab2){
    var test=0;
    var response = false;
    for(var i=0; i<tab1.length; i++){
        if(tab1[i]===tab2[i]){
            test+=1;
        }
    }
    if(test === tab1.length){
        response = true;
    }
    return response;
}

// Extract for a polling station the most repetitive pv
function extractionPv(pvs){
    var comparaison = [];
    var response = pvs[pvs.length-1];
    var max=0; 
    
    for(var i=0; i<pvs.length-1; i++){
        comparaison.push(0);
    }
    for(var i=0; i<pvs.length-1; i++){
        for(var j=i+1; j<pvs.length-1; j++){
            if (equals(pvs[i].voices,pvs[j].voices) === true){
                comparaison[i]+=1;
                comparaison[j]+=1;
            }
        }
    }

    max = Math.max(...comparaison);
    if(max>0){
        response = pvs[indiceBigElement(comparaison)];
    }

    return response;
}


// Extract the list of pvs to use to generate our own level of result
function ourList(pvs){
    var response = [];
    var listPvsPollingStation = [];
    var stop =1;
    var pvElecam;

   for(var i=1; i<=numberOfPollingStations; i++){
        for(var j=0; j<pvs.length; j++){
            if(pvs[j].pollingStation === i){
                if((pvs[j].scrutineerName !== "bon") && (pvs[j].scrutineerName !== "elecam")){ //exclusion pvs elecam et bon
                    listPvsPollingStation.push(pvs[j]);
                }
                if(pvs[j].scrutineerName === "elecam" && stop>0){
                    pvElecam = pvs[j];
                    stop = 0;
                }
            }
        }

        // pv qu'on enverra pour ce bureau de vote lorsque tous 
        // truque les élections dans leur coin

        listPvsPollingStation.push(pvElecam); 
        response.push(extractionPv(listPvsPollingStation));
        listPvsPollingStation = [];
    }
    
    return response;
}

// Our result after processing the data
function secondLevelResult(pvs){
    return firstLevelResult(ourList(pvs));
}




module.exports = {
    deleteAll(req, res){
        axios.get(config.blochainApiUri+'Pv')
            .then(function (response1) {
                console.log("liste pvs ok");

                axios.get(config.blochainApiUri+'Scrutineer')
                    .then(function (response2) {
                        console.log("liste scrutateurs ok");

                        var scrutineerIds = response2.data.map(function(item){ return item.scrutineerId });
                        var pvIds = response1.data.map(function(pv){ return pv.pvId });

                        console.log("pvIds: " + JSON.stringify(pvIds));
                        console.log("scrutineerIds: " + JSON.stringify(scrutineerIds));

                        var deletePv = function(i) {
                            if(i < pvIds.length) {
                                axios.delete(config.blochainApiUri+'Pv/'+pvIds[i]).then(function() {
                                    console.log("pv " + pvIds[i] + " supprimé")
                                    deletePv(++i)
                                })
                                .catch(function (error) {
                                    res.status(400).send(error.message)
                                })
                            }
                            else{
                                console.log("suppression pvs ok");
                                res.redirect('/');
                            }
                        }
                        var deleteScrutineer = function(i) {
                            if(i < scrutineerIds.length) {
                                axios.delete(config.blochainApiUri+'Scrutineer/'+scrutineerIds[i]).then(function() {
                                    console.log("scrutateur " + scrutineerIds[i] + " supprimé")
                                    deleteScrutineer(++i)
                                })
                                .catch(function (error) {
                                    res.status(400).send(error.message)
                                })  
                            }
                            else{
                                console.log("suppression scrutateurs ok");
                                deletePv(0)
                            }
                        }
                        deleteScrutineer(0)
                    })
                    .catch(function (error) {
                        res.status(400).send(error.response.data.errors[0].message)
                    })    
            })
            .catch(function (error) {
                res.status(400).send(error.response.data.errors[0].message)
            })        
    },
    resultPartyByPartyNumber(req,res) {
        axios.get(config.blochainApiUri+'queries/selectPvByPartyNumber?partyNumber='+req.params.partyNumber)
            .then(function (response) {

                var result = firstLevelResult(response.data);
                var percentages = calculatePercentages(result);
                var winner = indiceBigElement(result) + 1;
                var i = parseInt(req.params.partyNumber) + 1;
                res.render('resultat_i',{id:i, nbrCandidat:numberOfParties, tab:result, winner: winner, percentages:percentages});
            })
            .catch(function (error) {
                res.status(400).send(error.response.data.errors[0].message)
            })
    },
    resultPartyByScrutineerName(req,res) {
        axios.get(config.blochainApiUri+'queries/selectPvByScrutineerName?scrutineerName='+req.params.scrutineerName)
            .then(function (response) {

                var result = firstLevelResult(response.data);
                var percentages = calculatePercentages(result);
                var winner = indiceBigElement(result) + 1;

                if(req.params.scrutineerName === "bon"){
                    res.render('reference',{nbrCandidat:numberOfParties, tab:result, winner: winner, percentages:percentages});
                }
                if(req.params.scrutineerName === "elecam"){
                    res.render('elecam',{nbrCandidat:numberOfParties, tab:result, winner: winner, percentages:percentages});
                }
            })
            .catch(function (error) {
                res.status(400).send(error.response.data.errors[0].message)
            })
    },
    ourOwnResult(req,res) {
        axios.get(config.blochainApiUri+'Pv')
            .then(function (response) {

                var result = secondLevelResult(response.data);
                var percentages = calculatePercentages(result);
                var winner = indiceBigElement(result) + 1;
                
                res.render('nosResultats',{nbrCandidat:numberOfParties, tab:result, winner: winner, percentages:percentages});
            })
            .catch(function (error) {
                res.status(400).send(error.response.data.errors[0].message)
            })
    },
    init(nbreCandidats, nbreBureaux, nbreInscrits){
        numberOfParties = nbreCandidats;
        numberOfPollingStations = nbreBureaux;
        numberOfSuscribers = nbreInscrits;
    }
};

