# Extension development

## Intro to extension development

We've already talked about how to use extensions in [Using extensions](../getting-started/extensions.md). As you may already know, extensions are Rails engines that augment your Solidus store with additional functionality such as payment gateways, WMS integrations, social login and more. Using extensions when developing your store can be a huge time- and money-saver, since it spares you the need to reimplement common \(and often complicated\) functionality.

But how would you go about creating your own extension? Perhaps you found an unsolved problem in the ecosystem, or you need to implement a feature or integration that you think others could benefit for and would like to create an open-source extension for everyone to benefit for. Or maybe you want to keep the extension private and only allow your team to access it.

Whatever the use case, this guide has got you covered. We'll see how to create an extension from scratch and release it as open-source on RubyGems or on a private gem server.

## Creating your first extension

In this example, we'll create an extension for integrating with Acme Fulfillment, a fulfillment provider — this is a very common use case in eCommerce. Our extension will do the following:

1. When an order is finalized, it will call the fulfillment partner's API to send all information about the order, so that it can be packaged and shipped to the customer.
2. It will store the fulfillment partner's shipment ID in the Solidus DB, for easier inspection and debugging.

Let's dive right in!

### Generating the skeleton

When working with extensions and Rails engines in general, there's a lot of boilerplate involved. Over the years, we've developed tools that simplify most of the tasks around extension creation and maintenance.

We've consolidated this tooling in [`solidus_dev_support`](https://github.com/solidusio/solidus_dev_support), a gem whose job is to make it a no-brainer to develop Solidus extensions. The gem provides static and runtime utilities that help you create a new extension, make it compatible with different Solidus versions, release it and maintain it over time.

{% hint style="info" %}
`solidus_dev_support` provides much more functionality than we'd be able to cover in this guide, so you should definitely checkout its [documentation](https://github.com/solidusio/solidus_dev_support) to get an idea of how much it does.
{% endhint %}

The first step is to install the gem globally, so that you can use it from your console:

```bash
$ gem install solidus_dev_support
```

You can now generate a new extension with the `solidus extension` command. Solidus extensions are  generally named `solidus_`, and then the name of the feature or integration they provide, so we'll follow this convention for our Acme Fulfillment extension:

```bash
$ solidus extension solidus_acme_fulfillment
```

This will generate a `solidus_acme_fulfillment` directory in the current path. This directory will contain a lot of boilerplate that is required to make your extension play nice with Solidus and Rails conventions.

`solidus_dev_support` tries to be as smart as possible and use some sensible defaults for your extension, but we'll still need to adjust some values before we can proceed.

First of all, open `solidus_acme_fulfillment.gemspec` in your favorite text editor, and change the following lines to configure a description for your extension:

{% code title="solidus\_acme\_fulfillment.gemspec" %}
```diff
# ...

- spec.summary = 'TODO: Write a short summary, because RubyGems requires one.'
+ spec.summary = 'A Solidus extension to integrate with the Acme Fulfillment API.'
- spec.description = 'TODO: Write a longer description or delete this line.'

# ...
```
{% endcode %}

Now that our gemspec doesn't have any TODOs in it, we can install the extension's bundle, which contains some useful tooling for working with the extension:

```text
$ bundle install
```

Now that the gemspec is configured and the bundle installed, we're ready to write some code!

### Adding dependencies

In order to make API calls, we'll need a library that makes it easier to perform HTTP requests. We could use Ruby's `HTTP` module, but its API is kind of cumbersome and not really fun to work with. Instead, we'll go with the popular [`httparty`](https://github.com/jnunemaker/httparty) gem. In order to do that, let's add the dependency to our gemspec:

{% code title="solidus\_acme\_fulfillment.gemspec" %}
```diff
 Gem::Specification.new do |spec|
   # ...

   spec.add_dependency 'solidus_core', ['>= 2.0.0', '< 4']
   spec.add_dependency 'solidus_support', '~> 0.5'
+  spec.add_dependency 'httparty', '~> 0.18.1'
 
   # ...
 end
```
{% endcode %}

