export interface SerializedRule {
  category:   string;
  criteria:   string;
  context:    string;
  strength?:  number;
  extractor?: string;
  against?:   string;
  scorer?:    string;
}

export interface Rule {
  category:   string;
  criteria:   string;
  context:    string;
  strength:   number;
  extractor:  Function;
  against:    Function;
  scorer:     Function;
}

export interface Namespace {
  [name: string]: any;
}

export type Score = [number, number, Array<Error>];

export function parseRule(input: SerializedRule): Rule {
  const rule: Rule =
    { category: input.category, criteria: input.criteria, context: input.context
    , strength: input.strength > 1 ? input.strength : 1
    , extractor: computeExtractor(input.extractor)
    , against: null
    , scorer: computeScorer(input.scorer)
    };
  rule.against = input.against ? computeExtractor(input.against) : rule.extractor;
  return rule;
}

export function computeExtractor(extractor: string) {
  return new Function('_', 'with (this) { return (' + extractor + ') }');
}

export function computeScorer(scorer: string) {
  const range = /^(\w+):(\d+);(\d+);(\d+)$/.exec(scorer);
  if (range) {
    const [_, type, rawMin, rawRef, rawMax] = range;
    const [min, ref, max] = [Number(rawMin), Number(rawRef), Number(rawMax)];
    switch (type) {
    case 'gaussian': return wrapScore((l: any, r: any) => compareGaussianRange(l, r, min, ref, max));
    default: case 'linear': return wrapScore((l: any, r: any) => compareLinearRange(l, r, min, ref, max));
    }
  } else {
    const fn = new Function('l', 'r', 'with (this) { return (' + (scorer || '0') + ') }');
    return wrapScore(fn);
  }
}

export function wrapScore(fn: Function) {
  return function (l: any, r: any) {
    try {
      const result = fn.call(this, l, r);
      switch (typeof result) {
      case 'number':  return [result, 1, []];
      case 'boolean': return [result ? 1 : 0, 1, []];
      case 'undefined': return [0, 1, []];
      case 'object': default : {
        switch (Object.prototype.toString.call(result)) {
        case '[object Array]': {
          switch (result.length) {
          case 3: default : return result;
          case 2: return [...result, []];
          case 1: return [...result, 1, []];
          case 0: return [0, 1, []];
          }
        }
        case '[object Null]': return [0, 1, []];
        default : return [0, 1, [new Error('Bad result: ' + result)]];
        }
      } break ;
      }
    } catch (e) {
      return [0, 1, [e]];
    }
  };
}

export function compareGaussianRange(l: number, r: number, min: number, ref: number, max: number) {
  const linearValue = compareLinearRange(l, r, min, ref, max);
  const gassianValue = Math.exp(-Math.pow(linearValue, 2));
  return Number(Math.pow(gassianValue, 3).toFixed(3));
};

export function compareLinearRange(l: number, r: number, min: number, ref: number, max: number) {
  const ratio = r / ref;
  const pos = (l / r) - 1;
  if (pos > 0) return pos * (1 / (((max * ratio) / ref) - 1));
  if (pos < 0) return pos * (1 / (1 - ((min * ratio) / ref)));
  return 1;
};

export function execute(rules: Iterable<Rule>, left: any, right: any, namespace: Namespace = {}): Score {
  let score = 0;
  let total = 0;
  const errors = [];
  for (const rule of rules) {
    try {
      const leftValue  = rule.extractor.call(namespace, left);
      const rightValue = rule.against.call(namespace, right);
      const result = rule.scorer.call(namespace, leftValue, rightValue);
      score += (result[0] / result[1]) * rule.strength;
      total += rule.strength;
      errors.push(...result[2]);
    } catch (e) {
      total += rule.strength;
      errors.push(e);
    }
  }
  return [score, total, errors];
}

