# Deploying your store

## Choosing a cloud provider

Deploying a Solidus application to production is no different from deploying any other Rails application. You can pick from a number of infrastructure providers. Our favorites are:

* [Heroku](https://heroku.com/): Infrastructure-as-a-Service provider built on top of AWS. Incredibly easy to set up and work with, and arguably the most popular option for deploying Rails applications.
* [AWS ECS](https://aws.amazon.com/ecs/): container orchestration service provided by AWS. Recommended if you need an advanced setup, or expect to scale aggressively very quickly after launch.
* [DigitalOcean](https://digitalocean.com): developer cloud solutions provider. You can buy plain old VPS, or Kubernetes clusters.

For further instructions, we recommend referring to the official documentation for these services.

## External dependencies

When deploying a Solidus store, there are also a few external dependencies that you need to provide in order for your store to work properly.

### File storage

When you run Solidus locally or on a single node, any files you upload \(product images, taxon icons etc.\) are stored on the filesystem. While this works great in development, it's not a viable option when deploying to cloud platforms, where clustering may cause files in one node not to be accessible by all other nodes. You may also find that files disappear when a node reboots because of [ephemeral filesystems](https://devcenter.heroku.com/articles/dynos#ephemeral-filesystem).

When running your store in production, you will have to rely on a file storage service such as [Amazon S3](https://aws.amazon.com/s3/) or [Microsoft Azure Storage Service](https://azure.microsoft.com/en-us/services/storage/). Files will be uploaded to the storage service, which will also handle concerns such as high availability, security and distribution.

#### Active Storage

Solidus supports a multitude storage services out of the box through Rails' [Active Storage](https://edgeguides.rubyonrails.org/active_storage_overview.html) framework.

To configure Active Storage, change `config/storage.yml` by uncommenting your preferred storage services and setting its credentials. In the following example, we store our files in an S3 bucket:

{% code title="config/storage.yml" %}
```ruby
amazon:
  storage: :s3
  bucket: <%= ENV.fetch('S3_BUCKET') %>
  s3_host_name: <%= ENV.fetch('S3_HOST_NAME') %>
  s3_credentials:{
    access_key_id: <%= ENV.fetch('S3_ACCESS_KEY_ID') %>
    secret_access_key: <%= ENV.fetch('S3_SECRET_ACCESS_KEY') %>
    region: <%= ENV.fetch('S3_REGION') %>
  }
```
{% endcode %}

Next, you'll need to configure Rails to use your new Active Storage service in production:

{% code title="config/environment/production.rb" %}
```ruby
Rails.application.configure do
  # ...
  
  config.active_storage.service = :amazon
end
```
{% endcode %}

Finally, store your S3 credentials in the environment variables used in `config/storage.yml`.

#### Paperclip

{% hint style="warning" %}
Paperclip [has been deprecated](https://github.com/thoughtbot/paperclip#deprecated) in favor of [Active Storage](https://guides.rubyonrails.org/active_storage_overview.html). You should only use Paperclip with Rails 6.0 or earlier, where Active Storage does not support public URLs and cannot be used with Solidus applications.
{% endhint %}

Solidus also supports the popular [Paperclip](https://github.com/thoughtbot/paperclip) gem. In order to configure Paperclip, just create an initializer like the following:

{% code title="config/initializers/paperclip.rb" %}
```ruby
if Rails.env.production?
  Paperclip::Attachment.default_options.merge!(
    storage: :s3,
    bucket: ENV.fetch('S3_BUCKET'),
    s3_host_name: ENV.fetch('S3_HOST_NAME'),
    s3_credentials: {
      access_key_id: ENV.fetch('S3_ACCESS_KEY_ID'),
      secret_access_key: ENV.fetch('S3_SECRET_ACCESS_KEY'),
      s3_region: ENV.fetch('S3_REGION'),
    }
  )
end
```
{% endcode %}

Finally, put your S3 credentials in the environment variables used in the initializer.

### Cache store

Solidus employs [fragment caching](https://guides.rubyonrails.org/caching_with_rails.html#fragment-caching) and [low-level caching](https://guides.rubyonrails.org/caching_with_rails.html#low-level-caching) extensively throughout the storefront and API views. By default, Rails uses an in-memory cache adapter in production. This essentially makes all caching useless if you are running Solidus across multiple nodes, since the cache is not shared across instances.

Therefore, instead of the default adapter you should instead rely on an actual caching system. Popular options in the Rails ecosystem are [memcached](https://memcached.org/) and [Redis](https://redis.io/).

The procedure for configuring your cache store with Solidus is no different from doing it in a regular Rails application. Refer to the [Rails caching guide](https://guides.rubyonrails.org/caching_with_rails.html#activesupport-cache-memcachestore) for more details and recommendations on how to properly set up your caching server.

### Async operations

Solidus schedules certain time-intensive operations in the background. This provides faster feedback to the user and avoids blocking the Web process for too long. The most common examples are transactional emails. When an email needs to be delivered to the user, Solidus will enqueue the operation rather than executing it immediately. This operation will then be run in the background by [ActiveJob](https://guides.rubyonrails.org/active_job_basics.html).

The default ActiveJob adapter is [Async](https://api.rubyonrails.org/classes/ActiveJob/QueueAdapters/AsyncAdapter.html), which uses an in-process thread pool to schedule jobs. While Async is a good choice for local development and testing, it is a poor option for production deployments, as any pending jobs are dropped when the process restarts \([Heroku restarts dynos automatically every 24 hours](https://devcenter.heroku.com/articles/dynos#automatic-dyno-restarts), for instance\).

Instead, you should use a production-grade queue such as [Sidekiq](https://github.com/mperham/sidekiq), which uses Redis for storing and retrieving your application's jobs under the hood. Using Sidekiq with ActiveJob is simple.

First of all, install Sidekiq by adding it to your `Gemfile`:

```bash
bundle add 'sidekiq'
```

Next, tell ActiveJob to use Sidekiq for queueing and running jobs:

{% code title="config/application.rb" %}
```ruby
module AmazingStore
  class Application < Rails::Application
    # ...
    config.active_job.queue_adapter = :sidekiq
  end
end
```
{% endcode %}

That's it! Solidus will now use Sidekiq and Redis for all asynchronous processing. You may refer to the [Sidekiq documentation](https://github.com/mperham/sidekiq) and [ActiveJob documentation](https://guides.rubyonrails.org/active_job_basics.html) for advanced configuration.

### Content delivery network

It is strongly recommended to serve static assets via a [Content Delivery Network \(CDN\)](https://it.wikipedia.org/wiki/Content_Delivery_Network) rather than your own application. CDNs are a relatively simple and efficient way to instantaneously boost the performance of your application, and are widely used in Web development.

As with many other tasks, configuring a CDN for Solidus is the same as configuring it for a regular Rails application, so you can refer to the Rails guides on [configuring a CDN](https://guides.rubyonrails.org/asset_pipeline.html#cdns).

There are many reliable CDNs, with the most popular being [Amazon CloudFront](https://aws.amazon.com/it/cloudfront/).

### Email delivery

In order to send emails, Solidus needs a valid SMTP server. While you could use your domain registrar's mail server, it is usually recommended to use a more robust and feature-complete solution that will also provide useful insights and business metrics like deliverability, open, and click-through rates.

[SendGrid](https://sendgrid.com/), [Mailgun](https://www.mailgun.com/) and [Mailchimp](https://mailchimp.com/features/transactional-email/) are all very good, battle-tested solutions for delivering transactional emails to your customers, but you are free to use any other service you wish.

Most of these services provide a regular SMTP server you can use to deliver emails, which you can configure in Rails. Here's an example configuration for SendGrid:

{% code title="config/application.rb" %}
```ruby
module AmazingStore
  class Application < Rails::Application
    # ...
    config.action_mailer.smtp_settings = {
      user_name: ENV.fetch('SENDGRID_USERNAME'),
      password: ENV.fetch('SENDGRID_PASSWORD'),
      domain: ENV.fetch('SENDGRID_DOMAIN'),
      address: 'smtp.sendgrid.net',
      port: 465,
      authentication: :plain,
      enable_starttls_auto: true,
    }
  end
end
```
{% endcode %}

You should then configure the `SENDGRID_USERNAME`, `SENDGRID_PASSWORD` and `SENDGRID_DOMAIN` environment variables with your SendGrid credentials.

