import { buildClientSchema, buildSchema, introspectionFromSchema } from 'graphql';

import { plugin } from '../src/index';

describe('yup', () => {
  it('defined', async () => {
    const textSchema = /* GraphQL */ `
      input PrimitiveInput {
        a: ID!
        b: String!
        c: Boolean!
        d: Int!
        e: Float!
      }
    `;
    const scalars = { ID: 'string' };

    const schema = buildSchema(textSchema);
    const result = await plugin(schema, [], { scalars }, {});

    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as yup from 'yup'",
      ]
    `)

    expect(result.content).toMatchInlineSnapshot(`
      "

      export function PrimitiveInputSchema(): yup.ObjectSchema<PrimitiveInput> {
        return yup.object({
          a: yup.string().defined().nonNullable(),
          b: yup.string().defined().nonNullable(),
          c: yup.boolean().defined().nonNullable(),
          d: yup.number().defined().nonNullable(),
          e: yup.number().defined().nonNullable()
        })
      }
      "
    `)
  });

  it('optional', async () => {
    const textSchema = /* GraphQL */ `
      input PrimitiveInput {
        a: ID
        b: String
        c: Boolean
        d: Int
        e: Float
        z: String! # no defined check
      }
    `;
    const scalars = { ID: 'string' };

    const schema = buildSchema(textSchema);
    const result = await plugin(schema, [], { scalars }, {});
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function PrimitiveInputSchema(): yup.ObjectSchema<PrimitiveInput> {
        return yup.object({
          a: yup.string().defined().nullable().optional(),
          b: yup.string().defined().nullable().optional(),
          c: yup.boolean().defined().nullable().optional(),
          d: yup.number().defined().nullable().optional(),
          e: yup.number().defined().nullable().optional(),
          z: yup.string().defined().nonNullable()
        })
      }
      "
    `)
  });

  it('array', async () => {
    const textSchema = /* GraphQL */ `
      input ArrayInput {
        a: [String]
        b: [String!]
        c: [String!]!
        d: [[String]]
        e: [[String]!]
        f: [[String]!]!
      }
    `;

    const schema = buildSchema(textSchema);
    const result = await plugin(schema, [], {}, {});

    expect(result.content).toMatchInlineSnapshot(`
      "

      export function ArrayInputSchema(): yup.ObjectSchema<ArrayInput> {
        return yup.object({
          a: yup.array(yup.string().defined().nullable()).defined().nullable().optional(),
          b: yup.array(yup.string().defined().nonNullable()).defined().nullable().optional(),
          c: yup.array(yup.string().defined().nonNullable()).defined(),
          d: yup.array(yup.array(yup.string().defined().nullable()).defined().nullable()).defined().nullable().optional(),
          e: yup.array(yup.array(yup.string().defined().nullable()).defined()).defined().nullable().optional(),
          f: yup.array(yup.array(yup.string().defined().nullable()).defined()).defined()
        })
      }
      "
    `)
  });

  it('ref input object', async () => {
    const textSchema = /* GraphQL */ `
      input AInput {
        b: BInput!
      }
      input BInput {
        c: CInput!
      }
      input CInput {
        a: AInput!
      }
    `;

    const schema = buildSchema(textSchema);
    const result = await plugin(schema, [], {}, {});

    expect(result.content).toMatchInlineSnapshot(`
      "

      export function AInputSchema(): yup.ObjectSchema<AInput> {
        return yup.object({
          b: yup.lazy(() => BInputSchema().nonNullable())
        })
      }

      export function BInputSchema(): yup.ObjectSchema<BInput> {
        return yup.object({
          c: yup.lazy(() => CInputSchema().nonNullable())
        })
      }

      export function CInputSchema(): yup.ObjectSchema<CInput> {
        return yup.object({
          a: yup.lazy(() => AInputSchema().nonNullable())
        })
      }
      "
    `)
  });

  it('ref input object w/ schemaNamespacedImportName', async () => {
    const textSchema = /* GraphQL */ `
      input AInput {
        b: BInput!
      }
      input BInput {
        c: CInput!
      }
      input CInput {
        a: AInput!
      }
    `;

    const schema = buildSchema(textSchema);
    const result = await plugin(schema, [], { importFrom: './types', schemaNamespacedImportName: 't' }, {});

    expect(result.content).toMatchInlineSnapshot(`
      "

      export function AInputSchema(): yup.ObjectSchema<t.AInput> {
        return yup.object({
          b: yup.lazy(() => BInputSchema().nonNullable())
        })
      }

      export function BInputSchema(): yup.ObjectSchema<t.BInput> {
        return yup.object({
          c: yup.lazy(() => CInputSchema().nonNullable())
        })
      }

      export function CInputSchema(): yup.ObjectSchema<t.CInput> {
        return yup.object({
          a: yup.lazy(() => AInputSchema().nonNullable())
        })
      }
      "
    `)
  });

  it('nested input object', async () => {
    const schema = buildSchema(/* GraphQL */ `
      input NestedInput {
        child: NestedInput
        childrens: [NestedInput]
      }
    `);
    const result = await plugin(
      schema,
      [],
      {
        scalars: undefined,
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function NestedInputSchema(): yup.ObjectSchema<NestedInput> {
        return yup.object({
          child: yup.lazy(() => NestedInputSchema()).optional(),
          childrens: yup.array(yup.lazy(() => NestedInputSchema())).defined().nullable().optional()
        })
      }
      "
    `)
  });

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
    const result = await plugin(
      schema,
      [],
      {
        scalars: undefined,
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = yup.string<PageType>().oneOf(Object.values(PageType)).defined();

      export function PageInputSchema(): yup.ObjectSchema<PageInput> {
        return yup.object({
          pageType: PageTypeSchema.nonNullable()
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
    const result = await plugin(
      schema,
      [],
      {
        scalars: undefined,
        importFrom: './',
        schemaNamespacedImportName: 't',
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = yup.string<t.PageType>().oneOf(Object.values(t.PageType)).defined();

      export function PageInputSchema(): yup.ObjectSchema<t.PageInput> {
        return yup.object({
          pageType: PageTypeSchema.nonNullable()
        })
      }
      "
    `)
  });

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

      scalar URL # unknown scalar, should be any (yup.mixed())
    `);
    const result = await plugin(
      schema,
      [],
      {
        scalars: undefined,
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const HttpMethodSchema = yup.string<HttpMethod>().oneOf(Object.values(HttpMethod)).defined();

      export function HttpInputSchema(): yup.ObjectSchema<HttpInput> {
        return yup.object({
          method: HttpMethodSchema.nullable().optional(),
          url: yup.mixed().nonNullable()
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
        scalars: {
          Text: 'string',
          Count: 'number',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SaySchema(): yup.ObjectSchema<Say> {
        return yup.object({
          phrase: yup.string().defined().nonNullable(),
          times: yup.number().defined().nonNullable()
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
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as yup from 'yup'",
        "import { Say } from './types'",
      ]
    `)
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SaySchema(): yup.ObjectSchema<Say> {
        return yup.object({
          phrase: yup.string().defined().nonNullable()
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
        importFrom: './types',
        schemaNamespacedImportName: 't',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as yup from 'yup'",
        "import * as t from './types'",
      ]
    `)
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SaySchema(): yup.ObjectSchema<t.Say> {
        return yup.object({
          phrase: yup.string().defined().nonNullable()
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
        importFrom: './types',
        useTypeImports: true,
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as yup from 'yup'",
        "import type { Say } from './types'",
      ]
    `)
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SaySchema(): yup.ObjectSchema<Say> {
        return yup.object({
          phrase: yup.string().defined().nonNullable()
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
        enumsAsTypes: true,
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = yup.string().oneOf(['PUBLIC', 'BASIC_AUTH']).defined();
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
        enumsAsTypes: true,
        importFrom: './types',
        schemaNamespacedImportName: 't',
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = yup.string().oneOf(['PUBLIC', 'BASIC_AUTH']).defined();
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
        notAllowEmptyString: true,
        scalars: {
          ID: 'string',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function PrimitiveInputSchema(): yup.ObjectSchema<PrimitiveInput> {
        return yup.object({
          a: yup.string().defined().required(),
          b: yup.string().defined().required(),
          c: yup.boolean().defined().nonNullable(),
          d: yup.number().defined().nonNullable(),
          e: yup.number().defined().nonNullable()
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
        schema: 'yup',
        notAllowEmptyString: true,
        scalars: {
          ID: 'string',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function InputOneSchema(): yup.ObjectSchema<InputOne> {
        return yup.object({
          field: yup.lazy(() => InputNestedSchema().nonNullable())
        })
      }

      export function InputNestedSchema(): yup.ObjectSchema<InputNested> {
        return yup.object({
          field: yup.string().defined().required()
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
        scalarSchemas: {
          Date: 'yup.date()',
          Email: 'yup.string().email()',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function ScalarsInputSchema(): yup.ObjectSchema<ScalarsInput> {
        return yup.object({
          date: yup.date().defined().nonNullable(),
          email: yup.string().email().defined().nullable().optional(),
          str: yup.string().defined().nonNullable()
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
        scalarSchemas: {
          Email: 'yup.string().email()',
        },
        defaultScalarTypeSchema: 'yup.string()',
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function ScalarsInputSchema(): yup.ObjectSchema<ScalarsInput> {
        return yup.object({
          date: yup.string().nonNullable(),
          email: yup.string().email().defined().nullable().optional(),
          str: yup.string().defined().nonNullable()
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
        typesPrefix: 'I',
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as yup from 'yup'",
        "import { ISay } from './types'",
      ]
    `)
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function ISaySchema(): yup.ObjectSchema<ISay> {
        return yup.object({
          phrase: yup.string().defined().nonNullable()
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
        typesSuffix: 'I',
        importFrom: './types',
      },
      {},
    );
    expect(result.prepend).toMatchInlineSnapshot(`
      [
        "import * as yup from 'yup'",
        "import { SayI } from './types'",
      ]
    `)
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function SayISchema(): yup.ObjectSchema<SayI> {
        return yup.object({
          phrase: yup.string().defined().nonNullable()
        })
      }
      "
    `)
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
          schema: 'yup',
        },
        {},
      );
      expect(result.content).not.toContain('export function UserSchema(): yup.ObjectSchema<User> {');
    });

    it('generate object type contains object type', async () => {
      const schema = buildSchema(/* GraphQL */ `
        type Book {
          author: Author
          title: String
        }

        type Book2 {
          author: Author!
          title: String!
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
          schema: 'yup',
          withObjectType: true,
        },
        {},
      );
      expect(result.content).toMatchInlineSnapshot(`
        "

        function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
          return yup.mixed<T>().test({
            test: (value) => schemas.some((schema) => schema.isValidSync(value))
          }).defined()
        }

        export function BookSchema(): yup.ObjectSchema<Book> {
          return yup.object({
            __typename: yup.string<'Book'>().optional(),
            author: yup.lazy(() => AuthorSchema().nullable()).optional(),
            title: yup.string().defined().nullable().optional()
          })
        }

        export function Book2Schema(): yup.ObjectSchema<Book2> {
          return yup.object({
            __typename: yup.string<'Book2'>().optional(),
            author: yup.lazy(() => AuthorSchema().nonNullable()),
            title: yup.string().defined().nonNullable()
          })
        }

        export function AuthorSchema(): yup.ObjectSchema<Author> {
          return yup.object({
            __typename: yup.string<'Author'>().optional(),
            books: yup.array(yup.lazy(() => BookSchema().nullable())).defined().nullable().optional(),
            name: yup.string().defined().nullable().optional()
          })
        }
        "
      `)

      for (const wantNotContain of ['Query', 'Mutation', 'Subscription'])
        expect(result.content).not.toContain(wantNotContain);
    });

    it('generate both input & type if withObjectType true', async () => {
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
          schema: 'yup',
          withObjectType: true,
          scalarSchemas: {
            Date: 'yup.date()',
            Email: 'yup.string().email()',
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

        function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
          return yup.mixed<T>().test({
            test: (value) => schemas.some((schema) => schema.isValidSync(value))
          }).defined()
        }

        export function UserCreateInputSchema(): yup.ObjectSchema<UserCreateInput> {
          return yup.object({
            name: yup.string().defined().nonNullable(),
            date: yup.date().defined().nonNullable(),
            email: yup.string().email().defined().nonNullable()
          })
        }

        export function UsernameUpdateInputSchema(): yup.ObjectSchema<UsernameUpdateInput> {
          return yup.object({
            updateInputId: yup.number().defined().nonNullable(),
            updateName: yup.string().defined().nonNullable()
          })
        }

        export function UserSchema(): yup.ObjectSchema<User> {
          return yup.object({
            __typename: yup.string<'User'>().optional(),
            id: yup.string().defined().nonNullable(),
            name: yup.string().defined().nullable().optional(),
            age: yup.number().defined().nullable().optional(),
            email: yup.string().email().defined().nullable().optional(),
            isMember: yup.boolean().defined().nullable().optional(),
            createdAt: yup.date().defined().nonNullable()
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
          schema: 'yup',
          withObjectType: true,
          importFrom: './types',
          schemaNamespacedImportName: 't',
        },
        {},
      );

      expect(result.content).toMatchInlineSnapshot(`
        "

        function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
          return yup.mixed<T>().test({
            test: (value) => schemas.some((schema) => schema.isValidSync(value))
          }).defined()
        }

        export function SquareSchema(): yup.ObjectSchema<t.Square> {
          return yup.object({
            __typename: yup.string<'Square'>().optional(),
            size: yup.number().defined().nullable().optional()
          })
        }

        export function CircleSchema(): yup.ObjectSchema<t.Circle> {
          return yup.object({
            __typename: yup.string<'Circle'>().optional(),
            radius: yup.number().defined().nullable().optional()
          })
        }

        export function ShapeSchema(): yup.MixedSchema<t.Shape> {
          return union<t.Shape>(CircleSchema(), SquareSchema())
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
          schema: 'yup',
          withObjectType: true,
        },
        {},
      );

      expect(result.content).toMatchInlineSnapshot(`
        "

        function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
          return yup.mixed<T>().test({
            test: (value) => schemas.some((schema) => schema.isValidSync(value))
          }).defined()
        }

        export function SquareSchema(): yup.ObjectSchema<Square> {
          return yup.object({
            __typename: yup.string<'Square'>().optional(),
            size: yup.number().defined().nullable().optional()
          })
        }

        export function CircleSchema(): yup.ObjectSchema<Circle> {
          return yup.object({
            __typename: yup.string<'Circle'>().optional(),
            radius: yup.number().defined().nullable().optional()
          })
        }

        export function ShapeSchema(): yup.MixedSchema<Shape> {
          return union<Shape>(CircleSchema(), SquareSchema())
        }

        export function GeometrySchema(): yup.ObjectSchema<Geometry> {
          return yup.object({
            __typename: yup.string<'Geometry'>().optional(),
            shape: yup.lazy(() => ShapeSchema().nullable()).optional()
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
          schema: 'yup',
          withObjectType: true,
        },
        {},
      );

      expect(result.content).toMatchInlineSnapshot(`
        "

        function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
          return yup.mixed<T>().test({
            test: (value) => schemas.some((schema) => schema.isValidSync(value))
          }).defined()
        }

        export function CircleSchema(): yup.ObjectSchema<Circle> {
          return yup.object({
            __typename: yup.string<'Circle'>().optional(),
            radius: yup.number().defined().nullable().optional()
          })
        }

        export function ShapeSchema(): yup.MixedSchema<Shape> {
          return union<Shape>(CircleSchema())
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
          schema: 'yup',
          withObjectType: true,
        },
        {},
      );

      expect(result.content).toMatchInlineSnapshot(`
        "
        export const PageTypeSchema = yup.string<PageType>().oneOf(Object.values(PageType)).defined();

        export const MethodTypeSchema = yup.string<MethodType>().oneOf(Object.values(MethodType)).defined();

        function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
          return yup.mixed<T>().test({
            test: (value) => schemas.some((schema) => schema.isValidSync(value))
          }).defined()
        }

        export function AnyTypeSchema(): yup.MixedSchema<AnyType> {
          return union<AnyType>(PageTypeSchema, MethodTypeSchema)
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
          schema: 'yup',
          withObjectType: true,
          validationSchemaExportType: 'const',
        },
        {},
      );

      expect(result.content).toMatchInlineSnapshot(`
        "

        function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
          return yup.mixed<T>().test({
            test: (value) => schemas.some((schema) => schema.isValidSync(value))
          }).defined()
        }

        export const CircleSchema: yup.ObjectSchema<Circle> = yup.object({
            __typename: yup.string<'Circle'>().optional(),
            radius: yup.number().defined().nullable().optional()
        });

        export const SquareSchema: yup.ObjectSchema<Square> = yup.object({
            __typename: yup.string<'Square'>().optional(),
            size: yup.number().defined().nullable().optional()
        });

        export const ShapeSchema: yup.MixedSchema<Shape> = union<Shape>(CircleSchema, SquareSchema);

        export const GeometrySchema: yup.ObjectSchema<Geometry> = yup.object({
            __typename: yup.string<'Geometry'>().optional(),
            shape: yup.lazy(() => ShapeSchema.nullable()).optional()
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
          schema: 'yup',
          withObjectType: true,
          scalars: {
            Text: 'string',
          },
        },
        {},
      );
      expect(result.content).toMatchInlineSnapshot(`
        "

        function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
          return yup.mixed<T>().test({
            test: (value) => schemas.some((schema) => schema.isValidSync(value))
          }).defined()
        }

        export function MyTypeSchema(): yup.ObjectSchema<MyType> {
          return yup.object({
            __typename: yup.string<'MyType'>().optional(),
            foo: yup.string().defined().nullable().optional()
          })
        }

        export function MyTypeFooArgsSchema(): yup.ObjectSchema<MyTypeFooArgs> {
          return yup.object({
            a: yup.string().defined().nullable().optional(),
            b: yup.number().defined().nonNullable(),
            c: yup.boolean().defined().nullable().optional(),
            d: yup.number().defined().nonNullable(),
            e: yup.string().defined().nullable().optional()
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
            schema: 'yup',
            withObjectType: false,
          },
          {},
        );
        expect(result.content).not.toContain('export function UserSchema(): yup.ObjectSchema<User> {');
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
            schema: 'yup',
            withObjectType: true,
          },
          {},
        );
        expect(result.content).toMatchInlineSnapshot(`
          "

          function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
            return yup.mixed<T>().test({
              test: (value) => schemas.some((schema) => schema.isValidSync(value))
            }).defined()
          }

          export function BookSchema(): yup.ObjectSchema<Book> {
            return yup.object({
              title: yup.string().defined().nullable().optional()
            })
          }
          "
        `)

        const wantNotContains = ['__typename: yup.string<\'Book\'>().optional()'];
        for (const wantNotContain of wantNotContains)
          expect(result.content).not.toContain(wantNotContain);
      });

      it('generate interface type contains interface type', async () => {
        const schema = buildSchema(/* GraphQL */ `
          interface Book {
            author: Author
            title: String
          }

          interface Book2 {
            author: Author!
            title: String!
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
            schema: 'yup',
            withObjectType: true,
          },
          {},
        );
        expect(result.content).toMatchInlineSnapshot(`
          "

          function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
            return yup.mixed<T>().test({
              test: (value) => schemas.some((schema) => schema.isValidSync(value))
            }).defined()
          }

          export function BookSchema(): yup.ObjectSchema<Book> {
            return yup.object({
              author: yup.lazy(() => AuthorSchema().nullable()).optional(),
              title: yup.string().defined().nullable().optional()
            })
          }

          export function Book2Schema(): yup.ObjectSchema<Book2> {
            return yup.object({
              author: yup.lazy(() => AuthorSchema().nonNullable()),
              title: yup.string().defined().nonNullable()
            })
          }

          export function AuthorSchema(): yup.ObjectSchema<Author> {
            return yup.object({
              books: yup.array(yup.lazy(() => BookSchema().nullable())).defined().nullable().optional(),
              name: yup.string().defined().nullable().optional()
            })
          }
          "
        `)

        for (const wantNotContain of ['Query', 'Mutation', 'Subscription'])
          expect(result.content).not.toContain(wantNotContain);
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
            schema: 'yup',
            withObjectType: true,
          },
          {},
        );
        expect(result.content).toMatchInlineSnapshot(`
          "

          function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
            return yup.mixed<T>().test({
              test: (value) => schemas.some((schema) => schema.isValidSync(value))
            }).defined()
          }

          export function BookSchema(): yup.ObjectSchema<Book> {
            return yup.object({
              title: yup.string().defined().nonNullable(),
              author: yup.lazy(() => AuthorSchema().nonNullable())
            })
          }

          export function TextbookSchema(): yup.ObjectSchema<Textbook> {
            return yup.object({
              __typename: yup.string<'Textbook'>().optional(),
              title: yup.string().defined().nonNullable(),
              author: yup.lazy(() => AuthorSchema().nonNullable()),
              courses: yup.array(yup.string().defined().nonNullable()).defined()
            })
          }

          export function ColoringBookSchema(): yup.ObjectSchema<ColoringBook> {
            return yup.object({
              __typename: yup.string<'ColoringBook'>().optional(),
              title: yup.string().defined().nonNullable(),
              author: yup.lazy(() => AuthorSchema().nonNullable()),
              colors: yup.array(yup.string().defined().nonNullable()).defined()
            })
          }

          export function AuthorSchema(): yup.ObjectSchema<Author> {
            return yup.object({
              __typename: yup.string<'Author'>().optional(),
              books: yup.array(yup.lazy(() => BookSchema().nonNullable())).defined().nullable().optional(),
              name: yup.string().defined().nullable().optional()
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
        schema: 'yup',
        directives: {
          constraint: {
            min: 'min',
            max: 'max',
            startsWith: ['matches', '/^$1/'],
          },
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export function UserCreateInputSchema(): yup.ObjectSchema<UserCreateInput> {
        return yup.object({
          name: yup.string().defined().nonNullable().matches(/^Sir/),
          age: yup.number().defined().nonNullable().min(0).max(100)
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
        schema: 'yup',
        validationSchemaExportType: 'const',
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "

      export const SaySchema: yup.ObjectSchema<Say> = yup.object({
          phrase: yup.string().defined().nonNullable()
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
        schema: 'yup',
        withObjectType: true,
        scalarSchemas: {
          Date: 'yup.date()',
          Email: 'yup.string().email()',
        },
        validationSchemaExportType: 'const',
      },
      {},
    );

    expect(result.content).toMatchInlineSnapshot(`
      "

      function union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T> {
        return yup.mixed<T>().test({
          test: (value) => schemas.some((schema) => schema.isValidSync(value))
        }).defined()
      }

      export const UserSchema: yup.ObjectSchema<User> = yup.object({
          __typename: yup.string<'User'>().optional(),
          id: yup.string().defined().nonNullable(),
          name: yup.string().defined().nullable().optional(),
          age: yup.number().defined().nullable().optional(),
          email: yup.string().email().defined().nullable().optional(),
          isMember: yup.boolean().defined().nullable().optional(),
          createdAt: yup.date().defined().nonNullable()
      });

      export const UserCreateInputSchema: yup.ObjectSchema<UserCreateInput> = yup.object({
          name: yup.string().defined().nonNullable(),
          date: yup.date().defined().nonNullable(),
          email: yup.string().email().defined().nonNullable()
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
        schema: 'yup',
        scalars: {
          ID: 'string',
        },
      },
      {},
    );
    expect(result.content).toMatchInlineSnapshot(`
      "
      export const TestSchema = yup.string<Test>().oneOf(Object.values(Test)).defined();

      export function QueryInputSchema(): yup.ObjectSchema<QueryInput> {
        return yup.object({
          _dummy: TestSchema.nullable().optional()
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
        schema: 'yup',
        importFrom: './types',
      },
      {},
    );

    expect(result.content).toMatchInlineSnapshot(`
      "
      export const PageTypeSchema = yup.string<PageType>().oneOf(Object.values(PageType)).defined();

      export function PageInputSchema(): yup.ObjectSchema<PageInput> {
        return yup.object({
          pageType: PageTypeSchema.nonNullable().default("PUBLIC"),
          greeting: yup.string().defined().nullable().default("Hello").optional(),
          newline: yup.string().defined().nullable().default("Hello\\nWorld").optional(),
          score: yup.number().defined().nullable().default(100).optional(),
          ratio: yup.number().defined().nullable().default(0.5).optional(),
          isMember: yup.boolean().defined().nullable().default(true).optional()
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
        schema: 'yup',
        importFrom: './types',
        useEnumTypeAsDefaultValue: true,
      },
      {},
    );

    expect(result.content).toContain(
      'export const PageTypeSchema = yup.string<PageType>().oneOf(Object.values(PageType)).defined()',
    );
    expect(result.content).toContain('export function PageInputSchema(): yup.ObjectSchema<PageInput>');

    expect(result.content).toContain('pageType: PageTypeSchema.nonNullable().default(PageType.Public)');
    expect(result.content).toContain('greeting: yup.string().defined().nullable().default("Hello").optional()');
    expect(result.content).toContain('score: yup.number().defined().nullable().default(100).optional()');
    expect(result.content).toContain('ratio: yup.number().defined().nullable().default(0.5).optional()');
    expect(result.content).toContain('isMember: yup.boolean().defined().nullable().default(true).optional()');
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
        schema: 'yup',
        importFrom: './types',
        useEnumTypeAsDefaultValue: true,
      },
      {},
    );

    expect(result.content).toContain(
      'export const PageTypeSchema = yup.string<PageType>().oneOf(Object.values(PageType)).defined()',
    );
    expect(result.content).toContain('export function PageInputSchema(): yup.ObjectSchema<PageInput>');

    expect(result.content).toContain('pageType: PageTypeSchema.nonNullable().default(PageType.Basic_Auth)');
    expect(result.content).toContain('greeting: yup.string().defined().nullable().default("Hello").optional()');
    expect(result.content).toContain('score: yup.number().defined().nullable().default(100).optional()');
    expect(result.content).toContain('ratio: yup.number().defined().nullable().default(0.5).optional()');
    expect(result.content).toContain('isMember: yup.boolean().defined().nullable().default(true).optional()');
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
        schema: 'yup',
        importFrom: './types',
        useEnumTypeAsDefaultValue: true,
        namingConvention: {
          transformUnderscore: true,
        },
      },
      {},
    );

    expect(result.content).toContain(
      'export const PageTypeSchema = yup.string<PageType>().oneOf(Object.values(PageType)).defined()',
    );
    expect(result.content).toContain('export function PageInputSchema(): yup.ObjectSchema<PageInput>');

    expect(result.content).toContain('pageType: PageTypeSchema.nonNullable().default(PageType.BasicAuth)');
    expect(result.content).toContain('greeting: yup.string().defined().nullable().default("Hello").optional()');
    expect(result.content).toContain('score: yup.number().defined().nullable().default(100).optional()');
    expect(result.content).toContain('ratio: yup.number().defined().nullable().default(0.5).optional()');
    expect(result.content).toContain('isMember: yup.boolean().defined().nullable().default(true).optional()');
  });
});
