# Upgrading Solidus

With Solidus' maintenance policy, a release will receive security patches and other critical bug-fixes for 18 months after it's released to the public. This should give you plenty of time to upgrade to new versions of Solidus before your release reaches its EOL. You can find a list of the currently supported Solidus versions on the [Security](https://solidus.io/security/) page of our website.

Because of the project's focus on stability and backwards compatibility, upgrading Solidus is usually a painless process: minor releases NEVER break public APIs, although they may deprecate APIs that will then be removed in the next major.

When upgrading, look at the [changelog](https://github.com/solidusio/solidus/blob/v3.0/CHANGELOG.md) and make a note of any large refactoring or public API changes, then update your app accordingly. You should also make sure to [update any extensions](extensions.md#staying-up-to-date) you have installed, since new releases may have come out to support the new Solidus version or take advantage of new functionality it introduces.

### Ruby and Rails upgrades

Solidus' policy on Ruby and Ruby on Rails support is fairly simple: each release supports up to the oldest Ruby and Rails versions that are still maintained.

Solidus 2.10, for instance, introduced support for Rails 6.0, but it also works with Rails 5.2. As for Ruby, Solidus works with Ruby 2.4 and later, because 2.4 was the oldest maintained version at the time of release. However, you cannot use Rails 6 with Ruby 2.4, which means you will have to upgrade to at least Ruby 2.5 if you want to use Solidus with Rails 6.

When you upgrade Solidus, you should also make sure to upgrade your Ruby and Rails versions to the newest possible versions. Ruby upgrades are usually pretty smooth, while Rails provides amazing [upgrade guides](https://guides.rubyonrails.org/upgrading_ruby_on_rails.html) you can follow.

### Upgrading dependencies

Solidus is just a Rails engine that runs as part of your application, so you should still take care to regularly upgrade any other dependencies in addition to Solidus. There are tools that can help you stay on top of version updates, such as [Dependabot](https://dependabot.com/), but in general the best tool you can employ is a solid suite of automated unit and integration tests that verify the behavior of your application after an upgrade.

### Dealing with deprecations

{% hint style="warning" %}
While it can be tempting to leave calls to deprecated APIs in place and wait for their removal before fixing them, this approach will come back to haunt you when you upgrade to a new major version and find that you need to update dozens of method calls that don't work anymore.
{% endhint %}

It's particularly important to understand how to handle deprecations correctly. The recommended approach is to fix deprecation warnings as soon as they arise. When you upgrade Solidus, run your entire test suite and copy all deprecation warnings to a separate file. In Bash, you can easily do it by running this command from your app's root:

```bash
$ bundle exec rspec 2>deprecations.txt
```

This will save all Solidus deprecations to the `deprecations.txt` file. You will find that this file contains a lot of duplicates, but you may remove them with another command:

```bash
$ cat deprecations.txt | sort | uniq
```

This will output a de-duplicated list of deprecations in your code. Once you have this, just go through the deprecations one by one and fix them. Then run your test suite again to ensure your app doesn't contain any deprecated code.

{% hint style="info" %}
In some cases, deprecated code may come from Solidus extensions and not your own app, meaning you can't fix the deprecation yourself. When this happens, you can open an issue in the extension's repository to let the maintainer know that they need to update their extension.
{% endhint %}

