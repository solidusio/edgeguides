# Testing Solidus

## Introduction to testing

For most of the examples in this guide, we have also provided automated tests. While this is a bit unusual in product documentation, we wanted to give you something you can use as inspiration when testing your own customizations. Feel free to adapt our tests to fit your own style!

We can't emphasize enough the importance of writing tests for you Solidus app: Solidus is a large, complex framework, and you are bound to miss gotchas and edge cases when customizing it, no matter how much QA you do. **Skipping on automated tests means asking for trouble,** especially in eCommerce, where downtime translates directly into financial loss.

While writing tests may seem like a useless distraction in the short term, it will make you more productive in the long term, by allowing you to change code faster, with more confidence and with less manual work. Having good test coverage will also help you tremendously when upgrading Solidus.

## Our testing philosophy

In this paragraph, you'll find some opinionated advice about how to test your Solidus application. This advice is the result of years spent evolving and maintaining large-scale eCommerce apps, and will almost certainly be a good starting point for anyone starting to work with Solidus.

### Unit vs. system tests

In general, there's no hard rule on whether something should be tested with a unit test or a system test. Each developer and development team has their own style and philosophy, and you should find your own and adapt it over time, as your application grows and your needs evolve.

Our recommendation is to have a balanced test diet: write unit tests for all possible scenarios \(happy paths, failure paths, edge cases, etc.\), and write system tests for at least the happy path of all customer- or admin-facing features. This will help you ensure your application is working well in the real world, and not just when testing each component in isolation.

{% hint style="info" %}
We're using "unit tests" in this guide in a loose way to refer to a test that primarily tests a single module/class rather than its interactions with the rest of the codebase.
{% endhint %}

In certain cases, you may also want to write lower-level integration tests which don't exercise the UI, but call multiple components without attempting to isolate them. A good use case would be testing that a given set of promo rules and actions works as expected when the promotion is applied to a real order.

### Test coverage

**~80% or higher** is a good test coverage to aim for, but take it with a grain of salt.

In general, coverage metrics are not an optimal measure of test quality, as they don't tell you anything about where the code is being exercised and how its outputs and side effects are being measured: you can have very high test coverage and still have tons of blind spots in your application, because you're calling your code but not verifying its behavior.

Rather than obsessing over test coverage, create guidelines around how to write meaningful, effective tests. High test coverage will come as a natural byproduct.

{% hint style="warning" %}
**TODO:** Suggest a code coverage monitoring setup.
{% endhint %}

## Configuring your test environment

Here's the bare minimum you'll need to get started with testing your Solidus app:

{% code title="Gemfile" %}
```ruby
group :development, :test do
  gem 'rspec-rails'
  gem 'factory_bot_rails' '~> 4.8'
end

group :test do
  gem 'capybara', '>= 3.26'
end
```
{% endcode %}

Let's go over the reason we're recommending these tools and how to set them up.

### Test framework: RSpec

RSpec is the preferred testing framework in the Solidus world. While it's certainly possible to test a Solidus application with other frameworks \(e.g., MiniTest\), all of our test helpers have been written to support RSpec, so we strongly recommend using it.

To properly configure RSpec, run the following command after installing the `rspec-rails` gem:

```bash
$ rails g rspec:install
```

After installing RSpec, take a look at `spec/spec_helper.rb` and `spec/rails_helper.rb`, as they contain some default configurations which you may want to uncomment. At the very least, make sure you uncomment these lines:

{% code title="spec/rails\_helper.rb" %}
```ruby
Dir[Rails.root.join('spec', 'support', '**', '*.rb')].sort.each { |f| require f }
```
{% endcode %}

It will automatically load each file in `spec/support` before starting your test suite. This allows you to import test helpers and configurations from other gems without polluting your main RSpec configuration.

{% hint style="info" %}
Throughout the rest of this guide, we'll assume you are loading files in `spec/support`.
{% endhint %}

