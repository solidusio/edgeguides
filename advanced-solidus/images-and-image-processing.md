# Image processing

## Architecture overview

In a typical Solidus store, you can upload images for products and taxons.

Under the hood, Solidus will use a different file processing library depending on the Rails version: [Active Storage](https://edgeguides.rubyonrails.org/active_storage_overview.html) is the default starting from Rails 6.1, while [Paperclip](https://github.com/thoughtbot/paperclip#paperclip) is used in earlier versions.

{% hint style="warning" %}
Active Storage cannot be used in Rails 6.0 or earlier because it doesn't support public URLs, which Solidus needs to serve images to your users. If you're on Rails 6.0 or earlier, you _have_  to use Paperclip.
{% endhint %}

While Paperclip is deprecated and will be removed in the near future, Solidus provides a compatibility layer that abstracts the differences between the two libraries, in order to offer an easier migration path to existing Paperclip users.

## Customizing image sizes

By default, Solidus uses the following sizes for images:

* `mini`: 48x48
* `small`: 400x400
* `product`: 680x680
* `large`: 1200x1200

You can access the URL for a specific sizes by calling, e.g. `Spree::Image#url`:

```ruby
image = Spree::Image.first
image.url(:product)
```

If you're building a custom storefront, you may also want to change the sizes of the images in your store. You'll do this in a different way depending on your Solidus version.

{% tabs %}
{% tab title="Solidus <3.0" %}
If you are using Solidus 3.0 or earlier, you'll need to apply an override to `Spree::Image`:

{% code title="app/overrides/amazing\_store/spree/image/customize\_styles.rb" %}
```ruby
module AmazingStore
  module Spree
    module Image
      module CustomizeStyles
        def self.prepended(klass)
          klass.attachment_definitions[:attachment][:styles] = {
            mini: '48x48>',
            small: '400x400>',
            product: '680x680>',
            large: '1200x1200>',
            jumbo: '1600x1600>'
          }
        end
        ::Spree::Image.prepend self
      end
    end
  end
end
```
{% endcode %}
{% endtab %}

{% tab title="Solidus ≥3.1" %}
If you are running Solidus 3.1 or later, the most straightforward way to modify these settings is to add the following to your initializer:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # Change the sizes generated for each product image.
  config.product_image_styles = {
    mini: '48x48>',
    small: '100x100>',
    product: '240x240>',
    large: '600x600>',
    jumbo: '1600x1600>'
  }
  # Change the default size returned by `Spree::Image#url`.
  config.product_image_style_default = :large
  
  # Change the sizes generated for each taxon image.
  config.taxon_image_styles = {
    mini: '32x32>',
    normal: '128x128>',
    large: '200x200>'
  }
  
  # Change the default size returned by `Spree::Taxon#url`.
  config.taxon_image_style_default = :normal
end
```
{% endcode %}
{% endtab %}
{% endtabs %}

Now that you changed your sizes, try getting the URL for your new `jumbo` size or `large` sizes:

```ruby
image = Spree::Image.first
image.url(:jumbo)
taxon = Spree::Taxon.first
taxon.url(:large)
```

Solidus will generate the new sizes and return their URLs!

You can also use your new styles in the `image` partial:

```ruby
<%= render 'spree/admin/shared/image', image: product.gallery.images.first, size: :jumbo %>
```

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

