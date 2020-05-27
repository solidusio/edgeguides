# Installing Solidus

## System requirements

Solidus requires the following software on the host to run properly:

* [Ruby](https://ruby-lang.org) interpreter: Solidus always supports the oldest maintained Ruby branch.
* [Rails](https://rubyonrails.org): Solidus always supports the oldest maintained Rails version.
* Relational database: the core and the extensions are always tested with [MySQL](https://www.mysql.com) and [PostgreSQL](https://www.postgresql.org), but other relational databases should work as well.
* [ImageMagick](http://imagemagick.org/script/download.php): this is needed for manipulating product images and other assets.

## Gem ecosystem

Solidus has been designed as an ecosystem of independent libraries \(_gems_, in the Ruby world\) that work well in isolation, but collaborate to give you an amazing eCommerce experience when used together. A standard Solidus installation is comprised of the following gems:

* [solidus\_core](https://github.com/solidusio/solidus/tree/master/core): provides the core data models and eCommerce business logic. This is the bare minimum for a Solidus install.
* [solidus\_backend](https://github.com/solidusio/solidus/tree/master/backend): provides the standard Solidus backend, a powerful administrative UI you can use to manage your Solidus store.
* [solidus\_frontend](https://github.com/solidusio/solidus/tree/master/frontend): provides the standard Solidus storefront along with helpers to build your own.
* [solidus\_api](https://github.com/solidusio/solidus/tree/master/api): provides the Solidus REST API. The API is required by the backend, but you may also use it for your own purposes \(e.g. for JS interactions in the storefront\).

For maximum flexibility, you can decide you just want to install specific gems and built the rest of the functionality yourself. Or, if you want the full-fledged Solidus experience, you can install the [solidus](https://github.com/solidusio/solidus) gem, which ties them all together and will give you a complete store. This is the approach we'll be following in this guide.

## Installing Solidus

### In a new app

If you don't have an existing Ruby on Rails application yet, simply create one:

```bash
$ rails new amazing_store --skip-javascript
```

Solidus doesn't require the JavaScript compiler shipped with Rails by default (Webpacker). You are still free to install it and use it in your store, though.

Once you have generated your new Rails application, you can proceed as if you were installing Solidus [in an existing app](what-is-solidus.md#in-an-existing-app).

### In an existing app

If you have an existing Ruby on Rails application, installing Solidus is fairly simple:

{% code title="Gemfile" %}
```ruby
# ...

gem 'solidus'
gem 'solidus_auth_devise'
```
{% endcode %}

Then, install the bundle and configure Solidus:

```bash
$ bundle install
$ bin/rails generate spree:install
```

The installer will prompt you for an admin email and password. You can leave the default \(email: admin@example.com, password: test123\) or enter your own.

Once the installation has completed, you can now start your Rails server:

```bash
$ bin/rails server
```

You should now be able to access your storefront at [http://localhost:3000](http://localhost:3000). You can also access Solidus' admin UI at [http://localhost:3000/admin](http://localhost:3000/admin).

## Upgrading Solidus

With Solidus' maintenance policy, a release will receive security patches and other critical bugfixes for 18 months after it's released to the public. This should give you plenty of time to upgrade to new versions of Solidus before your release reaches its EOL. You can find a list of the currently supported Solidus versions on the [Security](https://solidus.io/security/) page of our website.

Because of the project's focus on stability and backwards compatibility, upgrading Solidus is usually a painless process: minor releases NEVER break public APIs, although they may deprecate APIs that will then be removed in the next major.

When upgrading, look at the [changelog](https://github.com/solidusio/solidus/blob/master/CHANGELOG.md) and make a note of any large refactorings or changes in the public API, then update your app accordingly. You should also make sure to [update any extensions](extensions.md#staying-up-to-date) you have installed, since new releases may have come out to support the new Solidus version or take advantage of new functionality it introduces.

### Ruby and Rails upgrades

Solidus' policy on Ruby and Ruby on Rails support is fairly simple: each release supports up to the oldest Ruby and Rails versions that are still maintained.

Solidus 2.10, for instance, introduced support for Rails 6.0, but it also works with Rails 5.2. As for Ruby, it works with Ruby 2.4 and later, because 2.4 was the oldest maintained version at the time of release. However, you cannot use Rails 6 with Ruby 2.4, which means you will have to upgrade to at least Ruby 2.5 if you want to use Solidus with Rails 6.

When you upgrade Solidus, you should also make sure to upgrade your Ruby and Rails versions to the newest possible versions. Ruby upgrades are usually pretty smooth, while Rails provides amazing [upgrade guides](https://guides.rubyonrails.org/upgrading_ruby_on_rails.html) you can follow.

### Upgrading dependencies

Solidus is just a Rails engine that runs as part of your application, so you should still take care of regularly upgrading any other dependencies in addition to Solidus. There are tools that can help you stay on top of version updates, such as [Dependabot](https://dependabot.com/), but in general the best tool you can employ is a solid suite of automated unit and integration tests that verify the behavior of your application after an upgrade.

### Dealing with deprecations

{% hint style="warning" %}
While it can be tempting to leave calls to deprecated APIs in place and wait for their removal before fixing them, this approach will come back to haunt you when you upgrade to a new major version and find that you need to update tens of method calls that don't work anymore.
{% endhint %}

A special mention goes to deprecations, and how to handle them correctly. The recommended approach is to fix deprecation warnings as soon as they arise. When you upgrade Solidus, run your entire test suite and copy all deprecation warnings to a separate file. In Bash, you can easily do it by running this command from your app's root:

```bash
$ bundle exec rspec 2>deprecations.txt
```

This will save all Solidus deprecations to the `deprecations.txt` file. You will find that this file contains a lot of duplicates, but you may remove them with another command:

```bash
$ cat deprecations.txt | sort | uniq
```

This will output a de-duplicated list of deprecations in your code. Once you have this, just go through the deprecations one by one and fix them, then run your test suite again to ensure your app doesn't contain any deprecated code anymore.

{% hint style="info" %}
In some cases, deprecated code may come from Solidus extensions and not your own app, meaning you can't fix the deprecation yourself. When this happens, you can open an issue in the extension's repository to let the maintainer know that they need to update their extension.
{% endhint %}

