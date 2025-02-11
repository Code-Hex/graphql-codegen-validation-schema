import { buildClientSchema, buildSchema, introspectionFromSchema } from 'graphql';
import dedent from 'ts-dedent';

import { plugin } from '../src/index';

const initialEmitValue = dedent(`
  export const definedNonNullAnySchema = myzod.object({});


  `)

function removedInitialEmitValue(content: string) {
  return content.replace(initialEmitValue, '');
}

describe('myzod', () => {
  it('non-null and defined', async () => {
    const schema = buildSchema(`
      input PrimitiveInput {
        a: ID!
        b: String!
        c: Boolean!
        d: Int!
        e: Float!
      }
    `);
    const result = await plugin(schema, [], {
      schema: 'myzod',
      scalars: {
        ID: 'string',
      },
    }, {});
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as myzod from 'myzod'",
      ]
    `);
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function PrimitiveInputSchema(): myzod.Type<PrimitiveInput> {
        return myzod.object({
          a: myzod.string(),
          b: myzod.string(),
          c: myzod.boolean(),
          d: myzod.number(),
          e: myzod.number()
        })
      }
      "
    `)
  });

  it('nullish', async () => {
    const schema = buildSchema(`
      input PrimitiveInput {
        a: ID
        b: String
        c: Boolean
        d: Int
        e: Float
        z: String! # no defined check
      }
    `);
    const result = await plugin(schema, [], {
      schema: 'myzod',
      scalars: {
        ID: 'string',
      },
    }, {});
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as myzod from 'myzod'",
      ]
    `);
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function PrimitiveInputSchema(): myzod.Type<PrimitiveInput> {
        return myzod.object({
          a: myzod.string().optional().nullable(),
          b: myzod.string().optional().nullable(),
          c: myzod.boolean().optional().nullable(),
          d: myzod.number().optional().nullable(),
          e: myzod.number().optional().nullable(),
          z: myzod.string()
        })
      }
      "
    `)
  });

  it('array', async () => {
    const schema = buildSchema(`
      input ArrayInput {
        a: [String]
        b: [String!]
        c: [String!]!
        d: [[String]]
        e: [[String]!]
        f: [[String]!]!
      }
    `);
    const result = await plugin(schema, [], {
      schema: 'myzod',
    }, {});
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function ArrayInputSchema(): myzod.Type<ArrayInput> {
        return myzod.object({
          a: myzod.array(myzod.string().nullable()).optional().nullable(),
          b: myzod.array(myzod.string()).optional().nullable(),
          c: myzod.array(myzod.string()),
          d: myzod.array(myzod.array(myzod.string().nullable()).optional().nullable()).optional().nullable(),
          e: myzod.array(myzod.array(myzod.string().nullable())).optional().nullable(),
          f: myzod.array(myzod.array(myzod.string().nullable()))
        })
      }
      "
    `)
  });

  it('ref input object', async () => {
    const schema = buildSchema(`
      input AInput {
        b: BInput!
      }
      input BInput {
        c: CInput!
      }
      input CInput {
        a: AInput!
      }
    `);
    const result = await plugin(schema, [], {
      schema: 'myzod',
    }, {});
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function AInputSchema(): myzod.Type<AInput> {
        return myzod.object({
          b: myzod.lazy(() => BInputSchema())
        })
      }

      export function BInputSchema(): myzod.Type<BInput> {
        return myzod.object({
          c: myzod.lazy(() => CInputSchema())
        })
      }

      export function CInputSchema(): myzod.Type<CInput> {
        return myzod.object({
          a: myzod.lazy(() => AInputSchema())
        })
      }
      "
    `)
  });

  it('ref input object w/ schemaNamespacedImportName', async () => {
    const schema = buildSchema(/* GraphQL */ `
          input AInput {
            b: BInput!
          }
          input BInput {
            c: CInput!
          }
          input CInput {
            a: AInput!
          }
    `);
    const scalars = undefined
    const result = await plugin(schema, [], { schema: 'myzod', scalars, importFrom: './types', schemaNamespacedImportName: 't' }, {});
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function AInputSchema(): myzod.Type<t.AInput> {
        return myzod.object({
          b: myzod.lazy(() => BInputSchema())
        })
      }

      export function BInputSchema(): myzod.Type<t.BInput> {
        return myzod.object({
          c: myzod.lazy(() => CInputSchema())
        })
      }

      export function CInputSchema(): myzod.Type<t.CInput> {
        return myzod.object({
          a: myzod.lazy(() => AInputSchema())
        })
      }
      "
    `)
  })

  it('nested input object', async () => {
    const schema = buildSchema(`
      input NestedInput {
        child: NestedInput
        childrens: [NestedInput]
      }
    `);
    const result = await plugin(schema, [], {
      schema: 'myzod',
    }, {});
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function NestedInputSchema(): myzod.Type<NestedInput> {
        return myzod.object({
          child: myzod.lazy(() => NestedInputSchema().optional().nullable()),
          childrens: myzod.array(myzod.lazy(() => NestedInputSchema().nullable())).optional().nullable()
        })
      }
      "
    `)
  });

  it('enum', async () => {
    const schema = buildSchema(`
      enum PageType {
        PUBLIC
        BASIC_AUTH
      }
      input PageInput {
        pageType: PageType!
      }
    `);
    const result = await plugin(schema, [], {
      schema: 'myzod',
    }, {});
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = myzod.enum(PageType);

      export function PageInputSchema(): myzod.Type<PageInput> {
        return myzod.object({
          pageType: PageTypeSchema
        })
      }
      "
    `)
  });

  it('enum w/ schemaNamespacedImportName', async () => {
    const schema = buildSchema(/* GraphQL */ `
          enum PageType {
            PUBLIC
            BASIC_AUTH
          }
          input PageInput {
            pageType: PageType!
          }
    `);
    const scalars = undefined
    const result = await plugin(schema, [], { schema: 'myzod', scalars, importFrom: './', schemaNamespacedImportName: 't' }, {});
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = myzod.enum(t.PageType);

      export function PageInputSchema(): myzod.Type<t.PageInput> {
        return myzod.object({
          pageType: PageTypeSchema
        })
      }
      "
    `)
  })

  it('camelcase', async () => {
    const schema = buildSchema(`
      input HTTPInput {
        method: HTTPMethod
        url: URL!
      }

      enum HTTPMethod {
        GET
        POST
      }

      scalar URL # unknown scalar, should be any (definedNonNullAnySchema)
    `);
    const result = await plugin(schema, [], {
      schema: 'myzod',
    }, {});
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export const HttpMethodSchema = myzod.enum(HttpMethod);

      export function HttpInputSchema(): myzod.Type<HttpInput> {
        return myzod.object({
          method: HttpMethodSchema.optional().nullable(),
          url: definedNonNullAnySchema
        })
      }
      "
    `)
  });

  it('with scalars', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input Say {
        phrase: Text!
        times: Count!
      }

      scalar Count
      scalar Text
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        scalars: {
          Text: 'string',
          Count: 'number',
        },
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function SaySchema(): myzod.Type<Say> {
        return myzod.object({
          phrase: myzod.string(),
          times: myzod.number()
        })
      }
      "
    `)
  });

  it('with importFrom', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input Say {
        phrase: String!
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as myzod from 'myzod'",
        "import { Say } from './types'",
      ]
    `)
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function SaySchema(): myzod.Type<Say> {
        return myzod.object({
          phrase: myzod.string()
        })
      }
      "
    `)
  });

  it('with importFrom & schemaNamespacedImportName', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input Say {
        phrase: String!
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        importFrom: './types',
        schemaNamespacedImportName: 't',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as myzod from 'myzod'",
        "import * as t from './types'",
      ]
    `)
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function SaySchema(): myzod.Type<t.Say> {
        return myzod.object({
          phrase: myzod.string()
        })
      }
      "
    `)
  });

  it('with importFrom & useTypeImports', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input Say {
        phrase: String!
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        importFrom: './types',
        useTypeImports: true,
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as myzod from 'myzod'",
        "import type { Say } from './types'",
      ]
    `)
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function SaySchema(): myzod.Type<Say> {
        return myzod.object({
          phrase: myzod.string()
        })
      }
      "
    `)
  });

  it('with enumsAsTypes', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum PageType {
        PUBLIC
        BASIC_AUTH
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        enumsAsTypes: true,
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export type PageTypeSchema = myzod.literals('PUBLIC', 'BASIC_AUTH');
      "
    `)
  });

  it('with enumsAsTypes + schemaNamespacedImportName', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum PageType {
        PUBLIC
        BASIC_AUTH
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        enumsAsTypes: true,
        importFrom: './types',
        schemaNamespacedImportName: 't',
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export type PageTypeSchema = myzod.literals('PUBLIC', 'BASIC_AUTH');
      "
    `)
  });

  it('with notAllowEmptyString', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input PrimitiveInput {
        a: ID!
        b: String!
        c: Boolean!
        d: Int!
        e: Float!
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        notAllowEmptyString: true,
        scalars: {
          ID: 'string',
        },
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function PrimitiveInputSchema(): myzod.Type<PrimitiveInput> {
        return myzod.object({
          a: myzod.string().min(1),
          b: myzod.string().min(1),
          c: myzod.boolean(),
          d: myzod.number(),
          e: myzod.number()
        })
      }
      "
    `)
  });

  it('with notAllowEmptyString issue #386', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input InputOne {
        field: InputNested!
      }

      input InputNested {
        field: String!
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        notAllowEmptyString: true,
        scalars: {
          ID: 'string',
        },
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function InputOneSchema(): myzod.Type<InputOne> {
        return myzod.object({
          field: myzod.lazy(() => InputNestedSchema())
        })
      }

      export function InputNestedSchema(): myzod.Type<InputNested> {
        return myzod.object({
          field: myzod.string().min(1)
        })
      }
      "
    `)
  });

  it('with scalarSchemas', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input ScalarsInput {
        date: Date!
        email: Email
        str: String!
      }
      scalar Date
      scalar Email
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        scalarSchemas: {
          Date: 'myzod.date()',
          Email: 'myzod.string()', // generate the basic type. User can later extend it using `withPredicate(fn: (val: string) => boolean), errMsg?: string }`
        },
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function ScalarsInputSchema(): myzod.Type<ScalarsInput> {
        return myzod.object({
          date: myzod.date(),
          email: myzod.string().optional().nullable(),
          str: myzod.string()
        })
      }
      "
    `)
  });

  it('with defaultScalarTypeSchema', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input ScalarsInput {
        date: Date!
        email: Email
        str: String!
      }
      scalar Date
      scalar Email
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        scalarSchemas: {
          Email: 'myzod.string()', // generate the basic type. User can later extend it using `withPredicate(fn: (val: string) => boolean), errMsg?: string }`
        },
        defaultScalarTypeSchema: 'myzod.string()',
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function ScalarsInputSchema(): myzod.Type<ScalarsInput> {
        return myzod.object({
          date: myzod.string(),
          email: myzod.string().optional().nullable(),
          str: myzod.string()
        })
      }
      "
    `)
  });
  it('with typesPrefix', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input Say {
        phrase: String!
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        typesPrefix: 'I',
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as myzod from 'myzod'",
        "import { ISay } from './types'",
      ]
    `)
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function ISaySchema(): myzod.Type<ISay> {
        return myzod.object({
          phrase: myzod.string()
        })
      }
      "
    `)
  });
  it('with typesSuffix', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input Say {
        phrase: String!
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        typesSuffix: 'I',
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as myzod from 'myzod'",
        "import { SayI } from './types'",
      ]
    `)
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function SayISchema(): myzod.Type<SayI> {
        return myzod.object({
          phrase: myzod.string()
        })
      }
      "
    `)
  });
  describe('issues #19', () => {
    it('string field', async () => {
      const schema = buildSchema(/* GraphQL */ `
        input UserCreateInput {
          profile: String @constraint(minLength: 1, maxLength: 5000)
        }

        directive @constraint(minLength: Int!, maxLength: Int!) on INPUT_FIELD_DEFINITION
      `);
      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          directives: {
            constraint: {
              minLength: ['min', '$1', 'Please input more than $1'],
              maxLength: ['max', '$1', 'Please input less than $1'],
            },
          },
        },
        {},
      );
      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function UserCreateInputSchema(): myzod.Type<UserCreateInput> {
          return myzod.object({
            profile: myzod.string().min(1, "Please input more than 1").max(5000, "Please input less than 5000").optional().nullable()
          })
        }
        "
      `)
    });
    it('not null field', async () => {
      const schema = buildSchema(/* GraphQL */ `
        input UserCreateInput {
          profile: String! @constraint(minLength: 1, maxLength: 5000)
        }

        directive @constraint(minLength: Int!, maxLength: Int!) on INPUT_FIELD_DEFINITION
      `);
      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          directives: {
            constraint: {
              minLength: ['min', '$1', 'Please input more than $1'],
              maxLength: ['max', '$1', 'Please input less than $1'],
            },
          },
        },
        {},
      );
      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function UserCreateInputSchema(): myzod.Type<UserCreateInput> {
          return myzod.object({
            profile: myzod.string().min(1, "Please input more than 1").max(5000, "Please input less than 5000")
          })
        }
        "
      `)
    });
    it('list field', async () => {
      const schema = buildSchema(/* GraphQL */ `
        input UserCreateInput {
          profile: [String] @constraint(minLength: 1, maxLength: 5000)
        }

        directive @constraint(minLength: Int!, maxLength: Int!) on INPUT_FIELD_DEFINITION
      `);
      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          directives: {
            constraint: {
              minLength: ['min', '$1', 'Please input more than $1'],
              maxLength: ['max', '$1', 'Please input less than $1'],
            },
          },
        },
        {},
      );
      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function UserCreateInputSchema(): myzod.Type<UserCreateInput> {
          return myzod.object({
            profile: myzod.array(myzod.string().nullable()).min(1, "Please input more than 1").max(5000, "Please input less than 5000").optional().nullable()
          })
        }
        "
      `)
    });
  });

  describe('with withObjectType', () => {
    it('not generate if withObjectType false', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type User {
          id: ID!
          name: String
        }
      `);
      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
        },
        {},
      );
      expect(result.content).not.toContain('export function UserSchema(): myzod.Type<User> {');
    });

    it('generate object type contains object type', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type Book {
          author: Author
          title: String
        }

        type Author {
          books: [Book]
          name: String
        }
      `);
      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
        },
        {},
      );
      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function BookSchema(): myzod.Type<Book> {
          return myzod.object({
            __typename: myzod.literal('Book').optional(),
            author: myzod.lazy(() => AuthorSchema().optional().nullable()),
            title: myzod.string().optional().nullable()
          })
        }

        export function AuthorSchema(): myzod.Type<Author> {
          return myzod.object({
            __typename: myzod.literal('Author').optional(),
            books: myzod.array(myzod.lazy(() => BookSchema().nullable())).optional().nullable(),
            name: myzod.string().optional().nullable()
          })
        }
        "
      `)

      for (const wantNotContain of ['Query', 'Mutation', 'Subscription'])
        expect(result.content).not.toContain(wantNotContain);
    });

    it('generate both input & type', async () => {
      const schema = buildSchema(/* GraphQL */ `
        scalar Date
        scalar Email
        input UserCreateInput {
          name: String!
          date: Date!
          email: Email!
        }
        input UsernameUpdateInput {
          updateInputId: ID!
          updateName: String!
        }
        type User {
          id: ID!
          name: String
          age: Int
          email: Email
          isMember: Boolean
          createdAt: Date!
        }

        type Mutation {
          _empty: String
        }

        type Query {
          _empty: String
        }

        type Subscription {
          _empty: String
        }
      `);
      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
          scalarSchemas: {
            Date: 'myzod.date()',
            Email: 'myzod.string().email()',
          },
          scalars: {
            ID: {
              input: 'number',
              output: 'string',
            },
          },
        },
        {},
      );
      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function UserCreateInputSchema(): myzod.Type<UserCreateInput> {
          return myzod.object({
            name: myzod.string(),
            date: myzod.date(),
            email: myzod.string().email()
          })
        }

        export function UsernameUpdateInputSchema(): myzod.Type<UsernameUpdateInput> {
          return myzod.object({
            updateInputId: myzod.number(),
            updateName: myzod.string()
          })
        }

        export function UserSchema(): myzod.Type<User> {
          return myzod.object({
            __typename: myzod.literal('User').optional(),
            id: myzod.string(),
            name: myzod.string().optional().nullable(),
            age: myzod.number().optional().nullable(),
            email: myzod.string().email().optional().nullable(),
            isMember: myzod.boolean().optional().nullable(),
            createdAt: myzod.date()
          })
        }
        "
      `)

      for (const wantNotContain of ['Query', 'Mutation', 'Subscription'])
        expect(result.content).not.toContain(wantNotContain);
    });

    it('generate union types', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type Square {
          size: Int
        }
        type Circle {
          radius: Int
        }
        union Shape = Circle | Square
      `);

      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
        },
        {},
      );

      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function SquareSchema(): myzod.Type<Square> {
          return myzod.object({
            __typename: myzod.literal('Square').optional(),
            size: myzod.number().optional().nullable()
          })
        }

        export function CircleSchema(): myzod.Type<Circle> {
          return myzod.object({
            __typename: myzod.literal('Circle').optional(),
            radius: myzod.number().optional().nullable()
          })
        }

        export function ShapeSchema() {
          return myzod.union([CircleSchema(), SquareSchema()])
        }
        "
      `)
    });

    it('generate union types + schemaNamespacedImportName', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type Square {
          size: Int
        }
        type Circle {
          radius: Int
        }
        union Shape = Circle | Square
      `);

      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
          importFrom: './types',
          schemaNamespacedImportName: 't',
        },
        {},
      );

      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function SquareSchema(): myzod.Type<t.Square> {
          return myzod.object({
            __typename: myzod.literal('Square').optional(),
            size: myzod.number().optional().nullable()
          })
        }

        export function CircleSchema(): myzod.Type<t.Circle> {
          return myzod.object({
            __typename: myzod.literal('Circle').optional(),
            radius: myzod.number().optional().nullable()
          })
        }

        export function ShapeSchema() {
          return myzod.union([CircleSchema(), SquareSchema()])
        }
        "
      `)
    });

    it('generate union types with single element', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type Square {
          size: Int
        }
        type Circle {
          radius: Int
        }
        union Shape = Circle | Square

        type Geometry {
          shape: Shape
        }
      `);

      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
        },
        {},
      );

      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function SquareSchema(): myzod.Type<Square> {
          return myzod.object({
            __typename: myzod.literal('Square').optional(),
            size: myzod.number().optional().nullable()
          })
        }

        export function CircleSchema(): myzod.Type<Circle> {
          return myzod.object({
            __typename: myzod.literal('Circle').optional(),
            radius: myzod.number().optional().nullable()
          })
        }

        export function ShapeSchema() {
          return myzod.union([CircleSchema(), SquareSchema()])
        }

        export function GeometrySchema(): myzod.Type<Geometry> {
          return myzod.object({
            __typename: myzod.literal('Geometry').optional(),
            shape: myzod.lazy(() => ShapeSchema().optional().nullable())
          })
        }
        "
      `)
    });

    it('correctly reference generated union types', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type Circle {
          radius: Int
        }
        union Shape = Circle
      `);

      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
        },
        {},
      );

      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function CircleSchema(): myzod.Type<Circle> {
          return myzod.object({
            __typename: myzod.literal('Circle').optional(),
            radius: myzod.number().optional().nullable()
          })
        }

        export function ShapeSchema() {
          return CircleSchema()
        }
        "
      `)
    });

    it('generate enum union types', async () => {
      const schema = buildSchema(/* GraphQL */ `
        enum PageType {
          PUBLIC
          BASIC_AUTH
        }

        enum MethodType {
          GET
          POST
        }

        union AnyType = PageType | MethodType
      `);

      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
        },
        {},
      );

      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export const PageTypeSchema = myzod.enum(PageType);

        export const MethodTypeSchema = myzod.enum(MethodType);

        export function AnyTypeSchema() {
          return myzod.union([PageTypeSchema, MethodTypeSchema])
        }
        "
      `)
    });

    it('generate union types with single element, export as const', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type Square {
          size: Int
        }
        type Circle {
          radius: Int
        }
        union Shape = Circle | Square

        type Geometry {
          shape: Shape
        }
      `);

      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
          validationSchemaExportType: 'const',
        },
        {},
      );

      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export const CircleSchema: myzod.Type<Circle> = myzod.object({
            __typename: myzod.literal('Circle').optional(),
            radius: myzod.number().optional().nullable()
        });

        export const SquareSchema: myzod.Type<Square> = myzod.object({
            __typename: myzod.literal('Square').optional(),
            size: myzod.number().optional().nullable()
        });

        export const ShapeSchema = myzod.union([CircleSchema, SquareSchema]);

        export const GeometrySchema: myzod.Type<Geometry> = myzod.object({
            __typename: myzod.literal('Geometry').optional(),
            shape: myzod.lazy(() => ShapeSchema.optional().nullable())
        });
        "
      `)
    });

    it('with object arguments', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type MyType {
          foo(a: String, b: Int!, c: Boolean, d: Float!, e: Text): String
        }
        scalar Text
      `);
      const result = await plugin(
        schema,
        [],
        {
          schema: 'myzod',
          withObjectType: true,
          scalars: {
            Text: 'string',
          },
        },
        {},
      );
      expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
        "
        export function MyTypeSchema(): myzod.Type<MyType> {
          return myzod.object({
            __typename: myzod.literal('MyType').optional(),
            foo: myzod.string().optional().nullable()
          })
        }

        export function MyTypeFooArgsSchema(): myzod.Type<MyTypeFooArgs> {
          return myzod.object({
            a: myzod.string().optional().nullable(),
            b: myzod.number(),
            c: myzod.boolean().optional().nullable(),
            d: myzod.number(),
            e: myzod.string().optional().nullable()
          })
        }
        "
      `)
    });

    describe('with InterfaceType', () => {
      it('not generate if withObjectType false', async () => {
        const schema = buildSchema(/* GraphQL */ `
          interface User {
            id: ID!
            name: String
          }
        `);
        const result = await plugin(
          schema,
          [],
          {
            schema: 'myzod',
          },
          {},
        );
        expect(result.content).not.toContain('export function UserSchema(): myzod.Type<User> {');
      });

      it('generate if withObjectType true', async () => {
        const schema = buildSchema(/* GraphQL */ `
          interface Book {
            title: String
          }
        `);
        const result = await plugin(
          schema,
          [],
          {
            schema: 'myzod',
            withObjectType: true,
          },
          {},
        );
        expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
          "
          export function BookSchema(): myzod.Type<Book> {
            return myzod.object({
              title: myzod.string().optional().nullable()
            })
          }
          "
        `)
        const wantNotContains = ['__typename: myzod.literal(\'Book\')'];

        for (const wantNotContain of wantNotContains)
          expect(result.content).not.toContain(wantNotContain);
      });

      it('generate interface type contains interface type', async () => {
        const schema = buildSchema(/* GraphQL */ `
          interface Book {
            author: Author
            title: String
          }

          interface Author {
            books: [Book]
            name: String
          }
        `);
        const result = await plugin(
          schema,
          [],
          {
            schema: 'myzod',
            withObjectType: true,
          },
          {},
        );
        expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
          "
          export function BookSchema(): myzod.Type<Book> {
            return myzod.object({
              author: myzod.lazy(() => AuthorSchema().optional().nullable()),
              title: myzod.string().optional().nullable()
            })
          }

          export function AuthorSchema(): myzod.Type<Author> {
            return myzod.object({
              books: myzod.array(myzod.lazy(() => BookSchema().nullable())).optional().nullable(),
              name: myzod.string().optional().nullable()
            })
          }
          "
        `)
      });
      it('generate object type contains interface type', async () => {
        const schema = buildSchema(/* GraphQL */ `
          interface Book {
            title: String!
            author: Author!
          }

          type Textbook implements Book {
            title: String!
            author: Author!
            courses: [String!]!
          }

          type ColoringBook implements Book {
            title: String!
            author: Author!
            colors: [String!]!
          }

          type Author {
            books: [Book!]
            name: String
          }
        `);
        const result = await plugin(
          schema,
          [],
          {
            schema: 'myzod',
            withObjectType: true,
          },
          {},
        );
        expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
          "
          export function BookSchema(): myzod.Type<Book> {
            return myzod.object({
              title: myzod.string(),
              author: myzod.lazy(() => AuthorSchema())
            })
          }

          export function TextbookSchema(): myzod.Type<Textbook> {
            return myzod.object({
              __typename: myzod.literal('Textbook').optional(),
              title: myzod.string(),
              author: myzod.lazy(() => AuthorSchema()),
              courses: myzod.array(myzod.string())
            })
          }

          export function ColoringBookSchema(): myzod.Type<ColoringBook> {
            return myzod.object({
              __typename: myzod.literal('ColoringBook').optional(),
              title: myzod.string(),
              author: myzod.lazy(() => AuthorSchema()),
              colors: myzod.array(myzod.string())
            })
          }

          export function AuthorSchema(): myzod.Type<Author> {
            return myzod.object({
              __typename: myzod.literal('Author').optional(),
              books: myzod.array(myzod.lazy(() => BookSchema())).optional().nullable(),
              name: myzod.string().optional().nullable()
            })
          }
          "
        `)
      });
    });
  });

  it('properly generates custom directive values', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input UserCreateInput {
        name: String! @constraint(startsWith: "Sir")
        age: Int! @constraint(min: 0, max: 100)
      }
      directive @constraint(startsWith: String, min: Int, max: Int) on INPUT_FIELD_DEFINITION
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        directives: {
          constraint: {
            min: 'min',
            max: 'max',
            startsWith: ['pattern', '/^$1/'],
          },
        },
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export function UserCreateInputSchema(): myzod.Type<UserCreateInput> {
        return myzod.object({
          name: myzod.string().pattern(/^Sir/),
          age: myzod.number().min(0).max(100)
        })
      }
      "
    `)
  });

  it('exports as const instead of func', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input Say {
        phrase: String!
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        validationSchemaExportType: 'const',
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export const SaySchema: myzod.Type<Say> = myzod.object({
          phrase: myzod.string()
      });
      "
    `)
  });

  it('generate both input & type, export as const', async () => {
    const schema = buildSchema(/* GraphQL */ `
      scalar Date
      scalar Email
      input UserCreateInput {
        name: String!
        date: Date!
        email: Email!
      }
      type User {
        id: ID!
        name: String
        age: Int
        email: Email
        isMember: Boolean
        createdAt: Date!
      }
      type Mutation {
        _empty: String
      }
      type Query {
        _empty: String
      }
      type Subscription {
        _empty: String
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        withObjectType: true,
        scalarSchemas: {
          Date: 'myzod.date()',
          Email: 'myzod.string().email()',
        },
        validationSchemaExportType: 'const',
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export const UserSchema: myzod.Type<User> = myzod.object({
          __typename: myzod.literal('User').optional(),
          id: myzod.string(),
          name: myzod.string().optional().nullable(),
          age: myzod.number().optional().nullable(),
          email: myzod.string().email().optional().nullable(),
          isMember: myzod.boolean().optional().nullable(),
          createdAt: myzod.date()
      });

      export const UserCreateInputSchema: myzod.Type<UserCreateInput> = myzod.object({
          name: myzod.string(),
          date: myzod.date(),
          email: myzod.string().email()
      });
      "
    `)
    for (const wantNotContain of ['Query', 'Mutation', 'Subscription'])
      expect(result.content).not.toContain(wantNotContain);
  });

  it('issue #394', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum Test {
        A
        B
      }

      type Query {
        _dummy: Test
      }

      input QueryInput {
        _dummy: Test
      }
    `);
    const query = introspectionFromSchema(schema);
    const clientSchema = buildClientSchema(query);
    const result = await plugin(
      clientSchema,
      [],
      {
        schema: 'myzod',
        scalars: {
          ID: 'string',
        },
      },
      {},
    );
    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export const TestSchema = myzod.enum(Test);

      export function QueryInputSchema(): myzod.Type<QueryInput> {
        return myzod.object({
          _dummy: TestSchema.optional().nullable()
        })
      }
      "
    `)
  });

  it('with default input values', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum PageType {
        PUBLIC
        BASIC_AUTH
      }
      input PageInput {
        pageType: PageType! = PUBLIC
        greeting: String = "Hello"
        newline: String = "Hello\\nWorld"
        score: Int = 100
        ratio: Float = 0.5
        isMember: Boolean = true
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        importFrom: './types',
      },
      {},
    );

    expect(removedInitialEmitValue(result.content)).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = myzod.enum(PageType);

      export function PageInputSchema(): myzod.Type<PageInput> {
        return myzod.object({
          pageType: PageTypeSchema.default("PUBLIC"),
          greeting: myzod.string().default("Hello").optional().nullable(),
          newline: myzod.string().default("Hello\\nWorld").optional().nullable(),
          score: myzod.number().default(100).optional().nullable(),
          ratio: myzod.number().default(0.5).optional().nullable(),
          isMember: myzod.boolean().default(true).optional().nullable()
        })
      }
      "
    `)
  });

  it('with default input values as enum types', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum PageType {
        PUBLIC
        BASIC_AUTH
      }
      input PageInput {
        pageType: PageType! = PUBLIC
        greeting: String = "Hello"
        score: Int = 100
        ratio: Float = 0.5
        isMember: Boolean = true
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        importFrom: './types',
        useEnumTypeAsDefaultValue: true,
      },
      {},
    );

    expect(result.content).toContain('export const PageTypeSchema = myzod.enum(PageType)');
    expect(result.content).toContain('export function PageInputSchema(): myzod.Type<PageInput>');

    expect(result.content).toContain('pageType: PageTypeSchema.default(PageType.Public)');
    expect(result.content).toContain('greeting: myzod.string().default("Hello").optional().nullable()');
    expect(result.content).toContain('score: myzod.number().default(100).optional().nullable()');
    expect(result.content).toContain('ratio: myzod.number().default(0.5).optional().nullable()');
    expect(result.content).toContain('isMember: myzod.boolean().default(true).optional().nullable()');
  });

  it('with default input values as enum types with underscores', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum PageType {
        PUBLIC
        BASIC_AUTH
      }
      input PageInput {
        pageType: PageType! = BASIC_AUTH
        greeting: String = "Hello"
        score: Int = 100
        ratio: Float = 0.5
        isMember: Boolean = true
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        importFrom: './types',
        useEnumTypeAsDefaultValue: true,
      },
      {},
    );

    expect(result.content).toContain('export const PageTypeSchema = myzod.enum(PageType)');
    expect(result.content).toContain('export function PageInputSchema(): myzod.Type<PageInput>');

    expect(result.content).toContain('pageType: PageTypeSchema.default(PageType.Basic_Auth)');
    expect(result.content).toContain('greeting: myzod.string().default("Hello").optional().nullable()');
    expect(result.content).toContain('score: myzod.number().default(100).optional().nullable()');
    expect(result.content).toContain('ratio: myzod.number().default(0.5).optional().nullable()');
    expect(result.content).toContain('isMember: myzod.boolean().default(true).optional().nullable()');
  });

  it('with default input values as enum types with no underscores', async () => {
    const schema = buildSchema(/* GraphQL */ `
      enum PageType {
        PUBLIC
        BASIC_AUTH
      }
      input PageInput {
        pageType: PageType! = BASIC_AUTH
        greeting: String = "Hello"
        score: Int = 100
        ratio: Float = 0.5
        isMember: Boolean = true
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        schema: 'myzod',
        importFrom: './types',
        useEnumTypeAsDefaultValue: true,
        namingConvention: {
          transformUnderscore: true,
        },
      },
      {},
    );

    expect(result.content).toContain('export const PageTypeSchema = myzod.enum(PageType)');
    expect(result.content).toContain('export function PageInputSchema(): myzod.Type<PageInput>');

    expect(result.content).toContain('pageType: PageTypeSchema.default(PageType.BasicAuth)');
    expect(result.content).toContain('greeting: myzod.string().default("Hello").optional().nullable()');
    expect(result.content).toContain('score: myzod.number().default(100).optional().nullable()');
    expect(result.content).toContain('ratio: myzod.number().default(0.5).optional().nullable()');
    expect(result.content).toContain('isMember: myzod.boolean().default(true).optional().nullable()');
  });
});
