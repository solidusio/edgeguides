# Image processing

## Architecture overview

In a typical Solidus store, you can upload taxon icons and product images. Under the hood, Solidus uses the same logic for storing and processing those images.

As of Solidus 3.0, the default file storage system is [Active Storage](https://edgeguides.rubyonrails.org/active_storage_overview.html) with [MiniMagick](https://github.com/minimagick/minimagick). Solidus will continue to support [Paperclip](https://github.com/thoughtbot/paperclip#paperclip) and [ImageMagick](https://imagemagick.org/index.php) in the near future, but will be migrating away from this setup, as Paperclip has been officially depreciated.

No matter your file storage library, Solidus provides an API to customize different aspects of image processing in your store, such as:

* introducing new image sizes;
* performing post-processing operations \(compression, watermarking, etc.\);
* adding support for new file storage libraries.

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

