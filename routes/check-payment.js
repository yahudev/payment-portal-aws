let express = require('express');
let checkSchema = require('express-validator/check').checkSchema;
let validationResult = require('express-validator/check').validationResult;
let bottle = require('bottlejs').pop('default');
let asyncWrap = require('express-async-handler');
let router = express.Router();

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
  const PaymentOrder = bottle.container.PaymentOrder;

  let paymentOrder = await PaymentOrder.findOne({customerName, ref: referenceCode})
    .select({_id: 0, customerName: 1, customerPhone: 1, currency: 1, price: 1});

  if (!paymentOrder) {
    res.status(404);
    res.send('order not found');
  }

  res.json({
    paymentOrder,
  });
}));

module.exports = router;
