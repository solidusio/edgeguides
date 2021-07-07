# Tax calculation

## Architecture overview

Solidus's taxation system supports both sales- and VAT-style taxes. You can use tax rates, tax categories, and tax calculators to handle your store's tax logic:

* Tax categories are used to group tax rates together. All products and shipping methods are assigned a tax category.
* Tax rates associate a tax category with a geographic zone and a tax calculator.
* Tax calculators specify the logic used to calculate taxes on top of an item. Solidus ships with basic calculators where the tax rates are statically configured in the backend, but you may also install or implement a calculator that integrates with third-party tax calculation services such as TaxJar or Avalara AvaTax.

### Order tax calculation

{% hint style="info" %}
Note that promotions are applied before taxes are calculated. This is to comply with tax regulations for value-added taxation [as outlined by the Government of the United Kingdom](https://www.gov.uk/vat-businesses/discounts-and-free-gifts#1) and for sales tax [as outlined by the California State Board of Equalization](http://www.boe.ca.gov/formspubs/pub113/).
{% endhint %}

Once an order has a tax address specified, tax can be calculated for all of the line items and shipments associated with the order:

1. Solidus calls the configured tax calculator to get taxes to apply to line items and shipments.
2. The tax amounts are stored in an adjustment object that is associated with the order.
3. The line item's `included_tax_total` or `additional_tax_total` are updated, depending on whether the tax rate is included in the price or not.
4. The same process is executed on the order's shipments.
5. The sums of the `included_tax_total` and `additional_tax_total` on all line items and shipments are stored in the order's `included_tax_total` and `additional_tax_total` values. The `included_tax_total` column does not affect the order's total, while `additional_tax_total` does.

{% hint style="info" %}
Using adjustments rather than storing tax amounts directly on the taxable items helps account for some of the complexities of tax, especially if a store sells internationally:

* Orders may include products with different tax categories or rates.
* Shipments may require special calculations if you are shipping to or from locations where there are specific taxation rules for shipments.
* Taxes may or may not be included in a product's price depending on a country's taxation rules.
{% endhint %}

Every time an order is changed, the taxation system checks whether tax adjustments need to be changed and updates all of the taxation-relevant totals.

### Shipping rate tax calculation

{% hint style="info" %}
For more information on when and how shipments and shipping rates are built, you can refer to the [Stock management](stock-and-fulfillment.md) guide.
{% endhint %}

In addition to calculating taxes on line items and shipments, Solidus also calculates taxes on shipping rates. This is done in the default stock estimator:

1. Right after building the shipping rate for a shipment, Solidus [calls the configured shipping rate tax calculator](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/stock/estimator.rb#L45) to calculate the tax for each shipping rate.
2. Shipping rates don't have adjustments, so the resulting taxes are stored in a dedicated [`ShippingRateTax`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/shipping_rate_tax.rb) model instead.

{% hint style="warning" %}
Note that, while these tax amounts will be included in the shipping rates that are displayed to your user, Solidus will still re-calculate taxes on your shipment cost, and the final amount the user is charged depends on the shipment's cost rather than the shipping rate's cost.

This is because you may have additional adjustments on your shipment, e.g. you're offering a "free shipping" promotion and want to completely discount shipping for the user. In this case, the shipping rate might be $10.0 + a $2.0 tax, but your shipment total will still be $0.0.

You should treat tax calculation for shipping rates as a UI-only matter. The standard order tax calculation flow determines the price your user will pay.
{% endhint %}

## Customizing order tax calculation

Here are the two main actors responsible for calculating taxes in Solidus:

* The **tax calculator** is a class responsible for receiving an order and returning all the taxes that need to be applied to that order's line items and shipments. The tax calculator API is completely independent from the underlying implementation. [Here's the default calculator.](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax_calculator/default.rb)
* **Rate calculators** are models that are associated to a tax rate and used to compute the tax amount for a specific line item or shipment. [Here's an example.](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/calculator/default_tax.rb)

In a standard Solidus configuration, Solidus uses both of these concepts: the [default tax calculator](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax_calculator/default.rb) uses the configured tax rates to determine the tax amounts to apply to your order.

If you want to customize the tax calculation logic, you may do it at two different levels:

* **Write a custom rate calculator:** with this approach, admins will create a tax rate that uses your own rate calculator and tell Solidus to use that tax rate for your products and zones. The default tax calculator will call the configured tax rate, which in turn will delegate the amount computation to your custom rate calculator.
* **Replace the tax calculator \(recommended\):** this way, Solidus will not use the rate calculators at all. This approach affords you maximum flexibility, since you'll be calculating taxes on the entire order at the same time rather than on a per-item basis.

Because most tax calculation workflows are fairly complicated with different edge case, it is advisable to replace the tax calculator entirely if you need to customize tax calculation in your store.

If, on the other hand, your logic is simple enough to fit the custom rate calculator pattern, you can go with that instead and save yourself the need to write some additional logic.

### With a custom tax calculator

The public interface for a tax calculator is pretty simple: it takes an order during initialization and exposes a `#calculate` method that returns a [`Spree::Tax::OrderTax`](https://github.com/solidusio/solidus/blob/v3.0/core/app/models/spree/tax/order_tax.rb) instance. This is an object that contains information about all taxes to apply on an order.

Here's a dead-simple custom tax calculator that simply applies a 1% tax on all line items and a 2% tax on all shipments — the implementation is inspired by the default tax calculator:

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

## Customizing shipping rate tax calculation

### With a custom shipping rate tax calculator

To create a new shipping rate tax calculator, first implement your new tax calculator:

{% code title="app/models/awesome\_store/tax\_calculator/shipping\_rate.rb" %}
```ruby
module AwesomeStore
  module TaxCalculator
    class ShippingRate
      include Spree::Tax::TaxHelpers

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
          )
        ]
      end
    end
  end
end
```
{% endcode %}

Finally, tell Solidus to use the new calculator instead of the default one:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  config.shipping_Rate_Tax_calculator_class = 'AwesomeStore::TaxCalculator:ShippingRate'
end
```
{% endcode %}

### With a custom rate calculator

{% hint style="info" %}
Just like for order tax calculation, it's advisable to customize shipping rate tax calculation via a custom shipping rate tax calculator rather than a custom rate calculator.
{% endhint %}

This process is identical to customizing order tax calculation through a custom rate calculator, so you can simply follow those instructions. Remember to assign your shipping method to the right tax category!

