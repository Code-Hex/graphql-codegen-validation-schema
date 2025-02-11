import { buildSchema } from 'graphql';

import { plugin } from '../src/index';

describe('valibot', () => {
  it('non-null and defined', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input PrimitiveInput {
        a: ID!
        b: String!
        c: Boolean!
        d: Int!
        e: Float!
      }
    `);
    const scalars = {
      ID: 'string',
    }
    const result = await plugin(schema, [], { schema: 'valibot', scalars }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function PrimitiveInputSchema(): v.GenericSchema<PrimitiveInput> {
        return v.object({
          a: v.string(),
          b: v.string(),
          c: v.boolean(),
          d: v.number(),
          e: v.number()
        })
      }
      "
    `);
  })
  it('nullish', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input PrimitiveInput {
        a: ID
        b: String
        c: Boolean
        d: Int
        e: Float
        z: String! # no defined check
      }
    `);
    const scalars = {
      ID: 'string',
    }
    const result = await plugin(schema, [], { schema: 'valibot', scalars }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function PrimitiveInputSchema(): v.GenericSchema<PrimitiveInput> {
        return v.object({
          a: v.nullish(v.string()),
          b: v.nullish(v.string()),
          c: v.nullish(v.boolean()),
          d: v.nullish(v.number()),
          e: v.nullish(v.number()),
          z: v.string()
        })
      }
      "
    `);
  })
  it('array', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input PrimitiveInput {
        a: [String]
        b: [String!]
        c: [String!]!
        d: [[String]]
        e: [[String]!]
        f: [[String]!]!
      }
    `);
    const scalars = undefined
    const result = await plugin(schema, [], { schema: 'valibot', scalars }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function PrimitiveInputSchema(): v.GenericSchema<PrimitiveInput> {
        return v.object({
          a: v.nullish(v.array(v.nullable(v.string()))),
          b: v.nullish(v.array(v.string())),
          c: v.array(v.string()),
          d: v.nullish(v.array(v.nullish(v.array(v.nullable(v.string()))))),
          e: v.nullish(v.array(v.array(v.nullable(v.string())))),
          f: v.array(v.array(v.nullable(v.string())))
        })
      }
      "
    `);
  })
  it('ref input object', async () => {
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
    const result = await plugin(schema, [], { schema: 'valibot', scalars }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function AInputSchema(): v.GenericSchema<AInput> {
        return v.object({
          b: v.lazy(() => BInputSchema())
        })
      }

      export function BInputSchema(): v.GenericSchema<BInput> {
        return v.object({
          c: v.lazy(() => CInputSchema())
        })
      }

      export function CInputSchema(): v.GenericSchema<CInput> {
        return v.object({
          a: v.lazy(() => AInputSchema())
        })
      }
      "
    `);
  })
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
    const result = await plugin(schema, [], { schema: 'valibot', scalars, importFrom: './types', schemaNamespacedImportName: 't' }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function AInputSchema(): v.GenericSchema<t.AInput> {
        return v.object({
          b: v.lazy(() => BInputSchema())
        })
      }

      export function BInputSchema(): v.GenericSchema<t.BInput> {
        return v.object({
          c: v.lazy(() => CInputSchema())
        })
      }

      export function CInputSchema(): v.GenericSchema<t.CInput> {
        return v.object({
          a: v.lazy(() => AInputSchema())
        })
      }
      "
    `);
  })
  it('nested input object', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input NestedInput {
        child: NestedInput
        childrens: [NestedInput]
      }
    `);
    const scalars = undefined
    const result = await plugin(schema, [], { schema: 'valibot', scalars }, {});

    expect(result.content).toMatchInlineSnapshot(`
      "

      export function NestedInputSchema(): v.GenericSchema<NestedInput> {
        return v.object({
          child: v.lazy(() => v.nullish(NestedInputSchema())),
          childrens: v.nullish(v.array(v.lazy(() => v.nullable(NestedInputSchema()))))
        })
      }
      "
    `)
  })
  it('enum', async () => {
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
    const result = await plugin(schema, [], { schema: 'valibot', scalars }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = v.enum_(PageType);

      export function PageInputSchema(): v.GenericSchema<PageInput> {
        return v.object({
          pageType: PageTypeSchema
        })
      }
      "
    `);
  })
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
    const result = await plugin(schema, [], { schema: 'valibot', scalars, importFrom: './types', schemaNamespacedImportName: 't' }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = v.enum_(t.PageType);

      export function PageInputSchema(): v.GenericSchema<t.PageInput> {
        return v.object({
          pageType: PageTypeSchema
        })
      }
      "
    `);
  })
  it('camelcase', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input HTTPInput {
        method: HTTPMethod
        url: URL!
      }
      enum HTTPMethod {
        GET
        POST
      }
      scalar URL # unknown scalar, should be any
    `);
    const scalars = undefined
    const result = await plugin(schema, [], { schema: 'valibot', scalars }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const HttpMethodSchema = v.enum_(HttpMethod);

      export function HttpInputSchema(): v.GenericSchema<HttpInput> {
        return v.object({
          method: v.nullish(HttpMethodSchema),
          url: v.any()
        })
      }
      "
    `);
  })
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
        schema: 'valibot',
        scalars: {
          Text: 'string',
          Count: 'number',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SaySchema(): v.GenericSchema<Say> {
        return v.object({
          phrase: v.string(),
          times: v.number()
        })
      }
      "
    `);
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
        schema: 'valibot',
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as v from 'valibot'",
        "import { Say } from './types'",
      ]
    `);
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SaySchema(): v.GenericSchema<Say> {
        return v.object({
          phrase: v.string()
        })
      }
      "
    `);
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
        schema: 'valibot',
        importFrom: './types',
        schemaNamespacedImportName: 't',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as v from 'valibot'",
        "import * as t from './types'",
      ]
    `);
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SaySchema(): v.GenericSchema<t.Say> {
        return v.object({
          phrase: v.string()
        })
      }
      "
    `);
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
        schema: 'valibot',
        importFrom: './types',
        useTypeImports: true,
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as v from 'valibot'",
        "import type { Say } from './types'",
      ]
    `);
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SaySchema(): v.GenericSchema<Say> {
        return v.object({
          phrase: v.string()
        })
      }
      "
    `);
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
        schema: 'valibot',
        enumsAsTypes: true,
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = v.picklist([\'PUBLIC\', \'BASIC_AUTH\']);
      "
    `);
  });
  it('with enumsAsTypes & schemaNamespacedImportName', async () => {
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
        schema: 'valibot',
        enumsAsTypes: true,
        importFrom: './types',
        schemaNamespacedImportName: 't',
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = v.picklist([\'PUBLIC\', \'BASIC_AUTH\']);
      "
    `);
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
        schema: 'valibot',
        notAllowEmptyString: true,
        scalars: {
          ID: 'string',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function PrimitiveInputSchema(): v.GenericSchema<PrimitiveInput> {
        return v.object({
          a: v.pipe(v.string(), v.minLength(1)),
          b: v.pipe(v.string(), v.minLength(1)),
          c: v.boolean(),
          d: v.number(),
          e: v.number()
        })
      }
      "
    `)
  })
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
        schema: 'valibot',
        notAllowEmptyString: true,
        scalars: {
          ID: 'string',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function InputOneSchema(): v.GenericSchema<InputOne> {
        return v.object({
          field: v.lazy(() => InputNestedSchema())
        })
      }

      export function InputNestedSchema(): v.GenericSchema<InputNested> {
        return v.object({
          field: v.pipe(v.string(), v.minLength(1))
        })
      }
      "
    `)
  })
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
        schema: 'valibot',
        scalarSchemas: {
          Date: 'v.date()',
          Email: 'v.string([v.email()])',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function ScalarsInputSchema(): v.GenericSchema<ScalarsInput> {
        return v.object({
          date: v.date(),
          email: v.nullish(v.string([v.email()])),
          str: v.string()
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
        schema: 'valibot',
        scalarSchemas: {
          Email: 'v.string([v.email()])',
        },
        defaultScalarTypeSchema: 'v.string()',
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function ScalarsInputSchema(): v.GenericSchema<ScalarsInput> {
        return v.object({
          date: v.string(),
          email: v.nullish(v.string([v.email()])),
          str: v.string()
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
        schema: 'valibot',
        typesPrefix: 'I',
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as v from 'valibot'",
        "import { ISay } from './types'",
      ]
    `)
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function ISaySchema(): v.GenericSchema<ISay> {
        return v.object({
          phrase: v.string()
        })
      }
      "
    `)
  })
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
        schema: 'valibot',
        typesSuffix: 'I',
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as v from 'valibot'",
        "import { SayI } from './types'",
      ]
    `)
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SayISchema(): v.GenericSchema<SayI> {
        return v.object({
          phrase: v.string()
        })
      }
      "
    `)
  })
  it.todo('with default input values')
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
          schema: 'valibot',
          directives: {
            constraint: {
              minLength: ['minLength', '$1', 'Please input more than $1'],
              maxLength: ['maxLength', '$1', 'Please input less than $1'],
            },
          },
        },
        {},
      );
      expect(result.content).toMatchInlineSnapshot(`
        "

        export function UserCreateInputSchema(): v.GenericSchema<UserCreateInput> {
          return v.object({
            profile: v.nullish(v.pipe(v.string(), v.minLength(1, "Please input more than 1"), v.maxLength(5000, "Please input less than 5000")))
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
          schema: 'valibot',
          directives: {
            constraint: {
              minLength: ['minLength', '$1', 'Please input more than $1'],
              maxLength: ['maxLength', '$1', 'Please input less than $1'],
            },
          },
        },
        {},
      );

      expect(result.content).toMatchInlineSnapshot(`
        "

        export function UserCreateInputSchema(): v.GenericSchema<UserCreateInput> {
          return v.object({
            profile: v.pipe(v.string(), v.minLength(1, "Please input more than 1"), v.maxLength(5000, "Please input less than 5000"))
          })
        }
        "
      `)
    });
    it.todo('list field')
    describe('pR #112', () => {
      it.todo('with notAllowEmptyString')
      it.todo('without notAllowEmptyString')
    })
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
            schema: 'valibot',
          },
          {},
        );
        expect(result.content).not.toContain('export function UserSchema(): v.GenericSchema<User>');
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
            schema: 'valibot',
            withObjectType: true,
          },
          {},
        );
        expect(result.content).toMatchInlineSnapshot(`
          "

          export function BookSchema(): v.GenericSchema<Book> {
            return v.object({
              __typename: v.optional(v.literal('Book')),
              author: v.lazy(() => v.nullish(AuthorSchema())),
              title: v.nullish(v.string())
            })
          }

          export function AuthorSchema(): v.GenericSchema<Author> {
            return v.object({
              __typename: v.optional(v.literal('Author')),
              books: v.nullish(v.array(v.lazy(() => v.nullable(BookSchema())))),
              name: v.nullish(v.string())
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
            schema: 'valibot',
            withObjectType: true,
            scalarSchemas: {
              Date: 'v.date()',
              Email: 'v.pipe(v.string(), v.email())',
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
        expect(result.content).toMatchInlineSnapshot(`
          "

          export function UserCreateInputSchema(): v.GenericSchema<UserCreateInput> {
            return v.object({
              name: v.string(),
              date: v.date(),
              email: v.pipe(v.string(), v.email())
            })
          }

          export function UsernameUpdateInputSchema(): v.GenericSchema<UsernameUpdateInput> {
            return v.object({
              updateInputId: v.number(),
              updateName: v.string()
            })
          }

          export function UserSchema(): v.GenericSchema<User> {
            return v.object({
              __typename: v.optional(v.literal('User')),
              id: v.string(),
              name: v.nullish(v.string()),
              age: v.nullish(v.number()),
              email: v.nullish(v.pipe(v.string(), v.email())),
              isMember: v.nullish(v.boolean()),
              createdAt: v.date()
            })
          }
          "
        `)

        for (const wantNotContain of ['Query', 'Mutation', 'Subscription'])
          expect(result.content).not.toContain(wantNotContain);
      });
    })
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
          schema: 'valibot',
          withObjectType: true,
        },
        {},
      );

      expect(result.content).toMatchInlineSnapshot(`
        "

        export function SquareSchema(): v.GenericSchema<Square> {
          return v.object({
            __typename: v.optional(v.literal('Square')),
            size: v.nullish(v.number())
          })
        }

        export function CircleSchema(): v.GenericSchema<Circle> {
          return v.object({
            __typename: v.optional(v.literal('Circle')),
            radius: v.nullish(v.number())
          })
        }

        export function ShapeSchema() {
          return v.union([CircleSchema(), SquareSchema()])
        }
        "
      `)
    });
  })
  it('generate union types & schemaNamespacedImportName', async () => {
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
        schema: 'valibot',
        withObjectType: true,
        importFrom: './types',
        schemaNamespacedImportName: 't',
      },
      {},
    );

    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SquareSchema(): v.GenericSchema<t.Square> {
        return v.object({
          __typename: v.optional(v.literal('Square')),
          size: v.nullish(v.number())
        })
      }

      export function CircleSchema(): v.GenericSchema<t.Circle> {
        return v.object({
          __typename: v.optional(v.literal('Circle')),
          radius: v.nullish(v.number())
        })
      }

      export function ShapeSchema() {
        return v.union([CircleSchema(), SquareSchema()])
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
        schema: 'valibot',
        withObjectType: true,
      },
      {},
    );

    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SquareSchema(): v.GenericSchema<Square> {
        return v.object({
          __typename: v.optional(v.literal('Square')),
          size: v.nullish(v.number())
        })
      }

      export function CircleSchema(): v.GenericSchema<Circle> {
        return v.object({
          __typename: v.optional(v.literal('Circle')),
          radius: v.nullish(v.number())
        })
      }

      export function ShapeSchema() {
        return v.union([CircleSchema(), SquareSchema()])
      }

      export function GeometrySchema(): v.GenericSchema<Geometry> {
        return v.object({
          __typename: v.optional(v.literal('Geometry')),
          shape: v.lazy(() => v.nullish(ShapeSchema()))
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
        schema: 'valibot',
        withObjectType: true,
      },
      {},
    );

    expect(result.content).toMatchInlineSnapshot(`
      "

      export function CircleSchema(): v.GenericSchema<Circle> {
        return v.object({
          __typename: v.optional(v.literal('Circle')),
          radius: v.nullish(v.number())
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
        schema: 'valibot',
        withObjectType: true,
      },
      {},
    );

    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = v.enum_(PageType);

      export const MethodTypeSchema = v.enum_(MethodType);

      export function AnyTypeSchema() {
        return v.union([PageTypeSchema, MethodTypeSchema])
      }
      "
    `)
  });
  it.todo('generate union types with single element, export as const')
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
        schema: 'valibot',
        withObjectType: true,
        scalars: {
          Text: 'string',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function MyTypeSchema(): v.GenericSchema<MyType> {
        return v.object({
          __typename: v.optional(v.literal('MyType')),
          foo: v.nullish(v.string())
        })
      }

      export function MyTypeFooArgsSchema(): v.GenericSchema<MyTypeFooArgs> {
        return v.object({
          a: v.nullish(v.string()),
          b: v.number(),
          c: v.nullish(v.boolean()),
          d: v.number(),
          e: v.nullish(v.string())
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
          schema: 'valibot',
          withObjectType: false,
        },
        {},
      );
      expect(result.content).not.toContain('export function UserSchema(): v.GenericSchema<User>');
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
          schema: 'valibot',
          withObjectType: true,
        },
        {},
      );
      expect(result.content).toMatchInlineSnapshot(`
        "

        export function BookSchema(): v.GenericSchema<Book> {
          return v.object({
            title: v.nullish(v.string())
          })
        }
        "
      `)
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
          schema: 'valibot',
          withObjectType: true,
        },
        {},
      );
      expect(result.content).toMatchInlineSnapshot(`
        "

        export function BookSchema(): v.GenericSchema<Book> {
          return v.object({
            author: v.lazy(() => v.nullish(AuthorSchema())),
            title: v.nullish(v.string())
          })
        }

        export function AuthorSchema(): v.GenericSchema<Author> {
          return v.object({
            books: v.nullish(v.array(v.lazy(() => v.nullable(BookSchema())))),
            name: v.nullish(v.string())
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
          schema: 'valibot',
          withObjectType: true,
        },
        {},
      );
      expect(result.content).toMatchInlineSnapshot(`
        "

        export function BookSchema(): v.GenericSchema<Book> {
          return v.object({
            title: v.string(),
            author: v.lazy(() => AuthorSchema())
          })
        }

        export function TextbookSchema(): v.GenericSchema<Textbook> {
          return v.object({
            __typename: v.optional(v.literal('Textbook')),
            title: v.string(),
            author: v.lazy(() => AuthorSchema()),
            courses: v.array(v.string())
          })
        }

        export function ColoringBookSchema(): v.GenericSchema<ColoringBook> {
          return v.object({
            __typename: v.optional(v.literal('ColoringBook')),
            title: v.string(),
            author: v.lazy(() => AuthorSchema()),
            colors: v.array(v.string())
          })
        }

        export function AuthorSchema(): v.GenericSchema<Author> {
          return v.object({
            __typename: v.optional(v.literal('Author')),
            books: v.nullish(v.array(v.lazy(() => BookSchema()))),
            name: v.nullish(v.string())
          })
        }
        "
      `)
    });
  })
  it.todo('properly generates custom directive values')
  it.todo('exports as const instead of func')
  it.todo('generate both input & type, export as const')
  it.todo('issue #394')
})
