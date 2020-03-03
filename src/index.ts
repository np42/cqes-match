export interface Knowledge {
  String: { [name: string]: PatternConstructor };
}

export interface PatternConstructor {
  new (knowledge: Knowledge, pattern?: any): PatternMatching;
}

interface Tester { (input: any): boolean; }

export interface PatternMatching { test: Tester; }

export type K  = Knowledge;
export type PM = PatternMatching;
export type PC = PatternConstructor;

export class MatchAny implements PatternMatching {
  public value?: any;

  constructor(knowledge: Knowledge, pattern?: any) {
    if (arguments.length < 2) return ;
    switch (typeof pattern) {
    case 'number': {
      this.value = pattern;
    } break ;
    case 'string': {
      return new MatchMeta(knowledge, pattern);
    } break ;
    case 'function': {
      return { test: <Tester>pattern };
    } break ;
    case 'object': switch (Object.prototype.toString.call(pattern)) {
    case '[object Null]': {
      return { test: (input: any) => input == null };
    } break ;
    case '[object Array]': {
      if (pattern.length === 1 && pattern[0] instanceof Array) {
        return new MatchArrayFit(knowledge, pattern[0]);
      } else {
        return new MatchOneOf(knowledge, pattern);
      }
    } break ;
    case '[object RegExp]': {
      return new MatchRegexp(knowledge, pattern);
    } break ;
    case '[object Object]': {
      if ('$' in pattern && typeof pattern.$ === 'string') {
        throw new Error('Not yet implemented');
      } else {
        return new MatchAllOf(knowledge, pattern);
      }
    } break ;
    default: {
      this.value = pattern;
    } break ;
    } break ;
    }
  }

  public test(input: any) {
    return this.value === input;
  }
}


// "42"
// "Regexp:/test/i"
export class MatchMeta extends MatchAny {
  constructor(knowledge: Knowledge, pattern?: string) {
    super(knowledge);
    if (arguments.length < 2) return ;
    const delimiter = pattern.indexOf(':');
    if (delimiter === -1) {
      this.value = pattern;
    } else {
      const schema = pattern.substr(0, delimiter);
      if (knowledge && knowledge.String && knowledge.String[schema])
        return new knowledge.String[schema](knowledge, pattern.substr(delimiter + 1));
      else if (StringMatch[schema])
        return new StringMatch[schema](knowledge, pattern.substr(delimiter + 1));
      else
        this.value = pattern;
    }
  }
}

// /test/i
export class MatchRegexp extends MatchAny {
  constructor(knowledge: Knowledge, regexp?: string | RegExp) {
    super(knowledge);
    if (arguments.length < 2) return ;
    if (typeof regexp === 'string') {
      const input = regexp;
      const start = 1;
      const end   = input.lastIndexOf(input.charAt(start - 1));
      if (end === -1) throw new Error('Unable to build RegExp');
      try {
        const regexp = new RegExp(input.substring(start, end), input.substr(end + 1));
        if (regexp.global)
          return { test: (input: string) => { regexp.lastIndex = 0; return regexp.test(input); } }
        else
          return regexp;
      } catch (e) {
        console.log(regexp + '\n' + e);
        return { test: (input: any) => false };
      }
    } else if (regexp instanceof RegExp) {
      if (regexp.global)
        return { test: (input: string) => { regexp.lastIndex = 0; return regexp.test(input); } }
      else
        return regexp;
    }
  }
}

// "test"
export class MatchEqual extends MatchAny {
  constructor(knowledge: Knowledge, pattern?: any) {
    super(knowledge);
    if (arguments.length < 2) return ;
  }
}

export const StringMatch = { Regexp: MatchRegexp };

// [1, 2, 3, 'toto', /test/i]
export class MatchOneOf extends MatchAny {
  constructor(knowledge: Knowledge, array?: Array<any>) {
    super(knowledge);
    if (arguments.length < 2) return ;
    const set = [];
    const members = [];
    for (const member of array) {
      const pattern = new MatchAny(knowledge, member);
      if (member == null) set.push(null, undefined);
      else if (pattern.value === member) set.push(member);
      else members.push(pattern);
    }
    if (members.length === 0) {
      if (set.length > 0) return new MatchOneWithSet(knowledge, set);
      else return { test: () => false };
    } else {
      if (set.length > 0) members.unshift(new MatchOneWithSet(knowledge, set));
      this.value = members;
    }
  }

  public test(input: any) {
    for (const pattern of this.value)
      if (pattern.test(input))
        return true;
    return false;
  }
}

// [1, 2, 3, 'toto']
export class MatchOneWithSet extends MatchOneOf {
  constructor(knowledge: Knowledge, array?: Array<any>) {
    super(knowledge);
    if (arguments.length < 2) return ;
    this.value = new Set(array);
  }

  public test(input: any) {
    return this.value.has(input);
  }
}

// { a: 42, b: 'toto', c: /titi/ }
export class MatchAllOf extends MatchAny {
  constructor(knowledge: Knowledge, object?: { [key: string]: any }) {
    super(knowledge);
    if (arguments.length < 2) return ;
    this.value = {};
    for (const key in object)
      this.value[key] = new MatchAny(knowledge, object[key]);
  }

  public test(input: any) {
    if (!input) return false;
    if (typeof input !== 'object') return false;
    for (const key in this.value) {
      if (!(key in input)) return false;
      if (!this.value[key].test(input[key])) return false;
    }
    return true;
  }
}

// [1, 15, 100] against [0, 1, 2, 3, ..., 100] => true
// [15, 1, 100] against [0, 1, 2, 3, ..., 100] => false
export class MatchArrayFit extends MatchAny {
  constructor(knowledge: Knowledge, array?: Array<any>) {
    super(knowledge);
    if (arguments.length < 2) return ;
    throw new Error('Not yet implemented');
  }

  public test(input: any) {
    return false;
  }
}
