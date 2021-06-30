# Image processing

## Architecture overview

In a typical Solidus store, you can upload images for products and taxons.

Under the hood, Solidus will use a different file processing library depending on the Rails version: [Active Storage](https://edgeguides.rubyonrails.org/active_storage_overview.html) is the default starting from Rails 6.1, while [Paperclip](https://github.com/thoughtbot/paperclip#paperclip) is used in earlier versions.

{% hint style="warning" %}
Active Storage cannot be used in Rails 6.0 or earlier because it doesn't support public URLs, which Solidus needs to serve images to your users. If you're on Rails 6.0 or earlier, you _have_  to use Paperclip.
{% endhint %}

While Paperclip is deprecated and will be removed in the near future, Solidus provides a compatibility layer that abstracts the differences between the two libraries, in order to offer an easier migration path to existing Paperclip users.

## Changing the allowed MIME types

By default, Solidus only accepts PNG, JPEG and GIF images. If you want to accept additional MIME types, e.g. WebP, you can do it via the `allowed_image_mime_types` configuration option:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...
  
  config.allowed_image_mime_types = %w(image/jpeg image/jpg image/png image/gif image/webp).freeze
end
```
{% endcode %}

## Replacing an attachment module

If the change you want to apply cannot be made through the existing configuration options, you can entirely replace the product image or taxon icon attachment module with your own.

This can be useful, for example, if you need to customize your image styles or perform custom post-processing operations on your image such as watermarking, compression, etc.

{% hint style="info" %}
When replacing an attachment module, we recommend copy-pasting the original module first and only changing what you need. The right starting point will depend on whether you're using ActiveStorage or Paperclip. You can find the modules for `Spree::Image` [here](https://github.com/solidusio/solidus/tree/v3.0/core/app/models/spree/image) and the modules for `Spree::Taxon` [here](https://github.com/solidusio/solidus/tree/v3.0/core/app/models/spree/taxon).
{% endhint %}

Here's an example for the product image attachment:

{% code title="app/models/amazing\_store/image\_attachment.rb" %}
```ruby
module AmazingStore
  module ImageAttachment
    # ...
  end
end
```
{% endcode %}

Once you have your custom attachment module, you need to tell Solidus to use it:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...
  config.image_attachment_module = 'AmazingStore::ImageAttachment'
end
```
{% endcode %}

To replace the taxon attachment, follow the same process, but set the `taxon_attachment_module` configuration option instead.

