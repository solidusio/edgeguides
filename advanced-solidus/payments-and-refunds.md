# Payments and refunds

{% hint style="info" %}
This guide covers the architecture and functionality of payments and refunds in Solidus, which is useful when you need to customize the payment flow or integrate with a custom payment gateway. However, Solidus comes with integrations for the major payment service providers. If that's what you're looking for, check out our [Payments](https://solidus.io/extensions/#extensions-group-payments) extensions.
{% endhint %}

## Domain concepts

Solidus comes with a modular, powerful system for managing payments and refunds.

The system is designed in layers, with each layer wrapping the one below to perform an additional level of abstraction. This allows for more granular customization, and makes it flexible enough that it can be adapted to any kind of payment service provider and payment/refunds flow.

In the next paragraphs, we'll go through the main pieces that make up Solidus' payment system, and give an overview of how they work with each other.

### Payment gateways

Payment gateways are the smallest unit of the payment system: each payment gateway provides the logic for integrating with the API of a specific PSP \(Payment Service Provider\).

Most payment gateways are built on top of [ActiveMerchant](https://github.com/activemerchant/active_merchant), a popular Ruby library for integrating with PSPs. You can learn more about the architecture on the [ActiveMerchant documentation](https://github.com/activemerchant/active_merchant/wiki).

### Payment sources

{% hint style="info" %}
Credit cards are the most common example of payment sources, and Solidus provide a good [out-of-the-box implementation](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/credit_card.rb) for credit-card-based payment sources.
{% endhint %}

[Payment sources](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment_source.rb), as the name suggests, are models whose purpose is to store information about the different ways a user can pay.

Each payment source is backed by its own DB table and exposes different information to Solidus about the actions that can be taken on it and whether it is reusable for future payments.

Reusable payment sources can be added to a user's [wallet](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/wallet.rb), in which case they can be picked by the user for future checkouts as well.

### Payment methods

{% hint style="info" %}
Solidus provides out-of-the-box implementations for [check](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment_method/check.rb) and [store credit](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment_method/store_credit.rb) payment methods, and a base implementation for [credit card](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment_method/credit_card.rb) payment methods.
{% endhint %}

Payment methods represent different ways customers can pay in your store. For example, you may have different payment methods for PayPal and Stripe.

Different payment methods support different features, depending on the underlying PSP:

* **Payment sources.** Some payment methods, like check payments or bank transfers, don't need a payment source to "draw" money from, e.g. because the payment is done off-site.
* **Payment profiles.** Not all PSPs support vaulting \(i.e., the ability to store a payment source so that it can be charged later\), and Solidus will adjust its API calls accordingly.

{% hint style="info" %}
Not all payment methods are tied to a PSP. For example, the check and store credit payment methods that Solidus ships with don't need to interact with a PSP to process payments. You can think of these as "virtual" payment methods.
{% endhint %}

Solidus doesn't know much about payment gateways as such: instead, payment gateways are just "helper classes." When processing payments and refunds, Solidus interacts with the payment method, not the payment gateway—the payment method can then delegate the calls to the payment gateway with no modifications \([which is the default](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment_method.rb#L40)\), or provide its own implementation that wraps the payment gateway's behavior and enriches it with additional logic.

This abstraction provides several advantages:

* It allows you to encapsulate the API interaction logic for your PSP and test it in isolation, whereas the payment method's implementation can deal with Solidus-specific details.
* It allows you to easily implement payment methods that don't use a PSP \(e.g. cash on delivery\), without Solidus having to know about this nuance.
* It allows you to use the store's configuration to determine how to structure the API calls to the PSP, and to enrich the API payload with store-specific information \(e.g., to add your store's name to your customer's credit card statement\).

### Payments

The [`Spree::Payment`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment.rb) model act as a connector between user input and the rest of the payment system. Payments are associated to an order, a payment source and a payment method.

Payments have a [state machine](https://github.com/solidusio/solidus/blob/v3.0/core/lib/spree/core/state_machines/payment.rb) that tracks the status of the payment as it goes through the regular payment processing flow. Through the [`Spree::Payment::Processing`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb) module, payments expose a simplified API that protects the rest of the system from PSP connection errors and data integrity issues, and integrates PSP operations with the payments state machine.

### Refunds

Refunds are a critical part of an eCommerce business and they are issued on a regular basis to customers for a variety of reasons.

In Solidus, refunds are represented by the [`Spree::Refund`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/refund.rb) model, and they are associated to their respective payment. Modeling refunds as a separate concept from payments makes them very flexible and allows to use them for a broad range of use cases.

Refunds have a very simple API and they only expose a [`#perform!`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/refund.rb#L42) method.

## Flow walkthroughs

### Payment processing

{% hint style="warning" %}
Payment processing is tightly coupled to the payments state machine API. If you customize or replace the payments state machine, you will need to make sure that your customizations play well with the payment processing flow!
{% endhint %}

The flow for payment processing, in a standard Solidus store, is the following:

* A payment is created, either by the customer or by a store admin.
* Before the order is completed, [`process_payments_before_complete`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/order.rb#L726) method is called on the order. This calls [`process_payments!`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/order/payments.rb#L22) which, in turn, calls [`process!`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L25) on all unprocessed payments.
* Depending on whether the payment method uses auto-capture, `process!` either authorizes or authorizes and captures the payment.
* The [`authorize!`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L37) or [`purchase!`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L42) call performs the [corresponding action on the payment method](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L176) and [updates the payment's state](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L185) accordingly.

At this point, all payments on the order have been processed and they're either authorized or captured. If they're just authorized, an admin will need to capture the payment manually at a later stage \(e.g., when the order is shipped\), which will call the [`capture!`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L49) method.

### Payment cancellation

{% hint style="info" %}
The [`Spree::Payment::Cancellation`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/cancellation.rb) class is responsible for cancelling payments in a stock Solidus installation, but you can easily replace it with your own.
{% endhint %}

If an order is cancelled at any point, Solidus will also "cancel" any payments on the order. The flow for payment cancellation is quite straightforward:

1. When an order is cancelled, the [state machine](https://github.com/solidusio/solidus/blob/v3.0/core/lib/spree/core/state_machines/order.rb#L124) calls the [`#after_cancel`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/order.rb#L800) method on the order.
2. `#after_cancel` loops through all payments, discards the ones that have been fully refunded or are not in a cancellable state, and calls [`#cancel!`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L87) on the remaining ones.
3. `#cancel!` [instantiates and run a payment canceller](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L87) for the payment.
4. The [default payment canceller](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/cancellation.rb) has different logic depending on the state of the payment:
   1. If the payment has been captured, it refunds the customer \(see [Refund processing](payments-and-refunds.md#refund-processing)\).
   2. If the payment has only been authorized, it voids the authorization.

### Refund processing

In a stock Solidus store, refunds and they can be created in different ways:

* manually via the admin UI;
* automatically, when [cancelling a payment](payments-and-refunds.md#payment-cancellation);
* automatically, when processing a reimbursement.

Some stores also have other ways for a refund to be created, e.g. through a return flow that can be initiated by the customer via the storefront or a third-party tool.

When a refund is created through the UI, via a payment cancellation or a reimbursement, Solidus will also immediately call `#perform!` on the refund. This processes the refund through the original payment's payment method and updates the payment and order accordingly.

## Customizing the payment system

In the next paragraphs, we'll see how to customize different aspects of Solidus' payment system.

Note that this is an advanced use case and is only required in very specific scenarios. In most cases, you'll be better off using one of the existing payment integrations.

### Custom payment sources



### Custom payment gateways

{% hint style="info" %}
Most payment integrations in Solidus don't ship with a custom payment gateway. Instead, they rely on one of the payment gateways provided by [ActiveMerchant](https://github.com/activemerchant/active_merchant).

If you need to integrate with a PSP that's not supported by Solidus, you should first look and see whether ActiveMerchant already provides the payment gateway you need: if that's the case, you will only need to implement a custom payment method and source.
{% endhint %}

Implementing a custom payment gateway can be useful if you're integrating with a lesser-known PSP \(e.g., a local PSP in your country\), or if you need to deeply customize an existing PSP integration.

#### The Payment Gateway API

Payment gateways expose the following API:

* `#initialize(options)`: initializes the gateway with the provided options. By default, Solidus will pass the [payment method's preferences](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment_method.rb#L78) in here.
* `#authorize(money, source, options = {})`: authorizes a certain amount on the provided payment source.
* `#capture(money, transaction_id, options = {})`: captures a certain amount from a previously authorized transaction.
* `#purchase(money, source, options = {})`: authorizes and captures a certain amount on the provided payment source.
* `#void(transaction_id, [source,] options = {})`: voids a previously authorized transaction, releasing the funds that are on hold.
* `#credit(money, transaction_id, options = {})`: refunds the provided amount on a previously captured transaction.

All of these methods are expected to return an [`ActiveMerchant::Billing::Response`](https://github.com/activemerchant/active_merchant/blob/master/lib/active_merchant/billing/response.rb) object containing the result and details of the operation. Payment gateways never raise exceptions when things go wrong: they only return response objects that represent successes or failures, and Solidus handles control flow accordingly.

{% hint style="warning" %}
For historical and technical reasons, the Solidus API for payment gateways deviates from the ActiveMerchant API in a few ways:

* The `source` parameter that is passed to a gateway will be an instance of `Spree::PaymentSource`, while ActiveMerchant gateways expect their own models.
* The `#void` method in ActiveMerchant never accepts a payment source. Solidus will pass the payment source to `#void` if the payment method supports payment profiles.
* The `#credit` method in ActiveMerchant gateways does not accept a transaction ID but a payment source, since it can be used to credit funds to a payment source even in the absence of a previous charge. What Solidus calls `#credit` is actually called `#refund` in ActiveMerchant.

For custom payment gateways, these discrepancies are not a problem, since the gateways can be implemented to respond to the API expected by Solidus.

For ActiveMerchant gateways, the payment method will wrap these methods instead of delegating them to the gateway directly, and will transform the method calls and their arguments to comply with ActiveMerchant's interface.
{% endhint %}

#### Building your gateway

To build your gateway, you just need to create a new class that responds to the Gateway API.

For example, let's say that we are integrating with a brand new PSP that's called EasyPay, which has a nice RESTful API for managing payments and refunds.

The first step would be to build the skeleton of our gateway. For the time being, we'll just make sure we store the API key that's passed when initializing the gateway, and we'll write a small helper on top of the HTTParty gem for interacting with the PSP's API:

```ruby
module EasyPay
  class Gateway
    API_URL = 'https://easypay.com/api/v1'

    attr_reader :api_key

    def initialize(options)
      @api_key = options.fetch(:api_key)
    end

    private

    def request(method, uri, body = {})
      HTTParty.send(
        method,
        "#{API_URL}#{uri}",
        headers: {
          "Authorization" => "Bearer #{api_key}",
          "Content-Type" => "application/json",
          "Accept" => "application/json",
        },
        body: body.to_json,
      )
    end
  end
end
```

Now that we have everything we need to interact with the API, we can start writing the actual integration. The first step in processing a payment is usually authorizing it, so we'll start with that:

```ruby
module EasyPay
  class Gateway
    # ...

    def authorize(money, source, options = {})
      response = request(
        :post,
        "/charges",
        payload_for_charge(money, source, options).merge(capture: false),
      )

      if response.success?
        ActiveMerchant::Billing::Response.new(
          true,
          "Transaction Authorized",
          {},
          authorization: response.parsed_response['id'],
        )
      else
        ActiveMerchant::Billing::Response.new(
          false,
          response.parsed_response['error'],
        )
      end
    end

    private

    # ...

    def payload_for_charge(money, source, options = {})
      {
        card_token: source.card_token,
        amount: money,
        currency: options[:currency],
        description: "Payment #{options[:order_id]}",
        billing_address: options[:billing_address],
      }
    end
  end
end
```

The logic for the `#authorize` method is fairly straightforward: it makes a POST request to the `/api/v1/charges` endpoint of the PSP's API. The body of the request includes information about:

* the amount we want to charge, which is passed in the `amount` parameter as a number of cents \(e.g., `1000` represents 10.00, `1050` represents 10.50\),
* the payment source we want to charge, which is passed in the `source` parameter and will be an instance of the payment source class for the payment method,
* [metadata about the order and the payment](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/payment/processing.rb#L91), which is passed in the `options` parameter.

The method then returns an `ActiveMerchant::Billing::Response` object that represents the success or failure of the operation. In the successful response, the `:authorization` option will also be included. Solidus will store the value of this option on the `response_code` attribute on the `Spree::Payment` record, so that we can reference the transaction ID when capturing/voiding/refunding it later.

You'll notice that the payload of the request is generated in a helper method, `#payload_for_charge`. This is because the payloads for authorizing and purchasing \(i.e., authorizing and capturing in one go\) is the same, minus the `:capture` option, which we'll set to `true` when we also want to capture the amount:

```ruby
module EasyPay
  class Gateway
    # ...

    def purchase(money, source, options = {})
      response = request(
        :post,
        "/charges",
        payload_for_charge(money, source, options).merge(capture: true),
      )

      if response.success?
        ActiveMerchant::Billing::Response.new(
          true,
          "Transaction Purchased",
          {},
          authorization: response.parsed_response['id'],
        )
      else
        ActiveMerchant::Billing::Response.new(
          false,
          response.parsed_response['error'],
        )
      end
    end

    # ...
  end
end
```

{% hint style="info" %}
Some PSPs, such as Stripe, provide a single endpoint for authorizing and capturing a payment in one request. Others will require you to perform two different requests, in which case your `#purchase`method may simply call `#authorize` and `#capture` in succession.
{% endhint %}

The rest of our gateway is trivial and pretty similar to our existing methods:

```ruby
module EasyPay
  class Gateway
    # ...

    def capture(money, transaction_id, options = {})
      response = request(
        :post,
        "/charges/#{transaction_id}/capture",
        { amount: money },
      )

      if response.success?
        ActiveMerchant::Billing::Response.new(true, "Transaction Captured")
      else
        ActiveMerchant::Billing::Response.new(
          false,
          response.parsed_response['error'],
        )
      end
    end

    def void(transaction_id, options = {})
      response = request(:post, "/charges/#{transaction_id}/refunds")

      if response.success?
        ActiveMerchant::Billing::Response.new(true, "Transaction Voided")
      else
        ActiveMerchant::Billing::Response.new(
          false,
          response.parsed_response['error'],
        )
      end
    end

    def credit(money, transaction_id, options = {})
      response = request(
        :post,
        "/charges/#{transaction_id}/credit",
        { amount: money },
      )

      if response.success?
        ActiveMerchant::Billing::Response.new(true, "Transaction Credited")
      else
        ActiveMerchant::Billing::Response.new(
          false,
          response.parsed_response['error'],
        )
      end
    end

    # ...
  end
end
```

TBD.

### Custom payment methods

Payment methods wrap the gateway API.

Payment methods also expose two additional methods which are not part of the standard ActiveMerchant API:

* `#try_void(payment)`: attempts to void a payment, or returns `false`/`nil` \(in which case, Solidus will then refund the payment\).
* `#create_profile(payment)`: creates a payment profile with the information from the provided payment, so that the customer can be charged for future orders.

### Custom payment canceller

If you need to customize the logic that is used for payment cancellation, you can easily do it via a configuration hook.

For this example, we are going to assume that, instead of refunding customers on the original payment method, you want to offer them store credit instead.

In order to accomplish this, you will first need to create a custom payment canceller:

{% code title="app/models/awesome\_store/payment\_canceller.rb" %}
```ruby
module AwesomeStore
  class PaymentCanceller
    def cancel(payment)
      # Capture the payment. If the payment has already been captured,
      # this will be a no-op.
      payment.capture!

      # Find or create an "Order cancellation" store credit category.
      category = Spree::StoreCreditCategory.find_or_create_by(
        name: 'Order cancellation',
      )

      # Create a store credit for the payment amount.
      Spree::StoreCredit.create!(
        user: payment.order.user,
        amount: payment.credit_allowed,
        category: category,
        currency: payment.currency,
        created_by: payment.order.canceler,
      )
    end
  end
end
```
{% endcode %}

The cancellation logic is pretty simple: first of all, we capture the payment, unless it's already been captured. Then we generate a store credit for the payment amount. Customers will then be able to spend the store credit on their next order.

In order for Solidus to start using our canceller, we need to specify it in our initializer:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...

  config.payment_canceller = AwesomeStore::PaymentCanceller.new
end
```
{% endcode %}

You can test your new canceller by placing and cancelling an order from the Solidus backend: you'll see that, instead of the payment being refunded, a store credit will be generated instead.

