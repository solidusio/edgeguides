# User permissions

## Architecture overview

For authorization management, Solidus uses [CanCanCan](https://github.com/CanCanCommunity/cancancan) \(a fork of the popular, now unmaintained CanCan library\), a Ruby/Rails authorization library that allows you to define granular permissions on collection and individual resources. This is combined with an in-house user role system that allows you to assign certain permissions to certain groups of users.

At a high level, here are the main concepts in the authorization system:

* \*\*\*\*[**The ability**](https://github.com/CanCanCommunity/cancancan#define-abilities) ****is a CanCan class that stores information about the permissions a user has on certain collections or resources, and the conditions under which such permissions must be granted. Solidus has [its own ability class](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/ability.rb) which has some custom logic to support permission sets.
* \*\*\*\*[**Permission sets**](https://github.com/solidusio/solidus/tree/master/core/lib/spree/permission_sets) are Solidus classes that activate certain sets of permissions on the user's ability. For instance, the [`StockManagement`](https://github.com/solidusio/solidus/blob/master/core/lib/spree/permission_sets/stock_management.rb) permission set allows the user to manage stock items and locations. They are a neat way to encapsulate groups of related permissions.
* \*\*\*\*[**The role configuration**](https://github.com/solidusio/solidus/blob/master/core/lib/spree/core/role_configuration.rb) ****is a configuration class that associates user roles \(stored through the [`Spree::RoleUser`](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/role_user.rb) model\) with a collection of permission sets. By default, a Solidus store has two roles: [`default` and `admin`](https://github.com/solidusio/solidus/blob/master/core/lib/spree/app_configuration.rb#L492), which have customer and super-admin permissions respectively.

{% hint style="info" %}
Solidus only uses the [`DefaultCustomer`](https://github.com/solidusio/solidus/blob/master/core/lib/spree/permission_sets/default_customer.rb) and [`SuperUser`](https://github.com/solidusio/solidus/blob/master/core/lib/spree/permission_sets/super_user.rb) permission sets internally: [all the others](https://github.com/solidusio/solidus/tree/master/core/lib/spree/permission_sets) are provided for your own convenience, in case you want to define custom roles with more granular permissions.
{% endhint %}

The process Solidus follows to determine the current user's permissions is pretty simple:

1. If the user is authenticated, it retrieves the current user's roles. If the user isn't authenticated, it assumes the user only has the `default` role.
2. It collects all the permission sets for the user's roles.
3. It applies all the permission sets to the current ability.

This simple but flexible system allows you to create custom permissions and roles, both in extensions and in your main application, as well as do things such as store permission sets in the database rather than in Ruby code, allowing the administrator to change them via the UI.

Let's see how we can leverage some of that flexibility.

## Custom user roles

Let's start with something simple: we'll define a new `customer_service` role that has limited access to the Solidus backend. Customer service representatives will only be able to display users, products and stock locations.

The first step is to create the `Spree::Role` record that we'll use to store our role. In order to do that, you can simply add the following to your seeds:

{% code title="" %}
```ruby
# ...
Spree::Role.where(name: 'customer_service').first_or_create!
```
{% endcode %}

Then, run the seeds:

```bash
$ rails db:seeds
```

Now that you have defined your role, you just need to associate it with the desired permission sets in your Solidus configuration. You can do this in the Solidus initializer:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...
  config.roles.assign_permissions :customer_service, [
    Spree::PermissionSets::OrderDisplay,
    Spree::PermissionSets::UserDisplay,
    Spree::PermissionSets::ProductDisplay,
  ]
end
```
{% endcode %}

Now, if you assign the `customer_service` role to a user and sign into the backend with their credentials, you'll see that you only have limited access to user profiles, orders and products.

## Custom permission sets

Let's take it one step further and assume that we also want customer service representatives to be able to update user profiles, perhaps in case a customer forgets their password and wants a reset.

Since there isn't a permission set that does what we need, we'll need to create our own:

{% code title="app/models/awesome\_store/permission\_sets/user\_update.rb" %}
```ruby
module AwesomeStore
  module PermissionSets
    class UserUpdate < Spree::PermissionSets::Base
      def activate!
        can :update, Spree::User
      end
    end
  end
end
```
{% endcode %}

Now that we have our permission set, the last step is to associate it to the `customer_service` role by updating the role definition we created:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...
  config.roles.assign_permissions :customer_service, [
    Spree::PermissionSets::OrderDisplay,
    Spree::PermissionSets::UserDisplay,
    Spree::PermissionSets::ProductDisplay,
    AwesomeStore::PermissionSets::UserUpdate,
  ]
end
```
{% endcode %}

That's it! Now, customer service representatives can also update user profiles.

{% hint style="info" %}
Permission sets delegate a lot of their implementation to CanCanCan, which provides a very powerful API for defining which actions a user can and cannot perform. For a complete overview of what you can accomplish, refer to the [CanCanCan documentation](https://github.com/CanCanCommunity/cancancan).
{% endhint %}

