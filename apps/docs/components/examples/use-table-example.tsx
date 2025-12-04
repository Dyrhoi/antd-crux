"use client";

import { useTable, createTableQueryOptions } from "@dyrhoi/antd-crux";
import { Button, Form, Input, Select, Table, Tag, Space } from "antd";
import { queryOptions } from "@tanstack/react-query";
import z from "zod";

// Mock data with more fields
const mockProducts = [
  {
    id: 1,
    name: "Laptop Pro",
    category: "electronics",
    price: 1299,
    stock: 15,
  },
  {
    id: 2,
    name: "Wireless Mouse",
    category: "electronics",
    price: 49,
    stock: 150,
  },
  { id: 3, name: "Office Chair", category: "furniture", price: 299, stock: 30 },
  {
    id: 4,
    name: "Standing Desk",
    category: "furniture",
    price: 599,
    stock: 12,
  },
  {
    id: 5,
    name: 'Monitor 27"',
    category: "electronics",
    price: 399,
    stock: 45,
  },
  { id: 6, name: "Keyboard", category: "electronics", price: 129, stock: 80 },
  { id: 7, name: "Desk Lamp", category: "furniture", price: 79, stock: 60 },
];

const schema = z.object({
  search: z.string().optional(),
  category: z.enum(["electronics", "furniture"]).optional(),
  minPrice: z.coerce.number().optional(),
  maxPrice: z.coerce.number().optional(),
});

type Filters = z.infer<typeof schema>;
type Product = (typeof mockProducts)[number];

// Simulated API fetch
async function fetchProducts(filters: Filters) {
  await new Promise((resolve) => setTimeout(resolve, 300));

  let filtered = mockProducts;

  if (filters.search) {
    const search = filters.search.toLowerCase();
    filtered = filtered.filter((p) => p.name.toLowerCase().includes(search));
  }

  if (filters.category) {
    filtered = filtered.filter((p) => p.category === filters.category);
  }

  if (filters.minPrice !== undefined) {
    filtered = filtered.filter((p) => p.price >= filters.minPrice!);
  }

  if (filters.maxPrice !== undefined) {
    filtered = filtered.filter((p) => p.price <= filters.maxPrice!);
  }

  return {
    items: filtered,
    totalCount: filtered.length,
  };
}

// Colocated query options - can be defined in a separate file
const productsQueryOptions = createTableQueryOptions<Filters, Product>()(
  ({ filters }) =>
    queryOptions({
      queryKey: ["products", filters],
      queryFn: () => fetchProducts(filters),
      select: (data) => ({
        data: data.items,
        total: data.totalCount,
      }),
      staleTime: 30 * 1000, // 30 seconds
    }),
);

export default function UseTableQueryOptionsExample() {
  const { formProps, FormItem, tableProps, query, filters } = useTable({
    validator: schema,
    queryOptions: productsQueryOptions,
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Form {...formProps} layout="inline">
        <FormItem name="search">
          <Input placeholder="Search products..." style={{ width: 160 }} />
        </FormItem>
        <FormItem name="category">
          <Select placeholder="Category" allowClear style={{ width: 130 }}>
            <Select.Option value="electronics">Electronics</Select.Option>
            <Select.Option value="furniture">Furniture</Select.Option>
          </Select>
        </FormItem>
        <FormItem name="minPrice">
          <Input type="number" placeholder="Min $" style={{ width: 90 }} />
        </FormItem>
        <FormItem name="maxPrice">
          <Input type="number" placeholder="Max $" style={{ width: 90 }} />
        </FormItem>
        <Button type="primary" htmlType="submit">
          Search
        </Button>
      </Form>

      <Space>
        <span style={{ color: "#888", fontSize: 12 }}>
          {query.isFetching
            ? "Loading..."
            : `${query.data?.total ?? 0} results`}
        </span>
        {filters.category && (
          <Tag color="blue">Category: {filters.category}</Tag>
        )}
      </Space>

      <Table
        {...tableProps}
        columns={[
          { title: "Name", dataIndex: "name", key: "name" },
          {
            title: "Category",
            dataIndex: "category",
            key: "category",
            render: (cat: string) => (
              <Tag color={cat === "electronics" ? "blue" : "green"}>{cat}</Tag>
            ),
          },
          {
            title: "Price",
            dataIndex: "price",
            key: "price",
            render: (price: number) => `$${price}`,
          },
          {
            title: "Stock",
            dataIndex: "stock",
            key: "stock",
            render: (stock: number) => (
              <span style={{ color: stock < 20 ? "red" : "inherit" }}>
                {stock}
              </span>
            ),
          },
        ]}
        rowKey="id"
        size="small"
      />
    </div>
  );
}
