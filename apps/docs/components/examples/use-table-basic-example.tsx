"use client";

import { useTable } from "@dyrhoi/antd-crux";
import { Button, Form, Input, Select, Table, Tag } from "antd";
import z from "zod";

// Mock data
const mockUsers = [
  {
    id: 1,
    name: "Alice Johnson",
    email: "alice@example.com",
    status: "active",
  },
  { id: 2, name: "Bob Smith", email: "bob@example.com", status: "inactive" },
  {
    id: 3,
    name: "Charlie Brown",
    email: "charlie@example.com",
    status: "active",
  },
  { id: 4, name: "Diana Prince", email: "diana@example.com", status: "active" },
  {
    id: 5,
    name: "Edward Norton",
    email: "edward@example.com",
    status: "inactive",
  },
];

const schema = z.object({
  search: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

type Filters = z.infer<typeof schema>;
type User = (typeof mockUsers)[number];

// Simulated API fetch
async function fetchUsers(filters: Filters) {
  await new Promise((resolve) => setTimeout(resolve, 500));

  let filtered = mockUsers;

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter(
      (user) =>
        user.name.toLowerCase().includes(search) ||
        user.email.toLowerCase().includes(search),
    );
  }

  if (filters.status) {
    filtered = filtered.filter((user) => user.status === filters.status);
  }

  return {
    items: filtered,
    totalCount: filtered.length,
  };
}

export default function UseTableExample() {
  const { formProps, FormItem, tableProps, form } = useTable({
    validator: schema,
    search: async ({ filters }) => {
      const data = await fetchUsers(filters);
      return { data: data.items, total: data.totalCount };
    },
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Form {...formProps} layout="inline">
        <FormItem name="search">
          <Input
            allowClear
            placeholder="Search by name or email..."
            style={{ width: 200 }}
          />
        </FormItem>
        <FormItem name="status">
          <Select placeholder="Status" allowClear style={{ width: 120 }}>
            <Select.Option value="active">Active</Select.Option>
            <Select.Option value="inactive">Inactive</Select.Option>
          </Select>
        </FormItem>
        <FormItem>
          <Button onClick={() => form.resetFields()}>Clear</Button>
        </FormItem>
        <Button type="primary" htmlType="submit">
          Search
        </Button>
      </Form>

      <Table
        {...tableProps}
        columns={[
          { title: "Name", dataIndex: "name", key: "name" },
          { title: "Email", dataIndex: "email", key: "email" },
          {
            title: "Status",
            dataIndex: "status",
            key: "status",
            render: (status: string) => (
              <Tag color={status === "active" ? "green" : "red"}>{status}</Tag>
            ),
          },
        ]}
        rowKey="id"
        size="small"
      />
    </div>
  );
}
