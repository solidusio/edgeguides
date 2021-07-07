# Tax calculation

## Architecture overview

{% hint style="warning" %}
In the following paragraphs, we use the terms **tax calculator** and **rate calculator**. ****While they sound similar, they are different things: the taxation system in Solidus primarily relies on tax calculators, not rate calculators.

While the [default tax calculators](https://github.com/solidusio/solidus/tree/v3.0/core/app/models/spree/tax_calculator) delegate the actual taxation math to rate calculators, it's perfectly possible to write a custom tax calculator that doesn't use rate calculators and instead relies on its own logic, e.g. by querying an external API.
{% endhint %}

Solidus's taxation system revolves around the concept of **tax calculators**. These are classes that implement the logic required for calculating taxes on [orders](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax_calculator/default.rb) and [shipping rates](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax_calculator/shipping_rate.rb).

The default tax calculators rely on **tax categories,** **tax rates** and **rate calculators**. These are concepts that help configure item taxation through the Solidus backend:

* \*\*\*\*[**tax categories**](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax_category.rb) are used to group tax rates together—all products and shipping methods are assigned a tax category;
* \*\*\*\*[**tax rates**](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax_rate.rb) associate a tax category with a geographic zone and a rate calculator \(and also determine whether the tax is included in the item's original amount or not\);
* \*\*\*\*[**rate calculators**](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/calculator/default_tax.rb) ****implement the actual math for converting a tax rate \(e.g., 3% included in price\) into a final amount \(e.g., $3.00, when computed on a $100.00 amount\).

This system is very flexible and allows you to insert your custom logic at different abstraction levels. But before we dive into how to customize it, let's take a look at the flow Solidus follows for calculating taxes on orders and shipping rates.

### Order taxation

{% hint style="info" %}
Note that promotions are applied to orders before taxes are calculated. This is to comply with tax regulations for value-added taxation [as outlined by the Government of the United Kingdom](https://www.gov.uk/vat-businesses/discounts-and-free-gifts#1) and for sales tax [as outlined by the California State Board of Equalization](http://www.boe.ca.gov/formspubs/pub113/).
{% endhint %}

The flow for order taxation is the following:

1. Whenever an order is updated, Solidus calls the `OrderUpdater` service. This service is responsible for recalculating all the amounts on the order, including tax amounts. This is done in the [`update_taxes` method](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/order_updater.rb#L219), which in turn calls the configured order adjuster.
2. The [default order adjuster](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax/order_adjuster.rb) uses the configured order tax calculator to [determine](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax/order_adjuster.rb#L17) which taxes should be applied to the order, then builds an `OrderTaxation` object and uses it to [apply them](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax/order_adjuster.rb#L18).
3. The [`Spree::OrderTaxation` class](https://github.com/solidusio/solidus/blob/63c937472de529cce99bf3ea8dd9f2a8cbc0e431/core/app/models/spree/order_taxation.rb#L26) applies the taxes on the order by _upserting_ the corresponding adjustments on the taxed items \(i.e., line items and shipments\).
4. The order's `included_tax_total` or `additional_tax_total` are [updated](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/order_updater.rb#L219) according to the adjustments created in the previous step.

### Shipping rate taxation

{% hint style="info" %}
For more information on when and how shipments and shipping rates are built, you can refer to the [Stock management](stock-and-fulfillment.md) guide.
{% endhint %}

In addition to calculating taxes on orders Solidus also calculates taxes on shipping rates. The flow here is slightly different, and is kicked off by the [default stock estimator](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/stock/estimator.rb):

1. Right after building the shipping rate for a shipment, Solidus [calls the configured shipping rate tax calculator](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/stock/estimator.rb#L45) to calculate the tax for each shipping rate.
2. Shipping rates don't have adjustments, so the resulting taxes are stored in a dedicated [`ShippingRateTax`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/shipping_rate_tax.rb) model instead.

{% hint style="warning" %}
Note that, while these tax amounts will be included in the shipping rates that are displayed to your user, Solidus will still re-calculate taxes on your shipment cost, and the final amount the user is charged depends on the shipment's cost rather than the shipping rate's cost.

This is because you may have additional adjustments on your shipment, e.g. you're offering a "free shipping" promotion and want to completely discount shipping for the user. In this case, the shipping rate might be $10.0 + a $2.0 tax, but your shipment total will still be $0.0.

You should treat tax calculation for shipping rates as a UI-only matter. The standard order tax calculation flow determines the price your user will pay.
{% endhint %}

## Customizing tax calculation

If you want to customize the tax calculation logic, you may do it at two different levels:

* **Write a custom rate calculator:** with this approach, admins will create a tax rate that uses your own rate calculator and tell Solidus to use that tax rate for your products and shipping methods. The default tax calculator will call the configured tax rate, which in turn will delegate the amount computation to your custom rate calculator.
* **Replace the tax calculator \(recommended\):** this way, Solidus will not use the rate calculators at all. This approach affords you maximum flexibility, since you'll be calculating taxes on the entire order at the same time rather than on a per-item basis.

### With a custom tax calculator

The public interface for a tax calculator is pretty simple: it takes an order during initialization and exposes a `#calculate` method that returns a [`Spree::Tax::OrderTax`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax/order_tax.rb) instance. This is an object that contains information about all taxes to apply to the item.

{% tabs %}
{% tab title="For orders" %}
Here's a dead-simple custom order tax calculator that simply applies a 1% tax on all line items and a 2% tax on all shipments:

{% code title="app/models/awesome\_store/tax\_calculator/default.rb" %}
```ruby
module AwesomeStore
  module TaxCalculator
    class Default
      def initialize(order)
        @order = order
      end

      def calculate
        Spree::Tax::OrderTax.new(
          order_id: order.id,
          line_item_taxes: line_item_rates,
          shipment_taxes: shipment_rates
        )
      end

      private

      def line_item_rates
        order.line_items.flat_map do |line_item|
          calculate_rates(line_item)
        end
      end

      def shipment_rates
        order.shipments.flat_map do |shipment|
          calculate_rates(shipment)
        end
      end

      def calculate_rates(item)
        amount = if item.is_a?(Spree::LineItem)
          item.amount * 0.01
        elsif item.is_a?(Spree::Shipment)
          item.amount * 0.02
        end

        [
          Spree::Tax::ItemTax.new(
            item_id: item.id,
            label: 'Custom Tax',
            # NOTE: You still need to tie the item tax to a tax rate, otherwise
            # Solidus will not be able to compare tax adjustments to each other 
            tax_rate: Spree::TaxRate.find_by(name: 'Custom Tax Rate'),
            amount: amount,
            included_in_price: false,
          )
        ]
      end
    end
  end
end
```
{% endcode %}

Once you have implemented your calculator, you need to tell Solidus to use it:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...

  config.tax_calculator_class = 'AwesomeStore::TaxCalculator::Default'
end
```
{% endcode %}
{% endtab %}

{% tab title="For shipping rates" %}
Here's a sample shipping rate tax calculator that applies a 3% tax to all shipping rates:

{% code title="app/models/awesome\_store/tax\_calculator/shipping\_rate.rb" %}
```ruby
module AwesomeStore
  module TaxCalculator
    class ShippingRate
      def initialize(order)
        @order = order
      end

      def calculate(shipping_rate)
        # Run your custom logic here and return an array
        # of `Spree::Tax::ItemTax` objects. For example:

        [
          Spree::Tax::ItemTax.new(
            item_id: shipping_rate.id,
            label: 'Custom tax',
            tax_rate: 0.03,
            amount: shipping_rate.amount * 0.03,
            included_in_price: false,
          )
        ]
      end
    end
  end
end
```
{% endcode %}

Once you have created the tax calculator, you need to tell Solidus to use your custom implementation instead of the default:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  config.shipping_rate_tax_calculator_class = 'AwesomeStore::TaxCalculator:ShippingRate'
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

Reboot your server, and Solidus should start using your custom tax calculator!

### With a custom rate calculator

With a custom rate calculator, store administrators configure tax rates as usual in the Solidus backend, but select your custom rate calculator instead of the default one. When a tax rate is applied to an item, the custom tax calculator will be called and your logic will be triggered.

A custom rate calculator is pretty simple, and it looks like the following:

{% code title="app/models/awesome\_store/calculator/default\_tax.rb" %}
```ruby
module AwesomeStore
  module Calculator
    class DefaultTax < Spree::Calculator::DefaultTax
      class << self
        def description
          'My Custom Calculator'
        end
      end

      def compute_line_item(line_item)
        calculate(line_item.total_before_tax)
      end

      def compute_shipping_rate(shipping_rate)
        calculate(shipping_rate.total_before_tax)
      end

      def compute_shipment(shipment)
        calculate(shipment.total_before_tax)
      end

      private

      def calculate(amount)
        # Skip the calculation if this tax rate is not active.
        return 0 unless calculable.active?

        # e.g. do some API call here and return the tax amount
        # ...
      end
    end
  end
end
```
{% endcode %}

As you can see, you can specify different logic for calculating taxes on line items, shipping rates and shipments, if you need to \(e.g., if you're not charging tax on shipments\). If you're using the same logic for all objects, you may further simplify the implementation:

{% code title="app/models/awesome\_store/calculator/default\_tax.rb" %}
```ruby
module AwesomeStore
  module Calculator
    class DefaultTax < Spree::Calculator::DefaultTax
      class << self
        def description
          'My Custom Calculator'
        end
      end
    
      def compute_item(item)
        # Skip the calculation if the tax rate is not active.
        return 0 unless calculable.active?
    
        amount = item.total_before_tax
    
        # e.g. do some API call here and return the tax amount
        # ...
      end
    
      alias_method :compute_shipment, :compute_item
      alias_method :compute_line_item, :compute_item
      alias_method :compute_shipping_rate, :compute_item
    end
  end
end
```
{% endcode %}

This is how the default tax calculator is implemented, for instance!

Once you have implemented your custom rate calculator, you need to register it by adding the following to an initializer:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...
  config.environment.calculators.tax_rates << 'AwesomeStore::Calculator::DefaultTax'
end
```
{% endcode %}

At this point, you can create a new tax rate in the admin panel and select your custom rate calculator. In the admin panel, go to **Settings -&gt; Taxes -&gt; Tax Rates** and click on **New Tax Rate**, then configure the new tax rate like this \(you may want to change the validity period, zone and tax categories\):

![](../.gitbook/assets/screenshot-localhost_3000-2021.05.18-09_34_06.png)

You can now save your tax rate, and your custom rate calculator will start being called for all items in one of the tax rate's tax categories, as long as they belong to the tax rate's zone!

{% hint style="info" %}
You'll notice that we entered a **Rate** of 0.0 in the configuration above, and that we disabled the **Show rate in label** option.

This is because, in our custom rate calculator, the user-provided tax rate is not being used at all: instead, we are calling an external API to return the correct tax rate for us.

This kind of inconsistency is one of the reasons you should almost always use a custom tax calculator instead of a custom rate calculator.
{% endhint %}

