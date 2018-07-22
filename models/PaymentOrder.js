let timestamp = require('mongoose-timestamp');

module.exports = function(config, mongoose) {
  let Schema = mongoose.Schema;
  let processSchema = new Schema({
    vendor: {
      type: String,
      enum: ['braintree', 'paypal'],
    },
    isCompleted: {
      type: Boolean,
      default: false,
    },
    isSuccess: {
      type: Boolean,
      default: false,
    },
    key: String,
  });

  let schema = new Schema({
    customerName: String,
    customerPhone: Number,
    currency: {
      type: String,
      enum: config.supportedCurrencies,
    },
    price: Number,
    process: processSchema,
    ref: String,
  });

  schema.plugin(timestamp);

  return mongoose.model('PaymentOrder', schema);
};


