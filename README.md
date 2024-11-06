# graphql-codegen-typescript-validation-schema

[![Test](https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/actions/workflows/ci.yml/badge.svg)](https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/actions/workflows/ci.yml) [![npm version](https://badge.fury.io/js/graphql-codegen-typescript-validation-schema.svg)](https://badge.fury.io/js/graphql-codegen-typescript-validation-schema)

[GraphQL code generator](https://github.com/dotansimha/graphql-code-generator) plugin to generate form validation schema from your GraphQL schema.

- [x] support [yup](https://github.com/jquense/yup)
- [x] support [zod](https://github.com/colinhacks/zod)
- [x] support [myzod](https://github.com/davidmdm/myzod)
- [x] support [valibot](https://valibot.dev/)

## Quick Start

Start by installing this plugin and write simple plugin config;

```sh
$ npm i graphql-codegen-typescript-validation-schema
```

```yml
generates:
  path/to/graphql.ts:
    plugins:
      - typescript
      - typescript-validation-schema # specify to use this plugin
    config:
      # You can put the config for typescript plugin here
      # see: https://www.graphql-code-generator.com/plugins/typescript
      strictScalars: true
      # Overrides built-in ID scalar to both input and output types as string.
      # see: https://the-guild.dev/graphql/codegen/plugins/typescript/typescript#scalars
      scalars:
        ID: string
      # You can also write the config for this plugin together
      schema: yup # or zod
```

It is recommended to write `scalars` config for built-in type `ID`, as in the yaml example shown above. For more information: [#375](https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/pull/375)

You can check [example](https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/tree/main/example) directory if you want to see more complex config example or how is generated some files.

The Q&A for each schema is written in the README in the respective example directory.

## Config API Reference

### `schema`

type: `ValidationSchema` default: `'yup'`

Specify generete validation schema you want.

You can specify `yup` or `zod` or `myzod`.

```yml
generates:
  path/to/graphql.ts:
    plugins:
      - typescript
      - typescript-validation-schema
    config:
      schema: yup
```

### `importFrom`

type: `string`

When provided, import types from the generated typescript types file path. if not given, omit import statement.

```yml
generates:
  path/to/graphql.ts:
    plugins:
      - typescript
  path/to/validation.ts:
    plugins:
      - typescript-validation-schema
    config:
      importFrom: ./graphql # path for generated ts code
```

Then the generator generates code with import statement like below.

```ts
import { GeneratedInput } from './graphql'

/* generates validation schema here */
```

### `useTypeImports`

type: `boolean` default: `false`

Will use `import type {}` rather than `import {}` when importing generated TypeScript types.
This gives compatibility with TypeScript's "importsNotUsedAsValues": "error" option.
Should used in conjunction with `importFrom` option.

### `typesPrefix`

type: `string` default: (empty)

Prefixes all import types from generated typescript type.

```yml
generates:
  path/to/graphql.ts:
    plugins:
      - typescript
  path/to/validation.ts:
    plugins:
      - typescript-validation-schema
    config:
      typesPrefix: I
      importFrom: ./graphql # path for generated ts code
```

Then the generator generates code with import statement like below.

```ts
import { IGeneratedInput } from './graphql'

/* generates validation schema here */
```

### `typesSuffix`

type: `string` default: (empty)

Suffixes all import types from generated typescript type.

```yml
generates:
  path/to/graphql.ts:
    plugins:
      - typescript
  path/to/validation.ts:
    plugins:
      - typescript-validation-schema
    config:
      typesSuffix: I
      importFrom: ./graphql # path for generated ts code
```

Then the generator generates code with import statement like below.

```ts
import { GeneratedInputI } from './graphql'

/* generates validation schema here */
```

### `enumsAsTypes`

type: `boolean` default: `false`

Generates enum as TypeScript `type` instead of `enum`.

### `notAllowEmptyString`

type: `boolean` default: `false`

Generates validation string schema as do not allow empty characters by default.

### `scalarSchemas`

type: `ScalarSchemas`

Extends or overrides validation schema for the built-in scalars and custom GraphQL scalars.

#### yup schema

```yml
config:
  schema: yup
  scalarSchemas:
    Date: yup.date()
    Email: yup.string().email()
```

#### zod schema

```yml
config:
  schema: zod
  scalarSchemas:
    Date: z.date()
    Email: z.string().email()
```

### `withObjectType`

type: `boolean` default: `false`

Generates validation schema with GraphQL type objects. But excludes `Query`, `Mutation`, `Subscription` objects.

It is currently added for the purpose of using simple objects. See also [#20](https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/issues/20#issuecomment-1058969191), [#107](https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/issues/107).

This option currently **does not support fragment** generation. If you are interested, send me PR would be greatly appreciated!

### `validationSchemaExportType`

type: `ValidationSchemaExportType` default: `'function'`

Specify validation schema export type.

### `useEnumTypeAsDefault`

type: `boolean` default: `false`

Uses the full path of the enum type as the default value instead of the stringified value.

### `namingConvention`

type: `NamingConventionMap` default: `{ enumValues: "change-case-all#pascalCase" }`

Uses the full path of the enum type as the default value instead of the stringified value.

Note: This option has not been tested with `namingConvention.transformUnderscore` and `namingConvention.typeNames` options and may not work as expected.

Related: https://the-guild.dev/graphql/codegen/docs/config-reference/naming-convention#namingconvention

### `directives`

type: `DirectiveConfig`

Generates validation schema with more API based on directive schema. For example, yaml config and GraphQL schema is here.

```graphql
input ExampleInput {
  email: String! @required(msg: "Hello, World!") @constraint(minLength: 50, format: "email")
  message: String! @constraint(startsWith: "Hello")
}
```

#### yup schema

```yml
generates:
  path/to/graphql.ts:
    plugins:
      - typescript
      - typescript-validation-schema
    config:
      schema: yup
      directives:
        # Write directives like
        #
        # directive:
        #   arg1: schemaApi
        #   arg2: ["schemaApi2", "Hello $1"]
        # OR
        # directive: schemaApi
        #
        # See more examples in `./tests/directive.spec.ts`
        # https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/blob/main/tests/directive.spec.ts
        required:
          msg: required
        constraint:
          minLength: min
          # Replace $1 with specified `startsWith` argument value of the constraint directive
          startsWith: [matches, /^$1/]
          format:
            # This example means `validation-schema: directive-arg`
            # directive-arg is supported String and Enum.
            email: email
```

Then generates yup validation schema like below.

```ts
export function ExampleInputSchema(): yup.SchemaOf<ExampleInput> {
  return yup.object({
    email: yup.string().defined().required('Hello, World!').min(50).email(),
    message: yup.string().defined().matches(/^Hello/)
  })
}
```

#### zod schema

```yml
generates:
  path/to/graphql.ts:
    plugins:
      - typescript
      - typescript-validation-schema
    config:
      schema: zod
      directives:
        # Write directives like
        #
        # directive:
        #   arg1: schemaApi
        #   arg2: ["schemaApi2", "Hello $1"]
        # OR
        # directive: schemaApi
        #
        # See more examples in `./tests/directive.spec.ts`
        # https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/blob/main/tests/directive.spec.ts
        constraint:
          minLength: min
          # Replace $1 with specified `startsWith` argument value of the constraint directive
          startsWith: [regex, /^$1/, message]
          format:
            # This example means `validation-schema: directive-arg`
            # directive-arg is supported String and Enum.
            email: email
```

Then generates zod validation schema like below.

```ts
export function ExampleInputSchema(): z.ZodSchema<ExampleInput> {
  return z.object({
    email: z.string().min(50).email(),
    message: z.string().regex(/^Hello/, 'message')
  })
}
```

#### other schema

Please see [example](https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/tree/main/example) directory.

#### Custom mapping functions

If you are using TS config you can define your own custom mapping for directives. The function will receive the arguments of the directive as an object and should return a string that will be appended to the schema.

```ts
const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  documents: ['src/**/*.tsx'],
  generates: {
      plugins: ['typescript', 'typescript-validation-schema'],
      config: {
          schema: 'zod',
            directives: {
                between: (args) => `.refine(v => v >= ${args.min} && v <= ${args.max})`,
            },
      }
  }
}
```

Additionally, you can define custom mapping functions for each argument, or even each argument value separately.

```ts
const config: CodegenConfig = {
  schema: 'http://localhost:4000/graphql',
  documents: ['src/**/*.tsx'],
  generates: {
      plugins: ['typescript', 'typescript-validation-schema'],
      config: {
          schema: 'zod',
            directives: {
                // @unique()
                unique: () => `.refine(items => new Set(items).size === items.length)`,
                
                // @array(unique: true)
                array: {
                    unique: (value) => value ? `.refine(items => new Set(items).size === items.length)` : ``,
                },
                
                // @constraint(array: "UNIQUE")
                constraint: {
                    array: {
                        UNIQUE: () => `.refine(items => new Set(items).size === items.length)`,
                    }
                },
            },
      }
  }
}
```

## Notes

There is currently a compatibility issue with the client-preset. A workaround for this is to split the generation into two (one for client-preset and one for typescript-validation-schema).

```yml
generates:
  path/to/graphql.ts:
    plugins:
      - typescript-validation-schema
  /path/to/graphql/:
    preset: 'client',
      plugins:
      ...
```
