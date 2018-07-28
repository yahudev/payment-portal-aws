// paypal module
let express = require('express');
let asyncWrap = require('express-async-handler');
let paypal = require('paypal-rest-sdk');
let _ = require('lodash');
let Error = require('common-errors').Error;

module.exports = function Paypal(
  config,
  app,
  {startProcess, findByProcess, handleProcessSuccess, handleProcessFailure}
) {
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

  console.info(`paypal return url: ${publicPaypalIntegrateEndpoint}/process`);
  console.info(`paypal cancel url: ${publicPaypalIntegrateEndpoint}/cancel`);

  router.get('/process', asyncWrap(async (req, res, next) => {
    console.info('paypal payment procesing ', req.query);
    let paymentId = req.query.paymentId;
    let token = req.query.token;
    let payerId = {payer_id: req.query.PayerID};

    let order = await findByProcess(token);
    if (!order) {
      throw new Error('Invalid paypal process session');
    }

    try {
      const payment = await new Promise((resolve, reject) => {
        paypal.payment.execute(paymentId, payerId, (err, payment) => {
          if (err) {
            reject(err);
            return;
          }
          resolve(payment);
        });
      });

      if (payment.state == 'approved') {
        console.log('payment completed successfully');
        // store to DB
        await handleProcessSuccess(token);
        res.redirect(`/make-payment?msgBody=${encodeURIComponent('Payment completed successfully.')}`);
        return;
      }

      console.log('payment not successful:', payment);
      await handleProcessFailure(token);
      throw new Error('Payment not successful');
    } catch (error) {
      console.error(JSON.stringify(error));

      await handleProcessFailure(token);
      throw new Error('Payment not successful');
    }
  }));

  // cancel url hanlder
  router.get('/cancel', asyncWrap(async (req, res, next) => {
    if (!req.query.token) {
      console.error('Invalid paypal cancel request.', req.query);
      throw new Error('Internal Server Error');
    }

    console.info('Paypal payment cancelled');
    await handleProcessFailure(req.query.token);
    throw new Error('Payment cancelled.');
  }));

  router.use(function(err, req, res, next) {
    res.redirect(`/make-payment?msgBody=${encodeURIComponent(err.message)}`);
  });


  const getKey = (approvalUrl) => {
    const name = 'token';
    const results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(approvalUrl);
    if (results==null) {
      return null;
    } else {
      return decodeURI(results[1]) || 0;
    }
  };

  const createPayReq = (order) => {
    const {price, currency} = order;
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

  app.use(paypalIntegrationEndpoint, router);

  this.paymentRequestHandler = async function(order, res, next) {
      // create payReq
      let payReq = createPayReq(order);
      console.info('Making a payment thru PayPal. ');

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
          let key = getKey(approvalUrl);
          await startProcess(order, 'paypal', key);
          console.info(`Payment (${payment.id}) inited thru payal: Redirecting to ${approvalUrl}`);
          res.status(200);
          res.json({redirect: approvalUrl});
          return;
        }

        // unhandled
        console.error('no redirect URI present');
        next(new Error('Fail to create payment request'));
      });
  };
};
