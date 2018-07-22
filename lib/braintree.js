let express = require('express');
let braintree = require('braintree');
let asyncWrap = require('express-async-handler');
let Error = require('common-errors').Error;
let Base64 = require('js-base64').Base64;
let uniqid = require('uniqid');
// brain tree module
// payment request handler
// Other payment functions to be used in routes
module.exports = function Braintree(config, app, PaymentOrder) {
  let btClient = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: config.braintree.merchantId,
    publicKey: config.braintree.publicKey,
    privateKey: config.braintree.privateKey,
  });

  let router = express.Router();

  /**
   * Generate a 16 char short hash
   * @param {String} str Sting
   * @return {String} hash string
   */
  function shortHash(str) {
    return Base64.encode(str).substr(0, 16);
  }

  const initPaymentProcess = async (paymentOrder, key) => {
    paymentOrder.process = {
      vendor: 'braintree',
      key: shortHash(key),
    };
    await paymentOrder.save();
  };

  const findProcess = async (key) => {
    return PaymentOrder.findOne({'process.key': shortHash(key)});
  };

  const saveProcessFailure = async (key) => {
    await PaymentOrder.findOneAndUpdate({
      'process.key': shortHash(key),
    }, {
      'process.isComplete': true,
      'process.isSuccess': false,
    });
  };

  const saveProcessSuccess = async (key) => {
    await PaymentOrder.findOneAndUpdate({
      'process.key': shortHash(key),
    }, {
      'process.isComplete': true,
      'process.isSuccess': true,
      'ref': uniqid(),
    });
  };

  router.post('/', asyncWrap(async (req, res) => {
    let transactionErrors;
    let nonce = req.body.payment_method_nonce;
    let clientToken = req.body.clientToken;

    if (!clientToken || !nonce) {
      throw new Error('Invalid transaction request');
    }

    let paymentOrder = await findProcess(clientToken);
    if (!paymentOrder || !paymentOrder.price) {
      console.info(`invalid order for token ${clientToken}: `, paymentOrder);
      throw new Error('Invalid order');
    }

    try {
      let result = await btClient.transaction.sale({
        amount: paymentOrder.price,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      });

      if (result.success || result.transaction) {
        await saveProcessSuccess(clientToken);
        res.redirect('/gateway/braintree/' + result.transaction.id);
      } else {
        transactionErrors = result.errors.deepErrors();
        console.warn('fail on braintree sale transaction: ', transactionErrors);
        await saveProcessFailure(clientToken);

        throw new Error('fail on braintree sale transaction');
        // standard failure handler.

        res.redirect('/make-payment');
      }
    } catch (e) {
      throw new Error('Braintrain transaction failure', e);
    }
  }));
  app.use('/gateway/braintree', router);

  this.paymentRequestHandler = async (paymentOrder, res, next) => {
    let response;
    try {
      response = await btClient.clientToken.generate({});
    } catch (e) {
      throw new Error('fail to generate braintree client token', e);
    }

    try {
      await initPaymentProcess(paymentOrder, response.clientToken);
      res.render('braintree/new', {
        amount: paymentOrder.price,
        clientToken: response.clientToken,
      });
    } catch (e) {
      throw new Error('fail to init payment process', e);
    }
  };
};
