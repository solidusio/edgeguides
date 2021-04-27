# Optional Installation Settings
## RSpec
RSpec is highly versatile testing framework that we utilize for Solidus and in our guide examples. To install it for your local project, simply add the gem to your gemfile:
{% code title="Gemfile" %}
```ruby
group :development, :test do
  #...
  gem 'rspec-rails'
end
```
{% endcode %}

Update your bundle and `Gemfile.lock` then install RSpec base files with the following commands in your shell:

```bash
bundle install
rails g rspec:install
```
{% hint style="info" %}
You may have to navigate to your `spec_helper.rb` located in the `spec` directory of your applications root folder and make sure that you have the following at the top of the file:
  {% code title="spec/spec_helper.rb" %}
  ```ruby
  ENV["RAILS_ENV"] ||= 'test'
  require File.expand_path("../../config/environment", __FILE__)
  require 'rspec/rails'
  #...
  ```
  {% endcode %}
{% endhint %}

For more information on RSpec and associated methods, please see the [official documentation](https://relishapp.com/rspec/rspec-rails/docs).

## Solidus Factories

Whether you are following along this learning guide and coding along with the examples, or developing on top of the Solidus platform, you might find yourself interested in utilizing some of the pre-built factories. In order use the pre-built factories, we will have to edit a few files starting with your Gemfile:

{% code title="Gemfile" %}
```ruby
# ...
group :development, :test do
  #...
  gem 'factory_bot_rails', '~>4.8'
end
```
{% endcode %}

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
        require 'spree/testing_support'

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

        # The application factories, according to the place in which they're stored.
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

Finally, modify the configuration to make the methods and ability to create/build factories available:

{% code title="spec/spec_helper.rb" %}
```ruby
RSpec.configure do |config|
  #...
  config.include FactoryBot::Syntax::Methods
end
```
{% endcode %}
