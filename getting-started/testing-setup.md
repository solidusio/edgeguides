# Testing Setup

Some of the tests we present in the guide examples utilize non-standard requirements that can be appended to your local rails helper. These additions will help provide an error-free learning experience! Let's start with our Gemfile to make sure we have the required dependencies:

{% code title="Gemfile" %}
```ruby
group :development, :test do
  # Preferred testing suite which we use in our Solidus guides
  gem 'rspec-rails'
  # Setup 'factories' or prebuilt objects to expedite testing
  gem 'factory_bot_rails' '~> 4.8'
  # Call 'byebug' anywhere in the code to stop execution and get a debugger console
end

#...

group :test do
# Adds support for Capybara system testing and selenium driver
  gem 'capybara', '>= 3.26'
  # Easy installation and use of web drivers to run system tests with browsers
  gem 'webdrivers'
  # Scrubs database clean between tests
  gem 'database_cleaner-active_record'
```
{% endcode %}

Let's go over the installation of these gems and why we are suggesting them!
## RSpec

RSpec is a highly versatile testing framework that we utilize for Solidus and in our guide examples. To install it for your local project, simply update your bundle and install RSpec base files with the following commands in your shell:

```bash
bundle install
rails g rspec:install
```
For more information on RSpec and associated methods, please see the [official documentation](https://relishapp.com/rspec/rspec-rails/docs).

## Solidus Factories and authentication helpers

Whether you are following along this learning guide and coding along with the examples, or developing on top of the Solidus platform, you might find yourself interested in utilizing some of the pre-built factories or authentication helpers. In order use the pre-built factories, we will have to edit a few files starting with your Gemfile:

{% hint style="warning" %}
We advise to use the same version used by Solidus to ensure you don't get errors from differences in how FactoryBot builds/creates associations, but if your app was based on a more recent version you might prefer to stick to that one instead.
{% endhint %}

Next, we will need to navigate to `config/application.rb` and customize it to look like the following:

{% code title="config/application.rb" %}
```ruby
module AmazingStore
  class Application < Rails::Application

    # … everything else

    # Don't initialize this if factory_bot_rails is not part of the current bundle group.
    if defined?(FactoryBotRails)
      initializer after: "factory_bot.set_factory_paths" do
        require 'spree/testing_support/factory_bot'

        # The paths for solidus factories.
        solidus_paths = Spree::TestingSupport::FactoryBot.definition_file_paths

        # Optional: The paths for extensions may be in different places, please refer to each extension
        # and add the factories you require without the ".rb" extension, avoid the directory
        # as it's supported by FactoryBot but can generate ambigous paths when a file with the
        # same name exists.
        extension_paths = []
        # Optional:
        # [ alt_1, alt_2, alt_3].map { |path| path.chomp(".rb") }

        # Where:
        # alt_1: MySolidusExtension::Engine.root.join("lib/solidus_content/factories.rb),
        # alt_2: MySolidusExtension::Engine.root.join("lib/solidus_content/factories/product.rb"),
        # alt_3: MySolidusExtension::Engine.root.join("lib/solidus_content/factories/product_factory.rb"),
        # etc.

        # The application's factories, according to the place in which they're generally stored.
        app_paths = [
          Rails.root.join('lib', 'factories'),
          Rails.root.join('spec', 'factories'),
        ]

        FactoryBot.definition_file_paths = solidus_paths + extension_paths + app_paths
      end
    end
  end
end
```
{% endcode %}

Finally, modify the configuration and create the support file to reference customized methods. This will give you the ability to create/build factories and stub authentication:

{% tabs %}
{% tab title="spec/rails\_helper.rb" %}
{% code title="spec/rails\_helper.rb" %}
```ruby
...
# Add additional requires below this line. Rails is not loaded until this point!
require 'spree/testing_support/authorization_helpers'
require 'spree/testing_support/controller_requests'
...
# The following line is provided for convenience purposes. It has the downside
# of increasing the boot-up time by auto-requiring all files in the support
# directory. Alternatively, in the individual `*_spec.rb` files, manually
# require only the support files necessary.
Dir[Rails.root.join('spec','support','**','*.rb')].sort.each {|f| require f }
...
RSpec.configure do |config|
  ...
  config.include Spree::TestingSupport::ControllerRequests, spree_controller: true
end
```
{% endcode %}
{% endtab %}

{% tab title="spec/support/factory\_bot.rb" %}
{% code title="spec/support/factory\_bot.rb" %}
```ruby
RSpec.configure do |config|
  #...
  config.include FactoryBot::Syntax::Methods
end
```
{% endcode %}
{% endtab %}
{% endtabs %}
## Capybara and Webdrivers

[Capybara](https://github.com/teamcapybara/capybara) helps you test web applications by simulating how a real user would interact with your app. This is complimented by the `webdrivers` gem to provide selenium drivers required by Capybara to test multiple browsers. However, some setup is required to utilize the features we will be testing. It is recommended that you follow [Capybara's guide](https://github.com/teamcapybara/capybara#using-capybara-with-rspec) provided by the content creators to properly setup this library.

For reference, our setup file resembled the following:

{% code title="spec/support/capybara.rb" %}
```ruby
require 'capybara/rspec'
require 'selenium/webdriver'

Capybara.default_max_wait_time = 5

Capybara.register_driver :headless_chrome do |app|
  capabilities = Selenium::WebDriver::Remote::Capabilities.chrome(
    chromeOptions: { args: %w(headless disable-gpu window-size=1280,2000 no-sandbox) }
  )

  Capybara::Selenium::Driver.new app,
    browser: :chrome,
    desired_capabilities: capabilities
end

Capybara.javascript_driver = :headless_chrome
```
{ %endcode% }

This configuration will set the default browser to a headless [Chrome](https://www.google.com/chrome/) window when running your tests. To learn about other supported drivers, please refer to [Capybara's guide](https://github.com/teamcapybara/capybara/blob/2.12.0/README.md#using-capybara-with-rspec).
## Database Cleaner

[Database Cleaner](https://github.com/DatabaseCleaner/database_cleaner) will ensure that we have a clean state after each test so there is not a possibility of running into duplicated objects or remaining object entries which may fail a test. Database cleaner has different strategies to ensure your database is clean, If you would like to learn more, you can visit the Database Cleaner guides which provides a detailed [explanation of their strategies](https://github.com/DatabaseCleaner/database_cleaner#what-strategy-is-fastest) and how to [setup the gem](https://github.com/DatabaseCleaner/database_cleaner#rspec-with-capybara-example) on your system.
