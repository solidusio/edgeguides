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

{% hint style="info" %}
**TODO:** Write this section.
{% endhint %}

### Stock location filter

{% hint style="info" %}
**TODO:** Write this section.
{% endhint %}

### Stock location sorter

{% hint style="info" %}
**TODO:** Write this section.
{% endhint %}

### Stock allocator

{% hint style="info" %}
**TODO:** Write this section.
{% endhint %}

### Stock splitters

{% hint style="info" %}
**TODO:** Write this section.
{% endhint %}

## Customizing rate estimation

{% hint style="info" %}
**TODO:** Write this section.
{% endhint %}

### Shipping rate selector

{% hint style="info" %}
**TODO:** Write this section.
{% endhint %}

### Shipping rate sorter

{% hint style="info" %}
**TODO:** Write this section.
{% endhint %}

