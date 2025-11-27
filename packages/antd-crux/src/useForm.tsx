import { StandardSchemaV1 } from "@standard-schema/spec";
import {
  Form,
  FormInstance,
  FormItemProps,
  FormListFieldData,
  FormProps,
  FormRule,
} from "antd";
import { createContext, ReactNode, useContext, useState } from "react";
import { useForm as useFormSF } from "sunflower-antd";
import { FieldData, FormListProps } from "./internal/antd-types";
import { standardValidate } from "./internal/standardSchemaValidator";
import { warning } from "./internal/warning";

type SimplePathSegment = string | number;
type NormalizeNamePath<TName> = TName extends SimplePathSegment[]
  ? TName
  : TName extends SimplePathSegment
    ? [TName]
    : never;

// Navigate to a nested type given a path
type GetTypeAtPath<
  T,
  Path extends readonly SimplePathSegment[],
> = Path extends [infer First, ...infer Rest extends SimplePathSegment[]]
  ? First extends keyof T
    ? GetTypeAtPath<T[First], Rest>
    : T extends readonly (infer Item)[]
      ? First extends number
        ? GetTypeAtPath<Item, Rest>
        : never
      : never
  : T;

// Get the array item type at the given path
type GetArrayItemType<T, TName> =
  GetTypeAtPath<T, NormalizeNamePath<TName>> extends readonly (infer Item)[]
    ? Item
    : never;

// Build paths for the inner item type (relative paths within array items)
type InnerPaths<T, Prefix extends SimplePathSegment[] = []> = T extends object
  ? T extends readonly unknown[]
    ? never // Don't recurse into nested arrays for now
    : {
        [K in keyof T & (string | number)]:
          | [...Prefix, K]
          | InnerPaths<T[K], [...Prefix, K]>;
      }[keyof T & (string | number)]
  : never;

type FormListFieldName<TName> = [...NormalizeNamePath<TName>, number];

// The getName function type - takes relative path, returns full path
type GetNameFn<TParsedValues, TName> = <
  TRelativePath extends InnerPaths<GetArrayItemType<TParsedValues, TName>>,
>(
  relativePath: TRelativePath,
) => [...FormListFieldName<TName>, ...TRelativePath];

// Field data with getName helper
type TypedFormListFieldData<TParsedValues, TName> = Omit<
  FormListFieldData,
  "name"
> & {
  /** @deprecated Use `getName` instead for type-safe field paths */
  name: number;
  getName: GetNameFn<TParsedValues, TName>;
};

const FormListContext = createContext<{ prefix: SimplePathSegment[] } | null>(
  null,
);

type TypedFormListProps<
  TParsedValues,
  TName extends
    FormItemProps<TParsedValues>["name"] = FormItemProps<TParsedValues>["name"],
> = Omit<FormListProps, "name" | "children"> & {
  name: TName;
  children: (
    fields: Array<TypedFormListFieldData<TParsedValues, TName>>,
    operation: Parameters<FormListProps["children"]>[1],
    meta: Parameters<FormListProps["children"]>[2],
  ) => ReactNode;
};

export interface UseFormReturn<TParsedValues = unknown> {
  form: FormInstance<TParsedValues>;
  formProps: FormProps<TParsedValues>;
  FormItem: (props: FormItemProps<TParsedValues>) => ReactNode;
  FormList: <TName extends FormItemProps<TParsedValues>["name"]>(
    props: TypedFormListProps<TParsedValues, TName>,
  ) => ReactNode;
}

type ImplOpts = {
  onFinish?: (values: unknown) => Promise<void> | void;
  validator?: StandardSchemaV1;
};

// Overload: schema-driven usage (validator provided)
export function useForm<TSchema extends StandardSchemaV1>(opts: {
  validator: TSchema;
  onFinish?: (
    values: StandardSchemaV1.InferOutput<TSchema>,
  ) => Promise<void> | void;
}): UseFormReturn<StandardSchemaV1.InferOutput<TSchema>>;

// Overload: generic or no-validator usage
export function useForm<TFormValues = unknown>(opts?: {
  onFinish?: (values: TFormValues) => Promise<void> | void;
  validator?: undefined;
}): UseFormReturn<TFormValues>;

