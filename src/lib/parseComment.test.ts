import { parseComment } from './parseComment';
import { PrConfig } from '../models/prConfig';

const defaultRegex = new PrConfig().trigger_comment_regex;

describe('parseComment', () => {
  it('should return a match with the default regex', () => {
    const comments = [
      'buildkite test this',
      'buildkite build this',
      'buildkite test this please',
      'BUILDKITE TEST THIS',
      'test this',
      'build this',
      'buildkite test this\nsome extra context',
      '  buildkite test this ',
    ];

    for (const comment of comments) {
      const result = parseComment(defaultRegex, comment);
      expect(result.match).toBeTruthy();
    }
  });

  it('should return no match with the default regex', () => {
    const comments = ['no buildkite test this', 'yadda\nbuildkite test this', 'just a normal comment', 'buildkite', ''];

    for (const comment of comments) {
      const result = parseComment(defaultRegex, comment);
      expect(result.match).toBeFalsy();
    }
  });

  it('should return a match with named groups', () => {
    const regex = 'buildkite deploy (?<product>[a-z]+) to (?<location>[a-z]+)';
    const comment = 'buildkite deploy Thing to Place';

    const result = parseComment(regex, comment);
    expect(result.match).toBeTruthy();
    expect(result.groups?.product).toBe('Thing');
    expect(result.groups?.location).toBe('Place');
  });
});
