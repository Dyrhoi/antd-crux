import type { FormInstance } from "antd";
export type FieldError = ReturnType<FormInstance["getFieldsError"]>[number];
export type FieldData = Parameters<FormInstance["setFields"]>[0][number];
export type { FormListProps } from "antd/es/form";
