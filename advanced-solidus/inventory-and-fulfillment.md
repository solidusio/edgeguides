# Stock and fulfillment

## Architecture overview

The stock system in Solidus is possibly one of the most complicated and powerful provided by the platform. It consists of several pieces, all working in unison.

It all begins when an order is about to transition to the `delivery` state. When that happens, the order state machine [calls the `create_proposed_shipments`](https://github.com/solidusio/solidus/blob/v3.0.1/core/lib/spree/core/state_machines/order.rb#L103) method on the order, which in turn [uses the configured **stock coordinator**](https://github.com/solidusio/solidus/blob/v3.0.1/core/app/models/spree/order.rb#L493) to re-create the order's shipments.

{% hint style="warning" %}
If you remove the `delivery` state from the order state machine, or override the state machine with your own, the stock coordinator won't be called automatically anymore, and it will be up to you to call it at the right time.
{% endhint %}

The **stock coordinator** is the main actor in the stock system and coordinates all the other components. It takes an order as input and builds a list of proposed shipments for that order, along with their available shipping rates \(e.g., FedEx Home Delivery for $10, FedEx Overnight for $20, etc.\).

The default implementation of the stock coordinator is [`Spree::Stock::SimpleCoordinator`](https://github.com/solidusio/solidus/blob/v3.0.1/core/app/models/spree/stock/simple_coordinator.rb), but you can use a different coordinator if you want. In the rest of this guide, we'll assume you're using the default `SimpleCoordinator` and we'll explain its inner workings.

{% hint style="warning" %}
The default `SimpleCoordinator` class contains stock coordination logic that is the result of years of eCommerce experience and community contributions. We strongly recommend going with the default implementation and only overriding its subcomponents, unless you _really_ know what you're doing.
{% endhint %}

The work done by the stock estimator can be split in two logical chunks:

1. First, the estimator **creates the packages** for the order. [Packages](https://github.com/solidusio/solidus/blob/v3.0.1/core/app/models/spree/stock/package.rb) are a simplified version of shipments, meant to hold information about which stock is leaving from which stock location.
2. It then converts the packages into shipments and **estimates the shipping rates** for those shipments, depending on the shipping methods available in the store.

Let's see which other service objects are involved in these two processes!

### Package creation

The following actors are involved in the package creation phase:

* **Stock location filter:** this class is responsible for filtering the stock locations created in the backend and only returning the ones that should be used for the current order \(e.g., you may want to only use stock locations in the customer's country\).
* **Stock location sorter:** this class is responsible for sorting the list of filtered stock locations in order of priority \(e.g., you may want to pick inventory from the stock location closest to the customer\).
* **Stock allocator:** this class is responsible for allocating stock from the selected stock locations \(e.g., you may want to allocate on-hand inventory before backordering\).
* **Stock splitters:** this class is responsible for splitting the allocated inventory units into different packages \(e.g., you may want to keep all packages below a certain weight, and ship multiple packages if needed\).

The process for package creation is fairly straightforward:

1. First, the coordinator uses the **configured stock location** filter to get the list of stock locations to use for the current order.
2. Then, the filtered list is sorted with the **configured stock location sorter**.
3. Then, the filtered and sorted stock locations, along with the inventory units to allocate, are passed to the **configured stock allocator**, which maps each stock location to a list of on-hand inventory units to ship and backorderable inventory units to backorder. \(At this point, an "insufficient stock" error is raised if there's leftover inventory that couldn't be allocated from any stock location.\)
4. Then, the list of on-hand and backorderable inventory units is converted into **packages**, one package per stock location.
5. Finally, the list of packages is passed to the **configured stock splitters**, which may further split up the original packages.

At this point, we have our final list of packages. It's now time to convert them into real shipments and estimate their shipping rates.

### Rate estimation

The rate estimation process follows a similar pattern:

1. First, the coordinator converts the packages into shipments.
2. Then, it calls the **configured estimator** to calculate the shipping rates for each package.
3. Finally, it links the shipping rates for each package to the corresponding shipment.

Because the estimator is configurable, you can override the estimation logic however you want.

However, for the purpose of this guide, we'll assume you're using the default [`Spree::Stock::Estimator`](https://github.com/solidusio/solidus/blob/v3.0.1/core/app/models/spree/stock/estimator.rb), and we'll explain its process too:

1. First, the estimator retrieves the list of shipping methods available for the package being estimated. This determination takes into account the current store, the order's shipping address and the currency on the shipping method's calculator.
2. Then, it calculates the rate for each available shipping method, by using the calculator configured on the shipping method.
3. Then, it filters out any rates that belong to backend-only shipping methods, in case the calculation is being performed from the storefront.
4. Then, it selects the default shipping rate by using the configured **shipping rate selector**.
5. Finally, it sorts the shipping rates by using the configured **shipping rate sorter**.

{% hint style="warning" %}
The default `Estimator` implementation holds a lot of experience and years of bug-fixing and community-contributed improvements. You should go with the default implementation and only override small pieces of it, such as the shipping rate selector and sorter, unless you _really_ know what you're doing.
{% endhint %}

The result of this process is a sorted list of shipping rates for the original package, with a default shipping rate already pre-selected for the user.

## Customizing package creation

There are several pieces you can customize in the package creation process:

* the **stock location filter,** to customize which stock locations Solidus picks inventory from;
* the **location sorter,** to customize how Solidus prioritizes stock locations to pick inventory from;
* the **allocator,** to customize how Solidus prioritizes inventory units to allocate from the filtered and sorted stock locations;
* the **splitters,** to customize how Solidus splits the allocated inventory units in packages.

In the next paragraphs, we'll see a brief example for each of these customizations!

### Stock location filter

{% hint style="info" %}
The [default stock location filter](https://github.com/solidusio/solidus/blob/6c0da5d618a6d04d13ef50ec01ae17c3b06f6259/core/app/models/spree/stock/location_filter/active.rb) simply filters out the inactive stock locations.
{% endhint %}

Let's say you are a giant brand with warehouses all over the US, and you only ever want to ship from the stock locations in the customer's state.

You can do that by writing a custom stock location filter that looks like this:

{% code title="app/models/awesome\_store/stock/location\_filter/order\_state.rb" %}
```ruby
module AwesomeStore
  module Stock
    module LocationFilter
      class OrderState < Spree::Stock::LocationFilter::Base
        def filter
          stock_locations.active.where(state: order.ship_address.state)
        end
      end
    end
  end
end
```
{% endcode %}

As you can see, the logic is pretty simple: we take an initial list of stock locations \(the default stock coordinator will simply pass all stock locations here\) and then we only pick the ones that are active and where the state matches the state on the order's shipping address.

In order to start using our new stock location filter, you just need to configure it:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...

  config.stock.location_filter_class = 'AwesomeStore::Stock::LocationFilter::OrderState'
end 
```
{% endcode %}

### Stock location sorter

{% hint style="info" %}
[By default,](https://github.com/solidusio/solidus/blob/6c0da5d618a6d04d13ef50ec01ae17c3b06f6259/core/app/models/spree/stock/location_sorter/unsorted.rb) stock locations are unsorted, but Solidus provides a built-in [`DefaultFirst`](https://github.com/solidusio/solidus/blob/6c0da5d618a6d04d13ef50ec01ae17c3b06f6259/core/app/models/spree/stock/location_sorter/default_first.rb) sorter that will put the default stock location first.
{% endhint %}

Let's say that you ship from a mix of your own warehouses and third-party warehouses, and you want to ship from your own warehouses first in order to minimize fulfillment cost.

You could do this with a custom stock location sorter:

{% code title="app/models/awesome\_store/stock/location\_sorter/self\_owned\_first.rb" %}
```ruby
module AwesomeStore
  module Stock
    module LocationSorter
      class SelfOwnedFirst < Spree::Stock::LocationSorter::Base
        def sort
          # We're assuming the `self_owned` column is `true` when the warehouse
          # is self-owned, and `false` when it's ownerd by a third-party.
          stock_locations.order(self_owned: :desc)
        end
      end
    end
  end
end
```
{% endcode %}

The implementation is pretty similar to that of the stock location filter: you take an initial list of sorted stock locations and you return a sorted list.

Now that you have implemented your sorter, you need to enable it:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...

  config.stock.location_sorter_class = 'AwesomeStore::Stock::LocationSorter::SelfOwnedFirst'
end
```
{% endcode %}

### Stock allocator

{% hint style="info" %}
The [default stock allocator](https://github.com/solidusio/solidus/blob/6c0da5d618a6d04d13ef50ec01ae17c3b06f6259/core/app/models/spree/stock/allocator/on_hand_first.rb) picks on hand inventory units before backordered inventory units.
{% endhint %}

Let's say you're a drop-shipping business, but you also hold a tiny amount of inventory on-hand for VIP customers or other special cases. In this case, you want to make sure you backorder all items and never touch your on-hand inventory unless absolutely needed \(e.g.., if the customer ordered an item that's not being produced anymore and cannot be backordered\).

You could accomplish this with a custom stock allocator such as the following:

{% code title="app/models/awesome\_store/stock/allocator/backordered\_first.rb" %}
```ruby
module AwesomeStore
  module Stock
    module Allocator
      class BackorderedFirst < Spree::Stock::Allocator::Base
        def allocate_inventory(desired)
          # Allocate backordered inventory first
          backordered = allocate_backordered(desired)
          desired -= backordered.values.sum if backordered.present?

          # Allocate any non-backorderable inventory from on-hand inventory
          on_hand = allocate_on_hand(desired)
          desired -= on_hand.values.sum if on_hand.present?

          # `desired` at this point should be empty if we managed to
          # allocate all required inventory
          [on_hand, backordered, desired]
        end

        protected

        # In these two methods, `availability` is a `Spree::Stock::Availability`
        # instance, which maps a list of variants to their availability in the
        # filtered stock locations

        def allocate_backordered(desired)
          allocate(availability.backorderable_by_stock_location_id, desired)
        end

        def allocate_on_hand(desired)
          allocate(availability.on_hand_by_stock_location_id, desired)
        end

        def allocate(availability_by_location, desired)
          # `availability_by_location` is a `Spree::StockQuantities` instance
          # that makes it easier to perform operations on inventory units
          availability_by_location.transform_values do |available|
            # Find the desired inventory which is available at this location
            packaged = available & desired
            # Remove found inventory from desired
            desired -= packaged
            packaged
          end
        end
      end
    end
  end
end
```
{% endcode %}

This allocator is extremely similar to Solidus' default stock allocator, but it works backwards: it allocates backordered inventory units before starting to pick on-hand inventory units.

{% hint style="info" %}
Because operations on inventory units can be a bit complicated for a developer to perform manually, Solidus provides two helper classes, [`Spree::Stock::Availability`](https://github.com/solidusio/solidus/blob/6c0da5d618a6d04d13ef50ec01ae17c3b06f6259/core/app/models/spree/stock/availability.rb) and [`Spree::StockQuantities`](https://github.com/solidusio/solidus/blob/6c0da5d618a6d04d13ef50ec01ae17c3b06f6259/core/app/models/spree/stock_quantities.rb), which make it easier to reason about and perform algebraic operations on inventory units. Feel free to take a look at their source code to understand how they work in detail.
{% endhint %}



### Stock splitters

{% hint style="info" %}
The default splitter chain will split packages by [shipping category](https://github.com/solidusio/solidus/blob/6c0da5d618a6d04d13ef50ec01ae17c3b06f6259/core/app/models/spree/stock/splitter/shipping_category.rb) and then by [availability](https://github.com/solidusio/solidus/blob/6c0da5d618a6d04d13ef50ec01ae17c3b06f6259/core/app/models/spree/stock/splitter/backordered.rb) \(i.e., by separating on hand and backordered items in different packages\).

There's also a `Weight` splitter that is not enabled by default, which will split packages so that they are all below a certain weight threshold.
{% endhint %}

An important aspect to understand about stock splitters is that, unlike all the other components of the stock system, you can have multiple stock splitters configured at the same time to form a **splitter chain**. 

When the packages are ready to be split, Solidus will pass the initial list of packages to the first splitter in the chain, and each splitter is responsible for running its logic and passing the result to the next splitter in the chain, until the end of the chain is reached.

As an example, let's say you ship some frozen products that are packaged in dry ice. You want to split frozen products and regular products in separate packages.

You could accomplish this with a custom stock splitter such as the following:

```ruby
module AwesomeStore
  module Stock
    module Splitter
      class FrozenItems < Spree::Stock::Splitter::Base
        def split(packages)
          split_packages = []

          packages.each do |package|
            # Split each package in frozen and non-frozen items
            split_packages += split_package(package)
          end

          # `return_next` is a helper that will pass the split
          # packages to the next splitter in the chain
          return_next split_packages
        end

        private

        def split_package(package)
          frozen_items = []
          non_frozen_items = []

          package.contents.each do |item|
            # We are assuming that `Spree::Variant` responds to `#frozen?`
            if item.variant.frozen?
              frozen_items << item
            else
              non_frozen_items << item
            end
          end

          # The `build_package` method is a helper that takes a
          # list of items and builds a package with them.
          [
            # Build the package for frozen items
            build_package(frozen_items),
            # Build the package for non-frozen items
            build_package(non_frozen_items),
          ]
        end
      end
    end
  end
end
```

The implementation here is slightly more complicated than usual, so let's walk through it:

1. First, we loop through each package that is passed to the splitter.
2. Then, for each package, we separate the frozen and the non-frozen items in two separate packages.
3. Then, we pass the final list of split packages to the next stock location splitter.

{% hint style="warning" %}
As you may imagine, the order of stock splitters is important to determine the final result of the splitter chain. When you implement a custom stock splitter, make sure to add it in the right place! If you want full control over the splitter chain, you can override the `stock_splitters` array completely rather than appending to it.
{% endhint %}

Now that we have our new splitter, we need to add it to the splitter chain:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...

  config.environment.stock_splitters << 'AwesomeStore::Stock::Splitter::FrozenItems'
end
```
{% endcode %}

## Customizing rate estimation

{% hint style="danger" %}
**TODO:** Write this section.
{% endhint %}

### Shipping rate selector

{% hint style="danger" %}
**TODO:** Write this section.
{% endhint %}

### Shipping rate sorter

{% hint style="danger" %}
**TODO:** Write this section.
{% endhint %}

