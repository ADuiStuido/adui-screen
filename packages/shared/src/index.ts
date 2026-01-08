export type Brand<K, T extends string> = K & { readonly __brand: T };
