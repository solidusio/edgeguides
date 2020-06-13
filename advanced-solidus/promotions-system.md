# Promotions system

## Architecture overview

Solidus ships with a powerful rule-based promotions system that allows you to grant flexible discounts to your customers in many different scenarios. You can apply discounts to the entire order, to a single line item or a set of line items, or to the shipping fees.

In order to achieve this level of flexibility, the promotions system is composed of four concepts:

* **Promotion handlers** are responsible for activating a promotion at the right step of the customer experience.
* **Promotion rules** are responsible for checking whether an order is eligible for a promotion.
* **Promotion actions** are responsible for defining the discount\(s\) to be applied to eligible orders.
* **Adjustments** are responsible for storing discount information.

Let's take the example of the following promotion:

> Apply free shipping on any orders whose total is $100 USD or greater.

Here's the flow Solidus follows to apply such a promotion:

1. When the customer enters their shipping information, the [`Shipping`](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/promotion_handler/shipping.rb) promotion handler activates the promotion on the order.
2. When activated, the promotion will perform some [basic eligibility checks](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/promotion.rb#L130) \(e.g. usage limit, validity dates\) and then [ensure the defined promotion rules are met.](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/promotion.rb#L130)
3. When called, the [`ItemTotal`](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/promotion/rules/item_total.rb) promotion rule will ensure the order's total is $100 USD or greater.
4. Since the order is eligible for the promotion, the [`FreeShipping`](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/promotion/actions/free_shipping.rb) action is applied to the order's shipment. The action creates an adjustment that cancels the cost of the shipment.
5. The customer gets free shipping!

This is the architecture at a glance. As you can see, Solidus already ships with some useful handlers, rules and actions out of the box.

However, you're not limited to using the stock functionality. In fact, the promotions system shows its full potential when you use it to implement your own logic. In the rest of the guide, we'll use the promotions system to implement the following requirements:

> We want to give influencers a referral code they can use to give their customers a 50% shipping discount in our store.

In order to do this, we'll have to implement our own handler, rule and action. Let's get to work!

## Storing referral codes

Because promotions already have a concept of codes, we're going to reuse the existing promotion codes system instead of adding our own field.

Note that this also means our users will be able to apply referral codes on their orders by simply applying a coupon code in addition to using the provided referral URL.

## Implementing a new handler

There's nothing special about promotion handlers: technically, they're just plain old Ruby objects that are created and called in the right places during the checkout flow.

For the purpose of our custom promotion, we'll need to create a new `Query` promotion handler that checks the current request's query string against a valid list of referral codes.

There is no unified API for promotion handlers, but we can take inspiration from the [existing ones](https://github.com/solidusio/solidus/tree/master/core/app/models/spree/promotion_handler) and use a similar format:

```ruby
module AwesomeStore
  module PromotionHandler
    class Query
      attr_reader :order, :query

      def initialize(order, query)
        @order = order
        @query = query
      end

      def activate
        if promotion && promotion.eligible?(order)
          promotion.activate(order: order)
        end
      end

      private

      def promotion
        @promotion ||= if query[:r].present?
          Spree::PromotionCode.find_by(value: query[:r])&.promotion
        end
      end
    end
  end
end
```

Our promotion handler accepts an order and the current request's query string \(as a hash\), and activates the promotion with the provided referral code \(if any\) on the order.

{% hint style="info" %}
**Why a handler and not a rule?**

You may be wondering why we have used a promotion handler to do this instead of a promotion rule to check the referral code. There are two main reasons:

1. Conceptually, it is the handler's responsibility to "activate" a promotion at the right time, while a rule should simply check that the order is valid for a promotion. 
2. Unlike promotion handlers, rules are activated by the promotions system automatically, and there is no way for them to access the current request.

With that said, we could have definitely followed other approaches, like storing the referral code on the order itself during the request, then validating it in a promotion rule. In most cases, there are many ways to implement the same promotion — you'll have to do some research and preparation to figure out what works best for your use case.
{% endhint %}

As we mentioned initially, Solidus doesn't know anything about custom promotion handlers and will not call them for you: it's your responsibility to call them when needed. The next step, then, is to call our new handler upon every request by using a decorator:

```ruby
module AwesomeStore
  module Spree
    module StoreController
      def self.prepended(base)
        base.class_eval do
          before_action :activate_referral_promotions
        end
      end

      private

      def activate_referral_promotions
        AwesomeStore::PromotionHandler::Query.new(
          current_order,
          request.query_parameters,
        ).activate
      end

      ::Spree::StoreController.prepend self
    end
  end
end
```

By decorating `Spree::StoreController`, we make sure the handler is called on every storefront request.

## Implementing a new rule

Now that we have our handler, let's move on and implement the promotion rule that checks whether the customer is the influencer tied to that referral code. If they are, we're not going to grant them the discount — we don't want influencers giving themselves discounts!

For simplicity, we'll just run a check on the order's email. However, in order to do that, we'll need to store the influencer's email somewhere on the promotion, and the best way to do that is to create a preference on the promotion rule itself:

```ruby
module AwesomeStore
  module Promotion
    module Rules
      class NotInfluencer < Spree::PromotionRule
        preference :influencer_email, :string, default: ''

        validates :preferred_influencer_email, format: {
          allow_blank: true,
          with: /@/,
        }

        def applicable?(promotable)
          promotable.is_a?(Spree::Order)
        end

        def eligible?(order, _options = {})
          preferred_influencer_email.present? &&
            order.email != preferred_influencer_email
        end
      end
    end
  end
end
```

{% hint style="warning" %}
You may have noticed that we allow the influencer's email to be blank, but require it to be present for an order to be eligible. This is because promotion rules are initially created without any of their preferences, so that the correct form can be presented to the admin when configuring the rule. If we enforced the presence of an email since the very beginning, Solidus wouldn't be able to create the promotion rule and admins would get an error.
{% endhint %}

Now that we have the implementation of our promotion rule, we also need to give admins a nice UI where they can manage the rule and enter the influencer's email. We just need to create the right partial:

{% code title="app/views/backend/spree/promotions/rules/\_not\_influencer.html.erb" %}
```markup
<div class="row">
  <div class="col-6">
    <div class="field">
      <%= AwesomeStore::Promotion::Rules::NotInfluencer.human_attribute_name(:email) %>
    </div>
  </div>
  <div class="col-6">
    <div class="field">
      <%= string_field_tag "#{param_prefix}[preferred_influencer_email]", promotion_rule.preferred_influencer_email, class: 'fullwidth' %>
    </div>
  </div>
</div>
```
{% endcode %}

The last step is to register our new promotion rule in an initializer:

{% code title="config/initializers/promotions.rb" %}
```ruby
# ...
Rails.application.config.spree.promotions.rules << AwesomeStore::Promotion::Rules::NotInfluencer
```
{% endcode %}

That's it! When you create a new promotion in the backend, we should now see the _Not Influencer_ promotion rule.

##  Implementing a new action

Finally, let's implement the promotion action that will grant customers a 50% shipping discount. In order to do that, we can take inspiration from the existing [`FreeShipping`](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/promotion/actions/free_shipping.rb) action:

```ruby
class AwesomeStore::Promotion::Actions::HalfShipping < Spree::PromotionAction
  # The `perform` method is called when an action is applied to an order or line
  # item. The payload contains a lot of useful context:
  # https://github.com/solidusio/solidus/blob/master/core/app/models/spree/promotion.rb#L97
  def perform(payload = {})
    order = payload[:order]
    promotion_code = payload[:promotion_code]

    results = order.shipments.map do |shipment|
      # If the shipment has already been discounted by this promotion action,
      # we skip it.
      next false if shipment.adjustments.where(source: self).exists?

      # If not, we create an adjustment to apply a 50% discount on the shipment.
      shipment.adjustments.create!(
        order: shipment.order,
        amount: shipment.cost * -0.5,
        source: self,
        promotion_code: promotion_code,
        label: promotion.name,
      )

      # We return true here to mark that the shipment has been discounted.
      true
    end

    # `perform` needs to return true if any adjustments have been applied by
    # the promotion action. Otherwise, it should return false.
    results.any? { |result| result == true }
  end

  # The `remove_from` method should undo any actions done by `perform`. It is
  # used when an order becomes ineligible for a given promotion and the promotion
  # needs to be removed.
  def remove_from(order)
    order.shipments.each do |shipment|
      shipment.adjustments.each do |adjustment|
        if adjustment.source == self
          # Here, we simply remove any adjustments on the order's shipments
          # created by this promotion action.
          shipment.adjustments.destroy!(adjustment)
        end
      end
    end
  end
end
```

As you can see, there's quite a bit going on here, but hopefully the comments help you understand the flow of the action and the purpose of the methods we implemented.

{% hint style="info" %}
Although we don't need it in this case, promotion actions can also have preferences and allow admins to define them via the UI. You can look at the [`CreateQuantityAdjustments`](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/promotion/actions/create_quantity_adjustments.rb) action and the [corresponding view](https://github.com/solidusio/solidus/blob/master/backend/app/views/spree/admin/promotions/actions/_create_quantity_adjustments.html.erb) for an example.
{% endhint %}

Finally, we need to register our action by adding the following to an initializer:

{% code title="config/initializers/promotions.rb" %}
```ruby
Rails.application.config.spree.promotions.actions << AwesomeStore::Promotion::Actions::HalfShipping
```
{% endcode %}

Restart the server and you should now see your new promotion action!

