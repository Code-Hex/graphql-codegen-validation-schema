import { DeclarationBlock, indent } from '@graphql-codegen/visitor-plugin-common';
import {
  EnumTypeDefinitionNode,
  FieldDefinitionNode,
  GraphQLSchema,
  InputObjectTypeDefinitionNode,
  InputValueDefinitionNode,
  NameNode,
  ObjectTypeDefinitionNode,
  TypeNode,
  UnionTypeDefinitionNode,
} from 'graphql';

import { ValidationSchemaPluginConfig } from '../config';
import { buildApi, GeneratedCodesForDirectives } from '../directive';
import { BaseSchemaVisitor } from '../schema_visitor';
import { Visitor } from '../visitor';
import { isInput, isListType, isNamedType, isNonNullType, ObjectTypeDefinitionBuilder } from './../graphql';

export class YupSchemaVisitor extends BaseSchemaVisitor {
  constructor(schema: GraphQLSchema, config: ValidationSchemaPluginConfig) {
    super(schema, config);
  }

  importValidationSchema(): string {
    return `import * as yup from 'yup'`;
  }

  initialEmit(): string {
    if (!this.config.withObjectType) return '\n' + this.enumDeclarations.join('\n');
    return (
      '\n' +
      this.enumDeclarations.join('\n') +
      '\n' +
      new DeclarationBlock({})
        .asKind('function')
        .withName('union<T extends {}>(...schemas: ReadonlyArray<yup.Schema<T>>): yup.MixedSchema<T>')
        .withBlock(
          [
            indent('return yup.mixed<T>().test({'),
            indent('test: (value) => schemas.some((schema) => schema.isValidSync(value))', 2),
            indent('})'),
          ].join('\n')
        ).string
    );
  }

  get InputObjectTypeDefinition() {
    return {
      leave: (node: InputObjectTypeDefinitionNode) => {
        const visitor = this.createVisitor('input');
        const name = visitor.convertName(node.name.value);
        this.importTypes.push(name);
        return this.buildInputFields(node.fields ?? [], visitor, name);
      },
    };
  }

  get ObjectTypeDefinition() {
    return {
      leave: ObjectTypeDefinitionBuilder(this.config.withObjectType, (node: ObjectTypeDefinitionNode) => {
        const visitor = this.createVisitor('output');
        const name = visitor.convertName(node.name.value);
        this.importTypes.push(name);

        // Building schema for field arguments.
        const argumentBlocks = this.buildObjectTypeDefinitionArguments(node, visitor);
        const appendArguments = argumentBlocks ? '\n' + argumentBlocks : '';

        // Building schema for fields.
        const shape = node.fields
          ?.map(field => {
            const fieldSchema = generateFieldYupSchema(this.config, visitor, field, 2);
            return isNonNullType(field.type) ? fieldSchema : `${fieldSchema}.optional()`;
          })
          .join(',\n');

        switch (this.config.validationSchemaExportType) {
          case 'const':
            return (
              new DeclarationBlock({})
                .export()
                .asKind('const')
                .withName(`${name}Schema: yup.ObjectSchema<${name}>`)
                .withContent(
                  [
                    `yup.object({`,
                    indent(`__typename: yup.string<'${node.name.value}'>().optional(),`, 2),
                    shape,
                    '}).strict()',
                  ].join('\n')
                ).string + appendArguments
            );

          case 'function':
          default:
            return (
              new DeclarationBlock({})
                .export()
                .asKind('function')
                .withName(`${name}Schema(): yup.ObjectSchema<${name}>`)
                .withBlock(
                  [
                    indent(`return yup.object({`),
                    indent(`__typename: yup.string<'${node.name.value}'>().optional(),`, 2),
                    shape,
                    indent('}).strict()'),
                  ].join('\n')
                ).string + appendArguments
            );
        }
      }),
    };
  }

  get EnumTypeDefinition() {
    return {
      leave: (node: EnumTypeDefinitionNode) => {
        const visitor = this.createVisitor('both');
        const enumname = visitor.convertName(node.name.value);
        this.importTypes.push(enumname);

        // hoise enum declarations
        if (this.config.enumsAsTypes) {
          const enums = node.values?.map(enumOption => `'${enumOption.name.value}'`);

          this.enumDeclarations.push(
            new DeclarationBlock({})
              .export()
              .asKind('const')
              .withName(`${enumname}Schema`)
              .withContent(`yup.string().oneOf([${enums?.join(', ')}])`).string
          );
        } else {
          const values = node.values
            ?.map(
              enumOption =>
                `${enumname}.${visitor.convertName(enumOption.name, {
                  useTypesPrefix: false,
                  transformUnderscore: true,
                })}`
            )
            .join(', ');
          this.enumDeclarations.push(
            new DeclarationBlock({})
              .export()
              .asKind('const')
              .withName(`${enumname}Schema`)
              .withContent(`yup.string<${enumname}>().oneOf([${values}])`).string
          );
        }
      },
    };
  }