For more information on RSpec and its usage, please see the [official documentation](https://relishapp.com/rspec/rspec-rails/docs).

### Factories: FactoryBot

Very often, you'll want to generate an instance of a user, order, product or any other type of Solidus model in a test. Instead of forcing you to generate the data manually every time, we provide a set of convenience factories you can import in your app:

{% code title="config/application.rb" %}
```ruby
module AmazingStore
  class Application < Rails::Application
    # ...

    # Don't initialize FactoryBot if it's not in the current Bundler group.
    if defined?(FactoryBotRails)
      initializer after: 'factory_bot.set_factory_paths' do
        require 'spree/testing_support/factory_bot'

        # The paths for Solidus factories.
        solidus_paths = Spree::TestingSupport::FactoryBot.definition_file_paths

        # Optional: Any factories you want to require from extensions.
        extension_paths = [
          # MySolidusExtension::Engine.root.join("lib/solidus_content/factories/order.rb"),
          # MySolidusExtension::Engine.root.join("lib/solidus_content/factories/product.rb"),
        ]

        # Your application's own factories.
        app_paths = [
          # Rails.root.join('lib/factories'),
          Rails.root.join('spec/factories'),
        ]

        FactoryBot.definition_file_paths = solidus_paths + extension_paths + app_paths
      end
    end
  end
end
```
{% endcode %}

Finally, you'll want to import the FactoryBot DSL methods. This allows you to call `create`, `build`, `build_stubbed` and `attributes_for` in your tests without prefixing them with `FactoryBot`:

{% tabs %}
{% tab title="spec/support/factory\_bot.rb" %}
{% code title="spec/support/factory\_bot.rb" %}
```ruby
RSpec.configure do |config|
  config.include FactoryBot::Syntax::Methods
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

For more information on FactoryBot and its usage, please see the [official documentation](https://github.com/thoughtbot/factory_bot).

### System tests: Capybara

[Capybara](https://github.com/teamcapybara/capybara) is an acceptance test framework that simulates how a real user would interact with your app. Rails uses Capybara to implement [system tests](https://guides.rubyonrails.org/testing.html#system-testing), which are tests where you interact with the UI of your application rather than directly calling individual modules. 

When configured properly, system tests can also execute JavaScript code, just like a real browser would do. In order for JavaScript to be executed, you'll need to tell Capybara to switch to a JavaScript-capable browser for JS tests:

{% code title="spec/support/capybara.rb" %}
```ruby
RSpec.configure do |config|
  config.before(:each, type: :system) do |example|
    if example.metadata[:js]
      driven_by :selenium_chrome_headless
    else
      driven_by :rack_test
    end
  end
end
```
{% endcode %}

The configuration above tells Capybara to use the default `Rack::Test` browser for non-JS tests, and Chrome for JS tests. This enables you to do the following:

{% code title="spec/system/product\_page\_spec.rb" %}
```ruby
RSpec.describe "Product page", type: :system do
  it "shows the product's description" do
    visit "/products/solidus-shirt"
    
    expect(page).to have_text("Solidus-branded T-shirt")
  end
  
  it "allows me to add a product to my cart", :js do
    visit "/products/solidus-shirt"

    click_button "Add to Cart"
    
    expect(page).to have_text("Product was added to the cart!")
  end
end
```
{% endcode %}

In the example above, the first test, which doesn't require JavaScript, will be run with `Rack::Test`, which is faster. The second test will be run through a headless Chrome instance with JS capabilities.

For more information on system tests and Capybara, you can refer to the [RSpec guides](https://relishapp.com/rspec/rspec-rails/v/5-0/docs/system-specs/system-spec) and [Capybara's official documentation](https://github.com/teamcapybara/capybara).

## Using the built-in helpers

Solidus comes with a set of useful helpers you can use in your tests. You can find all of them under the [`spree/testing_support`](https://github.com/solidusio/solidus/tree/master/core/lib/spree/testing_support) path. We suggest including the ones you need in your RSpec configuration to save some time when writing tests.

{% hint style="info" %}
You will notice Solidus has more helpers than we are documenting here. This is because some of the helpers in `spree/testing_support` are mostly meant for internal use \(i.e., for testing the Solidus codebase itself\), and wouldn't be very useful in another test suite.

You may still use the undocumented helpers if you find them useful, but keep in mind they may change over time.
{% endhint %}

### Authorization helpers

These helpers allow you to bypass Solidus' [authorization system](../advanced-solidus/permission-management.md). This makes testing easier, since you don't have to stub the current user or the current ability.

In order to use the helpers, first include them in your RSpec configuration:

{% code title="spec/support/solidus.rb" %}
```ruby
# ...

require 'spree/testing_support/authorization_helpers'
```
{% endcode %}

Once you've included them, you can use them both in controller specs and system specs.

{% hint style="warning" %}
Stubbing or customizing the authorization system during testing can lead to unexpected bugs in production. Instead of stubbing the authorization system, just use Devise's helpers to sign in as a user with the right permissions.
{% endhint %}

#### Stubbing the authorization system

The `stub_authorization!` method bypasses the authentication and authorization systems completely by stubbing the current user and allowing you to perform any action on any resource:

```ruby
RSpec.describe 'The product admin' do
  stub_authorization!

  it 'allows me to view the products' do
    product = create(:product)

    visit spree.admin_path
    click_link 'Products'

    expect(page).to have_content(product.name)
  end
end
```

#### Defining a custom authorization block

The `custom_authorization!` method, on the other hand, allows you to define a custom authorization block. You'll still need to authenticate the current user, if you use it:

```ruby
RSpec.describe 'The product admin' do
  custom_authorization! do
    can :read, Spree::Product
  end

  it 'allows me to view the products' do
    sign_in create(:user)
    product = create(:product)

    visit spree.admin_path
    click_link 'Products'

    expect(page).to have_content(product.name)
  end
  
  it 'does not allow me to edit products' do
    sign_in create(:user)
    product = create(:product)
    
    visit spree.edit_admin_product_path(product)
    
    expect(page).to have_content('Access denied')
  end
end
```

\(Note that the [`sign_in` helper](https://github.com/heartcombo/devise#test-helpers) is provided by Devise, not Solidus.\)

### Capybara helpers

These helpers make it easier to interact with the UI in system specs, especially when testing the Solidus backend. They can come in really useful if you've customized the backend and want to test some piece of functionality. They also suppress annoying Puma logs in the test output.

As always, the first step is to include them in your app:

{% code title="spec/support/solidus.rb" %}
```ruby
# ...

require 'spree/testing_support/capybara_ext'
```
{% endcode %}

#### Interacting with icons

You can use the `click_icon` helper to find and click on a specific FontAwesome icon:

```ruby
RSpec.describe 'The option types admin' do
  it 'allows me to delete the option types' do
    sign_in create(:admin_user)
    option_type = create(:option_type)

    visit spree.admin_path
    click_link 'Products'
    click_link 'Option Types'
    click_icon 'trash'

    expect(page).to have_content('has been successfully removed')
  end
end
```

#### Interacting with tables

The `within_row` helper can be used to scope the Capybara context to a specific row within an index table in the backend:

```ruby
RSpec.describe 'The product admin' do
  it 'allows me to edit a product' do
    sign_in create(:admin_user)
    product1 = create(:product)
    product2 = create(:product)

    visit spree.admin_products_path
    # Clicks the edit icon for the first product
    within_row(1) { click_icon 'edit' }

    # ...
  end
end
```

The `column_text` helper can be used to retrieve the text from a specific column in a table row:

```ruby
RSpec.describe 'The product admin' do
  it 'displays the product SKU' do
    sign_in create(:admin_user)
    product1 = create(:product)
    product2 = create(:product)

    visit spree.admin_products_path
    
    within_row(1) do
      expect(column_text(1)).to eq(product1.sku)
    end
  end
end
```

#### Interacting with select2 inputs

The Solidus backend uses the [Select2](https://select2.org/) jQuery plugin for nicer-looking, Ajax-enabled select boxes. Because Select2 inputs are not regular inputs, some additional code is required when interacting with them.

You can use the `select2_search` helper to search and select a specific option from a Select2 input \(this would be equivalent to typing the option's text in the search field, then selecting the result\):

```ruby
RSpec.describe 'The orders admin' do
  it 'allows me to filter by variant' do
    sign_in create(:admin_user)
    product = create(:product)
    order = create(:order) do |o|
      create(:line_item, order: o, variant: product.master)
    end
    
    visit spree.admin_orders_path
    select2_search product.sku, from: 'Variant'
    click_button 'Filter results'
    
    expect(page).to have_content(order.number)
  end
end
```

#### Testing meta tags

You can use the `have_meta` helper to expect the current page to have a specific meta tag:

```ruby
RSpec.describe 'The product page' do
  it 'uses the product description in the meta description' do
    product = create(:product)
    
    visit spree.product_path(product)
    
    expect(page).to have_meta(:description, product.description)
  end
end
```

### Order helpers

Sometimes, you need to generate an order in a given state. Solidus ships with a set of [order factories](https://github.com/solidusio/solidus/blob/v3.0/core/lib/spree/testing_support/factories/order_factory.rb) you can use to generate different types of orders, and these should be your first choice.

However, you will sometimes need a bit more granularity than what the factories provide \(e.g., when testing the checkout flow\). A common use case is wanting to generate an order in a certain state, only with the information the user would have provided up until that state \(e.g., generate an order in the delivery state, only with address information\). That's exactly what the `OrderWalkthrough` helper is for.

{% hint style="warning" %}
The `OrderWaltkhrough` helper is extremely opinionated: it assumes you haven't modified the order state machine in significant ways, and that your checkout flow resembles the standard, multi-page checkout flow from the starter frontend.

If you have altered the order state machine or checkout flow significantly, you may want to use the order factories instead, or write your own helper, in order for your tests to better resemble real-world usage.
{% endhint %}

First of all, include the helper in your test suite:

{% code title="spec/support/solidus.rb" %}
```ruby
# ...

require 'spree/testing_support/order_walkthrough'
```
{% endcode %}

You can now use the helper whenever you want:

```ruby
RSpec.describe 'The checkout flow' do
  it 'renders the delivery step' do
    user = create(:user)
    sign_in user
    # Generate an order in the `delivery` state
    order = Spree::TestingSupport::OrderWalkthrough.up_to(:address)
    order.update!(user: user)

    visit spree.checkout_path
    
    expect(page).to have_current_path('/checkout/delivery')
  end
end
```

The `OrderWalkthrough.up_to` call will create a new order and it will simulate what a user would do if they want to the checkout flow and only completed the `address` state. The order will have line items and an address on it, and it will be in the `delivery` state, ready for shipping method selection.

### Preference helpers

Sometimes, it can be useful to stub the Solidus configuration, to test how your store would behave with certain configuration options. This is usually the case for payment methods and other resources which can be configured by store operators without developer intervention: when that's the case, you want to make sure operators can't take any action that could cause a store malfunction, which requires testing under different configurations.

If you need to stub the configuration, first of all require the relevant helper:

{% code title="spec/support/solidus.rb" %}
```ruby
# ...

require 'spree/testing_support/preferences'
```
{% endcode %}

You can now use the `stub_spree_preferences` helper anywhere in your code. The helper accepts a hash of preferences, in which case the preferences will be stubbed on the global configuration:

```ruby
RSpec.describe 'The product page' do
  it 'renders the price in EUR' do
    # Stub the global `currency` setting of the store
    stub_spree_preferences(currency: 'EUR')
    product = create(:product)
    
    visit spree.product_path(product)
    
    expect(page).to have_content('€100,00')
  end
  
  it 'renders the price in USD' do
    # Stub the global `currency` setting of the store
    stub_spree_preferences(currency: 'USD')
    product = create(:product)
    
    visit spree.product_path(product)
    
    expect(page).to have_content('$100.00')
  end
end
```

The helper can also accept a configuration class and a hash of preferences, in which case the preferences will be stubbed on the provided configuration class:

```ruby
RSpec.describe 'The backend' do
  it 'is available in English' do
    # Stub the `locale` setting of the backend
    stub_spree_preferences(Spree::Backend::Config, locale: 'en')
    
    visit spree.admin_path
    
    expect(page).to have_content('Email')
  end

  it 'is available in French' do
    # Stub the `locale` setting of the backend
    stub_spree_preferences(Spree::Backend::Config, locale: 'fr')
    
    visit spree.admin_path
    
    expect(page).to have_content('Courriel')
  end
end
```

### URL helpers

By default, your tests will not have access to the Solidus routes, because they're part of a Rails engine and not of your main application. You could access them with `Spree::Core::Engine.routes.url_helpers`, but you can include the URL helpers if you want to save a few characters:

{% code title="spec/support/solidus.rb" %}
```ruby
# ...

require 'spree/testing_support/url_helpers'

RSpec.configure do |config|
  config.include Spree::TestingSupport::UrlHelpers
end
```
{% endcode %}

You can now access the helpers via the `spree.` shortcut:

```ruby
RSpec.describe 'The product page' do
  it 'is accessible' do
    product = create(:product)
    
    visit spree.product_path(product)
    
    expect(page).to have_content(product.name)
  end
end
```

## Testing your Solidus app

Since Solidus applications are just regular Rails applications, there's nothing special you need to do to test them: just write tests as you'd usually do and you'll be fine! With that said, there are some aspects to keep in mind when testing certain parts of your app, especially if you want to have an easy time upgrading Solidus.

### Testing service objects

If you have implemented a service object to replace one of Solidus' default implementations, make sure to test it just as you would do with any other service object.

If you're inheriting from Solidus' default implementation, you should also test any behavior that's inherited from the original class, to make sure you haven't altered functionality in undesired ways. This will usually not be needed, because the customizable service objects in Solidus have small, well-defined interfaces, but keep it in mind!

### Testing overrides

Testing an override is similar to testing a service objects that inherits from the original implementation: for full test coverage, you'll have to test both your customization and any original functionality that comes from the default implementation. This will ensure you haven't broken the original functionality in any way, and it will make it easier to upgrade Solidus.

This kind of gotcha is why you should prefer [customizing Solidus](../customization/customizing-the-core.md) via the extension hooks or the event bus instead of relying on overrides.

### Testing the storefront

There's nothing special you need to do here: when testing your storefront, do it with system specs, as you would do for any regular Rails app. Focus on user-facing functionality and integration testing \(i.e., don't write controller tests unless you have a very good reason to\).

### Testing the backend

Just like for the storefront, you should use system specs for testing your backend customizations. You may also want to leverage some of the [built-in helpers](testing-solidus.md#capybara-helpers) Solidus provides for testing the backend UI.

### Testing event subscribers

Event subscribers are an awesome way to decouple orthogonal logic, but once you start using them extensively, they can be tricky to test in isolation. Let's see an example.

Let's assume you are working on a store that integrates both with a taxation service. When an order is finalized, you want to send the order's information to the sales tax reporting API, so you can properly report your sales tax at the end of the quarter.

The event bus is the perfect fit for this use case, so you write the following event subscriber:

{% tabs %}
{% tab title="taxation/order\_subscriber.rb" %}
{% code title="app/subscribers/awesome\_store/taxation/order\_subscriber.rb" %}
```ruby
module AwesomeStore::Taxation::OrderSubscriber
  include Spree::Event::Subscriber
  
  event_action :report_order_tax, event_name: 'order_finalized'
  
  def report_order_tax(payload)
    # send the order information to a sales tax API
  end
end
```
{% endcode %}
{% endtab %}

{% tab title="taxation/order\_subscriber\_spec.rb" %}
{% code title="spec/subscribers/awesome\_store/taxation/order\_subscriber\_spec.rb" %}
```ruby
RSpec.describe AwesomeStore::Taxation::OrderSubscriber do
  describe 'on order_finalized' do
    it 'sends the order to the taxation API' do
      order = build_stubbed(:order)
      
      Spree::Event.fire 'order_finalized', order: order
      
      # verify the order has been sent to the API
    end
  end
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

Everything works well. Then, one day, you get a second requirement: when an order is finalized, you also need to send its information to an external 3PL API, so that it can be shipped to customers.

Given that the logic is very similar, you just write another subscriber:

{% tabs %}
{% tab title="fulfillment/order\_subscriber.rb" %}
{% code title="app/subscribers/awesome\_store/fulfillment/order\_subscriber.rb" %}
```ruby
module AwesomeStore::Fulfillment::OrderSubscriber
  include Spree::Event::Subscriber
  
  event_action :send_order_to_3pl, event_name: 'order_finalized'
  
  def send_order_to_3pl(payload)
    # send the order information to a 3PL API
  end
end
```
{% endcode %}
{% endtab %}

{% tab title="fulfillment/order\_subscriber\_spec.rb" %}
{% code title="spec/subscribers/awesome\_store/fulfillment/order\_subscriber\_spec.rb" %}
```ruby
RSpec.describe AwesomeStore::Fulfillment::OrderSubscriber do
  describe 'on order_finalized' do
    it 'sends the order to the 3PL API' do
      order = build_stubbed(:order)
      
      Spree::Event.fire 'order_finalized', order: order
      
      # verify the order has been sent to the API
    end
  end
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

This looks good at a superficial glance, but there's a problem: instead of just running the subscriber under test, both tests will now run both subscribers! This makes your tests slower and harder to debug when a subscriber fails, and it may also force you to duplicate any setup logic for one subscriber to in all the other subscribers that listen to the same event.

To solve the problem, you can add the following helper to your RSpec configuration:

{% code title="spec/support/subscriber\_helpers.rb" %}
```ruby
module TestingSupport
  module SubscriberHelpers
    def perform_subscribers(only: [])
      Spree::Config.events.subscriber_registry.deactivate_all_subscribers

      Array(only).each(&:activate)

      yield
    ensure
      reinitialize_subscribers(RSpec.current_example)
    end

    private

    def reinitialize_subscribers(example)
      Spree::Config.events.subscriber_registry.deactivate_all_subscribers

      if example.metadata[:type].in?(%i[system feature request])
        Spree::Config.events.subscriber_registry.activate_all_subscribers
      end
    end
  end
end

RSpec.configure do |config|
  config.include Helpers::Subscribers
  config.before do |example|
    reinitialize_subscribers(example)
  end
end
```
{% endcode %}

{% hint style="info" %}
This helper is in the process of being ported to Solidus, so you can simply include it like you do for all the other helpers. In the meantime, though, you'll have to do some old-fashioned copy-pasting if you want to use it!
{% endhint %}

This snippet will deactivate all subscribers when running your unit tests, except for the ones you explicitly enable via the `perform_subscribers` helper. Subscribers will still be active as usual in your system and request specs, so that you make sure your application works well in integration.

Here's how you can use it:

{% tabs %}
{% tab title="taxation/order\_subscriber\_spec.rb" %}
{% code title="spec/subscribers/awesome\_store/taxation/order\_subscriber\_spec.rb" %}
```ruby
RSpec.describe AwesomeStore::Taxation::OrderSubscriber do
  describe 'on order_finalized' do
    it 'sends the order to the taxation API' do
      order = build_stubbed(:order)
      
      perform_subscribers(only: described_class) do
        Spree::Event.fire 'order_finalized', order: order
      end
      
      # verify the order has been sent to the API
    end
  end
end
```
{% endcode %}
{% endtab %}

{% tab title="fulfillment/order\_subscriber\_spec.rb" %}
{% code title="spec/subscribers/awesome\_store/fulfillment/order\_subscriber\_spec.rb" %}
```ruby
RSpec.describe AwesomeStore::Fulfillment::OrderSubscriber do
  describe 'on order_finalized' do
    it 'sends the order to the 3PL API' do
      order = build_stubbed(:order)
      
      perform_subscribers(only: described_class) do
        Spree::Event.fire 'order_finalized', order: order
      end
      
      # verify the order has been sent to the API
    end
  end
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

This will make sure only the subscriber under test is executed when the `order_finalized` event is fired. As a result, your subscriber test is now fully isolated!

### Testing extensions

{% hint style="info" %}
This section still needs to be written.
{% endhint %}

