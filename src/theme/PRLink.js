import React from 'react';
import PRIcon from '@site/static/img/pr.png';

export default function PRLink({number, children}) {
  return (
    <a class="pull_request" href={ `https://github.com/solidusio/solidus/pull/${ number }` }>
      { children }
    </a>
  );
};
