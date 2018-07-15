
var express = require('express');
var bottle = require('bottlejs').pop('default');
var creditCardType = require('credit-card-type');
var checkSchema = require('express-validator/check').checkSchema;
var validationResult = require('express-validator/check').validationResult;

var router = express.Router();

router.get('/', function(req, res, next) {
  res.redirect('/make-payment.html');
});

var currentYear = new Date().getFullYear().toString().substr(-2);
console.info('current year for expiry validation: ' + currentYear);
var schemaValidator = checkSchema({
  name: {
    in: ['body'],
  },
  phone: {
    in: ['body'],
    isInt: true,
  },
  currency: {
    in: ['body'],
    isIn:  {
      // Options as an array
      options: [['USD','HKD','EUR','AUD','JPY','CNY']],
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
      allow_leading_zeroes: true
    }
  },
  expiryYear: {
    in: ['body'],
    isInt: {
      options: {
        min: currentYear,
        max: 99,
        allow_leading_zeroes: true
      }
    },
  },
  cvv: {
    in: ['body'],
    isInt: {
      options: {
        allow_leading_zeroes: true
      }
    },
    isLength: {
      options: {
        min: 3,
        max: 4,
      }
    }
  }
});

/* Handle payment request */
router.post('/', schemaValidator, function(req, res, next) {
  // handle validation
  var errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({ errors: errors.array() });
  }
  
  console.info('make payment form data: ', req.body);
  var currency = req.body.currency;
  var ccType = creditCardType(req.body.cardNumber)[0].type;

  var paymentObj = {
    currency: currency,
    price: req.body.price,
    description: 'Custom payment through payment portal',
  };
  
  console.info('Making a payment ', paymentObj);
  
  if (currency !== 'USD' && ccType === 'american-express') {
    // show Error
  }

  if (ccType === 'american-express') {
    // use paypal
    bottle.container.paypal.paymentRequestHandler(paymentObj, res, next);
    return;
  } else if (['USD','EUR','AUD'].includes(currency)) {
    // use paypal
    bottle.container.paypal.paymentRequestHandler(paymentObj, res, next);
    return;
  } 
  
  // use braintree
  

});

module.exports = router;
