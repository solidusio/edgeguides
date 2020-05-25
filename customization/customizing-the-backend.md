# Customizing the backend

## Designing your feature

When adding a feature to the backend UI, it's important that you spend some time designing the ideal UX for your store administrators. There are usually different ways to implement the same feature, and the best approach depends on how store admins use the backend.

In this guide, we'll implement a very simple blacklisting system that allows you to mark certain email addresses as blacklisted and require an admin to manually review and approve any orders placed with that email address.

To simplify the implementation, we'll assume the blacklisted email addresses are stored in an environment variable as a comma-separated string. Here are a couple of user stories we'll use as reference for the feature's requirement:

* Blacklisted orders are flagged automatically.
* Admins can manually approve blacklisted orders.

Without further ado, let's start writing some code!

## Adding new columns

The first step is to add the `blacklisted` column to the `spree_orders` table, which we'll use to determine whether an order has been blacklisted. This is quite simple to do with [a migration](https://guides.rubyonrails.org/active_record_migrations.html):

```bash
$ rails g migration AddBlacklistedToSpreeOrders blacklisted:boolean
$ rails db:migrate
```

This will add the `blacklisted` boolean column to `spree_orders`.

## Hooking into order events

The first step is to flag an order as blacklisted when the email address on the order has been blacklisted. You can do this by creating a class whose job is to analyze an order and determine whether it should be flagged as blacklisted:

{% code title="lib/awesome\_store/order\_analyzer.rb" %}
```ruby
module AwesomeStore
  class OrderAnalyzer
    def analyze(order)
      order.update!(blacklisted: )
    end

    private
    
    def blacklisted_emails
      ENV.fetch('BLACKLISTED_EMAILS', '').split(',')
    end

    def order_blacklisted?(order)
      order.email.in?(blacklisted_emails)
    end
  end
end
```
{% endcode %}

You will then need to subscribe to the `order_finalized` event, which is fired when an order is placed successfully, and call the analyzer:

{% code title="config/initializers/spree.rb" %}
```ruby
# ...
Spree::Event.subscribe 'order_finalized' do |payload|
  AwesomeStore::OrderAnalyzer.new.analyze(payload[:order])
end
```
{% endcode %}

Our new business logic is pretty easy to test in integration:

{% code title="spec/models/spree/order\_spec.rb" %}
```ruby
RSpec.describe Spree::Order do
  describe '#finalize!' do
    before do
      allow(ENV).to receive(:fetch)
        .with('BLACKLISTED_EMAILS', any_args)
        .and_return('jdoe@example.com')
      end
    end

    context 'when the email has been blacklisted' do
      it 'marks the order as blacklisted' do
        order = create(:order_ready_to_complete, email: 'jdoe@example.com')

        order.finalize!

        expect(order).to be_blacklisted
      end
    end

    context 'when the email has not been blacklisted' do
      it 'does not mark the order as blacklisted' do
        order = create(:order_ready_to_complete, email: 'hello@example.com')

        order.finalize!

        expect(order).not_to be_blacklisted
      end
    end
  end
end
```
{% endcode %}

At this point, we have a dead-simple order analyzer that determines whether each new order should be blacklisted or not. Now, we need to allow admins to manually review blacklisted orders and decide whether to reject them or remove them from the blacklist.

## Implementing new actions

In order to allow admins to remove an order from the blacklist, we'll add a button to the order detail page that will trigger a new controller action.

The first step is to add our custom action to `Spree::Admin::OrdersController`. We'll use a decorator to accomplish that:

{% code title="app/decorators/awesome\_store/spree/admin/oders\_controller/add\_remove\_from\_blacklist\_action.rb" %}
```ruby
module AwesomeStore
  module Spree
    module Admin
      module OrdersController
        module AddRemoveFromBlacklistAction
          def remove_from_blacklist
            load_order
            
            @order.update!(blacklisted: false)
            
            redirect_to edit_admin_order_path(@order)
          end

          ::Spree::Admin::OrdersController.prepend self
        end
      end
    end
  end
end
```
{% endcode %}

Now that the controller action has been implemented, we can define a route for it:

{% code title="config/routes.rb" %}
```ruby
# ...
Spree::Core::Engine.routes.draw do
  namespace :admin do
    resources :orders, only: [] do
      member do
        put :remove_from_blacklist
      end
    end
  end
end
```
{% endcode %}

In the next section, we'll see how to hook our custom controller action to a new button in the backend.

## Defacing admin views

