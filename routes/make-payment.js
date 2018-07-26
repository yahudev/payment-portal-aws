
let express = require('express');
let asyncWrap = require('express-async-handler');
let bottle = require('bottlejs').pop('default');
let creditCardType = require('credit-card-type');
let checkSchema = require('express-validator/check').checkSchema;
let validationResult = require('express-validator/check').validationResult;

let router = express.Router();

const {createOrder} = bottle.container.paymentManager;
const paypal = bottle.container.paypal;
const braintree = bottle.container.braintree;

router.get('/', function(req, res, next) {
  res.render('make-payment');
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
router.post('/', schemaValidator, asyncWrap(async (req, res, next) => {
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
    throw new Error('American express can only pay USD');
  }

  let gateway;

  if (ccType === 'american-express') {
    // use paypal
    gateway = paypal;
  } else if (['USD', 'EUR', 'AUD'].includes(currency)) {
    // use paypal
    gateway = paypal;
  } else {
    gateway = braintree;
  }

  let order = await createOrder({
    customerName: req.body.name,
    customerPhone: req.body.phone,
    price: req.body.price,
    currency: req.body.currency,
  });

  gateway.paymentRequestHandler(order, res, next);
}));

module.exports = router;
