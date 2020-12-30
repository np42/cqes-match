import { Knowledge, MatchAny } from './Matches';

const skills: Knowledge = { String: {}, Object: {} };

skills.String.js = class MatchJS extends MatchAny {
  constructor(knowledge: Knowledge, pattern: string) {
    super(knowledge);
    if (arguments.length < 2) return ;
    this.test = <any>new Function
    ( 'locals'
    , [ 'with (locals) {'
      , '  try { return !!(' + pattern + '); }'
      , '  catch (e) { return false; }'
      , '}'
      ].join('\n')
    );
  }

  public test() {
    return false;
  }
}

export default skills;