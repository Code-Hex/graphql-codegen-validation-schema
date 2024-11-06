import type { PluginFunction, Types } from '@graphql-codegen/plugin-helpers';
import type { GraphQLSchema } from 'graphql';
import { transformSchemaAST } from '@graphql-codegen/schema-ast';
import { buildSchema, printSchema, visit } from 'graphql';
import type { ValidationSchemaPluginConfig } from './config.js';
import type { SchemaVisitor } from './types.js';

import { isGeneratedByIntrospection, topologicalSortAST } from './graphql.js';
import { MyZodSchemaVisitor } from './myzod/index.js';
import { ValibotSchemaVisitor } from './valibot/index.js';
import { YupSchemaVisitor } from './yup/index.js';
import { ZodSchemaVisitor } from './zod/index.js';

export const plugin: PluginFunction<ValidationSchemaPluginConfig, Types.ComplexPluginOutput> = (
  schema: GraphQLSchema,
  _documents: Types.DocumentFile[],
  config: ValidationSchemaPluginConfig,
): Types.ComplexPluginOutput => {
  const { schema: _schema, ast } = _transformSchemaAST(schema, config);
  const visitor = schemaVisitor(_schema, config);

  const result = visit(ast, visitor);

  const generated = result.definitions.filter(def => typeof def === 'string');

  return {
    prepend: visitor.buildImports(),
    content: [visitor.initialEmit(), ...generated].join('\n'),
  };
};

function schemaVisitor(schema: GraphQLSchema, config: ValidationSchemaPluginConfig): SchemaVisitor {
  if (config?.schema === 'zod')
    return new ZodSchemaVisitor(schema, config);
  else if (config?.schema === 'myzod')
    return new MyZodSchemaVisitor(schema, config);
  else if (config?.schema === 'valibot')
    return new ValibotSchemaVisitor(schema, config);

  return new YupSchemaVisitor(schema, config);
}

function _transformSchemaAST(schema: GraphQLSchema, config: ValidationSchemaPluginConfig) {
  const { schema: _schema, ast } = transformSchemaAST(schema, config);

  // See: https://github.com/Code-Hex/graphql-codegen-typescript-validation-schema/issues/394
  const __schema = isGeneratedByIntrospection(_schema) ? buildSchema(printSchema(_schema)) : _schema;

  // This affects the performance of code generation, so it is
  // enabled only when this option is selected.
  if (config.validationSchemaExportType === 'const') {
    return {
      schema: __schema,
      ast: topologicalSortAST(__schema, ast),
    };
  }
  return {
    schema: __schema,
    ast,
  };
}

export type { ValidationSchemaPluginConfig }
