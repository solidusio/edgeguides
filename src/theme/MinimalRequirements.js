import React from 'react';
import RubyIcon from '@site/static/img/ruby.svg';
import RailsIcon from '@site/static/img/rails.svg';

export default function MinimalRequirements(props) {
  return (
    <div class="minimal_requirements">
      <p>Minimal requirements:</p>
      <dl>
        <dt class="minimal_requirements-title__ruby">
          <img src="/img/ruby.svg" alt="Ruby" />
        </dt>
        <dd>v{ props.ruby }</dd>
        <dt class="minimal_requirements-title__rails">
          <img src="/img/rails.svg" alt="Rails" />
        </dt>
        <dd>v{ props.rails }</dd>
      </dl>
    </div>
  );
};
