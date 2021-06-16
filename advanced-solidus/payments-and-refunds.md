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

Most payment gateways are built on top of [ActiveMerchant](https://github.com/activemerchant/active_merchant), a popular Ruby library for integrating with PSPs, so you can learn more about their architecture and API on the [ActiveMerchant documentation](https://github.com/activemerchant/active_merchant/wiki).

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

Solidus doesn't know much about payment gateways. Instead, payment methods expose an API that wraps the payment gateway's API, and Solidus interacts with the payment method.

This additional level of abstraction allows Solidus to use the store's configuration to determine how to structure the API calls to the PSP, and to enrich the payload with store-specific information \(e.g., to add your store's name to your customer's credit card statement\).

The abstraction also allows you to easily implement payment methods that don't use a PSP \(e.g. cash on delivery\), without Solidus having to know about this nuance.

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

Whenever a refund is created, Solidus will also immediately call `#perform!` on the refund. This processes the refund through the original payment's payment method and updates the payment and order accordingly.

## Customizing the payment system

### Building a custom payment method

### Customizing payment cancellation

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

