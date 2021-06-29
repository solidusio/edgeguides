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

## Replacing an attachment module

Additionally, if further changes to the module are intended, we can simply overwrite the entire ActiveStorageAttachment/PaperclipAttachment modules by creating an alternate override:

{% code title="app/models/amazing\_store/spree/image/my\_active\_storage\_attachment.rb" %}
```ruby
module AmazingStore::Spree::Image::MyActiveStorageAttachment
  extend ActiveSupport::Concern
  include ::Spree::ActiveStorageAdapter

  delegate :width, :height, to: :attachment, prefix: true

  included do
    validates :attachment, presence: true
    validate :attachment_is_an_image
    validate :supported_content_type

    has_attachment :attachment,
                   styles: {
                    mini: '48x48>',
                    small: '400x400>',
                    product: '680x680>',
                    large: '1200x1200>',
                    jumbo: '1600x1600>'
                   },
                   default_style: :product

    def supported_content_type
      unless attachment.content_type.in?(::Spree::Config.allowed_image_mime_types)
        errors.add(:attachment, :content_type_not_supported)
      end
    end
  end
end
```
{% endcode %}

However, to make the module override work, we will also have to instruct Spree to utilize our customized `my_active_storage_attachment` instead of the default:

{% code title="config/initializers/spree.rb" %}
```ruby
Spree.config do |config|
  # ...
  config.image_attachment_module = 'AmazingStore::Spree::Image::ActiveStorageAttachment'
  # ...
end
```
{% endcode %}

#### Customizing MIME Type Validation

Currently, web image MIME types that are accepted by ActiveStorage and Paperclip are limited to png, jpeg, jpg, and gif. Because of this, Solidus checks uploaded image files to make sure they are compatible and will raise an error letting the user know that they can not upload a non-supported format. If you are creating your preview adapter to ActiveStorage or Paperclip, you will also need to ensure that Solidus' MIME type configuration is set to include your desired format. As of Solidus 3.1, this is can be accomplished by simply editing the configuration option in `spree.rb`:

{% code title="config/initializers/spree.rb" %}
```ruby
# ...
Spree::Config.allowed_image_mime_types = %w(image/jpeg image/jpg image/png image/gif your/MIMETYPE).freeze
# ...
```
{% endcode %}

### Modifying Variant Options

#### When Utilizing Active Storage

MiniMagick allows the processing of variants with many [options](https://github.com/janko/image_processing/blob/master/doc/minimagick.md#imageprocessingminimagick) to customize your images. To take full advantage of these options, we will need to inject our modified method for `variant`. This can be accomplished with an **override** to Spree's current `variant` method utilizing Rails' suggested pattern for [improving engine functionality](https://guides.rubyonrails.org/engines.html#improving-engine-functionality).

Utilizing learning examples on **overrides** from [customizing the core guide](customization/customizing-the-core.md#L232) again, we can implement our required changes without duplicating the entire class. Let's assume all of our pictures are somehow imported upside down and cropped in a different shape. To correct this, we want to rotate all of them to be right side up and framed to the appropriate size when displayed in the view. Additionally, it was decided by your team that you wanted to compress and force convert your images png to reduce load times. This could be implemented by creating our new override with the following:

{% code title="app/overrides/amazing\_store/spree/active\_storage\_adapter/attachment/new\_variant.rb" %}
```ruby
module AmazingStore
  module Spree
    module ActiveStorageAdapter
      module Attachment
        module NewVariant

          def variant(style = nil)
            size = style_to_size(style)
            @attachment.variant(
              resize_and_pad: size.append(background: "white"),
              format: :png,
              saver: { quality: 40 },
              rotate: 180,
              strip: true
            ).processed

          end
          ::Spree::ActiveStorageAdapter::Attachment.prepend self
        end
      end
    end
  end
end
```
{% endcode %}

Take note that the method resize\_and\_pad expected an array input which is given by `size`, but the [documentation](https://github.com/janko/image_processing/blob/master/doc/minimagick.md#resize_and_pad) also states that the method expects the user to define what color the padded background will be. Without modifying any other methods, we could utilize the append method on our existing array to provide the required parameters for the method. For more information on methods that can be utilized to customize your image library, please refer to [MiniMagick's documentation](https://github.com/minimagick/minimagick).

#### When Utilizing Paperclip

Paperclip utilizes [ImageMagick](https://imagemagick.org/index.php) similarly to the way Active Storage utilizes MiniMagick to modify its images. MiniMagick is just a wrapper for the more robust ImageMagick which comes with a [multitude of options](https://imagemagick.org/script/command-line-options.php) to process your images but has less compiled option methods such as `resize_and_pad`. We can still accomplish the scenario previously mentioned in the Active Storage guide above, however, the approach will be slightly different. Instead of modifying an existing class, we will implement our Paperclip attachment module. Despite only needed to modify a few lines of code to process images, we will want to copy and relocate the [entire module](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/image/paperclip_attachment.rb) to our application's directory to ensure proper functionality. This is because we will be telling Rails to ignore Spree's default `PaperclipAttachment` module.

{% code title="app/models/amazing\_store/spree/image/my\_paperclip\_attachment.rb" %}
```ruby
module AmazingStore::Spree::Image::MyPaperclipAttachment
  # copy/paste
  # ...
end
```
{% endcode %}

As can be seen in the the module, the image properties are all contained within `has_attached_file` and therefore the method we would like to target. Before continuing, update `config.image_attachment_module` in `spree.rb` configuration to the newly created module `'AmazingStore::Spree::Image::MyPaperclipAttachment'` so Rails will utilize it! Implementing the same scenario from Active Storage, our new module has\_attached\_file method would look like:

{% code title="app/models/amazing\_store/spree/image/my\_paperclip\_attachment.rb" %}
```ruby
module AmazingStore::Spree::Image::MyPaperclipAttachment
    # ...
    has_attached_file :attachment,
                      styles: Spree::Config.product_image_styles,
                      default_style: Spree::Config.product_image_style_default,
                      default_url: 'noimage/:style.png',
                      url: '/spree/products/:id/:style/:basename.:extension',
                      path: ':rails_root/public/spree/products/:id/:style/:basename.:extension',
                      source_file_options: { all: "-compress Zip -quality 40" },
                      convert_options: { all: '-strip -colorspace sRGB -rotate 180 -gravity Center', mini: '-background White -extent 40x40' }
    # ...
end
```
{% endcode %}

Take notice of being able to select which styles you would like to edit and set additional modifications to specific styles for further customization.

