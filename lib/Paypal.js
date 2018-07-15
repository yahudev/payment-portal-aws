// paypal module
var express = require('express');
var paypal = require('paypal-rest-sdk');
var _ = require('lodash');

module.exports = function Paypal(config, app) {
    // init config
  paypal.configure({
    mode: config.paypal.type, 
    client_id: config.paypal.client_id,
    client_secret: config.paypal.client_secret
  });

  // init routes on expressJs
  var router = express.Router();
  var paypalIntegrationEndpoint = '/gateway/paypal';
  var publicPaypalIntegrateEndpoint = config.publicUrlBase + paypalIntegrationEndpoint;
  app.use(paypalIntegrationEndpoint, router);

  var payReqBase = {
    intent:'sale',
    payer:{
      payment_method:'paypal'
    },
    redirect_urls:{
      return_url: publicPaypalIntegrateEndpoint + '/process',
      cancel_url: publicPaypalIntegrateEndpoint + '/cancel'
    },
  };

  // return url hanlder
  router.get('/process', function returnUrlHandler(req, res, next) {
    var paymentId = req.query.paymentId;
    var payerId = { payer_id: req.query.PayerID };

    paypal.payment.execute(paymentId, payerId, function(error, payment){
      if(error){
        console.error(JSON.stringify(error));   
        next(new Error("Internal Server Error"));
        return;
      } 
      
      if (payment.state == 'approved'){
        console.log('payment completed successfully');
        // store to DB

        res.send('completed payment');
        return;
      } 

      console.log('payment not successful');
      next();
    });

  });

  // cancel url hanlder
  router.get('/cancel', function cancelUrlHandler(req, res, next) {
    
    console.info('payment cancelled during approval ', req.query);
    res.send('Payment cancellel ', req.query);
    
  });
  

  function createPayReq(currency, price, description) {
    return JSON.stringify(_.merge({
      transactions: [{
        amount: {
          total: price,
          currency: currency
        },
        description: description
      }]
    }, payReqBase));
  }

  this.paymentRequestHandler = function(paymentRequest, res, next) {
      
      var currency = paymentRequest.currency;
      var price = paymentRequest.price;
      var description = paymentRequest.description;

      console.info('Making a payment thru PayPal: ', paymentRequest);
      // create payReq
      var payReq = createPayReq(currency, price, description);

      paypal.payment.create(payReq, function(error, payment) {
        var links = {};

        if(error){
          console.error(JSON.stringify(error));
          next(new Error("Internal Server Error"));
          return;
        }

        // Capture HATEOAS links
        payment.links.forEach(function(linkObj){
          links[linkObj.rel] = {
            href: linkObj.href,
            method: linkObj.method
          };
        })

        // If redirect url present, redirect user
        if (links.hasOwnProperty('approval_url')){
          //REDIRECT USER TO links['approval_url'].href
          var approvalUrl = links['approval_url'].href;
          console.info('Payment inited thru payal: Redirecting to ' + approvalUrl );
          res.direct(approvalUrl); 
          return;
        }

        //unhandled
        console.error('no redirect URI present');
        next();
          
      });

  }
};