# Installing Solidus

## System requirements

Solidus requires the following software on the host to run properly:

* [Ruby](https://www.ruby-lang.org) interpreter: Solidus always supports the oldest maintained Ruby branch.
* [Rails](https://www.rubyonrails.org): Solidus always supports the oldest maintained Rails version.
* Relational database: the core and the extensions are always tested with [MySQL](https://www.mysql.com) and [PostgreSQL](https://www.postgresql.org), but other relational databases should work as well.
* [ImageMagick](http://imagemagick.org/script/download.php): this is needed for manipulating product images and other assets.

## Gem ecosystem

Solidus has been designed as an ecosystem of independent libraries \(_gems_, in the Ruby world\) that work well in isolation, but collaborate to give you an amazing eCommerce experience when used together. A standard Solidus installation is composed of the following gems:

* [solidus\_core](https://github.com/solidusio/solidus/tree/master/core): provides the core data models and eCommerce business logic. This is the bare minimum for a Solidus install.
* [solidus\_backend](https://github.com/solidusio/solidus/tree/master/backend): provides the standard Solidus backend, a powerful administrative UI you can use to manage your Solidus store.
* [solidus\_frontend](https://github.com/solidusio/solidus/tree/master/frontend): provides the standard Solidus storefront along with helpers to build your own.
* [solidus\_api](https://github.com/solidusio/solidus/tree/master/api): provides the Solidus REST API. The API is required by the backend, but you may also use it for your own purposes \(e.g. for JS interactions in the storefront\).

For maximum flexibility, you can decide you just want to install specific gems and build the rest of the functionality yourself. Or, if you want the full-fledged Solidus experience, you can install the [solidus](https://github.com/solidusio/solidus) gem, which ties them all together and will give you a complete store. This is the approach we'll be following in this guide.

## Installing Solidus

### In a new app

If you don't have an existing Ruby on Rails application yet, simply create one with Sqlite3 as your database:

```bash
$ rails new amazing_store --skip-javascript
```

Solidus doesn't require the JavaScript compiler shipped with Rails by default \(Webpacker\). You are still free to install it and use it in your store, though.

Once you have generated your new Rails application, you can proceed as if you were installing Solidus [in an existing app](what-is-solidus.md#in-an-existing-app).

### In an existing app

If you have an existing Ruby on Rails application, installing Solidus is fairly simple. In your CLI:

```bash
$ bundle add 'solidus'
$ bin/rails generate solidus:install
```

The installer will prompt you on a few questions before completing the installation. First it will ask if you would like to use the default authentication solution, [Devise](https://github.com/heartcombo/devise), or your implement your own. Next it will ask what payment service you would like to install with solidus.Currently, Solidus comes packaged with [Paypal](https://developer.paypal.com/home) as the default and only option. Other integrated services that you tie into your application can be found and in the payment section of [Solidus extensions](https://solidus.io/extensions/). If you want to skip installing a payment service, just type 'none'. Finally, you will be prompted for an admin email and password. You can leave the default \(email: admin@example.com, password: test123\) or enter your own.

Once the installation has completed, you can now start your Rails server:

```bash
$ bin/rails server
```

You should now be able to access your storefront at [http://localhost:3000](http://localhost:3000). You can also access Solidus' admin UI at [http://localhost:3000/admin](http://localhost:3000/admin).

