import * as z from 'zod';

// Define MessageSchemaDefinition to accept deeply nested Zod schemas or plain TypeScript types
type MessageSchemaDefinition = Record<string, any>;

function defineMessages<T extends MessageSchemaDefinition>(schemas: T): T {
  return schemas;
}

// InferPayload type that maps over the entire schema structure
type InferPayload<T extends MessageSchemaDefinition> = {
  [K in keyof T]: InferNestedPayload<T[K]>;
};

// Utility type to recursively infer payload types, supporting Zod schemas
type InferNestedPayload<T> =
  // Is it a zod thing
  T extends z.ZodType<any, any, any>
    ? // If so, infer the type
      z.infer<T>
    : // If not is it: type MessageSchemaDefinition = Record<string, any>;
    T extends Record<string, any>
    ? // if so recursively infer the types
      { [K in keyof T]: InferNestedPayload<T[K]> }
    : // Otherwise return the type
      T;

// WebSocket client function with enhanced type inference for nested payloads
function createWebSocketClient<T extends MessageSchemaDefinition>(_: T) {
  return {
    send<K extends keyof T>(type: K, payload: InferPayload<T>[K]) {
      // Return the payload, leveraging compile-time type safety
      return payload;
    },
  };
}

// Define schemas with Zod for runtime validation and compile-time type safety
const schema = defineMessages({
  hello: 'world',
  join: {
    id: z.string(),
    name: z.string(),
    etc: z.object({}),
  },
  leave: {
    thisIs: {
      aSuper: {
        nestedThing: z.boolean(),
      },
    },
  },
});
const client = createWebSocketClient(schema);

client.send('hello');
