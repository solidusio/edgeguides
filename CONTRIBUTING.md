# Contributing Guidelines

Thank you for considering contributing to our documentation project! We appreciate
your efforts in helping us improve and expand our documentation. To ensure a smooth
and consistent contribution process, please review the following guidelines before
submitting your contribution.

1. Familiarize yourself with the project's documentation structure, style, and content.
You can find our documentation in the `docs/` directory.

2. When creating new guides or making updates, we strongly encourage you to use the
**Diátaxis** framework. Diátaxis provides a standardized format and set of tools for
creating documentation, ensuring consistency across our guides. You can find more
information about Diátaxis and how to use it in the [Diátaxis Documentation](https://diataxis.fr/).

3. If you encounter any issues or have questions related to writing or updating a guide, please
reach out in the [Solidus Slack workspace](http://slack.solidus.io/).

4. Before submitting your contribution, please ensure the following:

   - Your guides are well-structured, clear, and concise.
   - You have checked your spelling and grammar.
   - All code examples are accurate and follow our established conventions.
   - Your contribution adheres to the project's content and style guidelines.

## Submitting a Contribution

1. Fork the repository and create a new branch for your contribution.
2. Make your changes or additions, focusing on the documentation improvements.
3. Commit your changes and provide a clear and descriptive commit message.
4. Push your changes to your forked repository.
5. Open a pull request (PR) against the `main` branch of our repository.
6. Our team will review your PR, provide feedback if necessary, and work with you to address any required changes.
7. Once your contribution has been approved and meets our guidelines, it will be merged into the main repository.

## Some general guidelines
1. Avoid introducing new libraries into starter-frontend and avoid heavy libraries such as jquery, clean javascript is preferred.
2. If you work on extensions that impact the starter-frontend align with the design language, do not introduce new icon sets. 

## Versioned Doc

Our documentation is versioned, which means that each Solidus version has a different version of the guides, which users can navigate based on the Solidus version they are using. If the guide page you are adding or updating needs to be backported to other versions of the documentation, please use the related [instructions in the README](https://github.com/solidusio/edgeguides#versions).

## Migrate old pages to Diátaxis

If you don't have any specific guide to add or update, but you still want to contribute, we suggest to help by
updating an existing page to the Diátaxis framework. You can recognize the pages that need this migration because they have a frontmatter metatag called `needs-diataxis-rewrite` with the value set to `true`.

## Thank You

We greatly appreciate your contribution to our documentation project. Your efforts help us create a valuable
resource for our community. If you have any questions or need further assistance, please don't hesitate to
reach out to us.

Happy documenting!
