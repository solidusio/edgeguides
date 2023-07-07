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
  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",
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
          editUrl: 'https://github.com/solidusio/edgeguides/tree/main/',
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
      announcementBar: {
        id: 'support_us',
        content:
          'If you are enjoying Solidus, please drop us a star on <a target="_blank" href="https://github.com/solidusio/solidus">GitHub</a>! ⭐️',
        backgroundColor: '#3c76f0',
        textColor: '#fafbfc',
        isCloseable: true,
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
            href: "/",
            label: "Docs",
            position: "left",
          },
          {
            href: "/policies/security",
            label: "Security",
            position: "left",
          },
          {
            href: "/policies/release_policy",
            label: "Releases",
            position: "left",
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
          {
            type: 'docsVersionDropdown',
            position: 'right',
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
              {
                label: "Community Guidelines",
                href: "/policies/community-guidelines",
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
      algolia: {
        appId: 'UBY09X99OB',
        apiKey: '8ad55e50cbf0c0d82709597260065f36',
        indexName: 'edgeguides',
        contextualSearch: false,
      },
    }
  ),
  plugins: [
    [
      '@docusaurus/plugin-content-docs',
      {
        id: 'policies',
        path: 'policies',
        routeBasePath: 'policies',
        sidebarPath: false,
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          {
            to: '/upgrading-solidus',
            from: '/getting-started/upgrading-solidus',
          },
        ],
      },
    ],
  ],
};

module.exports = config;
