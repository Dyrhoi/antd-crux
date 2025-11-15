import { useForm } from "../src/index";
import { z } from "zod";
import { describe, expectTypeOf, it } from "vitest";
import { FormInstance, FormProps } from "antd";

describe("useForm", () => {
  describe("useForm-schema-driven", () => {
    const schema = z.object({ name: z.string(), age: z.number() });

    it("inferred type should be passed to onFinish callback", () => {
      useForm({
        validator: schema,
        onFinish: (values) => {
          expectTypeOf(values).toEqualTypeOf<z.infer<typeof schema>>();
        },
      });
    });

    it("inferred type should be passed to form return type", () => {
      const { form, formProps } = useForm({
        validator: schema,
      });

      expectTypeOf(form).toEqualTypeOf<FormInstance<z.infer<typeof schema>>>();
      expectTypeOf(formProps).toEqualTypeOf<
        FormProps<z.infer<typeof schema>>
      >();
    });
  });

  describe("useForm-generic", () => {
    type MyFormValues = {
      title: string;
      quantity: number;
    };
    it("inferred type should be passed to onFinish callback", () => {
      useForm<MyFormValues>({
        onFinish: (values) => {
          expectTypeOf(values).toEqualTypeOf<MyFormValues>();
        },
      });
    });

    it("inferred type should be passed to form return type", () => {
      const { form, formProps } = useForm<MyFormValues>();
      expectTypeOf(form).toEqualTypeOf<FormInstance<MyFormValues>>();
      expectTypeOf(formProps).toEqualTypeOf<FormProps<MyFormValues>>();
    });
  });

  describe("useForm-no-schema-no-generic", () => {
    it("inferred type should be passed to onFinish callback", () => {
      useForm({
        onFinish: (values) => {
          expectTypeOf(values).toEqualTypeOf<unknown>();
        },
      });
    });

    it("inferred type should be passed to form return type", () => {
      const { form, formProps } = useForm();
      expectTypeOf(form).toEqualTypeOf<FormInstance<unknown>>();
      expectTypeOf(formProps).toEqualTypeOf<FormProps<unknown>>();
    });
  });
});
