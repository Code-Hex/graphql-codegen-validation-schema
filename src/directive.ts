import type { ConstArgumentNode, ConstDirectiveNode, ConstValueNode } from 'graphql';
import { Kind, valueFromASTUntyped } from 'graphql';
import type { DirectiveConfig, DirectiveObjectArguments, SingleDirectiveConfig } from './config.js';

import { isConvertableRegexp } from './regexp.js';

// This function generates `.required("message").min(100).email()`
//
// config
// {
//   'required': {
//     'msg': ['required', '$1'],
//   },
//   'constraint': {
//     'minLength': ['min', '$1'],
//     'format': {
//       'uri': ['url', '$2'],
//       'email': ['email', '$2'],
//     }
//   }
// }
//
// GraphQL schema
// ```graphql
// input ExampleInput {
//   email: String! @required(msg: "message") @constraint(minLength: 100, format: "email")
// }
// ```
export function buildApi(config: DirectiveConfig, directives: ReadonlyArray<ConstDirectiveNode>): string {
  return directives
    .filter(directive => config[directive.name.value] !== undefined)
    .map((directive) => {
      const directiveName = directive.name.value;
      const directiveConfig = config[directiveName];
      if (typeof directiveConfig === 'string') {
        return `.${directiveConfig}()`;
      }
      if (typeof directiveConfig === 'function') {
        return directiveConfig(directiveArgs(directive));
      }
      return buildApiFromDirectiveArguments(directiveConfig, directive.arguments ?? []);
    })
    .join('')
}

// This function generates `[v.minLength(100), v.email()]`
// NOTE: valibot's API is not a method chain, so it is prepared separately from buildApi.
//
// config
// {
//   'constraint': {
//     'minLength': ['minLength', '$1'],
//     'format': {
//       'uri': ['url', '$2'],
//       'email': ['email', '$2'],
//     }
//   }
// }
//
// GraphQL schema
// ```graphql
// input ExampleInput {
//   email: String! @required(msg: "message") @constraint(minLength: 100, format: "email")
// }
// ```
//
// FIXME: v.required() is not supported yet. v.required() is classified as `Methods` and must wrap the schema. ex) `v.required(v.object({...}))`
export function buildApiForValibot(config: DirectiveConfig, directives: ReadonlyArray<ConstDirectiveNode>): string[] {
  return directives
    .filter(directive => config[directive.name.value] !== undefined)
    .map((directive) => {
      const directiveName = directive.name.value;
      const directiveConfig = config[directiveName];
      if (typeof directiveConfig === 'string') {
        return `.${directiveConfig}()`;
      }
      if (typeof directiveConfig === 'function') {
        return directiveConfig(directiveArgs(directive));
      }
      const apis = _buildApiFromDirectiveArguments(directiveConfig, directive.arguments ?? []);
      return apis.map(api => `v${api}`);
    })
    .flat()
}

function buildApiSchema(validationSchema: string | string[] | undefined, argValue: ConstValueNode): string {
  if (!validationSchema) {
    return '';
  }
  if (!Array.isArray(validationSchema)) {
    return `.${validationSchema}()`
  }

  const schemaApi = validationSchema[0];
  const schemaApiArgs = validationSchema.slice(1).map((templateArg) => {
    const gqlSchemaArgs = apiArgsFromConstValueNode(argValue);
    return applyArgToApiSchemaTemplate(templateArg, gqlSchemaArgs);
  });
  return `.${schemaApi}(${schemaApiArgs.join(', ')})`;
}

function buildApiFromDirectiveArguments(config: SingleDirectiveConfig, args: ReadonlyArray<ConstArgumentNode>): string {
  return _buildApiFromDirectiveArguments(config, args).join('');
}

function _buildApiFromDirectiveArguments(config: SingleDirectiveConfig, args: ReadonlyArray<ConstArgumentNode>): string[] {
  return args
    .map((arg) => {
      const argName = arg.name.value;
      const validationSchema = config[argName];
      if (!validationSchema) {
        return ''
      }
      if (typeof validationSchema === 'function') {
        return validationSchema(valueFromASTUntyped(arg.value));
      }
      if (typeof validationSchema === 'string') {
        return buildApiSchema([validationSchema, '$1'], arg.value);
      }
      if (Array.isArray(validationSchema)) {
        return buildApiSchema(validationSchema, arg.value);
      }
      return buildApiFromDirectiveObjectArguments(validationSchema, arg.value);
    })
}

function buildApiFromDirectiveObjectArguments(config: DirectiveObjectArguments, argValue: ConstValueNode): string {
  if (argValue.kind !== Kind.STRING && argValue.kind !== Kind.ENUM) {
    return '';
  }
  const validationSchema = config[argValue.value];
  if (typeof validationSchema === 'function') {
    return validationSchema();
  }
  return buildApiSchema(validationSchema, argValue);
}

function applyArgToApiSchemaTemplate(template: string, apiArgs: any[]): string {
  const matches = template.matchAll(/\$(\d+)/g);
  for (const match of matches) {
    const placeholder = match[0]; // `$1`
    const idx = Number.parseInt(match[1], 10) - 1; // start with `1 - 1`
    const apiArg = apiArgs[idx];
    if (apiArg === undefined) {
      template = template.replace(placeholder, '');
      continue;
    }
    if (template === placeholder)
      return stringify(apiArg);

    template = template.replace(placeholder, apiArg);
  }
  if (template !== '')
    return stringify(template, true);

  return template;
}

function stringify(arg: any, quoteString?: boolean): string {
  if (Array.isArray(arg))
    return arg.map(v => stringify(v, true)).join(',');

  if (typeof arg === 'string') {
    if (isConvertableRegexp(arg))
      return arg;

    const v = tryEval(arg)
    if (v !== undefined)
      arg = v

    if (quoteString)
      return JSON.stringify(arg);
  }

  if (typeof arg === 'boolean' || typeof arg === 'number' || typeof arg === 'bigint' || arg === 'undefined' || arg === null)
    return `${arg}`;

  return JSON.stringify(arg);
}

function apiArgsFromConstValueNode(value: ConstValueNode): any[] {
  const val = valueFromASTUntyped(value);
  if (Array.isArray(val))
    return val;

  return [val];
}

function directiveArgs(directive: ConstDirectiveNode): Record<string, any> {
  if (!directive.arguments) {
    return {}
  }
  return Object.fromEntries(directive.arguments.map(arg => [arg.name.value, valueFromASTUntyped(arg.value)]))
}

function tryEval(maybeValidJavaScript: string): any | undefined {
  try {
    // eslint-disable-next-line no-eval
    return eval(maybeValidJavaScript)
  }
  catch {
    return undefined
  }
}

export const exportedForTesting = {
  applyArgToApiSchemaTemplate,
  buildApiFromDirectiveObjectArguments,
  buildApiFromDirectiveArguments,
};