export function useForm({
  onFinish: onFinishFromProps,
  validator,
}: ImplOpts = {}): UseFormReturn<unknown> {
  const [_formAnt] = Form.useForm<unknown>();
  const formSF = useFormSF({ form: _formAnt });

  const [requiredFields] = useState<
    Array<StandardSchemaV1.Issue["path"]> | undefined
  >(() => {
    if (validator) {
      const result = validator["~standard"].validate({});
      if (result instanceof Promise) {
        warning(
          "Asynchronous schema validation is not supported and can lead to unexpected behavior. If you need to validate form data asynchronously, please add additional FormItem rules with custom async validators.",
        );
        return;
      }

      if (result.issues) {
        return result.issues
          .filter((issue) => issue.path !== undefined)
          .map((issue) => issue.path);
      }
      return [];
    }
  });

  const onFinish = async (values: unknown) => {
    if (!onFinishFromProps) return;
    if (!validator) {
      return onFinishFromProps(values);
    }
    return standardValidate(validator, values).then((result) => {
      if (result.success) {
        return onFinishFromProps(result.value);
      }
      const formErrors = mapIssuesToFormErrors(result.issues);
      formSF.form.setFields(formErrors);
    });
  };

  const FormList: UseFormReturn<unknown>["FormList"] = ({
    // eslint-disable-next-line react/prop-types
    name,
    // eslint-disable-next-line react/prop-types
    children,
    ...rest
  }) => {
    const prefixPath = (
      Array.isArray(name) ? name : [name]
    ) as SimplePathSegment[];

    // For each field the user is forced to write the entire path including the prefix.
    // We have the "name" prop to include prefix so the user can conveniently prefix the FormItem for type safety.
    // But since FormList already prefixes the path, we need to remove it here to avoid duplication.

    return (
      <FormListContext.Provider value={{ prefix: prefixPath }}>
        <Form.List name={prefixPath} {...rest}>
          {(fields, operation, meta) =>
            children(
              fields.map(({ name: fieldIndex, ...restField }) => ({
                ...restField,
                name: fieldIndex,
                getName: (relativePath: SimplePathSegment[]) => [
                  ...prefixPath,
                  fieldIndex,
                  ...relativePath,
                ],
              })) as Parameters<typeof children>[0],
              operation,
              meta,
            )
          }
        </Form.List>
      </FormListContext.Provider>
    );
  };

  // eslint-disable-next-line react/prop-types
  const FormItem: UseFormReturn["FormItem"] = ({
    rules,
    name: unprefixedName,
    ...rest
  }) => {
    const formListPrefix = useContext(FormListContext)?.prefix || [];

    // If we have a formList prefix, we should check our name if it contains the prefix already.
    // If it does, we should remove the prefix to avoid duplication.
    let name = unprefixedName;
    if (formListPrefix.length > 0 && name !== undefined) {
      const namePath = Array.isArray(name) ? name : [name];
      const hasPrefix = formListPrefix.every(
        (segment, index) => segment === namePath[index],
      );
      if (hasPrefix) {
        name = namePath.slice(formListPrefix.length);
      }
    }

    if (!validator || !name) {
      return <Form.Item name={name} rules={rules} {...rest} />;
    }

    const fieldPath = Array.isArray(name) ? name : [name];

    const schemaRule = mapSchemaToFormRule(validator, { fieldPath });
    const mergedRules = [schemaRule, ...(rules ?? [])];
    const required = requiredFields?.some((path) => {
      if (!path) return false;
      if (path.length !== fieldPath.length) return false;
      return path.every((key, index) => key === fieldPath[index]);
    });

    return (
      <Form.Item
        name={name}
        rules={mergedRules}
        required={required}
        {...rest}
      />
    );
  };

  return {
    form: _formAnt,
    FormItem,
    FormList,
    formProps: {
      ...formSF.formProps,
      onFinish,
    },
  };
}

function mapSchemaToFormRule<TSchema extends StandardSchemaV1>(
  validator: TSchema,
  { fieldPath }: { fieldPath: (string | number)[] },
): FormRule {
  return ({ getFieldsValue }) => ({
    validator: async () => {
      const allValues = getFieldsValue(true);
      const result = await standardValidate(validator, allValues);
      console.log(allValues, result, fieldPath);
      if (result.success) {
        return Promise.resolve();
      }

      const matchingIssue = result.issues.find((issue) => {
        if (!issue.path) return false;
        const issuePath = issue.path.map((segment) =>
          typeof segment === "object" && "key" in segment
            ? segment.key
            : segment,
        );
        if (issuePath.length !== fieldPath.length) return false;
        return issuePath.every((key, index) => key === fieldPath[index]);
      });

      if (!matchingIssue) {
        return Promise.resolve();
      }

      return Promise.reject(new Error(matchingIssue.message));
    },
  });
}

function mapIssuesToFormErrors(
  issues: readonly StandardSchemaV1.Issue[],
): FieldData[] {
  return issues.map((issue) => {
    return {
      name: issue.path?.map((segment) =>
        typeof segment === "object" && "key" in segment ? segment.key : segment,
      ),
      errors: [issue.message],
    };
  });
}