This will ensure `httparty` is also installed by any apps that install our extension. We can now reinstall the bundle to get the new gem:

```bash
$ bundle install
```

Finally, we'll need to require the `httparty` gem in our extension's main file, since gem dependencies are not autoloaded by Bundler when initializing the main app:

{% code title="lib/solidus\_acme\_fulfillment.rb" %}
```diff
+require 'httparty'
+
 require 'solidus_acme_fulfillment/configuration'
 require 'solidus_acme_fulfillment/version'
 require 'solidus_acme_fulfillment/engine'
```
{% endcode %}

We should now be able to access `httparty` everywhere in our extension's code!

### Accepting configuration values

A common pattern in extensions is to accept certain configuration values that the user can change in a Rails initializer. For this reason, the extension skeleton generated by `solidus_dev_support` ships with a sample configuration file where you can add any options that you want the user to be able to configure. The skeleton also contains an initializer which will be copied to the main app when the extension is installed, so that the user doesn't have to write the configuration code manually.

In the case of our Acme Fulfillment extension, we want to let the user configure their API key. In order to do this, let's edit the `lib/solidus_acme_fulfillment/configuration.rb` file as follows:

{% code title="lib/solidus\_acme\_fulfillment/configuration.rb" %}
```diff
 module SolidusAcmeFulfillment
   class Configuration
-    # Define here the settings for this extension, e.g.:
-    #
-    # attr_accessor :my_setting
+    attr_accessor :api_key
   end

   # ...
 end
```
{% endcode %}

We will also edit the sample initializer to let the user know about the new configuration option:

{% code title="lib/generators/solidus\_acme\_fulfillment/install/templates/initializer.rb" %}
```diff
 SolidusAcmeFulfillment.configure do |config|
-  # TODO: Remember to change this with the actual preferences you have implemented!
-  # config.sample_preference = 'sample_value'
+  # Set your Acme Fulfillment API key here.
+  config.api_key = 'my-api-key'
 end
```
{% endcode %}

When a user installs our extension, an initializer will be added to their main application under `config/initializers/solidus_acme_fulfillment.rb` which will contain our sample configuration.

### Writing your first feature

Customizing Solidus through an extension is very similar to customizing it in the main application, and the same rules and patterns apply: you can use extension hooks, the event bus, overrides, Deface, etc.

{% hint style="warning" %}
One important aspect to keep in mind when working on extensions is that you can't predict what other extensions the user will install, so you need to make sure your customizations play nice with other extensions.

For example, setting a configuration value in the Solidus configuration is usually discouraged in extensions, since other extensions may do the same and end up overriding your setting. Instead, you can change the value by altering the configuration in the main app through your installation initializer, or document that the value needs to be set in your readme, and let the user do it.
{% endhint %}

When we described our requirements, we mentioned we also want to save the shipment ID that we get back from the 3PL's API when we create the order, so that we can easily access the shipment later. The best place to store this information would be an additional column in the `spree_orders` table, so let's first write a migration to create it:

```bash
$ rails g migration AddAcmeFulfillmentShipmentIdToSpreeOrders \
    acme_fulfillment_shipment_id
```

{% hint style="info" %}
You may have noticed that we're not running `rails db:migrate` after generating the migration. This is because we're working in a Rails engine, not a Rails application. We don't have a database to work on.

All database migrations that you generate in your extension will be automatically imported into the main application when the extension is installed via its initializer.
{% endhint %}

Next, we need to implement the actual code to integrate with the fulfillment partner's API. An event subscriber seems like the best way to do this, so let's write one:

