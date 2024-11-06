import type {
  ASTNode,
  DefinitionNode,
  DocumentNode,
  GraphQLSchema,
  InterfaceTypeDefinitionNode,
  ListTypeNode,
  NameNode,
  NamedTypeNode,
  NonNullTypeNode,
  ObjectTypeDefinitionNode,
  TypeNode,
} from 'graphql';
import { Graph } from 'graphlib';
import {
  isSpecifiedScalarType,
  visit,
} from 'graphql';

export const isListType = (typ?: TypeNode): typ is ListTypeNode => typ?.kind === 'ListType';
export const isNonNullType = (typ?: TypeNode): typ is NonNullTypeNode => typ?.kind === 'NonNullType';
export const isNamedType = (typ?: TypeNode): typ is NamedTypeNode => typ?.kind === 'NamedType';

export const isInput = (kind: string) => kind.includes('Input');

type ObjectTypeDefinitionFn = (node: ObjectTypeDefinitionNode) => any;
type InterfaceTypeDefinitionFn = (node: InterfaceTypeDefinitionNode) => any;

export function ObjectTypeDefinitionBuilder(useObjectTypes: boolean | undefined, callback: ObjectTypeDefinitionFn): ObjectTypeDefinitionFn | undefined {
  if (!useObjectTypes)
    return undefined;
  return (node) => {
    if (/^(Query|Mutation|Subscription)$/.test(node.name.value))
      return;

    return callback(node);
  };
}

export function InterfaceTypeDefinitionBuilder(useInterfaceTypes: boolean | undefined, callback: InterfaceTypeDefinitionFn): InterfaceTypeDefinitionFn | undefined {
  if (!useInterfaceTypes)
    return undefined;
  return (node) => {
    return callback(node);
  };
}

export function topologicalSortAST(schema: GraphQLSchema, ast: DocumentNode): DocumentNode {
  const dependencyGraph = new Graph();
  const targetKinds = [
    'ObjectTypeDefinition',
    'InputObjectTypeDefinition',
    'EnumTypeDefinition',
    'UnionTypeDefinition',
    'ScalarTypeDefinition',
  ];

  visit<DocumentNode>(ast, {
    enter: (node) => {
      switch (node.kind) {
        case 'ObjectTypeDefinition':
        case 'InputObjectTypeDefinition': {
          const typeName = node.name.value;
          dependencyGraph.setNode(typeName);

          if (node.fields) {
            node.fields.forEach((field) => {
              if (field.type.kind === 'NamedType') {
                const dependency = field.type.name.value;
                const typ = schema.getType(dependency);
                if (typ?.astNode?.kind === undefined || !targetKinds.includes(typ.astNode.kind))
                  return;

                if (!dependencyGraph.hasNode(dependency))
                  dependencyGraph.setNode(dependency);

                dependencyGraph.setEdge(typeName, dependency);
              }
            });
          }
          break;
        }
        case 'ScalarTypeDefinition':
        case 'EnumTypeDefinition': {
          dependencyGraph.setNode(node.name.value);
          break;
        }
        case 'UnionTypeDefinition': {
          const dependency = node.name.value;
          if (!dependencyGraph.hasNode(dependency))
            dependencyGraph.setNode(dependency);

          node.types?.forEach((type) => {
            const dependency = type.name.value;
            const typ = schema.getType(dependency);
            if (typ?.astNode?.kind === undefined || !targetKinds.includes(typ.astNode.kind))
              return;

            dependencyGraph.setEdge(node.name.value, dependency);
          });
          break;
        }
        default:
          break;
      }
    },
  });

  const sorted = topsort(dependencyGraph);

  // Create a map of definitions for quick access, using the definition's name as the key.
  const definitionsMap: Map<string, DefinitionNode> = new Map();

  // SCHEMA_DEFINITION does not have name.
  // https://spec.graphql.org/October2021/#sec-Schema
  const astDefinitions = ast.definitions.filter(def => def.kind !== 'SchemaDefinition');

  astDefinitions.forEach((definition) => {
    if (hasNameField(definition) && definition.name)
      definitionsMap.set(definition.name.value, definition);
  });

  // Two arrays to store sorted and not sorted definitions.
  const sortedDefinitions: DefinitionNode[] = [];
  const notSortedDefinitions: DefinitionNode[] = [];

  // Iterate over sorted type names and retrieve their corresponding definitions.
  sorted.forEach((sortedType) => {
    const definition = definitionsMap.get(sortedType);
    if (definition) {
      sortedDefinitions.push(definition);
      definitionsMap.delete(sortedType);
    }
  });

  // Definitions that are left in the map were not included in sorted list
  // Add them to notSortedDefinitions.
  definitionsMap.forEach(definition => notSortedDefinitions.push(definition));

  const newDefinitions = [...sortedDefinitions, ...notSortedDefinitions];

  if (newDefinitions.length !== astDefinitions.length) {
    throw new Error(
      `unexpected definition length after sorted: want ${astDefinitions.length} but got ${newDefinitions.length}`,
    );
  }

  return {
    ...ast,
    definitions: newDefinitions as ReadonlyArray<DefinitionNode>,
  };
}

function hasNameField(node: ASTNode): node is DefinitionNode & { name?: NameNode } {
  return 'name' in node;
}

// Re-implemented w/o CycleException version
// https://github.com/dagrejs/graphlib/blob/8d27cb89029081c72eb89dde652602805bdd0a34/lib/alg/topsort.js
export function topsort(g: Graph): string[] {
  const visited: Record<string, boolean> = {};
  const stack: Record<string, boolean> = {};
  const results: any[] = [];

  function visit(node: string) {
    if (!(node in visited)) {
      stack[node] = true;
      visited[node] = true;
      const predecessors = g.predecessors(node);
      if (Array.isArray(predecessors))
        predecessors.forEach(node => visit(node));

      delete stack[node];
      results.push(node);
    }
  }

  g.sinks().forEach(node => visit(node));

  return results.reverse();
}

export function isGeneratedByIntrospection(schema: GraphQLSchema): boolean {
  return Object.entries(schema.getTypeMap()).filter(([name, type]) => !name.startsWith('__') && !isSpecifiedScalarType(type)).every(([, type]) => type.astNode === undefined)
}

// https://spec.graphql.org/October2021/#EscapedCharacter
const escapeMap: { [key: string]: string } = {
  '\"': '\\\"',
  '\\': '\\\\',
  '\/': '\\/',
  '\b': '\\b',
  '\f': '\\f',
  '\n': '\\n',
  '\r': '\\r',
  '\t': '\\t',
};

export function escapeGraphQLCharacters(input: string): string {
  // eslint-disable-next-line regexp/no-escape-backspace
  return input.replace(/["\\/\f\n\r\t\b]/g, match => escapeMap[match]);
}
