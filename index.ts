import * as z from 'zod';

/**
 * Makes at least one property required from the given type.
 *
 * @template T - The base type.
 * @template Keys - The keys to make required (defaults to all keys).
 *
 * @example
 * interface Example {
 *   a: string;
 *   b: number;
 *   c?: boolean;
 * }
 *
 * // Makes "a" or "b" required
 * type Test = RequireAtLeastOne<Example, "a" | "b">;
 **/
type RequireAtLeastOne<T, Keys extends keyof T = keyof T> = Keys extends keyof T
  ? Omit<T, Keys> & { [K in Keys]-?: T[K] }
  : never;

// This is the basic structure of a message
type MessageSchemaDefinition = Record<
  string,
  RequireAtLeastOne<{ toServer?: any; toClient?: any }>
>;

function defineMessages<T extends MessageSchemaDefinition>(schemas: T): T {
  return schemas;
}

// Utility type to recursively infer payload types, supporting Zod schemas
type InferNestedPayload<T> =
  // Is it a zod thing
  T extends z.ZodType<any, any, any>
    ? // If so, infer the type
      z.infer<T>
    : // If not is it: type MessageSchemaDefinition = Record<string, any>;
    T extends Record<string, any>
    ? // If so, recursively infer the types
      { [K in keyof T]: InferNestedPayload<T[K]> }
    : // Otherwise return the type
      T;

// InferToServerPayload: Extracts only the toServer types from the schema
type InferToServerPayload<T extends MessageSchemaDefinition> = {
  [K in keyof T]: T[K]['toServer'] extends z.ZodType<any, any, any>
    ? InferNestedPayload<T[K]['toServer']>
    : never;
};

// InferToClientPayload: Extracts only the toClient types from the schema
type InferToClientPayload<T extends MessageSchemaDefinition> = {
  [K in keyof T]: T[K]['toClient'] extends z.ZodType<any, any, any>
    ? InferNestedPayload<T[K]['toClient']>
    : never;
};

// WebSocket client function for toClient messages
function toClient<T extends MessageSchemaDefinition>(_: T) {
  return {
    send<K extends keyof T>(type: K, payload: InferToClientPayload<T>[K]) {
      return payload;
    },
  };
}

// WebSocket client function for toServer messages
function toServer<T extends MessageSchemaDefinition>(_: T) {
  return {
    send<K extends keyof T>(type: K, payload: InferToServerPayload<T>[K]) {
      return payload;
    },
  };
}

const schema = defineMessages({
  join: {
    toClient: z.object({
      id: z.string(),
      name: z.string(),
      etc: z.object({ key: z.string() }).optional(),
    }),
    toServer: z.object({
      id: z.enum(['1', '2', '3']),
      name: z.union([z.string(), z.number()]),
    }),
  },
  leave: {
    toServer: z.object({
      userId: z.string(),
    }),
  },
});

// Usage example
const server = toServer(schema);
const client = toClient(schema);
