// paypal module
let express = require('express');
let asyncWrap = require('express-async-handler');
let paypal = require('paypal-rest-sdk');
let _ = require('lodash');
let Error = require('common-errors').Error;
let URL = require('url-parse');

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

  // return url hanlder
  router.get('/process', asyncWrap(async (req, res, next) => {
    console.info('paypal payment procesing ', req.query);
    let paymentId = req.query.paymentId;
    let token = req.query.token;
    let payerId = {payer_id: req.query.PayerID};

    let order = await findByProcess(token);
    if (!order) {
      throw new Error('Invalid paypal process session');
    }

    paypal.payment.execute(paymentId, payerId, function(error, payment) {
      if (error) {
        console.error(JSON.stringify(error));

        handleProcessFailure(token)
          .catch(next);
        return;
      }

      if (payment.state == 'approved') {
        console.log('payment completed successfully');
        // store to DB
        handleProcessSuccess(token).then(() => {
          res.send('completed payment');
        })
        .catch(next);
        return;
      }

      console.log('payment not successful');
      handleProcessFailure(token)
      .catch(next).then(next);
    });
  }));

  // cancel url hanlder
  router.get('/cancel', asyncWrap(async (req, res, next) => {
    if (!req.query.token) {
      console.error('Invalid paypal cancel request.', req.query);
      throw new Error('Internal Server Error');
    }

    console.info('Paypal payment cancelled');
    await handleProcessFailure(req.query.token);
    res.send('Payment cancelled. Return to <a href="' + config.publicUrl + '/make-payment">Make Payment</a> page.');
  }));

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
      console.info('Making a payment thru PayPal: ', payReq);

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
          await startProcess(order, 'paypal', key);
          console.info(`Payment (${payment.id}) inited thru payal: Redirecting to ${approvalUrl}`);
          res.redirect(approvalUrl);
          return;
        }

        // unhandled
        console.error('no redirect URI present');
        next(new Error('Fail to create payment request'));
      });
  };
};
