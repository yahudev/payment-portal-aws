module.exports = {
    redisUrl: 'redis://localhost:6379/1',
    mongoUrl: 'mongodb://localhost:27017/payment-portal',
    publicUrl: 'http://carmandy.ddns.net:3000',
    paypal: {
        type: 'sandbox',
        account: 'yahudev-facilitator@gmail.com',
        client_id: 'AdoiB4Y6gVpEyFZsQQt9x2CAd7VyMMnH4yF_rXbuBzn2r7l6aDc0czANrChHgenJQSQLWizqJfbOL8uc',
        client_secret: 'EPJo4CC_fIxjJx-1N84rSUo0Fv_3xw1DClvabY5ymVXz7KO9hYuGRdPM4EZtcmU_gc0OU67E4V6U8m_t',
    },
    braintree: {
        type: 'Sandbox',
        merchantId: 'pwmm4hpbzgqpz6jf',
        publicKey: 'vkzbfvdhpck64sfk',
        privateKey: '0f6d6f879d88af135cbf90019e9daed1',
    },
    supportCurrencies: ['HKD', 'USD', 'AUD', 'EUR', 'JPY', 'CNY'],
};
