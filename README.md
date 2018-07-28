# Payment Portal

## Getting Started

### Prerequisite

To run the application, you need:
- NodeJs 8+
- Docker 1.12+ with docker-compose.
- A public accessible url for payment vendors (e.g. Paypal) web hooking. e.g. http://your.domain.com:3000

### Install dependencies

Install nodejs dependencies
```
npm i 
```

### Run the supporting services

Run mongo and redis with docker compose. At project root directory,
```
docker-compose -f stack.yml up -d
```

### Start the application

Start the application with ur applcation's public url
```
PUBLIC_URL={YOUR_PUBLIC_URL} npm run start
```

### Configuration

In case you want to use your own payment solution credentials. Config it in config.js
```js
{
  ...
  paypal: {
      type: 'sandbox',
      account: '{YOUR_PAYAL_SANDBOX_MERCHANT_ACCOUNT}',
      client_id: '{YOUR_PAYAL_SANDBOX_CLIENT_ID}',
      client_secret: '{YOUR_PAYAL_SANDBOX_CLIENT_SECRET}',
  },
  braintree: {
      type: 'Sandbox',
      merchantId: '{YOUR_BRAINTREE_MERCHANT_ID}',
      publicKey: '{YOUR_BRAINTREE_PUBLIC_KEY}',
      privateKey: '{YOUR_BRAINTREE_PRIVATE_KEY}',
  },
  ...
}
```

## AWS

This project is also deployed on AWS, using AWS Code Star as the Continuous Deployment tool, running on AWS linux instance.

To leverage the free tier, Mongo and Redis are ran inside the same EC2 instance using docker-compose. 

See stack.yml and scripts/start_env for details.
