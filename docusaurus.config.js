// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require("prism-react-renderer/themes/github");
const darkCodeTheme = require("prism-react-renderer/themes/dracula");

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: "Solidus",
  tagline: "The open-source eCommerce framework for industry trailblazers.",
  url: "https://docs.solidus.io",
  baseUrl: "/",
  onBrokenLinks: "warn",
  onBrokenMarkdownLinks: "warn",
  favicon: "img/favicon.ico",

  // Even if you don't use internalization, you can use this field to set useful
  // metadata like html lang. For example, if your site is Chinese, you may want
  // to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          sidebarPath: require.resolve("./sidebars.js"),
          routeBasePath: "/",
        },
        theme: {
          customCss: [require.resolve("./src/css/custom.css")],
        },
      }),
    ],
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      colorMode: {
        respectPrefersColorScheme: true,
      },
      navbar: {
        title: "Solidus",
        logo: {
          alt: "Solidus Logo",
          src: "img/logo.svg",
          srcDark: "img/logo-dark.svg",
        },
        items: [
          {
            type: "docsVersionDropdown",
            position: "left",
            dropdownActiveClassDisabled: true,
          },
          {
            href: "https://solidus.io",
            label: "solidus.io",
            position: "right",
          },
          {
            href: "https://solidus.stoplight.io",
            label: "REST API",
            position: "right",
          },
          {
            href: "https://github.com/solidusio/solidus",
            label: "GitHub",
            position: "right",
          },
        ],
      },
      footer: {
        style: "light",
        links: [
          {
            title: "Documentation",
            items: [
              {
                label: "Ruby API",
                to: "https://rubydoc.info/gems/solidus_core",
              },
              {
                label: "REST API",
                to: "https://solidus.stoplight.io",
              },
            ],
          },
          {
            title: "Community",
            items: [
              {
                label: "GitHub",
                href: "https://github.com/solidusio/solidus",
              },
              {
                label: "Slack",
                href: "https://slack.solidus.io",
              },
              {
                label: "Twitter",
                href: "https://twitter.com/solidusio",
              },
              {
                label: "Stack Overflow",
                href: "https://stackoverflow.com/questions/tagged/solidus",
              },
            ],
          },
          {
            title: "More",
            items: [
              {
                label: "Website",
                href: "https://solidus.io",
              },
              {
                label: "Blog",
                href: "https://solidus.io/blog",
              },
            ],
          },
        ],
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
        additionalLanguages: ["ruby", "erb"],
      },
    }),
};

module.exports = config;
