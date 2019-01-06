
var express = require('express');
var router = express.Router();
const axios = require('axios');

const pvsController = require('../controllers').pvs;
const config=require("../config/configs");

var nbrCandidat;
var nbrInscrit;
var nbrBureau;
var typeFraude;

/* GET home page. */
router.get('/', function (req, res, next) {
  res.render('index');
});

router.post('/resultats', function (req, res, next) {
  nbrCandidat = req.body.nbrCandidat;
  nbrInscrit = req.body.nbrInscrit;
  nbrBureau = req.body.nbrBureau;
  typeFraude = req.body.typeFraude;

  pvsController.init(nbrCandidat, nbrBureau, nbrInscrit);
  
  // A ce niveau ci on doit appeler le génerateur de pvs pour qu'il fasse son travait
  // tout en stockant les résultats dans la blockchain

  axios.post('http://localhost:5000/api?number_party='+req.body.nbrCandidat+'&bureau_number='+req.body.nbrBureau+'&enrolled_number='+req.body.nbrInscrit+'&coalition_mode='+req.body.typeFraude)
  .then(function (response) {
    console.log(response);
    if(response.data === 200){
      res.render('resultats',{nbrCandidat:req.body.nbrCandidat});
    }
    else if (response.data === 404){
      res.status(404).send("Une erreur est survenue. Veuillez réessayer");
    }
    
  })
  .catch(function (error) {
      errors.push(error.response.data.errors[0].message);

  })

  
});


router.get('/resultats', function (req, res, next) {
  res.render('resultats',{nbrCandidat:nbrCandidat});
});


router.get("/resultPartyByPartyNumber/:partyNumber", pvsController.resultPartyByPartyNumber);
router.get("/resultPartyByScrutineerName/:scrutineerName", pvsController.resultPartyByScrutineerName);
router.get("/ourOwnResult", pvsController.ourOwnResult);

router.get("/deleteAll", pvsController.deleteAll);

module.exports = router;












