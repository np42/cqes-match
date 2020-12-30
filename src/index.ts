import * as Matches from './Matches';

const { MatchAny, MatchMeta, MatchRegexp, MatchEqual, MatchOneOf
      , MatchOneWithSet, MatchAllOf, MatchArrayFit, MatchArrayAnd
      } = Matches;

export { MatchAny, MatchMeta, MatchRegexp, MatchEqual, MatchOneOf
       , MatchOneWithSet, MatchAllOf, MatchArrayFit, MatchArrayAnd
       };

import Skill  from './Skill';
export { Skill };

export * as H from './Heuristic';

export type K  = Matches.Knowledge;
export type PM = Matches.PatternMatching;
export type PC = Matches.PatternConstructor;
