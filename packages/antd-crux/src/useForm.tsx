import { StandardSchemaV1 } from "@standard-schema/spec";
import { Form, FormInstance, FormItemProps, FormProps } from "antd";
import { useForm as useFormSF } from "sunflower-antd";
import { standardValidate } from "./internal/standardSchemaValidator";

export interface UseFormReturn<TParsedValues = unknown> {
  form: FormInstance<TParsedValues>;
  formProps: FormProps<TParsedValues>;
  register: (
    name: FormItemProps<TParsedValues>["name"],
    formProps?: Omit<FormItemProps<TParsedValues>, "name">,
  ) => FormItemProps<TParsedValues>;
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

  const onFinish = async (values: unknown) => {
    if (!onFinishFromProps) return;
    if (!validator) {
      return onFinishFromProps(values);
    }
    return standardValidate(validator, values).then((result) => {
      if (result.success) {
        return onFinishFromProps(result.value);
      }
      const formErrors = result.issues.map((issue) => {
        return {
          name: issue.path?.map((segment) =>
            typeof segment === "object" && "key" in segment
              ? segment.key
              : segment,
          ),
          errors: [issue.message],
        };
      });
      formSF.form.setFields(formErrors);
    });
  };

  const register: UseFormReturn["register"] = (
    name,
    { rules, ...rest } = {},
  ) => {
    // Our antd paths are always arrays of keys, so a path of user.preferences.mailing
    // becomes ['user', 'preferences', 'mailing'].
    const fieldPath = Array.isArray(name) ? name : [name];

    return {
      name: name,
      rules: [
        ({ getFieldsValue }) => ({
          validator: async () => {
            if (!validator) return Promise.resolve(); // no-op if no validator

            // Run full validation
            const allValues = getFieldsValue(true);
            const result = await standardValidate(validator, allValues);
            if (result.success) {
              return Promise.resolve();
            }

            // Navigate through the issues to see if path matches this field.
            // Luckily Standard Schema issues have paths in similar format.
            // We will have a list of Issue objects, each with a path array, so again if our ['user', 'preferences', 'mailing'] failed validation,
            // we can find an Issue with path ['user', 'preferences', 'mailing'].
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
        }),
        ...(rules || []),
      ],
      ...rest,
    };
  };

  return {
    form: _formAnt,
    register,
    formProps: {
      ...formSF.formProps,
      onFinish,
    },
  };
}
