"use client";

import { useForm } from "@dyrhoi/antd-crux";
import { Button, Form, Input } from "antd";
import z from "zod";

export default function UseFormExample() {
  const { formProps, FormItem, FormList } = useForm({
    validator: z.object({
      username: z.string().min(3, "Username must be at least 3 characters"),
      emails: z
        .array(
          z.object({
            email: z.email("Invalid email address"),
            updates: z.object({
              security: z.boolean(),
              newsletter: z.boolean(),
            }),
          }),
        )
        .min(1, "At least one email is required"),
    }),
    onFinish: (values: unknown) => {
      alert(`${JSON.stringify(values, null, 2)}`);
    },
  });

  return (
    <Form {...formProps} layout="vertical">
      <FormItem name={["username"]} label="Username">
        <Input />
      </FormItem>
      <FormItem>
        <FormList name={"emails"}>
          {(fields, { add, remove }) => (
            <>
              {fields.map(({ key, getName, name, ...restField }) => {
                return (
                  <FormItem
                    key={key}
                    label={`Other Email #${key + 1}`}
                    name={getName(["email"])}
                    {...restField}
                  >
                    <Input />
                  </FormItem>
                );
              })}
              <Button onClick={() => add()}>Add Other Email</Button>
            </>
          )}
        </FormList>
      </FormItem>
      <Button type="primary" htmlType="submit">
        Submit
      </Button>
    </Form>
  );
}
