# Images and Image Processing

Solidus utilizes [MiniMagick](https://github.com/minimagick/minimagick) for [ActiveStorage](https://edgeguides.rubyonrails.org/active_storage_overview.html) and [ImageMagick](https://imagemagick.org/index.php) for [Paperclip](https://github.com/thoughtbot/paperclip#paperclip) to handle the under-the-hood resizing and image processing. After an image is uploaded to a project, it is automatically resized based on when the view requests an image variant "style". The main dictating functions can be found in [adapter](https://github.com/solidusio/solidus/blob/master/core/app/models/concerns/spree/active_storage_adapter/attachment.rb) that controls sizing and the [ActiveStorage](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/image/active_storage_attachment.rb)/[Paperclip](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/image/paperclip_attachment.rb) attachment modules. Solidus is currently in the process of depreciating Paperclip due to ActiveStorage's inclusion with rails.

## Customizing Size Defaults and Attachment Module Override

As you can see from the linked modules above, the default configuration provides only a few variant sizes out of the box. Changing the image sizing is simply a configuration of an attachment module and is referenced when the attachment class method `style_to_size` is called. We could create ourselves a new adapter for our app and override the settings that way, but in this case, we just want to add some new types of sizings for our UI display.

If you are running Solidus 3.1 or later, The most simple and most straight forward way to modify these settings is to append the configuration in our spree initializer.

{% code title="config/initializers/spree.rb" %}
```ruby
# ...
Spree::Config.image_sizes = {
  mini: '48x48>',
  small: '100x100>',
  product: '240x240>',
  large: '600x600>',
  jumbo: '1600x1600>'
}

Spree::Config.image_default = :product
```
{% endcode %}

This will overwrite the default configuration and add Amazing Store's custom sizing to the `:styles` hash.

If you are utilizing versions of solidus that are 3.0 or before, we will have to insert an override to change our defaults or utilize our own ActiveStorageAttachment module. Inserting an override is relatively easy. The default pathing for override files is `app/overrides/`  (this can be changed within your application's `config/application.rb` file should you choose to do so), so we will be appending our `image_style` override there:

{% code title="app/overrides/amazing_store/spree/image/custom_style.rb" %}
```ruby
# ...
module AmazingStore
  module Spree
    module Image
      module CustomStyle
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
}
```
{% endcode %}

Additionally, if further changes to the module are intended, we can simply overwrite the entire ActiveStorageAttachment/PaperclipAttachment modules by creating and alternate override:

{% code title="app/models/amazing_store/spree/image/my_active_storage_attachment.rb" %}
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
{% endtab %}

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

After appending these new styles into settings, they can be utilized in your store by passing the style when rendering the image partial. Ex:

{% code title="" %}
```ruby
<%= render 'spree/admin/shared/image', image: product.gallery.images.first, size: :jumbo %>
```
{% endcode %}

## Modifying Variant Options
### ActiveStorage

MiniMagick allows the processing of variants with many [options](https://github.com/janko/image_processing/blob/master/doc/minimagick.md#imageprocessingminimagick) to customize your images. To take full advantage of these options, we will need to inject our modified method for `variant`. This can be accomplished with an **override** to Spree's current `variant` method utilizing Rail's suggested pattern for [improving engine functionality](https://guides.rubyonrails.org/engines.html#improving-engine-functionality).

Solidus version 3.1 and greater is currently is set up to implement overrides by searching for files located in the overrides' directory found in your application's `root/app` folder. For our new variant method to take precedence, we will need to also instruct our override to `prepend` the attachment class' `variant` method. For Solidus versions below 3.1, the decorators' folder (`root/app/decorators`) is utilized instead. Let's assume all of our pictures are somehow imported upside down and cropped in a different shape. To correct this, we want to rotate all of them to be right side up and framed to the appropriate size when displayed in the view. Additionally, it was decided by your team that you wanted to compress and force convert your images png to reduce load times. This could be implemented by creating our new override with the following:

{% code title="app/overrides/amazing_store/spree/active_storage_adapter/attachment/new_variant.rb" %}
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

Take note that the method resize_and_pad expected an array input which is given by `size`, but the [documentation](https://github.com/janko/image_processing/blob/master/doc/minimagick.md#resize_and_pad) also states that the method expects the user to define what color the padded background will be. Without modifying any other methods, we could utilize the append method on our existing array to provide the required parameters for the method. For more information on methods that can be utilized to customize your image library, please refer to [MiniMagick's documentation](https://github.com/minimagick/minimagick).

### Paperclip

Paperclip utilizes [ImageMagick](https://imagemagick.org/index.php) similarly to the way ActiveStorage utilizes MiniMagick to modify its images. MiniMagick is just a wrapper for the more robust ImageMagick which comes with a [multitude of options](https://imagemagick.org/script/command-line-options.php) to process your images but has less compiled option methods such as `resize_and_pad`.
We can still accomplish the scenario previously mentioned in the ActiveStorage guide above, however, the approach will be slightly different. Instead of modifying an existing class, we will implement our Paperclip attachment module. Despite only needed to modify a few lines of code to process images, we will want to copy and relocate the [entire module](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/image/paperclip_attachment.rb) to our application's directory to ensure proper functionality. This is because we will be telling Rails to ignore Spree's default `PaperclipAttachment` module.

{% code title="app/models/amazing_store/spree/image/my_paperclip_attachment.rb" %}
```ruby
module AmazingStore::Spree::Image::MyPaperclipAttachment
  extend ActiveSupport::Concern
  # include the entire module
  # ...
end
```
{% endcode %}

As can be seen in the the module, the image properties are all contained within `has_attached_file` and therefore the method we would like to target. Before continuing, update `config.image_attachment_module` in `spree.rb` configuration to the newly created module `'AmazingStore::Spree::Image::MyPaperclipAttachment'` so Rails will utilize it!  Implementing the same scenario from ActiveStorage, our new module has_attached_file method would look like:

{% code title="app/models/amazing_store/spree/image/my_paperclip_attachment.rb" %}
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

{% hint style="info" %}
### Customizing MIME Type Validation

Currently, web image MIME types that are accepted by ActiveStorage and Paperclip are limited to png, jpeg, jpg, and gif. Because of this, Solidus checks uploaded image files to make sure they are compatible and will raise an error letting the user know that they can not upload a non-supported format. If you are creating your preview adapter to ActiveStorage or Paperclip, you will also need to ensure that Solidus' MIME type configuration is set to include your desired format. As of Solidus 3.1, this is can be accomplished by simply editing the configuration option in `spree.rb`:

{% code title="config/initializers/spree.rb" %}
```ruby
# ...
Spree::Config.allowed_image_mime_types = %w(image/jpeg image/jpg image/png image/gif your/MIMETYPE).freeze
# ...
```
{% endcode %}
{% endhint %}