We are going to add a "Remove from blacklist" to the order toolbar:

![](../.gitbook/assets/screenshot-solidemo.herokuapp.com-2020.05.18-14_42_32.png)

We are going to use the popular [Deface](https://github.com/spree/deface) gem to apply a patch to the default view. In case you're not familiar with it, Deface is a gem that allows you to "virtually" patch third-party views, meaning you can edit them without having to completely replace them in your application.

{% hint style="info" %}
Just like for the storefront, you can still copy-paste the backend views into your application if you want to override them. However, this approach is quite hard to maintain, since it would prevent you to get any Solidus upgrades to the backend for views that have been overridden. It becomes even more complex when you consider all the different overrides applied to the backend by Solidus extensions. Deface is a declarative, maintainable way of patching backend views while still benefitting from Solidus upgrades.
{% endhint %}

First of all, we need to install Deface by adding it to our `Gemfile`:

{% code title="Gemfile" %}
```ruby
# ...
gem 'deface'
```
{% endcode %}

Once done, we need to identify which view we want to customize. By browsing through the backend's codebase, we can see the view in question is `spree/backend/orders/edit.html.erb`. If we inspect the view's source code, we can also see that we want our button to be included in the content for the `:page_actions` element, so that it's added to the toolbar actions when editing an order.

Equipped with this information, we can now write our Deface override:

{% code title="app/overrides/spree/backend/orders/edit/add\_remove\_from\_blacklist.html.erb.deface" %}
```markup
<!-- insert_after "erb[silent]:contains('content_for :page_actions')" -->
<li>
  <% if @order.blacklisted? %>
    <%= button_to(
      t('spree.remove_from_blacklist'),
      remove_from_blacklist_admin_order_url(@order),
      method: :post,
      class: 'btn btn-primary',
    ) %>
  <% end %>
</li>
```
{% endcode %}

{% hint style="warning" %}
The path of overrides is extremely important: the directory where you put the override **must** match the path of the view you want to customize \(minus the extension\), and the override **must** have the `.html.erb.deface` extension for Deface to apply it correctly. If an override is not getting applied, the first thing you look at should be the path.
{% endhint %}

{% hint style="info" %}
Deface provides a lot of selectors, actions and tools for debugging your overrides — taking the time to understand how to use them correctly will help you a lot when overriding different parts of the backend. You can look at the [Deface documentation](https://github.com/spree/deface) and even at Solidus extensions if you need some inspiration with a tricky override.
{% endhint %}

The last thing we need to do for our button to appear properly is add the `spree.remove_from_blacklist` translation key to our application. We just need to add the key to the `config/locales/en.yml` file in our application, like this:

{% code title="config/locales/en.yml" %}
```yaml
en:
  spree:
    remove_from_blacklist: Remove from blacklist
```
{% endcode %}

{% hint style="info" %}
While it's also possible to hardcode the string in your views/controllers, using Rails' native internationalization features will allow you to write code that is easier to maintain and will make it easier to go global, should you ever need it.
{% endhint %}

{% hint style="info" %}
You can override default Spree translations in the exact same way, if you want to change the default labels or messages in the backend.
{% endhint %}

## Writing a feature test

It's finally time to write a full-fledged feature test to make sure the new button appears and our new functionality works correctly in integration:

{% code title="spec/features/admin/orders/blacklisting\_spec.rb" %}
```ruby
RSpec.describe 'Order blacklisting', :js do
  stub_authorization!

  it 'can be removed from the blacklist' do
    order = create(:completed_order, blacklisted: true)
    visit spree.edit_admin_order_path(order)

    click_button t('spree.remove_from_blacklist')
    order.reload

    expect(order).not_to be_blacklisted
  end
end
```
{% endcode %}

If we did everything well, our test should pass with flying colors!

{% hint style="info" %}
Solidus provides a lot of factories and helper methods to make it quicker for developers to write unit and integration tests. `stub_authorization!` and `:completed_order` are examples of such helpers, but there are many others which you can find by browsing through the tests.
{% endhint %}

## Taking it from here

Congratulations! You have implemented your first custom feature for the Solidus backend.

Of course, we have just scratched the surface of what's possible: the backend provides a lot of UI components and capabilities you may leverage. We suggest spending some time in the backend's codebase to get accustomed with all the different tools at your disposal, and doing some planning/research before every custom feature.

By using a combination of custom controller actions, view overrides and automated tests, you'll be able to write custom admin features that are fully integrated with the Solidus experience, and yet are a joy to maintain and evolve over time.

