# GraphQL API

## GraphQL integration

[GraphQL](https://graphql.org/) provides a query language that allows clients to ask a GraphQL-enabled server for data in whichever shape and structure it needs to consume. The Solidus team officially supports [solidus\_graphql\_api](https://github.com/solidusio-contrib/solidus_graphql_api), an extension adding a GraphQL endpoint to the application.

To use the GraphQL extension, you have to add it to the `Gemfile`:

```ruby
gem 'solidus_graphql_api'
```

After that, remember to run:

```bash
bundle
```

Once done, and after \(re\)starting the rails server, you'll have a new route `POST /graphql` ready to answer your GraphQL queries. E.g.:

```bash
curl -X POST --data '{ "query": "{ currentStore { name }  } "}' -H "Content-Type: application/json" http://localhost:3000/graphql
```

## Solidus' GraphQL playground

We have a dedicated playground that you can use [to learn how to use the GraphQL endpoint on Solidus](http://graphql-playground.solidus.io/). It uses the data on [Solidus' demo application](http://demo.solidus.io/) as the backend.

You can click on the `Docs` tab on the playground to look at the GraphQL schema and discover all the queries and mutations you can perform. If you prefer, you can check the [extension's documentation page](https://solidusio-contrib.github.io/solidus_graphql_api/docs/) instead.

Some of the operations require that you add a header to the request. Look for the `Set Headers` icon on the playground site.

## Demo walkthrough

We're going to walk through a typical flow when interacting with a [Solidus storefront](../customization/creating-your-storefront.md). It will help you get familiar with GraphQL on Solidus. You can use [our playground](graphql-api.md#solidus-graphql-playground) as a development platform.

{% hint style="warning" %}
You can use the playground to test all the points except for the [Authenticated users section](/@nebulab/s/solidus/~/drafts/-MhvyoWa1lwA3GQ8dlpA/advanced-solidus/graphql-api#authenticated-users/@drafts). That's because the demo application uses an on-the-fly user, which is not persisted in the database. For that section, you should use your own application.

For the same reason, understand that the changes you made here won't be visible if you visit [http://demo.solidus.io](http://demo.solidus.io) in the browser, and vice-versa. Both requests are associated with different visitors; therefore, no data will be shared between them.
{% endhint %}

### Listing products

One of the core information you need to present to the customers is what products are available to buy. As you might have a lot, probably it's a good idea to paginate them. Solidus' GraphQL works with Relay's [cursor-based pagination](https://uxdesign.cc/why-facebook-says-cursor-pagination-is-the-greatest-d6b98d86b6c0), where each item gets a unique cursor that you use to get following or previous records. For instance, when implementing forward pagination for products, your first query would look something like the following:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
query listProducts {
  products(first: 5) {
    nodes {
      name
      slug
      masterVariant {
        defaultPrice {
          amount
          currency {
            htmlEntity
          } 
        }
        images {
          nodes {
            smallUrl
          }
        }
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "products": {
      "nodes": [
        {
          "name": "Solidus T-Shirt",
          "slug": "solidus-t-shirt",
          "masterVariant": {
            "defaultPrice": {
              "amount": "19.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/39/small/solidus_tshirt.jpg"
                },
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/40/small/solidus_tshirt_back.jpg"
                }
              ]
            }
          }
        },
        {
          "name": "Solidus Long Sleeve",
          "slug": "solidus-long-sleeve",
          "masterVariant": {
            "defaultPrice": {
              "amount": "19.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/41/small/solidus_long.jpg"
                },
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/42/small/solidus_long_back.jpg"
                }
              ]
            }
          }
        },
        {
          "name": "Solidus Girly",
          "slug": "solidus-girly",
          "masterVariant": {
            "defaultPrice": {
              "amount": "19.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/53/small/solidus_girly.jpg"
                }
              ]
            }
          }
        },
        {
          "name": "Solidus Snapback Cap",
          "slug": "solidus-snapback-cap",
          "masterVariant": {
            "defaultPrice": {
              "amount": "15.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/43/small/solidus_snapback_cap.jpg"
                }
              ]
            }
          }
        },
        {
          "name": "Solidus Hoodie Zip",
          "slug": "solidus-hoodie-zip",
          "masterVariant": {
            "defaultPrice": {
              "amount": "29.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/44/small/solidus_hoodie.jpg"
                }
              ]
            }
          }
        }
      ],
      "pageInfo": {
        "endCursor": "NQ",
        "hasNextPage": true
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

Notice the `first` variable that is being given to the query. It limits the number of records to be fetched to 5. Also, please pay attention to the `endCursor` and `hasNextPage` fields within `pageInfo` as we're going to use them shortly.

Now, take a look at the `Response` tab. Notice that `NQ` value for `pageInfo -> endCursor`. It uniquely identifies the last received product, i.e., `Solidus Hoodie Zip`. On the other hand, `hasNextPage`is telling us that we're not done with the whole list of products. We can get the five following products giving the `endCursor` value to an `after` variable from the same query as before:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
query listProducts {
  products(first: 5, after: "NQ") {
    nodes {
      name
      slug
      masterVariant {
        defaultPrice {
          amount
          currency {
            htmlEntity
          } 
        }
        images {
          nodes {
            smallUrl
          }
        }
      }
    }
    pageInfo {
      endCursor
      hasNextPage
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "products": {
      "nodes": [
        {
          "name": "Ruby Hoodie",
          "slug": "ruby-hoodie",
          "masterVariant": {
            "defaultPrice": {
              "amount": "29.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/45/small/ruby_hoodie.jpg"
                }
              ]
            }
          }
        },
        {
          "name": "Ruby Hoodie Zip",
          "slug": "ruby-hoodie-zip",
          "masterVariant": {
            "defaultPrice": {
              "amount": "29.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/46/small/ruby_hoodie_zip.jpg"
                }
              ]
            }
          }
        },
        {
          "name": "Ruby Polo",
          "slug": "ruby-polo",
          "masterVariant": {
            "defaultPrice": {
              "amount": "26.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/47/small/ruby_polo.jpg"
                },
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/48/small/ruby_polo_back.jpg"
                }
              ]
            }
          }
        },
        {
          "name": "Solidus Mug",
          "slug": "solidus-mug",
          "masterVariant": {
            "defaultPrice": {
              "amount": "9.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/49/small/solidus_mug.jpg"
                }
              ]
            }
          }
        },
        {
          "name": "Ruby Mug",
          "slug": "ruby-mug",
          "masterVariant": {
            "defaultPrice": {
              "amount": "9.99",
              "currency": {
                "htmlEntity": "$"
              }
            },
            "images": {
              "nodes": [
                {
                  "smallUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/50/small/ruby_mug.jpg"
                }
              ]
            }
          }
        }
      ],
      "pageInfo": {
        "endCursor": "MTA",
        "hasNextPage": true
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

We could repeat the process until `hasNextPage` would be `false`.

We can also implement backward pagination if we switch `first` & `after` variables for `last` & `before`, and `endCursor` & `hasNextPage` fields for `startCursor` & `hasPreviousPage`. Relay's spec for cursor-based pagination is mainly intended to be used in infinite-scroll UX and, for now, it [doesn't support bidirectional pagination](https://github.com/graphql/graphql-relay-js/issues/103) \(when paginating forward `hasPreviousPage` is meaningless and vice-versa\).

### Displaying a product

Once we have rendered the list of products, users would typically click on the one they're interested in. We can use its `slug` to display the complete information. For instance, the amazing `Solidus T-Shirt` is really appreciated by customers:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
query getProduct {
  productBySlug(slug: "solidus-t-shirt") {
    name
    description
    variants {
      nodes {
        id
        sku
        position
        prices {
          nodes {
            amount
            currency {
              htmlEntity
            }
          }
        }
        optionValues {
          nodes {
            name
            presentation
          }
        }
        images {
          nodes {
            largeUrl
          }
        }
      }
    }
  }
}

```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "productBySlug": {
      "name": "Solidus T-Shirt",
      "description": "Necessitatibus optio quod ullam itaque quis corporis occaecati. Saepe harum voluptates consectetur rerum dolorum. Corrupti officiis reprehenderit quo excepturi cumque. Soluta eos perspiciatis aut et ea nulla amet dolores. Dolores distinctio nesciunt libero voluptas molestiae consequatur aut veritatis.",
      "variants": {
        "nodes": [
          {
            "id": "U3ByZWU6OlZhcmlhbnQtMTM=",
            "sku": "SOL-00003",
            "position": 3,
            "prices": {
              "nodes": [
                {
                  "amount": "19.99",
                  "currency": {
                    "htmlEntity": "$"
                  }
                }
              ]
            },
            "optionValues": {
              "nodes": [
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "Blue",
                  "presentation": "Blue"
                },
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "Blue",
                  "presentation": "Blue"
                },
                {
                  "name": "Blue",
                  "presentation": "Blue"
                }
              ]
            },
            "images": {
              "nodes": [
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/1/large/solidus_tshirt_blue.png"
                },
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/2/large/solidus_tshirt_back_blue.png"
                }
              ]
            }
          },
          {
            "id": "U3ByZWU6OlZhcmlhbnQtMTQ=",
            "sku": "SOL-00002",
            "position": 5,
            "prices": {
              "nodes": [
                {
                  "amount": "19.99",
                  "currency": {
                    "htmlEntity": "$"
                  }
                }
              ]
            },
            "optionValues": {
              "nodes": [
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "Black",
                  "presentation": "Black"
                },
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "Black",
                  "presentation": "Black"
                }
              ]
            },
            "images": {
              "nodes": [
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/3/large/solidus_tshirt_black.png"
                },
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/4/large/solidus_tshirt_back_black.png"
                }
              ]
            }
          },
          {
            "id": "U3ByZWU6OlZhcmlhbnQtMTU=",
            "sku": "SOL-00004",
            "position": 7,
            "prices": {
              "nodes": [
                {
                  "amount": "19.99",
                  "currency": {
                    "htmlEntity": "$"
                  }
                }
              ]
            },
            "optionValues": {
              "nodes": [
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "Small",
                  "presentation": "S"
                },
                {
                  "name": "White",
                  "presentation": "White"
                },
                {
                  "name": "White",
                  "presentation": "White"
                }
              ]
            },
            "images": {
              "nodes": [
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/5/large/solidus_tshirt_white.png"
                },
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/6/large/solidus_tshirt_back_white.png"
                }
              ]
            }
          },
          {
            "id": "U3ByZWU6OlZhcmlhbnQtMTY=",
            "sku": "SOL-00005",
            "position": 9,
            "prices": {
              "nodes": [
                {
                  "amount": "19.99",
                  "currency": {
                    "htmlEntity": "$"
                  }
                }
              ]
            },
            "optionValues": {
              "nodes": [
                {
                  "name": "Blue",
                  "presentation": "Blue"
                },
                {
                  "name": "Medium",
                  "presentation": "M"
                },
                {
                  "name": "Blue",
                  "presentation": "Blue"
                },
                {
                  "name": "Blue",
                  "presentation": "Blue"
                }
              ]
            },
            "images": {
              "nodes": [
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/7/large/solidus_tshirt_blue.png"
                },
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/8/large/solidus_tshirt_back_blue.png"
                }
              ]
            }
          },
          {
            "id": "U3ByZWU6OlZhcmlhbnQtMTc=",
            "sku": "SOL-00006",
            "position": 11,
            "prices": {
              "nodes": [
                {
                  "amount": "19.99",
                  "currency": {
                    "htmlEntity": "$"
                  }
                }
              ]
            },
            "optionValues": {
              "nodes": [
                {
                  "name": "White",
                  "presentation": "White"
                },
                {
                  "name": "Large",
                  "presentation": "L"
                },
                {
                  "name": "White",
                  "presentation": "White"
                },
                {
                  "name": "Large",
                  "presentation": "L"
                }
              ]
            },
            "images": {
              "nodes": [
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/9/large/solidus_tshirt_white.png"
                },
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/10/large/solidus_tshirt_back_white.png"
                }
              ]
            }
          },
          {
            "id": "U3ByZWU6OlZhcmlhbnQtMTg=",
            "sku": "SOL-00007",
            "position": 13,
            "prices": {
              "nodes": [
                {
                  "amount": "19.99",
                  "currency": {
                    "htmlEntity": "$"
                  }
                }
              ]
            },
            "optionValues": {
              "nodes": [
                {
                  "name": "Black",
                  "presentation": "Black"
                },
                {
                  "name": "Large",
                  "presentation": "L"
                },
                {
                  "name": "Large",
                  "presentation": "L"
                },
                {
                  "name": "Black",
                  "presentation": "Black"
                }
              ]
            },
            "images": {
              "nodes": [
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/11/large/solidus_tshirt_black.png"
                },
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/12/large/solidus_tshirt_back_black.png"
                }
              ]
            }
          },
          {
            "id": "U3ByZWU6OlZhcmlhbnQtMTk=",
            "sku": "SOL-0008",
            "position": 15,
            "prices": {
              "nodes": [
                {
                  "amount": "19.99",
                  "currency": {
                    "htmlEntity": "$"
                  }
                }
              ]
            },
            "optionValues": {
              "nodes": [
                {
                  "name": "Blue",
                  "presentation": "Blue"
                },
                {
                  "name": "Blue",
                  "presentation": "Blue"
                },
                {
                  "name": "Extra Large",
                  "presentation": "XL"
                },
                {
                  "name": "Blue",
                  "presentation": "Blue"
                }
              ]
            },
            "images": {
              "nodes": [
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/13/large/solidus_tshirt_blue.png"
                },
                {
                  "largeUrl": "https://res.cloudinary.com/hl3m5fihu/image/upload/v1/spree/products/14/large/solidus_tshirt_back_blue.png"
                }
              ]
            }
          }
        ]
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

Notice that we're assuming there's not a crazy amount of product variants, nor its nested associations like prices and images. Otherwise, we could paginate those resources as we did before with products.

### Adding a product to the cart

Say a visitor wants to buy two `Solidus T-Shirt`. Before adding the items to the cart, we need to create an order to attach the former to it. We need it so that we can group future additions and keep the state between requests.

Here comes our first GraphQL mutation. Mutations are similar to queries. By convention, they change the server's state. It's the equivalent to `POST`, `PUT`, `PATCH` and `DELETE`HTTP methods on traditional RESTful APIs.

We're going to use the `createOrder` mutation, and we need to make sure it returns the order's `guestToken` so that we can reference it back later. It's a good practice to always ask for `errors` in the mutation to detect any problem.

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation createOrder{
  createOrder(input: {}) {
    order {
      guestToken
      number
      state
    }
    errors {
      path
      message
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "createOrder": {
      "order": {
        "guestToken": "OQAFTjTtIYY1WjgCNyG3rw",
        "number": "R901119678",
        "state": "cart"
      },
      "errors": []
    }
  }
}
```
{% endtab %}
{% endtabs %}

Once we have the token, we need to set it as the value of a `X-Spree-Order-Token`request header. It's going to authenticate the request as coming from the same guest user.

We also need the id of the variant we want to add to the cart. If you look at the response for the product query, you'll see that if we chose the blue/small variant, its identifier corresponds to `U3ByZWU6OlZhcmlhbnQtMTM=`.

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation addToCart {
  addToCart(input: { variantId: "U3ByZWU6OlZhcmlhbnQtMTM=", quantity: 2}) {
    order {
      number
      state
      itemTotal
      total
      lineItems {
        nodes {
          amount
          price
          currency
          quantity
          variant {
            id
          }
          hasSufficientStock
        }
      }
    }
    errors {
      path
      message
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "addToCart": {
      "order": {
        "number": "R901119678",
        "state": "cart",
        "itemTotal": "50.0",
        "total": "50.0",
        "lineItems": {
          "nodes": [
            {
              "amount": 50,
              "price": 25,
              "currency": "USD",
              "quantity": 2,
              "variant": {
                "id": "U3ByZWU6OlZhcmlhbnQtMTM="
              },
              "hasSufficientStock": true
            }
          ]
        }
      },
      "errors": []
    }
  }
}
```
{% endtab %}
{% endtabs %}

We could repeat the process for other items if needed.

### Checkout 1 - Billing & shipping addresses

Once we're done adding items to the cart, we need to transition the checkout process to the next state:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutNextFromCart {
  nextCheckoutState(input: {}) {
    order {
      number
      state
    }
    errors {
      path
      message
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "nextCheckoutState": {
      "order": {
        "number": "R901119678",
        "state": "address"
      },
      "errors": []
    }
  }
}
```
{% endtab %}
{% endtabs %}

Notice that the state changed from `cart` to `address`. That means we need to do a couple of things: associate an email to the order and set the user's shipping & billing addresses.

Let's go first with the email address:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutEmail {
  setOrderEmail(input: { email: "alice@geekmail.com"} ) {
    order {
      number
      state
      email
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "setOrderEmail": {
      "order": {
        "number": "R901119678",
        "state": "address",
        "email": "alice@geekmail.com"
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

All good. Before going with the addresses, we need to fetch country and state ids from our system. Here we have the list of countries:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
query countries {
  countries {
    nodes {
      id
      name
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "countries": {
      "nodes": [
        {
          "id": "U3ByZWU6OkNvdW50cnktMQ==",
          "name": "Andorra"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMg==",
          "name": "United Arab Emirates"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMw==",
          "name": "Afghanistan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNA==",
          "name": "Antigua and Barbuda"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNQ==",
          "name": "Anguilla"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNg==",
          "name": "Albania"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNw==",
          "name": "Armenia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOA==",
          "name": "Angola"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOQ==",
          "name": "Antarctica"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTA=",
          "name": "Argentina"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTE=",
          "name": "American Samoa"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTI=",
          "name": "Austria"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTM=",
          "name": "Australia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQ=",
          "name": "Aruba"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTU=",
          "name": "Åland Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTY=",
          "name": "Azerbaijan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTc=",
          "name": "Bosnia and Herzegovina"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTg=",
          "name": "Barbados"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTk=",
          "name": "Bangladesh"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjA=",
          "name": "Belgium"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjE=",
          "name": "Burkina Faso"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjI=",
          "name": "Bulgaria"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjM=",
          "name": "Bahrain"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQ=",
          "name": "Burundi"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjU=",
          "name": "Benin"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjY=",
          "name": "Saint Barthélemy"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjc=",
          "name": "Bermuda"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjg=",
          "name": "Brunei Darussalam"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjk=",
          "name": "Bolivia, Plurinational State of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzA=",
          "name": "Bonaire, Sint Eustatius and Saba"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzE=",
          "name": "Brazil"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzI=",
          "name": "Bahamas"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzM=",
          "name": "Bhutan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzQ=",
          "name": "Bouvet Island"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzU=",
          "name": "Botswana"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzY=",
          "name": "Belarus"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzc=",
          "name": "Belize"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzg=",
          "name": "Canada"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMzk=",
          "name": "Cocos (Keeling) Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDA=",
          "name": "Congo, The Democratic Republic of the"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDE=",
          "name": "Central African Republic"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDI=",
          "name": "Congo"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDM=",
          "name": "Switzerland"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDQ=",
          "name": "Côte d'Ivoire"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDU=",
          "name": "Cook Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDY=",
          "name": "Chile"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDc=",
          "name": "Cameroon"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDg=",
          "name": "China"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNDk=",
          "name": "Colombia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTA=",
          "name": "Costa Rica"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTE=",
          "name": "Cuba"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTI=",
          "name": "Cabo Verde"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTM=",
          "name": "Curaçao"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTQ=",
          "name": "Christmas Island"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTU=",
          "name": "Cyprus"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTY=",
          "name": "Czechia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTc=",
          "name": "Germany"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTg=",
          "name": "Djibouti"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNTk=",
          "name": "Denmark"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjA=",
          "name": "Dominica"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjE=",
          "name": "Dominican Republic"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjI=",
          "name": "Algeria"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjM=",
          "name": "Ecuador"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjQ=",
          "name": "Estonia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjU=",
          "name": "Egypt"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjY=",
          "name": "Western Sahara"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjc=",
          "name": "Eritrea"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjg=",
          "name": "Spain"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNjk=",
          "name": "Ethiopia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzA=",
          "name": "Finland"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzE=",
          "name": "Fiji"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzI=",
          "name": "Falkland Islands (Malvinas)"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzM=",
          "name": "Micronesia, Federated States of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzQ=",
          "name": "Faroe Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzU=",
          "name": "France"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzY=",
          "name": "Gabon"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzc=",
          "name": "United Kingdom"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzg=",
          "name": "Grenada"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktNzk=",
          "name": "Georgia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODA=",
          "name": "French Guiana"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODE=",
          "name": "Guernsey"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODI=",
          "name": "Ghana"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODM=",
          "name": "Gibraltar"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODQ=",
          "name": "Greenland"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODU=",
          "name": "Gambia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODY=",
          "name": "Guinea"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODc=",
          "name": "Guadeloupe"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODg=",
          "name": "Equatorial Guinea"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktODk=",
          "name": "Greece"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTA=",
          "name": "South Georgia and the South Sandwich Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTE=",
          "name": "Guatemala"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTI=",
          "name": "Guam"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTM=",
          "name": "Guinea-Bissau"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTQ=",
          "name": "Guyana"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTU=",
          "name": "Hong Kong"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTY=",
          "name": "Heard Island and McDonald Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTc=",
          "name": "Honduras"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTg=",
          "name": "Croatia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktOTk=",
          "name": "Haiti"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTAw",
          "name": "Hungary"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTAx",
          "name": "Indonesia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTAy",
          "name": "Ireland"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTAz",
          "name": "Israel"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTA0",
          "name": "Isle of Man"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTA1",
          "name": "India"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTA2",
          "name": "British Indian Ocean Territory"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTA3",
          "name": "Iraq"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTA4",
          "name": "Iran, Islamic Republic of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTA5",
          "name": "Iceland"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTEw",
          "name": "Italy"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTEx",
          "name": "Jersey"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTEy",
          "name": "Jamaica"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTEz",
          "name": "Jordan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTE0",
          "name": "Japan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTE1",
          "name": "Kenya"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTE2",
          "name": "Kyrgyzstan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTE3",
          "name": "Cambodia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTE4",
          "name": "Kiribati"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTE5",
          "name": "Comoros"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTIw",
          "name": "Saint Kitts and Nevis"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTIx",
          "name": "Korea, Democratic People's Republic of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTIy",
          "name": "Korea, Republic of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTIz",
          "name": "Kuwait"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTI0",
          "name": "Cayman Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTI1",
          "name": "Kazakhstan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTI2",
          "name": "Lao People's Democratic Republic"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTI3",
          "name": "Lebanon"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTI4",
          "name": "Saint Lucia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTI5",
          "name": "Liechtenstein"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTMw",
          "name": "Sri Lanka"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTMx",
          "name": "Liberia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTMy",
          "name": "Lesotho"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTMz",
          "name": "Lithuania"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTM0",
          "name": "Luxembourg"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTM1",
          "name": "Latvia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTM2",
          "name": "Libya"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTM3",
          "name": "Morocco"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTM4",
          "name": "Monaco"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTM5",
          "name": "Moldova, Republic of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQw",
          "name": "Montenegro"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQx",
          "name": "Saint Martin (French part)"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQy",
          "name": "Madagascar"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQz",
          "name": "Marshall Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQ0",
          "name": "North Macedonia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQ1",
          "name": "Mali"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQ2",
          "name": "Myanmar"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQ3",
          "name": "Mongolia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQ4",
          "name": "Macao"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTQ5",
          "name": "Northern Mariana Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTUw",
          "name": "Martinique"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTUx",
          "name": "Mauritania"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTUy",
          "name": "Montserrat"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTUz",
          "name": "Malta"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTU0",
          "name": "Mauritius"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTU1",
          "name": "Maldives"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTU2",
          "name": "Malawi"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTU3",
          "name": "Mexico"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTU4",
          "name": "Malaysia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTU5",
          "name": "Mozambique"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTYw",
          "name": "Namibia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTYx",
          "name": "New Caledonia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTYy",
          "name": "Niger"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTYz",
          "name": "Norfolk Island"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTY0",
          "name": "Nigeria"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTY1",
          "name": "Nicaragua"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTY2",
          "name": "Netherlands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTY3",
          "name": "Norway"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTY4",
          "name": "Nepal"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTY5",
          "name": "Nauru"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTcw",
          "name": "Niue"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTcx",
          "name": "New Zealand"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTcy",
          "name": "Oman"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTcz",
          "name": "Panama"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTc0",
          "name": "Peru"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTc1",
          "name": "French Polynesia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTc2",
          "name": "Papua New Guinea"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTc3",
          "name": "Philippines"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTc4",
          "name": "Pakistan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTc5",
          "name": "Poland"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTgw",
          "name": "Saint Pierre and Miquelon"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTgx",
          "name": "Pitcairn"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTgy",
          "name": "Puerto Rico"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTgz",
          "name": "Palestine, State of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTg0",
          "name": "Portugal"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTg1",
          "name": "Palau"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTg2",
          "name": "Paraguay"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTg3",
          "name": "Qatar"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTg4",
          "name": "Réunion"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTg5",
          "name": "Romania"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTkw",
          "name": "Serbia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTkx",
          "name": "Russia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTky",
          "name": "Rwanda"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTkz",
          "name": "Saudi Arabia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTk0",
          "name": "Solomon Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTk1",
          "name": "Seychelles"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTk2",
          "name": "Sudan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTk3",
          "name": "Sweden"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTk4",
          "name": "Singapore"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMTk5",
          "name": "Saint Helena, Ascension and Tristan da Cunha"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjAw",
          "name": "Slovenia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjAx",
          "name": "Svalbard and Jan Mayen"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjAy",
          "name": "Slovakia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjAz",
          "name": "Sierra Leone"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjA0",
          "name": "San Marino"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjA1",
          "name": "Senegal"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjA2",
          "name": "Somalia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjA3",
          "name": "Suriname"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjA4",
          "name": "South Sudan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjA5",
          "name": "Sao Tome and Principe"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjEw",
          "name": "El Salvador"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjEx",
          "name": "Sint Maarten (Dutch part)"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjEy",
          "name": "Syrian Arab Republic"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjEz",
          "name": "Eswatini"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjE0",
          "name": "Turks and Caicos Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjE1",
          "name": "Chad"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjE2",
          "name": "French Southern Territories"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjE3",
          "name": "Togo"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjE4",
          "name": "Thailand"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjE5",
          "name": "Tajikistan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjIw",
          "name": "Tokelau"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjIx",
          "name": "Timor-Leste"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjIy",
          "name": "Turkmenistan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjIz",
          "name": "Tunisia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjI0",
          "name": "Tonga"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjI1",
          "name": "Turkey"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjI2",
          "name": "Trinidad and Tobago"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjI3",
          "name": "Tuvalu"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjI4",
          "name": "Taiwan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjI5",
          "name": "Tanzania, United Republic of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjMw",
          "name": "Ukraine"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjMx",
          "name": "Uganda"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjMy",
          "name": "United States Minor Outlying Islands"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjMz",
          "name": "United States"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjM0",
          "name": "Uruguay"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjM1",
          "name": "Uzbekistan"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjM2",
          "name": "Holy See (Vatican City State)"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjM3",
          "name": "Saint Vincent and the Grenadines"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjM4",
          "name": "Venezuela, Bolivarian Republic of"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjM5",
          "name": "Virgin Islands, British"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQw",
          "name": "Virgin Islands, U.S."
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQx",
          "name": "Vietnam"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQy",
          "name": "Vanuatu"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQz",
          "name": "Wallis and Futuna"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQ0",
          "name": "Samoa"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQ1",
          "name": "Yemen"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQ2",
          "name": "Mayotte"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQ3",
          "name": "South Africa"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQ4",
          "name": "Zambia"
        },
        {
          "id": "U3ByZWU6OkNvdW50cnktMjQ5",
          "name": "Zimbabwe"
        }
      ]
    }
  }
}
```
{% endtab %}
{% endtabs %}

Once users select a country, we want them to select a state from that country.  We can leverage the generic `node` query, which accepts as an argument the id of any resource. `node` returns a `Node`interface, i.e., a polymorphic type. To access the concrete type, we need to pattern match with `... on`GraphQL syntax:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
query states {
  node(id: "U3ByZWU6OkNvdW50cnktMjMz") {
    ... on Country {
      states {
        nodes {
          id
          name
        }
      }
    }
  } 
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "node": {
      "states": {
        "nodes": [
          {
            "id": "U3ByZWU6OlN0YXRlLTM0MzU=",
            "name": "Alabama"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0MzQ=",
            "name": "Alaska"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Mzc=",
            "name": "American Samoa"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Mzg=",
            "name": "Arizona"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0MzY=",
            "name": "Arkansas"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0OTI=",
            "name": "Armed Forces Africa, Canada, Europe, Middle East"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0OTE=",
            "name": "Armed Forces Americas (except Canada)"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0OTM=",
            "name": "Armed Forces Pacific"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Mzk=",
            "name": "California"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDA=",
            "name": "Colorado"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDE=",
            "name": "Connecticut"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDM=",
            "name": "Delaware"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDI=",
            "name": "District of Columbia"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDQ=",
            "name": "Florida"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDU=",
            "name": "Georgia"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDY=",
            "name": "Guam"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDc=",
            "name": "Hawaii"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDk=",
            "name": "Idaho"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTA=",
            "name": "Illinois"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTE=",
            "name": "Indiana"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NDg=",
            "name": "Iowa"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTI=",
            "name": "Kansas"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTM=",
            "name": "Kentucky"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTQ=",
            "name": "Louisiana"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTc=",
            "name": "Maine"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTY=",
            "name": "Maryland"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTU=",
            "name": "Massachusetts"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTg=",
            "name": "Michigan"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NTk=",
            "name": "Minnesota"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NjI=",
            "name": "Mississippi"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NjA=",
            "name": "Missouri"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NjM=",
            "name": "Montana"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NjY=",
            "name": "Nebraska"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NzA=",
            "name": "Nevada"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Njc=",
            "name": "New Hampshire"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Njg=",
            "name": "New Jersey"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Njk=",
            "name": "New Mexico"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NzE=",
            "name": "New York"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NjQ=",
            "name": "North Carolina"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NjU=",
            "name": "North Dakota"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NjE=",
            "name": "Northern Mariana Islands"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NzI=",
            "name": "Ohio"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NzM=",
            "name": "Oklahoma"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NzQ=",
            "name": "Oregon"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NzU=",
            "name": "Pennsylvania"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0NzY=",
            "name": "Puerto Rico"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Nzc=",
            "name": "Rhode Island"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Nzg=",
            "name": "South Carolina"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0Nzk=",
            "name": "South Dakota"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODA=",
            "name": "Tennessee"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODE=",
            "name": "Texas"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODI=",
            "name": "United States Minor Outlying Islands"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODM=",
            "name": "Utah"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODY=",
            "name": "Vermont"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODU=",
            "name": "Virgin Islands"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODQ=",
            "name": "Virginia"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODc=",
            "name": "Washington"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODk=",
            "name": "West Virginia"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0ODg=",
            "name": "Wisconsin"
          },
          {
            "id": "U3ByZWU6OlN0YXRlLTM0OTA=",
            "name": "Wyoming"
          }
        ]
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

We now have everything we need to create the addresses. We'll use the same for both shipping and billing:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutAddress {
  addAddressesToCheckout(
    input: {
      billingAddress: {
        name: "Alice"
        address1: "1 Solidus Road"
        city: "LA"
        countryId: "U3ByZWU6OkNvdW50cnktMjMz"
        zipcode: "65555"
        phone: "111111"
        stateId: "U3ByZWU6OlN0YXRlLTM0Mzk="
      }
      shipToBillingAddress: true
    }
  ) {
    order {
      number
      state
      email
      itemTotal
      adjustmentTotal
      total
      billingAddress {
        name
      }
      shippingAddress {
        name
      }
      adjustments {
        nodes {
          label
          amount
          eligible
        }
      }
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "addAddressesToCheckout": {
      "order": {
        "number": "R901119678",
        "state": "address",
        "email": "alice@geekmail.com",
        "itemTotal": "50.0",
        "adjustmentTotal": "2.5",
        "total": "52.5",
        "billingAddress": {
          "name": "Alice"
        },
        "shippingAddress": {
          "name": "Alice"
        },
        "adjustments": {
          "nodes": [
            {
              "label": "North America 5.000%",
              "amount": "2.5",
              "eligible": true
            }
          ]
        }
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

Pay attention to how $2.5 of adjustments were added to the total. That's because of a 5% tax applied due to the checkout address. It's something configurable from `Settings -> Taxes`in the admin section.

### Checkout 2 - Shipment method

We can proceed now to the next checkout step: introducing the delivery data. Let's use the query to retrieve the available shipping rates for the generated shipment \(be sure to have shipment methods associated with the shipping address. They're configurable from `Settings -> Shipping` in the admin section\):

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutNextFromAddress {
  nextCheckoutState(input: {}) {
    order {
      number
      state
      itemTotal
      adjustmentTotal
      shipmentTotal
      total
      shipments {
        nodes {
          number
          shippingRates {
            nodes {
              id
              cost
              currency
              selected
            }
          }
        }
      }
      adjustments {
        nodes {
          amount
          label
          eligible
        }
      }
    }
    errors {
      path
      message
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "nextCheckoutState": {
      "order": {
        "number": "R901119678",
        "state": "delivery",
        "itemTotal": "50.0",
        "adjustmentTotal": "2.75",
        "shipmentTotal": "5.0",
        "total": "57.75",
        "shipments": {
          "nodes": [
            {
              "number": "H23764807316",
              "shippingRates": {
                "nodes": [
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS00Ng==",
                    "cost": "5.0",
                    "currency": "USD",
                    "selected": true
                  },
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS00Nw==",
                    "cost": "10.0",
                    "currency": "USD",
                    "selected": false
                  },
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS00OA==",
                    "cost": "15.0",
                    "currency": "USD",
                    "selected": false
                  }
                ]
              }
            }
          ]
        },
        "adjustments": {
          "nodes": [
            {
              "amount": "2.5",
              "label": "North America 5.000%",
              "eligible": true
            },
            {
              "amount": "0.25",
              "label": "North America 5.000%",
              "eligible": true
            }
          ]
        }
      },
      "errors": []
    }
  }
}
```
{% endtab %}
{% endtabs %}

We can see that the state changed to `delivery`and that the cheapest shipping rate has been selected by default. Notice it carries with it the same 5% tax adjustment applied to its cost.

We're in a hurry as we want to wear those t-shirts as soon as possible! Let's choose the last shipping rate:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutShipment {
  selectShippingRate(input: { shippingRateId: "U3ByZWU6OlNoaXBwaW5nUmF0ZS00OA==" }) {
    order {
      number
      state
      itemTotal
      adjustmentTotal
      shipmentTotal
      total
      shipments {
        nodes {
          number
          shippingRates {
            nodes {
              id
              cost
              currency
              selected
            }
          }
        }
      }
      adjustments {
        nodes {
          amount
          label
          eligible
        }
      }
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "selectShippingRate": {
      "order": {
        "number": "R901119678",
        "state": "delivery",
        "itemTotal": "50.0",
        "adjustmentTotal": "3.25",
        "shipmentTotal": "15.0",
        "total": "68.25",
        "shipments": {
          "nodes": [
            {
              "number": "H23764807316",
              "shippingRates": {
                "nodes": [
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS00Ng==",
                    "cost": "5.0",
                    "currency": "USD",
                    "selected": false
                  },
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS00Nw==",
                    "cost": "10.0",
                    "currency": "USD",
                    "selected": false
                  },
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS00OA==",
                    "cost": "15.0",
                    "currency": "USD",
                    "selected": true
                  }
                ]
              }
            }
          ]
        },
        "adjustments": {
          "nodes": [
            {
              "amount": "2.5",
              "label": "North America 5.000%",
              "eligible": true
            },
            {
              "amount": "0.75",
              "label": "North America 5.000%",
              "eligible": true
            }
          ]
        }
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

We can check that totals and taxes have been updated accordingly.

### Checkout 3 - Payment method

We're one step closer to complete the checkout, but we still need to drop some money! First, we need to advance to the next step. But we'll take the occasion to retrieve the available payment methods:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutNextFromDelivery {
  nextCheckoutState(input: {}) {
    order {
      number
      state
      total
      availablePaymentMethods {
        id
        name
        description
        position 
      }
    }
    errors {
      path
      message
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "nextCheckoutState": {
      "order": {
        "number": "R901119678",
        "state": "payment",
        "total": "68.25",
        "availablePaymentMethods": [
          {
            "id": "U3ByZWU6OlBheW1lbnRNZXRob2Q6OkJvZ3VzQ3JlZGl0Q2FyZC0y",
            "name": "Credit Card",
            "description": "Bogus payment gateway",
            "position": "2"
          },
          {
            "id": "U3ByZWU6OlBheW1lbnRNZXRob2Q6OkNoZWNrLTM=",
            "name": "Check",
            "description": "Pay by check.",
            "position": "3"
          }
        ]
      },
      "errors": []
    }
  }
}
```
{% endtab %}
{% endtabs %}

Let' use the bogus credit card option to recreate an actual credit card payment but with no real money involved:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutPayment {
  addPaymentToCheckout(
    input: {
      paymentMethodId: "U3ByZWU6OlBheW1lbnRNZXRob2Q6OkJvZ3VzQ3JlZGl0Q2FyZC0y",
      source: {
        number: "4111111111111111",
        name: "Alice",
        expiry: "12/29",
        verification_value: "123"
      }
    }
  ) {
    order {
      number
      state
      payments {
        amount
        state
        paymentSource {
          paymentMethod {
            id
            description
          }
        }
      } 
    }
    errors {
      path
      message
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "addPaymentToCheckout": {
      "order": {
        "number": "R901119678",
        "state": "payment",
        "payments": [
          {
            "amount": "68.25",
            "state": "checkout",
            "paymentSource": {
              "paymentMethod": {
                "id": "U3ByZWU6OlBheW1lbnRNZXRob2Q6OkJvZ3VzQ3JlZGl0Q2FyZC0y",
                "description": "Bogus payment gateway"
              }
            }
          }
        ]
      },
      "errors": []
    }
  }
}
```
{% endtab %}
{% endtabs %}

We can see how the payment information has been associated to the returned order.

### Checkout 4 - Confirm order

We still need to confirm our order. As in the previous states, we need to tell the system that we're ready for the next step:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutNextFromPayment {
  nextCheckoutState(input: {}) {
    order {
      number
      state
    }
    errors {
      path
      message
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "nextCheckoutState": {
      "order": {
        "number": "R901119678",
        "state": "confirm"
      },
      "errors": []
    }
  }
}
```
{% endtab %}
{% endtabs %}

The state has changed to `confirm`, so we can finally complete the checkout:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutConfirm {
  completeCheckout(input: {}) {
    order {
      number
      state
      payments {
        state
      }
    }
    errors {
      path
      message
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "completeCheckout": {
      "order": {
        "number": "R901119678",
        "state": "complete",
        "payments": [
          {
            "state": "pending"
          }
        ]
      },
      "errors": []
    }
  }
}
```
{% endtab %}
{% endtabs %}

Take a look at how the state automatically changed to `complete`. The state for the payment also changed from `checkout` to `pending`, and it'll move again to `completed` automatically or manually by an admin when the money is received. We have nothing else to do and the best part of it is that the Solidus t-shirts are on their way to us!

### Authenticated users

Up to this point, we have gone through the checkout process with a guest user: a visitor whose data \(besides the associated to the order itself\) is not persisted in our system. However, the user model has a `spree_api_key`field, which can be used to identify users between requests. For signing in/up/out, you can rely on external extensions, like [`solidus_jwt`](https://github.com/skukx/solidus_jwt) or [`solidus_auth_devise`](https://github.com/solidusio/solidus_auth_devise).

But let's go back to what interests us now, the GraphQL extension, as quickly as possible. Open a Rails console:

```bash
bin/rails console
```

Then, create a new user, generate its `spree_api_key`and write it down:

```ruby
user = Spree::User.create(email: "joe.doe@geekmail.com", password: "password")
user.generate_spree_api_key
# Copy the output from last line
user.save
```

Going back to your GraphQL client, remove the `X-Spree-Order-Token`header and add instead a new `Authorization`one. Its value must be `Bearer {token}`, where you need to substitute `{token}` by the `spree_api_key`value you generated above.

At some point, you'd ask your user for a default ship address:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation addAddress {
  saveInAddressBook(input: {
    address: {
        name: "Joe Doe"
        address1: "1 E-commerce Rd."
        city: "LA"
        countryId: "U3ByZWU6OkNvdW50cnktMjMz"
        zipcode: "36666"
        phone: "222222"
        stateId: "U3ByZWU6OlN0YXRlLTM0Mzk="
    }
  }) {
    errors {
      path
      message
    }
    user {
      shipAddress {
        name
      }
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "saveInAddressBook": {
      "errors": [],
      "user": {
        "shipAddress": {
          "name": "Joe Doe"
        }
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

The checkout process for a registered user is very similar to what we did before. We'd start once more with a `createOrder` mutation, but this time we don't need the `guestToken` field. Also, we'd add something to the cart through `addToCart`.

This time, there's no need to ask users for an email associated with the order nor their address as we already have them. We can also assume that, in the beginning, users could accept the default shipping method. That allows us to fast-forward the process and leave the order ready to be paid:

{% tabs %}
{% tab title="GraphQL" %}
```graphql
mutation checkoutAdvanceFromCart {
  advanceCheckout(input: {}) {
    order {
      email
      state
      itemTotal
      shipmentTotal
      adjustmentTotal
      shippingAddress {
        name
      }
      shipments {
        nodes {
          number
          shippingRates {
            nodes {
              id
              cost
              currency
              selected
            }
          }
        }
      }
      availablePaymentMethods {
        id
        name
        description
        position
      }
      adjustments {
        nodes {
          label
          amount
          eligible
        }
      }
    }
  }
}
```
{% endtab %}

{% tab title="Response" %}
```javascript
{
  "data": {
    "advanceCheckout": {
      "order": {
        "email": "joe.doe@geekmail.com",
        "state": "confirm",
        "itemTotal": "50.0",
        "shipmentTotal": "5.0",
        "adjustmentTotal": "2.75",
        "shippingAddress": {
          "name": "Joe Doe"
        },
        "shipments": {
          "nodes": [
            {
              "number": "H73242176573",
              "shippingRates": {
                "nodes": [
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS02MQ==",
                    "cost": "5.0",
                    "currency": "USD",
                    "selected": true
                  },
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS02Mg==",
                    "cost": "10.0",
                    "currency": "USD",
                    "selected": false
                  },
                  {
                    "id": "U3ByZWU6OlNoaXBwaW5nUmF0ZS02Mw==",
                    "cost": "15.0",
                    "currency": "USD",
                    "selected": false
                  }
                ]
              }
            }
          ]
        },
        "availablePaymentMethods": [
          {
            "id": "U3ByZWU6OlBheW1lbnRNZXRob2Q6OkJvZ3VzQ3JlZGl0Q2FyZC0y",
            "name": "Credit Card",
            "description": "Bogus payment gateway",
            "position": "2"
          },
          {
            "id": "U3ByZWU6OlBheW1lbnRNZXRob2Q6OkNoZWNrLTM=",
            "name": "Check",
            "description": "Pay by check.",
            "position": "3"
          }
        ],
        "adjustments": {
          "nodes": [
            {
              "label": "North America 5.000%",
              "amount": "2.5",
              "eligible": true
            },
            {
              "label": "North America 5.000%",
              "amount": "0.25",
              "eligible": true
            }
          ]
        }
      }
    }
  }
}
```
{% endtab %}
{% endtabs %}

Nothing forbids us to change the address with `addAddressesToCheckout`mutation, or change the shipping rate with `selectShippingRate`. But, if the user is ok with what it's proposed, we would jump straight into `addPaymentToCheckout` and, again, complete the process with `nextCheckoutState` and `completeCheckout`.

