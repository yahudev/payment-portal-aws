// paypal module
let express = require('express');
let paypal = require('paypal-rest-sdk');
let _ = require('lodash');
let Error = require('common-errors');
let URL = require('url-parse');

module.exports = function Paypal(config, app, PaymentOrder) {
    // init config
  paypal.configure({
    mode: config.paypal.type,
    client_id: config.paypal.client_id,
    client_secret: config.paypal.client_secret,
  });

  // init routes on expressJs
  let router = express.Router();
  let paypalIntegrationEndpoint = '/gateway/paypal';
  let publicPaypalIntegrateEndpoint = config.publicUrl + paypalIntegrationEndpoint;
  app.use(paypalIntegrationEndpoint, router);

  const initPaymentProcess = async (paymentOrder, key) => {
    paymentOrder.process = {
      vendor: 'paypal',
      key,
    };
    await paymentOrder.save();
  };

  const saveProcessFailure = async (key) => {
    await PaymentOrder.findOneAndUpdate({
      'process.key': key,
    }, {
      'process.isComplete': true,
      'process.isSuccess': false,
    });
  };

  const saveProcessSuccess = async (key) => {
    await PaymentOrder.findOneAndUpdate({
      'process.key': key,
    }, {
      'process.isComplete': true,
      'process.isSuccess': true,
      'ref': md5(key),
    });
  };

  console.info('paypal return url: ', publicPaypalIntegrateEndpoint + '/process');
  console.info('paypal cancel url: ', publicPaypalIntegrateEndpoint + '/cancel');

  // return url hanlder
  router.get('/process', async (req, res, next) => {
    console.info('paypal payment procesing ', req.query);
    let paymentId = req.query.paymentId;
    let token = req.query.token;
    let payerId = {payer_id: req.query.PayerID};
    
    paypal.payment.execute(paymentId, payerId, function(error, payment) {
      if (error) {
        console.error(JSON.stringify(error));

        saveProcessFailure(token);
        next(new Error('Internal Server Error'));
        return;
      }

      if (payment.state == 'approved') {
        console.log('payment completed successfully');
        // store to DB
        saveProcessSuccess(token);
        res.send('completed payment');
        return;
      }

      console.log('payment not successful');
      saveProcessFailure(token);
      next();
    });
  });

  // cancel url hanlder
  router.get('/cancel', async (req, res, next) => {
    if (!req.query.token) {
      console.error('Invalid paypal cancel request.', req.query);
      next(new Error('Internal Server Error'));
      return;
    }
    console.info('Paypal payment cancelled');
    await saveProcessFailure(req.query.token);
    res.send('Payment cancelled. Return to <a href="' + config.publicUrl + '/make-payment">Make Payment</a> page.');
  });

  const createPayReq = (paymentOrder) => {
    const {price, currency} = paymentOrder;
    const description = 'Make payment for payment portal';

    let payReqBase = {
      intent: 'sale',
      payer: {
        payment_method: 'paypal',
      },
      redirect_urls: {
        return_url: publicPaypalIntegrateEndpoint + '/process',
        cancel_url: publicPaypalIntegrateEndpoint + '/cancel',
      },
    };

    const payReq = JSON.stringify(_.merge({
      transactions: [{
        amount: {
          total: price,
          currency: currency,
        },
        description: description,
      }],
    }, payReqBase));

    return payReq;
  };

  this.paymentRequestHandler = async function(paymentOrder, res, next) {
    console.info('Making a payment thru PayPal: ', paymentOrder);
    // create payReq
    try {
      let payReq = createPayReq(paymentOrder);

      paypal.payment.create(payReq, async (error, payment) => {
        let links = {};

        if (error) {
          console.error(JSON.stringify(error));
          next(new Error('Internal Server Error'));
          return;
        }

        // Capture HATEOAS links
        payment.links.forEach(function(linkObj) {
          links[linkObj.rel] = {
            href: linkObj.href,
            method: linkObj.method,
          };
        });

        // If redirect url present, redirect user
        if (links.hasOwnProperty('approval_url')) {
          // REDIRECT USER TO links['approval_url'].href
          let approvalUrl = links['approval_url'].href;
          let key = new URL(approvalUrl).query.token;
          await initPaymentProcess(paymentOrder, key);
          console.info(`Payment (${payment.id}) inited thru payal: Redirecting to ${approvalUrl}`);
          res.redirect(approvalUrl);
          return;
        }

        // unhandled
        console.error('no redirect URI present');
        await handlePayReqError(paymentOrder, payment);
        next();
      });
      } catch (e) {
        next(new Error('Fail to create payment request', e));
      }
  };
};
