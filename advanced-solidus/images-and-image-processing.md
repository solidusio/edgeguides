# Images and Image Processing

Solidus utilizes [MiniMagick](https://github.com/minimagick/minimagick) for [ActiveStorage](https://edgeguides.rubyonrails.org/active_storage_overview.html) and [ImageMagick](https://imagemagick.org/index.php) for [Paperclip](https://github.com/thoughtbot/paperclip#paperclip) to handle the under-the-hood resizing and image processing. After an image is uploaded to a project, it is automatically resized based on when the view requests an image variant "style". The main dictating functions can be found in [adapter](https://github.com/solidusio/solidus/blob/master/core/app/models/concerns/spree/active_storage_adapter/attachment.rb) that controls sizing and the [ActiveStorage](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/image/active_storage_attachment.rb)/[Paperclip](https://github.com/solidusio/solidus/blob/master/core/app/models/spree/image/paperclip_attachment.rb) attachment modules. Solidus is currently in the process of depreciating Paperclip due to ActiveStorage's inclusion with rails.

## Customizing Size Defaults and Attachment Module Override

As you can see from the linked modules above, the default configuration provides only a few variant sizes out of the box. Changing the image sizing is simply a configuration of an attachment module and is referenced when the attachment class method `style_to_size` is called. We could create ourselves a new adapter for our app and override the settings that way, but in this case, we just want to add some new types of sizings for our UI display.
>>>>>>> 957cafb (Added guide to changing image size defaults)

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
## Customizing MIME Type Validation

Currently, web image MIME types that are accepted by ActiveStorage and Paperclip are limited to png, jpeg, jpg, and gif. Because of this, Solidus checks uploaded image files to make sure they are compatible and will raise and error letting the user know that they can not upload a non-supported format. If you are creating your own preview adapter to ActiveStorage or Paperclip, you will also need to ensure that Solidus' MIME type configuration is set to include your desired format. This is can be accomplished by simply editing the configuration option in `spree.rb`:

{% code title="config/initializers/spree.rb" %}
```ruby
# ...
Spree::Config.allowed_image_mime_types = %w(image/jpeg image/jpg image/png image/gif your/MIMETYPE).freeze
# ...
```
{% endcode %}

