
let Error = require('common-errors').Error;
let Base64 = require('js-base64').Base64;
let uniqid = require('uniqid');

module.exports = function(PaymentOrder, redis) {
  /**
   * Generate a 16 char short hash
   * @param {String} str Sting
   * @return {String} hash string
   */
  function shortHash(str) {
    return Base64.encode(str).substr(0, 16);
  }

  function cacheKey(customerName, ref) {
    return `${customerName}-${ref}`;
  }

  async function cacheOrder(order) {
    return redis.set(cacheKey(order.customerName, order.ref), JSON.stringify(order.toJSON()), 'EX', 3600);
  }

  const createOrder = async ({customerName, customerPhone, price, currency}) => {
    let order = new PaymentOrder({
      customerName,
      customerPhone,
      price,
      currency,
    });

    try {
      await order.save();
      console.info('Created payment order', order);
    } catch (e) {
      throw new Error('Fail to persist order to DB', e);
    }
    return order;
  };

  const checkOrder = async (customerName, ref) => {
    let order = await redis.get(cacheKey(customerName, ref));

    if (order) {
      console.debug(`hit cache for ref ${ref}: `, order);
      return JSON.parse(order);
    }

    let order = await PaymentOrder.findOne({customerName, ref});
    if (!order) {
      return null;
    }

    await cacheOrder(order);

    return order.toJSON();
  };

  const startProcess = async (order, vendor, key) => {
    order.process = {
      vendor,
      key: shortHash(key),
    };
    await order.save();
  };

  const findByProcess = async (key) => {
    return PaymentOrder.findOne({'process.key': shortHash(key)});
  };

  const handleProcessFailure = async (key) => {
    await PaymentOrder.findOneAndUpdate({
      'process.key': shortHash(key),
    }, {
      'process.isComplete': true,
      'process.isSuccess': false,
    });
  };

  const handleProcessSuccess = async (key) => {
    let order = await PaymentOrder.findOneAndUpdate({
      'process.key': shortHash(key),
    }, {
      'process.isComplete': true,
      'process.isSuccess': true,
      'ref': uniqid(),
    }, {
      new: true,
    });

    console.info('Successfully completed order: ', JSON.stringify(order.toJSON()));

    if (order) {
      await cacheOrder(order);
    }

    return order.ref;
  };

  return {
    createOrder,
    checkOrder,
    findByProcess,
    startProcess,
    handleProcessSuccess,
    handleProcessFailure,
  };
};
