# Tax calculation

## Architecture overview

Solidus's taxation system supports both sales- and VAT-style taxes. You can use tax rates, tax categories, and tax calculators to handle your store's tax logic:

* Tax categories are used to group tax rates together. All products and shipping methods are assigned a tax category.
* Tax rates associate a tax category with a geographic zone and a tax calculator.
* Tax calculators specify the logic used to calculate taxes on top of an item. Solidus ships with basic calculators where the tax rates are statically configured in the backend, but you may also install or implement a calculator that integrates with third-party tax calculation services such as TaxJar or Avalara AvaTax.

### Tax calculation flow

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

## Custom tax calculation

Here are the two main actors responsible for calculating taxes in Solidus:

* The **tax calculator** is a class responsible for receiving an order and returning all the taxes that need to be applied to that order's line items and shipments. The tax calculator API is completely independent from the underlying implementation. [Here's the default calculator.](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/tax_calculator/default.rb)
* **Amount calculators** are models that are associated to a tax rate and used to compute the tax amount for a specific line item or shipment. [Here's an example.](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/calculator/default_tax.rb)

In a standard Solidus configuration, Solidus uses both of these concepts: the [default tax calculator](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/tax_calculator/default.rb) uses the configured tax rates to determine the tax amounts to apply to your order.

If you want to customize the tax calculation logic, you may do it at two different levels:

* **Write a custom amount calculator:** with this approach, admins will create a tax rate that uses your own amount calculator and tell Solidus to use that tax rate for your products and zones. The default tax calculator will call the configured tax rate, which in turn will delegate the amount computation to your custom amount calculator.
* **Replace the tax calculator \(recommended\):** this way, Solidus will not use the amount calculators at all. This approach affords you maximum flexibility, since you'll be calculating taxes on the entire order at the same time rather than on a per-item basis.

Because most tax calculation workflows are fairly complicated with different edge case, it is advisable to replace the tax calculator entirely if you need to customize tax calculation in your store.

If, on the other hand, your logic is simple enough to fit the custom amount calculator pattern, you can go with that instead and save yourself the need to write some additional logic.

{% hint style="info" %}
**TODO:** Document shipping rate tax calculators.
{% endhint %}

### With a custom tax calculator

The public interface for a tax calculator is pretty simple: it takes an order during initialization and exposes a `#calculate` method that returns a [`Spree::Tax::OrderTax`](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/tax/order_tax.rb) instance. This is an object that contains information about all taxes to apply on an order.

Here's a dead-simple custom tax calculator that simply applies a 1% tax on all line items and a 2% tax on all shipments — the implementation is inspired by the default tax calculator:

```ruby
class CustomTaxCalculator
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
```

Once you have implemented your calculator, you need to tell Solidus to use it:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...

  config.tax_calculator_class = CustomTaxCalculator
end
```
{% endcode %}

Reboot your server, and Solidus should start using your custom tax calculator!

### With a custom amount calculator

With a custom amount calculator, store administrators configure tax rates as usual in the Solidus backend, but select your custom amount calculator instead of the default one. When a tax rate is applied to an item, the custom tax calculator will be called and your logic will be triggered.

```ruby
class CustomCalculator < Calculator::DefaultTax
  class << self
    def description
      'My Custom Calculator'
    end
  end

  def compute_line_item(line_item)
    # ...
  end

  def compute_shipping_rate(shipping_rate)
    # ...
  end

  def compute_shipment(shipment)
    # ...
  end
end
```

Register:

```ruby
Rails.application.config.spree.calculators.tax_rates << Spree::Calculator::AvalaraTransaction
```



