import type {
  ConstArgumentNode,
  ConstDirectiveNode,
  ConstValueNode,
  NameNode,
} from 'graphql';

import { Kind, parseConstValue } from 'graphql';
import type { DirectiveConfig, DirectiveObjectArguments, SingleDirectiveConfig } from '../src/config';
import {
  buildApi,
  buildApiForValibot,
  exportedForTesting,
} from '../src/directive';

const { applyArgToApiSchemaTemplate, buildApiFromDirectiveObjectArguments, buildApiFromDirectiveArguments }
  = exportedForTesting;

function buildNameNode(name: string): NameNode {
  return {
    kind: Kind.NAME,
    value: name,
  }
}

function buildConstArgumentNodes(args: Record<string, string>): ConstArgumentNode[] {
  return Object.entries(args).map(
    ([argName, argValue]): ConstArgumentNode => ({
      kind: Kind.ARGUMENT,
      name: buildNameNode(argName),
      value: parseConstValue(argValue),
    }),
  )
}

function buildConstDirectiveNodes(name: string, args: Record<string, string>): ConstDirectiveNode {
  return {
    kind: Kind.DIRECTIVE,
    name: buildNameNode(name),
    arguments: buildConstArgumentNodes(args),
  }
}

describe('format directive config', () => {
  describe('applyArgToApiSchemaTemplate', () => {
    const cases: {
      name: string
      args: {
        template: string
        apiArgs: any[]
      }
      want: string
    }[] = [
      {
        name: 'string',
        args: {
          template: '$1',
          apiArgs: ['hello'],
        },
        want: `"hello"`,
      },
      {
        name: 'regexp string',
        args: {
          template: '$1',
          apiArgs: ['/hello/g'],
        },
        want: `/hello/g`,
      },
      {
        name: 'number',
        args: {
          template: '$1',
          apiArgs: [10],
        },
        want: '10',
      },
      {
        name: 'boolean',
        args: {
          template: '$1',
          apiArgs: [true],
        },
        want: 'true',
      },
      {
        name: 'eval number',
        args: {
          template: '$1',
          apiArgs: ['10 + 1'],
        },
        want: '11',
      },
      {
        name: 'eval boolean',
        args: {
          template: '$1',
          apiArgs: ['!true'],
        },
        want: 'false',
      },
      {
        name: 'eval template with number',
        args: {
          template: '$1 + 1',
          apiArgs: [10],
        },
        want: '11',
      },
      {
        name: 'eval template with boolean',
        args: {
          template: '$1 && false',
          apiArgs: [true],
        },
        want: 'false',
      },
      {
        name: 'array',
        args: {
          template: '$1',
          apiArgs: [['hello', 'world']],
        },
        want: `"hello","world"`,
      },
      {
        name: 'object',
        args: {
          template: '$1',
          apiArgs: [{ hello: 'world' }],
        },
        want: `{"hello":"world"}`,
      },
      {
        name: 'undefined',
        args: {
          template: '$1',
          apiArgs: ['undefined'],
        },
        want: 'undefined',
      },
      {
        name: 'null',
        args: {
          template: '$1',
          apiArgs: ['null'],
        },
        want: 'null',
      },
      {
        name: 'multiple',
        args: {
          template: '^$1|$2',
          apiArgs: ['hello', 'world'],
        },
        want: `"^hello|world"`,
      },
      {
        name: 'use only $2',
        args: {
          template: '$2$',
          apiArgs: ['hello', 'world'],
        },
        want: `"world$"`,
      },
      {
        name: 'does not match all',
        args: {
          template: '^$1',
          apiArgs: [],
        },
        want: `"^"`,
      },
      {
        name: 'if does not exists index',
        args: {
          template: '$1 $2 $3',
          apiArgs: ['hello', 'world'],
        },
        want: `"hello world "`,
      },
    ];
    for (const tc of cases) {
      it(tc.name, () => {
        const { template, apiArgs } = tc.args;
        const got = applyArgToApiSchemaTemplate(template, apiArgs);
        expect(got).toBe(tc.want);
      });
    }
  });

  describe('buildApiFromDirectiveObjectArguments', () => {
    const cases: {
      name: string
      args: {
        config: DirectiveObjectArguments
        argValue: ConstValueNode
      }
      want: string
    }[] = [
      {
        name: 'simple',
        args: {
          config: {
            uri: 'url',
          },
          argValue: parseConstValue(`"uri"`),
        },
        want: `.url()`,
      },
      {
        name: 'contains in config',
        args: {
          config: {
            uri: ['url', '$2'],
          },
          argValue: parseConstValue(`"uri"`),
        },
        want: `.url()`,
      },
      {
        name: 'does not contains in config',
        args: {
          config: {
            email: ['email', '$2'],
          },
          argValue: parseConstValue(`"uri"`),
        },
        want: ``,
      },
      {
        name: 'const value does not string type',
        args: {
          config: {
            email: ['email', '$2'],
          },
          argValue: parseConstValue(`123`),
        },
        want: ``,
      },
      {
        name: 'function',
        args: {
          config: {
            UNIQUE: () => `.refine((items) => new Set(items).size === items.length])`,
          },
          argValue: parseConstValue(`UNIQUE`),
        },
        want: `.refine((items) => new Set(items).size === items.length])`,
      },
    ];
    for (const tc of cases) {
      it(tc.name, () => {
        const { config, argValue } = tc.args;
        const got = buildApiFromDirectiveObjectArguments(config, argValue);
        expect(got).toBe(tc.want);
      });
    }
  });

  describe('buildApiFromDirectiveArguments', () => {
    const cases: {
      name: string
      args: {
        config: SingleDirectiveConfig
        args: ReadonlyArray<ConstArgumentNode>
      }
      want: string
    }[] = [
      {
        name: 'simple',
        args: {
          config: {
            msg: 'required',
          },
          args: buildConstArgumentNodes({
            msg: `"hello"`,
          }),
        },
        want: `.required("hello")`,
      },
      {
        name: 'string',
        args: {
          config: {
            msg: ['required', '$1'],
          },
          args: buildConstArgumentNodes({
            msg: `"hello"`,
          }),
        },
        want: `.required("hello")`,
      },
      {
        name: 'string with additional stuff',
        args: {
          config: {
            startWith: ['matched', '^$1'],
          },
          args: buildConstArgumentNodes({
            startWith: `"hello"`,
          }),
        },
        want: `.matched("^hello")`,
      },
      {
        name: 'number',
        args: {
          config: {
            minLength: ['min', '$1'],
          },
          args: buildConstArgumentNodes({
            minLength: `1`,
          }),
        },
        want: `.min(1)`,
      },
      {
        name: 'boolean',
        args: {
          config: {
            // @strict(enabled: true)
            enabled: ['strict', '$1'],
          },
          args: buildConstArgumentNodes({
            enabled: `true`,
          }),
        },
        want: `.strict(true)`,
      },
      {
        name: 'list',
        args: {
          config: {
            minLength: ['min', '$1', '$2'],
          },
          args: buildConstArgumentNodes({
            minLength: `[1, "message"]`,
          }),
        },
        want: `.min(1, "message")`,
      },
      {
        name: 'object in list',
        args: {
          config: {
            matches: ['matches', '$1', '$2'],
          },
          args: buildConstArgumentNodes({
            matches: `["hello", {message:"message", excludeEmptyString:true}]`,
          }),
        },
        want: `.matches("hello", {"message":"message","excludeEmptyString":true})`,
      },
      {
        name: 'two arguments but matched to first argument',
        args: {
          config: {
            msg: ['required', '$1'],
          },
          args: buildConstArgumentNodes({
            msg: `"hello"`,
            msg2: `"world"`,
          }),
        },
        want: `.required("hello")`,
      },
      {
        name: 'two arguments but matched to second argument',
        args: {
          config: {
            msg2: ['required', '$1'],
          },
          args: buildConstArgumentNodes({
            msg: `"hello"`,
            msg2: `"world"`,
          }),
        },
        want: `.required("world")`,
      },
      {
        name: 'two arguments matched all',
        args: {
          config: {
            required: ['required', '$1'],
            minLength: ['min', '$1'],
          },
          args: buildConstArgumentNodes({
            required: `"message"`,
            minLength: `1`,
          }),
        },
        want: `.required("message").min(1)`,
      },
      {
        name: 'argument matches validation schema api',
        args: {
          config: {
            format: {
              uri: ['url'],
            },
          },
          args: buildConstArgumentNodes({
            format: `"uri"`,
          }),
        },
        want: `.url()`,
      },
      {
        name: 'argument matched argument but doesn\'t match api',
        args: {
          config: {
            format: {
              uri: ['url'],
            },
          },
          args: buildConstArgumentNodes({
            format: `"uuid"`,
          }),
        },
        want: ``,
      },
      {
        name: 'complex',
        args: {
          config: {
            required: ['required', '$1'],
            format: {
              uri: ['url'],
            },
          },
          args: buildConstArgumentNodes({
            required: `"message"`,
            format: `"uri"`,
          }),
        },
        want: `.required("message").url()`,
      },
      {
        name: 'complex 2',
        args: {
          config: {
            required: ['required', '$1'],
            format: {
              uri: ['url'],
            },
          },
          args: buildConstArgumentNodes({
            required: `"message"`,
            format: `"uuid"`,
          }),
        },
        want: `.required("message")`,
      },
      {
        name: 'function',
        args: {
          config: {
            max: value => `.refine(items => items.length <= ${value})`,
          },
          args: buildConstArgumentNodes({
            max: `10`,
          }),
        },
        want: `.refine(items => items.length <= 10)`,
      },
    ];
    for (const tc of cases) {
      it(tc.name, () => {
        const { config, args } = tc.args;
        const got = buildApiFromDirectiveArguments(config, args);
        expect(got).toStrictEqual(tc.want);
      });
    }
  });

  describe('buildApi', () => {
    const cases: {
      name: string
      args: {
        config: DirectiveConfig
        args: ReadonlyArray<ConstDirectiveNode>
      }
      want: string
    }[] = [
      {
        name: 'valid',
        args: {
          config: {
            required: {
              msg: 'required',
            },
            constraint: {
              minLength: ['min', '$1'],
              format: {
                uri: ['url'],
                email: ['email'],
              },
            },
          },
          args: [
            // @required(msg: "message")
            buildConstDirectiveNodes('required', {
              msg: `"message"`,
            }),
            // @constraint(minLength: 100, format: "email")
            buildConstDirectiveNodes('constraint', {
              minLength: `100`,
              format: `"email"`,
            }),
          ],
        },
        want: `.required("message").min(100).email()`,
      },
      {
        name: 'simple',
        args: {
          config: {
            required: 'required',
          },
          args: [
            // @required()
            buildConstDirectiveNodes('required', {}),
          ],
        },
        want: `.required()`,
      },
      {
        name: 'enum',
        args: {
          config: {
            constraint: {
              format: {
                URI: ['uri'],
              },
            },
          },
          args: [
            // @constraint(format: EMAIL)
            buildConstDirectiveNodes('constraint', {
              format: 'URI',
            }),
          ],
        },
        want: `.uri()`,
      },
      {
        name: 'function',
        args: {
          config: {
            between: (args) => {
              return `.refine(arr => arr.length > ${args.min} && arr.length < ${args.max})`;
            },
          },
          args: [
            // @between(min: 1, max: 99)
            buildConstDirectiveNodes('between', {
              min: `1`,
              max: `99`,
            }),
          ],
        },
        want: `.refine(arr => arr.length > 1 && arr.length < 99)`,
      },
    ];
    for (const tc of cases) {
      it(tc.name, () => {
        const { config, args } = tc.args;
        const got = buildApi(config, args);
        expect(got).toStrictEqual(tc.want);
      });
    }
  });

  describe('buildApiForValibot', () => {
    const cases: {
      name: string
      args: {
        config: DirectiveConfig
        args: ReadonlyArray<ConstDirectiveNode>
      }
      want: string[]
    }[] = [
      {
        name: 'valid',
        args: {
          config: {
            constraint: {
              minLength: ['minLength', '$1'],
              format: {
                uri: ['url'],
                email: 'email',
              },
            },
          },
          args: [
            // @constraint(minLength: 100, format: "email")
            buildConstDirectiveNodes('constraint', {
              minLength: `100`,
              format: `"email"`,
            }),
          ],
        },
        want: [`v.minLength(100)`, `v.email()`],
      },
      {
        name: 'enum',
        args: {
          config: {
            constraint: {
              format: {
                URI: ['uri'],
              },
            },
          },
          args: [
            // @constraint(format: EMAIL)
            buildConstDirectiveNodes('constraint', {
              format: 'URI',
            }),
          ],
        },
        want: [`v.uri()`],
      },
    ];
    for (const tc of cases) {
      it(tc.name, () => {
        const { config, args } = tc.args;
        const got = buildApiForValibot(config, args);
        expect(got).toStrictEqual(tc.want);
      });
    }
  });
});
