let express = require('express');
let checkSchema = require('express-validator/check').checkSchema;
let validationResult = require('express-validator/check').validationResult;
let bottle = require('bottlejs').pop('default');
let asyncWrap = require('express-async-handler');
let _ = require('lodash');

let router = express.Router();
const paymentManager = bottle.container.paymentManager;

router.get('/', function(req, res, next) {
  res.redirect('/check-payment.html');
});

let schemaValidator = checkSchema({
  name: {
    in: ['body'],
  },
  referenceCode: {
    in: ['body'],
  },
});

router.post('/', schemaValidator, asyncWrap(async (req, res, next) => {
  // handle validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({errors: errors.array()});
    return;
  }

  const customerName = req.body.name;
  const referenceCode = req.body.referenceCode;

  let order = await paymentManager.checkOrder(customerName, referenceCode);

  if (!order) {
    res.status(404);
    res.send('order not found');
    return;
  }

  order = _.pick(order, ['customerName', 'customerPhone', 'price', 'currency', 'ref']);
  res.send({
    order,
  });
}));

module.exports = router;
