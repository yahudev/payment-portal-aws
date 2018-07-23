# payment-portal

## Studies

### Paypal

* OAuth 2.0
* Use oauth token until it expires (for rate limiting)
* Flow
    * [Portal] --> [Paypal] Request for a payment (ReturnURL, CancelURL)
    * [Portal] <-- [Paypal] RedirectURL
    * [Portal] --> [User] Redirect user to RedirectURL
    * [Portal] <-- [User] Redirect back after payment done
* Exception Flows
    * 401 Unauthorized
    * Cancelled Payment on Paypal
    * Expired Payment 
    
### Braintree

* Flow
    *  [User] --> [Server] Request Client Token
    *  [User] <-- [Server] Return Token
    *  [User] --> [BT] Init session
    *  [User] <-- [BT] return session Nounce
    *  [User] --> [Server] Nounce
    *  [Server] --> [BT] Create transaction with nounce
* Exception
    * 401 Unauthorized on client side

## Design 

* Shouldn't store any data.
* DI of payment methods
* Save transaction result on success
* Payment Request Data - cc holder name, cc number, cc expiry, cc ccv
* Payment Record Data - *Customer Name*, *Reference Code*, Customer Phone Number, Currency, Amount.
* Forked payment flow

## UI endpoints

- GET /make-payment
- GET /make-payment/result

- GET /check-payment
- GET /check-payment/result 

## Controllers

- POST /make-payment
- POST /check-payment

## Form validation
- API schema validation


## Models

Shouldn't store any credit card info for security purpose.

```
- Payment order
    - name: string // index, for check payment read
    - phone: string
    - currency: enum
    - price: number
    - process: Doc
    - ref: string // index, for check payment read

- Payment process
    - vendor: enum(braintree, paypal)
    - isComplete: boolean
    - isSuccess: boolean
    - key: string // index, for process record lookup
```

## Integrations

Payment Process Interface
- processPaymentRequest(HTTPRequest): HTTPResponse, to fork into module's flow on success form submission
- return user to /make-payment/result on complete

### Paypal Module
- Redirect to redirectUrl on POST /make-payment
- GET /gw/pp/returnUrl
- GET /gw/pp/cancelUrl

### Braintree Module
- Load process integration page with BT client SDK
- Integration page pre-load all data in the form data and get ready for transaction
- Integration make request automatically once sdk init complete
- POST gw/bt/makepayment (by SDK?)

## Caching
- Cache by hashed double key *Customer Name*, * reference code*
- add record with expiry on succesful payment
- fallback to db if cache expired


