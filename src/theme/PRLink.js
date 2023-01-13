import React from 'react';
import PRIcon from '@site/static/img/pr.png';

export default function PRLink(props) {
  return (
    <a class="pull_request" href={ `https://github.com/solidusio/solidus/pull/${ props.number }` }>
      { props.description }
    </a>
  );
};
