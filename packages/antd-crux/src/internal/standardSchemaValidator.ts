import type { StandardSchemaV1 } from "@standard-schema/spec";

type ValidationResult<T> =
  | { value: T; issues?: undefined; success: true }
  | { value?: undefined; issues: StandardSchemaV1.Issue[]; success: false };

export async function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>,
): Promise<ValidationResult<StandardSchemaV1.InferOutput<T>>> {
  let result = schema["~standard"].validate(input);
  if (result instanceof Promise) result = await result;

  // if the `issues` field exists, the validation failed
  if (result.issues) {
    return {
      success: false,
      issues: result.issues as StandardSchemaV1.Issue[],
      value: undefined,
    };
  }

  return {
    success: true,
    value: result.value,
  };
}
