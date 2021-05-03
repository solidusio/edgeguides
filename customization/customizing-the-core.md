# Customizing the core

## Customization strategies

Most Solidus stores don't stop at customizing the storefront: in fact, if all you need is a custom storefront, perhaps Solidus is not a good choice in the first place. Solidus users want to be able to customize every single aspect of their store, not just how the store appears to customers but also what happens under the hood when customers browse it and place an order.

Because Solidus is built on Ruby and Ruby on Rails, there are no limits to what can be customized. You can literally change every single aspect of the framework's business logic however you see fit, either through built-in customization hooks or Ruby's powerful meta-programming features.

How you customize Solidus will have implications for the stability and maintainability of your store, so it's good to know the set of tools at your disposal and make an informed decision depending on your specific use case. In most cases, you'll want to adopt a mix of these approaches.

### Using built-in hooks

Solidus provides a rich and powerful API for customizing different aspects of your store's business logic. By defining which classes get called to perform certain tasks in your store, you have the option to either enrich or completely replace Solidus' default functionality.

The [`Spree::AppConfiguration`](https://github.com/solidusio/solidus/blob/master/core/lib/spree/app_configuration.rb) class has a list of all the service object classes that can be natively customized. Look for through the source code of that class and see if there's an option that resembles what you need to do. If yes, bingo!

{% hint style="info" %}
`Spree::AppConfiguration` is not the only configuration class that contains service objects. Before resorting to other customization methods, search through Solidus' source code and see if there are any other options that allow you to replace the class you need.
{% endhint %}

For instance, Solidus merges a user's "guest" cart with the cart associated to their user account when they sign in. Let's suppose you don't like this default behavior, and would like to keep the two carts separate at all times instead, to avoid confusion for the user. You can see there is [an option](https://github.com/solidusio/solidus/blob/master/core/lib/spree/app_configuration.rb#L372) in the configuration that allows us to control precisely this behavior:

{% code title="solidus/core/lib/spree/app\_configuration.rb" %}
```ruby
# Allows providing your own class for merging two orders.
#
# @!attribute [rw] order_merger_class
# @return [Class] a class with the same public interfaces
#   as Spree::OrderMerger.
class_name_attribute :order_merger_class, default: 'Spree::OrderMerger'
```
{% endcode %}

Let's also take a look at the [default `Spree::OrderMerger` class](https://github.com/solidusio/solidus/blob/475d9db5d0291dd4aeddc58ec919988c336729bb/core/app/models/spree/order_merger.rb) to understand what public API Solidus expects us to implement in our custom version:

{% code title="solidus/core/app/models/spree/order\_merger.rb" %}
```ruby
module Spree
  class OrderMerger
    # ...

    def initialize(order)
      # ...
    end

    def merge!(other_order, user = nil)
      # ...
    end

    # ...
  end
end
```
{% endcode %}

As you can see, the order merger exposes two public methods:

* `#initialize`, which accepts an order.
* `#merge!`, which accepts another order to merge with the first one and \(optionally\) the current user.

Equipped with this information, we can now write our "nil" order merger, along with its spec:

{% tabs %}
{% tab title="nil\_order\_merger.rb" %}
{% code title="app/models/amazing\_store/nil\_order\_merger.rb" %}
```ruby
module AmazingStore
  class NilOrderMerger
    attr_reader :order

    def initialize(order)
      @order = order
    end

    def merge!(other_order, user = nil)
      order.associate_user!(user) if user
    end
  end
end
```
{% endcode %}
{% endtab %}

{% tab title="nil\_order\_merger\_spec.rb" %}
{% code title="spec/models/amazing\_store/nil\_order\_merger\_spec.rb" %}
```ruby
RSpec.describe AmazingStore::NilOrderMerger do
  subject(:order_merger) { described_class.new(order) }

  let(:order) { instance_spy('Spree::Order') }

  context 'when a user is provided' do
    it 'associates the order to the user' do
      other_order = instance_spy('Spree::Order')
      user = double

      subject.merge!(other_order, user)

      expect(order).to have_received(:associate_user!).with(user)
    end
  end

  context 'when a user is not provided' do
    it 'does not attempt to associate the order to the user' do
      other_order = instance_spy('Spree::Order')

      subject.merge!(other_order, user)

      expect(order).not_to have_received(:associate_user!)
    end
  end
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

Finally, now that we have the new merger, we need to tell Solidus to use it:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...
  config.order_merger_class = 'AmazingStore::NilOrderMerger'
end
```
{% endcode %}

Restart your application server, and Solidus should start using your shiny new order merger!

{% hint style="warning" %}
When overriding critical functionality, you may also want to make sure that your feature is working correctly in integration. The unit test we have written, for instance, doesn't guarantee in any way that our custom order merger responds to the expected public API and will not break as soon as Solidus tries to call it.
{% endhint %}

### Using the event bus

Solidus 2.9 introduced the [event bus](https://github.com/solidusio/solidus/pull/3081), an internal pub-sub system. It is based on Rails' instrumentation API, [ActiveSupport::Notifications](https://api.rubyonrails.org/classes/ActiveSupport/Notifications.html), and therefore provides the same public API and capabilities. The event bus is still being rolled out across the platform, but you can already use it with a few native events.

For instance, let's say you want to call some external API every time an order is placed in our store. You could extend the [`Spree::Order#finalize!`](https://github.com/solidusio/solidus/blob/afd7f5b3bc1f3701012b7932725941aa772e04f8/core/app/models/spree/order.rb#L437) method to do it, but what if the implementation changes and the finalization logic is moved somewhere else? With the event bus, you can ask Solidus to run your custom logic whenever an order is finalized, without having to know about the platform's internals.

To accomplish this, you need to create an `OrderNotificationSubscriber` module that looks like this:

{% tabs %}
{% tab title="order\_finalization\_notifier.rb" %}
{% code title="lib/amazing\_store/order\_finalization\_notifier.rb" %}
```ruby
module AmazingStore
  class OrderFinalizationNotifier
    attr_reader :event

    def initialize(event)
      @event = event
    end

    def run
      # call your external API here
    end

    private

    def order
      event.payload[:order]
    end
  end
end
```
{% endcode %}
{% endtab %}

{% tab title="order\_finalization\_notifier\_spec.rb" %}
{% code title="spec/lib/amazing\_store/order\_finalization\_notifier\_spec.rb" %}
```ruby
require "rails_helper"

RSpec.describe AmazingStore::OrderFinalizationNotifier do
  it 'calls the external API' do
    order = double('Spree::Order')
    event = double('Spree::Event', payload: { order: order })

    described_class.new(event).run

    # add some expectation here
  end
end
```
{% endcode %}
{% endtab %}

{% tab title="config/application.rb" %}
{% code title="config/application.rb" %}
```ruby
module AmazingStore
  class Application < Rails::Application
    #... scan for and edit below
    config.eager_load_paths << Rails.root.join("lib")
    #...
  end
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

{% hint style="warning" %}
Make sure to also write integration tests when writing event handlers for critical aspects of your application. Issues with the load order and the application setup may cause event subscribers not to be registered properly, which will cause your event handler never to be called, although your unit tests will pass.
{% endhint %}

Finally, you need to tell Solidus you're subscribing to the `order_finalized` event:

{% code title="config/initializers/spree.rb" %}
```ruby
# ...
Spree::Event.subscribe 'order_finalized' do |event|
  AmazingStore::OrderFinalizationNotifier.new(event).run
end
```
{% endcode %}

Restart your server, and Solidus will start calling your event handler when an order is finalized!

#### Subscribing to multiple events

Thanks to regular expressions, it's also possible to subscribe to multiple events at once. Here's what the code to do that would look like:

{% code title="config/initializers/spree.rb" %}
```ruby
# ...
Spree::Event.subscribe /.*\.spree/ do |event|
  puts "#{event.name} => #{event.payload.inspect}"
end
```
{% endcode %}

{% hint style="warning" %}
When subscribing via a regular expression, you **need** to include the `.spree` suffix. Otherwise, you will subscribe to Rails' native events as well! When subscribing to a specific event, the event name is normalized automatically, so the suffix can be omitted.
{% endhint %}

If you still want the encapsulation and testability of event handler classes, you can still use them:

```ruby
Spree::Event.subscribe /.*\.spree/ do |event|
  AmazingStore::GenericEventHandler.new(event).run
end
```

### Using decorators

Solidus is a large and complex platform and, while new built-in customization hooks and events are introduced all the time to make the platform easier to extend, there may be situations where Solidus doesn't provide an official API to customize what you need. When that's the case, Ruby's meta-programming features come to the rescue, allowing you to extend and/or override whatever you want.

As an example, suppose you want to introduce an environment variable that allows you to temporarily make all products unavailable in the storefront.

When you look at Solidus' source code, you will notice that `Spree::Product` already has an [`#available?`](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/product.rb#L174) method to control a product's visibility. This is the original implementation:

```ruby
# Determines if product is available. A product is available if it has not
# been deleted and the available_on date is in the past.
#
# @return [Boolean] true if this product is available
def available?
  !(available_on.nil? || available_on.future?) && !deleted?
end
```

As you can see, there is no "clean" way we can extend this method: no built-in customization hooks or events that can help us.

However, we can still use plain old Ruby and the power of [`Module#prepend`](https://ruby-doc.org/core-2.6.1/Module.html#method-i-prepend). If you're not familiar with it, `#prepend` is a method that allows us to insert a module at the beginning of another module's ancestors chain. Think of it as taking a module A and placing it "in front" of another module B: when you call a method on module B, Ruby will first hit module A and then continue down the chain of ancestors.

{% hint style="info" %}
The Solidus ecosystem used to rely heavily on `#class_eval` for overrides, but `#prepend` is a much better option. In case you're curious and want to dig deeper into the internals of what's going on, there are a few tutorials on Ruby's ancestors chain and what makes `#prepend` better than its alternatives. Check out "[Ruby modules: Include vs Prepend vs Extend](https://medium.com/@leo_hetsch/ruby-modules-include-vs-prepend-vs-extend-f09837a5b073)" and "[A class\_eval monkey-patching pattern with prepend](https://bibwild.wordpress.com/2016/12/27/a-class_eval-monkey-patching-pattern-with-prepend/)". You may see old guides, tutorials and extensions still using `#class_eval`, but you should know this is a deprecated pattern.
{% endhint %}

You can customize the `Spree::Product#available?` method by writing a module that will be prepended to `Spree::Product`. In the Solidus ecosystem, we call such modules **decorators.** Decorators are usually named in a descriptive way, that expresses how the decorator extends the original class.

Here's our `AddGlobalHiddenFlag` decorator for `Spree::Product`, along with its related spec:

{% tabs %}
{% tab title="add\_global\_hidden\_flag.rb" %}
{% code title="app/decorators/amazing\_store/spree/product/add\_global\_hidden\_flag.rb" %}
```ruby
module AmazingStore
  module Spree
    module Product
      module AddGlobalHiddenFlag
        def available?
          ENV['MAKE_PRODUCTS_UNAVAILABLE'] == false && super
        end

        ::Spree::Product.prepend self
      end
    end
  end
end
```
{% endcode %}
{% endtab %}

{% tab title="product\_spec.rb" %}
{% code title="spec/models/spree/product\_spec.rb" %}
```ruby
require 'rails_helper'

RSpec.describe Spree::Product do
  describe '#available?' do
    context 'when MAKE_PRODUCTS_UNAVAILABLE is true' do
      before do
        stub_const 'ENV',
          ENV.to_h
          .merge('MAKE_PRODUCTS_UNAVAILABLE' => true)
      end

      it 'makes the product unavailable' do
        product = build_stubbed(:product, available_on: Time.zone.yesterday)

        expect(product).not_to be_available
      end
    end

    context 'when MAKE_PRODUCTS_UNAVAILABLE is false' do
      before do
        stub_const 'ENV',
          ENV.to_h
          .merge('MAKE_PRODUCTS_UNAVAILABLE' => false)
      end

      it 'makes the product available' do
        product = build_stubbed(:product, available_on: Time.zone.yesterday)

        expect(product).to be_available
      end
    end
  end
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

As you can see, we are not only able to override the default `#available?` implementation, but we can also call the original implementation with `super`. This allows you to decide whether you want to extend the original method or completely override it.

{% hint style="warning" %}
You should always prefer customizing Solidus via public, standardized APIs such as the built-in customization hooks and the event bus, whenever possible. When you use a supported API, it's much less likely your customization will be broken by a future upgrade that changes the part of the code you are overriding.
{% endhint %}
