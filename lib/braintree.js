var express = require('express');
var braintree = require('braintree');
// brain tree module
// payment request handler
// Other payment functions to be used in routes

module.exports = function Braintree(config, app) {

  var gateway = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: config.braintree.merchantId,
    publicKey: config.braintree.publicKey,
    privateKey: config.braintree.privateKey,
  });

  var router = express.Router(); 
  
  var TRANSACTION_SUCCESS_STATUSES = [
    braintree.Transaction.Status.Authorizing,
    braintree.Transaction.Status.Authorized,
    braintree.Transaction.Status.Settled,
    braintree.Transaction.Status.Settling,
    braintree.Transaction.Status.SettlementConfirmed,
    braintree.Transaction.Status.SettlementPending,
    braintree.Transaction.Status.SubmittedForSettlement
  ];

  function formatErrors(errors) {
    var formattedErrors = '';

    for (var i in errors) { 
      if (errors.hasOwnProperty(i)) {
        formattedErrors += 'Error: ' + errors[i].code + ': ' + errors[i].message + '\n';
      }
    }
    return formattedErrors;
  }

  function createResultObject(transaction) {
    var result;
    var status = transaction.status;

    if (TRANSACTION_SUCCESS_STATUSES.indexOf(status) !== -1) {
      result = {
        header: 'Sweet Success!',
        icon: 'success',
        message: 'Your test transaction has been successfully processed. See the Braintree API response and try again.'
      };
    } else {
      result = {
        header: 'Transaction Failed',
        icon: 'fail',
        message: 'Your test transaction has a status of ' + status + '. See the Braintree API response and try again.'
      };
    }

    return result;
  }

  router.get('/', function (req, res) {
    res.redirect('/gateway/braintree/new');
  });

  router.get('/new', function (req, res) {
    gateway.clientToken.generate({}, function (err, response) {
      res.render('braintree/new', {
        amount: req.query.amount, // tmp hack
        clientToken: response.clientToken, 
      });
    });
  });

  router.get('/:id', function (req, res) {
    var result;
    var transactionId = req.params.id;

    gateway.transaction.find(transactionId, function (err, transaction) {
      result = createResultObject(transaction);
      res.render('braintree/show', {transaction: transaction, result: result});
    });
  });

  router.post('/', function (req, res) {
    var transactionErrors;
    var amount = req.body.amount; // In production you should not take amounts directly from clients
    var nonce = req.body.payment_method_nonce;

    gateway.transaction.sale({
      amount: amount,
      paymentMethodNonce: nonce,
      options: {
        submitForSettlement: true
      }
    }, function (err, result) {
      if (result.success || result.transaction) {
        res.redirect('/gateway/braintree/' + result.transaction.id);
      } else {
        transactionErrors = result.errors.deepErrors();
        req.flash('error', {msg: formatErrors(transactionErrors)});
        res.redirect('/gateway/braintree/new');
      }
    });
  });
  app.use('/gateway/braintree', router);

  this.paymentRequestHandler = function(paymentObj, res, next) {
    res.redirect('/gateway/braintree/new?amount='+ paymentObj.price); 
  };
};