let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
let Bottle = require('bottlejs');
let Redis = require('ioredis');
let mongoose = require('mongoose');
let bodyParser = require('body-parser');
let ArgumentError = require('common-errors').ArgumentError;

// payment modules
let Paypal = require('./lib/Paypal');
let Braintree = require('./lib/Braintree');

let bottle = Bottle.pop('default');

let app = express();
bottle.value('app', app);

let config = require('./config.js');

bottle.value('config', config);
bottle.service('redis', function(_config) {
  console.info('connecting to redis ' + _config.redisUrl);
  return new Redis(_config.redisUrl);
}, 'config');
bottle.service('mongo', function(_config) {
  console.info('connecting to mongo ' + _config.mongoUrl);
  mongoose.connect(config.mongoUrl);
  return mongoose;
}, 'config');
bottle.service('PaymentOrder', require('./models/PaymentOrder'),
  'config', 'mongo');
bottle.service('paymentManager', require('./lib/PaymentManager'),
  'PaymentOrder', 'redis');

// modules
bottle.service('paypal', Paypal, 'config', 'app', 'paymentManager');
bottle.service('braintree', Braintree, 'config', 'app', 'paymentManager');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({extended: true}));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// routes
app.use('/', require('./routes/index'));
app.use('/make-payment', require('./routes/make-payment'));
app.use('/check-payment', require('./routes/check-payment'));


// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  
  if (err instanceof ArgumentError) {
    res.status(422);
    res.send(err.message);
    return;
  }
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {}; 

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
