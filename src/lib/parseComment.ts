export interface ParsedComment {
  comment: string;
  groups?: {
    [key: string]: string;
  };
  match?: string;
}

export const parseComment = (regex: string, fullComment: string, flags = 'i'): ParsedComment => {
  // The original behavior was to always use only the first line of the comment
  // But now that flags can be customized, I think users expect to parse multiple lines when m or s flags are used
  // I would like to take out the first line behavior altogether, but I don't want to break existing triggers
  const comment = flags.includes('s') || flags.includes('m') ? fullComment.trim() : fullComment.split('\n', 1)[0].trim();
  const match = comment.match(new RegExp(regex, flags));

  return {
    comment: comment,
    groups: match?.groups,
    match: match && match[0],
  };
};
