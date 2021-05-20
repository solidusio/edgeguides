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

Solidus comes with a set of useful helpers you can use in your tests. You can find them in the [`spree/testing_support`](https://github.com/solidusio/solidus/tree/master/core/lib/spree/testing_support) path. We suggest including the ones you need in your RSpec configuration to save some time when writing tests.

### Ability helpers

### Authorization helpers

### Capybara helpers

### Flash helpers

### Order helpers

### Preference helpers

### URL helpers

{% hint style="info" %}
This section still needs to be written.
{% endhint %}

## Testing your Solidus app

{% hint style="info" %}
This section still needs to be written.
{% endhint %}

### Testing overrides

{% hint style="info" %}
This section still needs to be written.
{% endhint %}

### Testing the storefront

{% hint style="info" %}
This section still needs to be written.
{% endhint %}

### Testing the backend

{% hint style="info" %}
This section still needs to be written.
{% endhint %}

### Testing event subscribers

{% hint style="info" %}
This section still needs to be written.
{% endhint %}

