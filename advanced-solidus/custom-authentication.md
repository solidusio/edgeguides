# Custom authentication

{% hint style="info" %}
You can use the official [`solidus_auth_devise`  ](https://github.com/solidusio/solidus_auth_devise)gem to provide a `Spree::User` model and basic authentication for Solidus. See its documentation for additional setup instructions.
{% endhint %}

Solidus requires a `User` model in order to take advantage of all its features. This model can have any name, and Solidus can integrate with your application's existing authentication system.

In this guide, we'll explore the steps required to create a `User` model from scratch, use an authentication solution like [Devise ](https://github.com/plataformatec/devise), or integrate your application's existing `User` model.

## Basic requirements

In order to use a custom user model, your model should have:

* **An integer `id` column:** Solidus uses integers for all foreign keys, so you need to use integer IDs in your user model. You may use other types of IDs by changing the types of the foreign key columns, but this is generally discouraged.
* **A `password` attribute:** This is needed if you use the stock `solidus_frontend` or `solidus_backend` gems. You can implement the attribute however you see fit.

This is all you need for now. The rest of the requirements will be implemented in the next steps!

## Preparing your user class

### With the generator

Solidus ships with a generator to prepare and configure your custom user class throughout the application. Just run the following:

```bash
$ rails g spree:custom_user MyStore::User
```

This will do the following:

* Generate a migration to add some required columns to the custom model's table.
* Set `Spree.user_class` to your custom model's class name, so that Solidus knows to use it in association and throughout the store.
* Implement some authentication helpers required by `solidus_backend` and `solidus_frontend` in `lib/spree/authentication_helpers.rb`.

{% hint style="warning" %}
If you use the stock `solidus_frontend` or `solidus_backend` gems, your user class **must** have a `password` column, which will not be added for you by the generator. You can set up a password column however you see fit.
{% endhint %}

At this point, you'll need to migrate your database to add the new columns:

```bash
$ rails db:migrate
```

You may also want to customize the helpers in `lib/spree/authentication_helpers.rb`.

### Without the generator

#### Add the required columns <a id="minimum-requirements"></a>

The first step is to add the columns Solidus expects to the users table:

* `spree_api_key`: a string containing the user's API key. This should be limited to 48 characters.
* `bill_address_id`: an integer containing the ID of the `Spree::Address` that should be used as the user's billing address.
* `ship_address_id`: an integer containing the ID of the `Spree::Address` that should be used as the user's shipping address.

You can easily add these with the following migration:

```bash
$ rails g migration AddAuthColumnsToUsers \
    spree_api_key:string{48} \
    bill_address_id:integer \
    ship_address_id:integer
```

Once the migration has been generated, you can migrate the database:

```bash
$ rails db:migrate
```

#### spree\_current\_user helper <a id="spree-em-current-em-user"></a>

If you use the stock `solidus_frontend` or `solidus_backend` gems, you need to provide a `spree_current_user` helper method in your `ApplicationController`:

{% code title="app/controllers/application\_controller.rb" %}
```ruby
class ApplicationController < ActionController::Base
  helper_method :spree_current_user

  def spree_current_user
    # If your gem already provides a current_user method,
    # you may simply wrap it in spree_current_user. If not,
    # you'll need some additional custom logic here.
    current_user
  end
  
  # ...
end
```
{% endcode %}

#### Add authentication helpers <a id="add-authentication-helpers"></a>

If you use the stock `solidus_frontend` or `solidus_backend` gems, you need to provide authentication helpers so that users can sign up, log in, and log out:

{% code title="app/controllers/application\_controller.rb" %}
```ruby
class ApplicationController < ActionController::Base
  helper_method :spree_login_path
  helper_method :spree_signup_path
  helper_method :spree_logout_path

  def spree_login_path
    login_path
  end

  def spree_signup_path
    signup_path
  end

  def spree_logout_path
    logout_path
  end

  # ...
end
```
{% endcode %}

## Adding Solidus user methods

The [`Spree::UserMethods` module  ](https://github.com/solidusio/solidus/blob/master/core/app/models/concerns/spree/user_methods.rb)provides extensive integration for a `User` model, creating associations and allowing it to interact with major models in Solidus like `Spree::Order`.

To add user methods to your `User` model, include `Spree::UserMethods` :

{% code title="app/models/my\_store/user.rb" %}
```ruby
module MyStore
  class User
    include Spree::UserMethods
    
    # ...
  end
end
```
{% endcode %}