  get UnionTypeDefinition() {
    return {
      leave: (node: UnionTypeDefinitionNode) => {
        if (!node.types || !this.config.withObjectType) return;
        const visitor = this.createVisitor('output');

        const unionName = visitor.convertName(node.name.value);
        this.importTypes.push(unionName);

        const unionElements = node.types
          ?.map(t => {
            const element = visitor.convertName(t.name.value);
            const typ = visitor.getType(t.name.value);
            if (typ?.astNode?.kind === 'EnumTypeDefinition') {
              return `${element}Schema`;
            }
            switch (this.config.validationSchemaExportType) {
              case 'const':
                return `${element}Schema`;
              case 'function':
              default:
                return `${element}Schema()`;
            }
          })
          .join(', ');

        switch (this.config.validationSchemaExportType) {
          case 'const':
            return new DeclarationBlock({})
              .export()
              .asKind('const')
              .withName(`${unionName}Schema: yup.MixedSchema<${unionName}>`)
              .withContent(`union<${unionName}>(${unionElements})`).string;
          case 'function':
          default:
            return new DeclarationBlock({})
              .export()
              .asKind('function')
              .withName(`${unionName}Schema(): yup.MixedSchema<${unionName}>`)
              .withBlock(indent(`return union<${unionName}>(${unionElements})`)).string;
        }
      },
    };
  }

  protected buildInputFields(
    fields: readonly (FieldDefinitionNode | InputValueDefinitionNode)[],
    visitor: Visitor,
    name: string
  ) {
    const shape = fields
      ?.map(field => {
        const fieldSchema = generateFieldYupSchema(this.config, visitor, field, 2);
        return isNonNullType(field.type) ? fieldSchema : `${fieldSchema}.optional()`;
      })
      .join(',\n');

    switch (this.config.validationSchemaExportType) {
      case 'const':
        return new DeclarationBlock({})
          .export()
          .asKind('const')
          .withName(`${name}Schema: yup.ObjectSchema<${name}>`)
          .withContent(['yup.object({', shape, '}).strict()'].join('\n')).string;

      case 'function':
      default:
        return new DeclarationBlock({})
          .export()
          .asKind('function')
          .withName(`${name}Schema(): yup.ObjectSchema<${name}>`)
          .withBlock([indent(`return yup.object({`), shape, indent('}).strict()')].join('\n')).string;
    }
  }
}

const generateFieldYupSchema = (
  config: ValidationSchemaPluginConfig,
  visitor: Visitor,
  field: InputValueDefinitionNode | FieldDefinitionNode,
  indentCount: number
): string => {
  const generatedCodesForDirectives = buildApi(config.rules ?? {}, config.ignoreRules ?? [], field.directives ?? []);
  const gen = generateFieldTypeYupSchema(config, visitor, field.type, null, generatedCodesForDirectives);
  return indent(`${field.name.value}: ${maybeLazy(config, field.type, gen)}`, indentCount);
};

const generateFieldTypeYupSchema = (
  config: ValidationSchemaPluginConfig,
  visitor: Visitor,
  type: TypeNode,
  parentType: TypeNode | null,
  generatedCodesForDirectives: GeneratedCodesForDirectives
): string => {
  if (isListType(type)) {
    const gen = generateFieldTypeYupSchema(config, visitor, type.type, type, generatedCodesForDirectives);
    const nullable = !parentType || !isNonNullType(parentType);
    return `yup.array(${maybeLazy(config, type.type, gen)})${generatedCodesForDirectives.rulesForArray}${
      nullable ? '.nullable()' : ''
    }`;
  }
  if (isNonNullType(type)) {
    const gen = generateFieldTypeYupSchema(config, visitor, type.type, type, generatedCodesForDirectives);
    return maybeLazy(config, type.type, gen);
  }
  if (isNamedType(type)) {
    const gen = generateNameNodeYupSchema(config, visitor, type.name) + generatedCodesForDirectives.rules;
    if (!!parentType && isNonNullType(parentType)) {
      if (visitor.shouldEmitAsNotAllowEmptyString(type.name.value)) {
        return `${gen}.required()`;
      }
      return `${gen}.nonNullable()`;
    }
    const typ = visitor.getType(type.name.value);
    if (typ?.astNode?.kind === 'InputObjectTypeDefinition') {
      return `${gen}`;
    }
    return `${gen}.nullable()`;
  }
  console.warn('unhandled type:', type);
  return '';
};

const generateNameNodeYupSchema = (config: ValidationSchemaPluginConfig, visitor: Visitor, node: NameNode): string => {
  const converter = visitor.getNameNodeConverter(node);

  switch (converter?.targetKind) {
    case 'InputObjectTypeDefinition':
    case 'ObjectTypeDefinition':
    case 'UnionTypeDefinition':
      // using switch-case rather than if-else to allow for future expansion
      switch (config.validationSchemaExportType) {
        case 'const':
          return `${converter.convertName()}Schema`;
        case 'function':
        default:
          return `${converter.convertName()}Schema()`;
      }
    case 'EnumTypeDefinition':
      return `${converter.convertName()}Schema`;
    default:
      return yup4Scalar(config, visitor, node.value);
  }
};

const maybeLazy = (config: ValidationSchemaPluginConfig, type: TypeNode, schema: string): string => {
  if (isNamedType(type) && isInput(type.name.value) && config.lazyTypes?.includes(type.name.value)) {
    // https://github.com/jquense/yup/issues/1283#issuecomment-786559444
    return `yup.lazy(() => ${schema})`;
  }
  return schema;
};

const yup4Scalar = (config: ValidationSchemaPluginConfig, visitor: Visitor, scalarName: string): string => {
  if (config.scalarSchemas?.[scalarName]) {
    return `${config.scalarSchemas[scalarName]}`;
  }
  const tsType = visitor.getScalarType(scalarName);
  switch (tsType) {
    case 'string':
      return `yup.string()`;
    case 'number':
      return `yup.number()`;
    case 'boolean':
      return `yup.boolean()`;
  }
  console.warn('unhandled name:', scalarName);
  return `yup.mixed()`;
};
