import type { FormInstance } from "antd";
export type FieldError = ReturnType<FormInstance["getFieldsError"]>[number];
