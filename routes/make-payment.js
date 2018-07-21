
let express = require('express');
let bottle = require('bottlejs').pop('default');
let creditCardType = require('credit-card-type');
let checkSchema = require('express-validator/check').checkSchema;
let validationResult = require('express-validator/check').validationResult;

let router = express.Router();

router.get('/', function(req, res, next) {
  res.redirect('/make-payment.html');
});

let currentYear = new Date().getFullYear().toString().substr(-2);
console.info('current year for expiry validation: ' + currentYear);
let schemaValidator = checkSchema({
  name: {
    in: ['body'],
  },
  phone: {
    in: ['body'],
    isInt: true,
  },
  currency: {
    in: ['body'],
    isIn: {
      // Options as an array
      options: [['USD', 'HKD', 'EUR', 'AUD', 'JPY', 'CNY']],
    },
  },
  price: {
    in: ['body'],
    isInt: true,
    toInt: true,
  },
  cardHolderName: {
    in: ['body'],
    isString: true,
  },
  cardNumber: {
    in: ['body'],
    isCreditCard: true,
  },
  expiryMonth: {
    in: ['body'],
    isInt: {
      min: 1,
      max: 12,
      allow_leading_zeroes: true,
    },
  },
  expiryYear: {
    in: ['body'],
    isInt: {
      options: {
        min: currentYear,
        max: 99,
        allow_leading_zeroes: true,
      },
    },
  },
  cvv: {
    in: ['body'],
    isInt: {
      options: {
        allow_leading_zeroes: true,
      },
    },
    isLength: {
      options: {
        min: 3,
        max: 4,
      },
    },
  },
});

/* Handle payment request */
router.post('/', schemaValidator, async (req, res, next) => {
  // handle validation
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(422).json({errors: errors.array()});
    return;
  }

  console.info('make payment form data: ', req.body);
  let currency = req.body.currency;
  let ccType = creditCardType(req.body.cardNumber)[0].type;

  if (currency !== 'USD' && ccType === 'american-express') {
    // show Error
    next(new Error('American express can only pay USD'));
  }

  let PaymentOrder = bottle.container.PaymentOrder;

  let order = new PaymentOrder({
    customerName: req.body.name,
    customerPhone: req.body.phone,
    price: req.body.price,
    currency: req.body.currency,
  });

  console.info('Created payment order', order);

  try {
    await order.save();
  } catch (e) {
    console.error(' failed to save order ', e, 'order: ', order);
    next(new Error('Fail to persist order to DB'));
    return;
  }

  if (ccType === 'american-express') {
    // use paypal
    bottle.container.paypal.paymentRequestHandler(order, res, next);
    return;
  } else if (['USD', 'EUR', 'AUD'].includes(currency)) {
    // use paypal
    bottle.container.paypal.paymentRequestHandler(order, res, next);
    return;
  }

  // use braintree
  bottle.container.braintree.paymentRequestHandler(order, res, next);
});

module.exports = router;
