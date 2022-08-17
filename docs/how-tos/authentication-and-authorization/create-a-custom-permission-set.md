# Create a custom permission set

Let's take it one step further and assume that we also want customer service representatives to be
able to update user profiles, perhaps in case a customer forgets their password and wants a reset.

Since there isn't a permission set that does what we need, we'll need to create our own:

```ruby title="app/models/amazing\_store/permission\_sets/user\_update.rb"
module AmazingStore
  module PermissionSets
    class UserUpdate < Spree::PermissionSets::Base
      def activate!
        can :update, Spree::User
      end
    end
  end
end
```

Now that we have our permission set, the last step is to associate it to the `customer_service` role
by updating the role definition we created:

```ruby title="config/initializers/spree.rb"
Spree.config do |config|
  # ...
  config.roles.assign_permissions :customer_service, [
    Spree::PermissionSets::OrderDisplay,
    Spree::PermissionSets::UserDisplay,
    Spree::PermissionSets::ProductDisplay,
    AmazingStore::PermissionSets::UserUpdate,
  ]
end
```

That's it! Now, customer service representatives can also update user profiles.

:::info

Permission sets delegate a lot of their implementation to CanCanCan, which provides a very powerful
API for defining which actions a user can and cannot perform. For a complete overview of what you
can accomplish, refer to the [CanCanCan documentation](https://github.com/CanCanCommunity/cancancan).

:::

