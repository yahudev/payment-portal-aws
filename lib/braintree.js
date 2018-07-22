let express = require('express');
let braintree = require('braintree');
let asyncWrap = require('express-async-handler');
let Error = require('common-errors').Error;
// brain tree module
// payment request handler
// Other payment functions to be used in routes
module.exports = function Braintree(
  config,
  app,
  {startProcess, findByProcess, handleProcessSuccess, handleProcessFailure}
) {
  let btClient = braintree.connect({
    environment: braintree.Environment.Sandbox,
    merchantId: config.braintree.merchantId,
    publicKey: config.braintree.publicKey,
    privateKey: config.braintree.privateKey,
  });

  let router = express.Router();

  router.post('/', asyncWrap(async (req, res) => {
    let transactionErrors;
    let nonce = req.body.payment_method_nonce;
    let clientToken = req.body.clientToken;

    if (!clientToken || !nonce) {
      throw new Error('Invalid transaction request');
    }

    let order = await findByProcess(clientToken);
    if (!order || !order.price) {
      console.info(`invalid order for token ${clientToken}: `, order);
      throw new Error('Invalid order');
    }

    try {
      let result = await btClient.transaction.sale({
        amount: order.price,
        paymentMethodNonce: nonce,
        options: {
          submitForSettlement: true,
        },
      });

      if (result.success || result.transaction) {
        let ref = await handleProcessSuccess(clientToken);
        res.redirect(`/check-payment.html?referenceCode=${ref}`);
      } else {
        transactionErrors = result.errors.deepErrors();
        console.warn('fail on braintree sale transaction: ', transactionErrors);
        await handleProcessFailure(clientToken);

        throw new Error('fail on braintree sale transaction');
      }
    } catch (e) {
      throw new Error('Braintrain transaction failure', e);
    }
  }));
  app.use('/gateway/braintree', router);

  this.paymentRequestHandler = async (order, res, next) => {
    let response;
    try {
      response = await btClient.clientToken.generate({});
    } catch (e) {
      throw new Error('fail to generate braintree client token', e);
    }

    try {
      await startProcess(order, 'braintree', response.clientToken);
      res.render('braintree/new', {
        amount: order.price,
        clientToken: response.clientToken,
      });
    } catch (e) {
      throw new Error('fail to init payment process', e);
    }
  };
};