{% code title="app/subscribers/solidus\_acme\_fulfillment/order\_subscriber.rb" %}
```ruby
module SolidusAcmeFulfillment
  module OrderSubscriber
    include Spree::Event::Subscriber
    
    event_action :send_to_3pl, event_name: 'order_finalized'
    
    def send_to_3pl(event)
      order = event.payload.fetch(:order)
      
      response = HTTParty.post(
        'https://api.acmefulfillment.com/orders', 
        headers: {
          'Authorization' => "Bearer #{SolidusAcmeFulfillment.config.api_key}",
          'Content-Type' => 'application/json',
          'Accept' => 'application/json',
        },
        body: serialize_order(order).to_json,
      )
      
      order.update!(
        acme_fulfillment_shipment_id: response.parsed_response['id'],
      )
    end
    
    private
    
    def serialize_order(order)
      {
        # ...
      }
    end
  end
end
```
{% endcode %}

Our event subscriber is pretty simple: it listens to the `order_finalized` event and, when it's fired, it calls the Acme Fulfillment API with the configured API key and the serialized order information. It then parses the API response and sets the `acme_fulfillment_shipment_id` column on the order to the ID returned by the fulfillment partner's API.

{% hint style="warning" %}
In the real world, you'd want to move this block of code to a background job, so that it doesn't unnecessarily slow down your user's HTTP requests with API calls to your fulfillment partner.
{% endhint %}

That's all we needed! The requirements have been satisfied, and it's now time to preview our work. In order to do that, we'll use the **sandbox app.**

### Using the sandbox app

Because extensions are Rails engines, they can't be previewed as easily as we'd do with a customization in our main app, because there's no underlying Rails/Solidus application to run the extension. You could install your extension in an existing Solidus app and preview it there, but this can be slow and cumbersome, especially when you're still actively working on the extension.

Luckily, `solidus_dev_support` provides a Rake task we can run to generate a "sandbox app", i.e. a barebones Rails + Solidus application with our extension already installed and configured. The sandbox app is extremely useful in extension development, and it's important to learn to make the best of it.

To generate the sandbox app, simply run the following command:

```text
$ bin/sandbox
```

The generation might take a couple of minutes, so sit tight and relax! The process will also ask you a few times whether migrations should be run immediately or manually at a later stage — you want to run them immediately, which is also the default selection. This will save you a few seconds of work.

Once the process has completed, you'll find a new `sandbox` directory in the root of your extension. This contains your new shiny sandbox app. Your extension has already been installed and configured inside the app: try looking for the `config/initializers/solidus_acme_fulfillment.rb` initializer.

{% hint style="warning" %}
The sandbox app is ephemeral and intended for development/test purposes only: the sandbox path is ignored by Git, so any changes you make there will be lost permanently if you remove the `sandbox` directory.
{% endhint %}

`solidus_dev_support` also allows you to run commands in your sandbox app from the root of your extension, just as you would do with a regular Rails application. Try spinning up a Rails server:

```text
$ rails server
```

This should boot your sandbox app and serve it at [http://localhost:3000](http://localhost:3000), so that you can preview your extension as you work on it!

{% hint style="info" %}
All `rails` commands will be delegated to the sandbox app.

One exception is the `rails g` /`rails generate` command, which will be run in your extension \(since that's usually the intended behavior\). If you need to run a generator in the sandbox app, you'll have to first `cd` into the `sandbox` directory.

In alternative, you can use `bin/rails-engine` and `bin/rails-sandbox` to force a command to run in the engine or in the sandbox respectively.
{% endhint %}

### Releasing the extension

{% hint style="info" %}
This step is optional, but recommended. You _could_ keep your extension in a private or public GitHub repository and download it directly from there, but you'd miss out on the benefits of properly versioning your extension, which makes it easier to maintain it and upgrade it.
{% endhint %}

* Release the extension on RubyGems
* Release the extension privately on Gemfury

### Installing the extension

* Install the extension in a store
* Show it in action

### Testing via CircleCI

* Show how to configure CircleCI with the Solidus orb
* Show how to add the CircleCI badge

## Extension best practices

### Avoid overrides

### CircleCI configuration

### Make all copy localizable

### Don't touch the frontend

### Support older Solidus versions

### Implement extension points

### Follow semantic versioning

### Keeping up to date with Solidus

