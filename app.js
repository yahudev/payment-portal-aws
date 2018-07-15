var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var Bottle = require('bottlejs');
var Redis = require('ioredis');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');

// payment modules 
var Paypal = require('./lib/Paypal');
var Braintree = require('./lib/Braintree');

var bottle = Bottle.pop('default');

var app = express();
bottle.value('app', app);

var config = require('./config.js');

bottle.value('config', config); 
bottle.service('redis', function(_config) {
  console.info('connecting to redis ' + _config.redisUrl);
  return new Redis(_config.redisUrl);
}, 'config');
bottle.service('mongo', function(_config) {
  console.info('connecting to mongo ' + _config.mongoUrl)
  mongoose.connect(config.mongoUrl);
  return mongoose;
}, 'config');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// routes
app.use('/', require('./routes/index'));
app.use('/make-payment', require('./routes/make-payment'));

// modules 
bottle.service('paypal', Paypal, 'config', 'app');
bottle.container.paypal; // init

bottle.service('braintree', Braintree, 'config', 'app');
bottle.container.braintree; // init

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
