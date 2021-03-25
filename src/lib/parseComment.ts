export interface ParsedComment {
  comment: string;
  groups?: {
    [key: string]: string;
  };
  match?: string;
}

export const parseComment = (regex: string, fullComment: string): ParsedComment => {
  const comment = fullComment.split('\n', 1)[0].trim();
  const match = comment.match(new RegExp(regex, 'i'));

  return {
    comment: comment,
    groups: match?.groups,
    match: match && match[0],
  };
};
