import { describe, expectTypeOf, it } from "vitest";
import z from "zod";
import {
  useTable,
  createTableQueryOptions,
  SearchProps,
  SearchResult,
} from "../src/useTable";
import { queryOptions } from "@tanstack/react-query";

describe("useTable", () => {
  describe("search function typing", () => {
    const schema = z.object({ filter: z.string() });
    type FilterValues = z.infer<typeof schema>;
    type User = { id: number; name: string };

    it("should accept search function with correct props typing", () => {
      useTable({
        validator: schema,
        search: (props) => {
          // props.params should be typed as FilterValues
          expectTypeOf(props).toEqualTypeOf<SearchProps<FilterValues>>();
          expectTypeOf(props.filters.filter).toEqualTypeOf<string>();

          return {
            data: [{ id: 1, name: "User 1" }],
            total: 1,
          };
        },
      });
    });

    it("should accept async search function", () => {
      useTable({
        validator: schema,
        search: async (props) => {
          expectTypeOf(props.filters).toEqualTypeOf<FilterValues>();

          return {
            data: [{ id: 1, name: "User 1" }] as User[],
            total: 1,
          };
        },
      });
    });

    it("should infer return type correctly", () => {
      const { query } = useTable({
        validator: schema,
        search: (props) => ({
          data: [{ id: 1, name: "User 1" }] as User[],
          total: 1,
        }),
      });

      expectTypeOf(query.data).toEqualTypeOf<SearchResult<User> | undefined>();
    });

    it("should work with explicit generic type (no validator)", () => {
      useTable<FilterValues>({
        search: (props) => {
          expectTypeOf(props.filters).toEqualTypeOf<FilterValues>();
          return {
            data: [{ id: 1, name: "User 1" }],
            total: 1,
          };
        },
      });
    });
  });

  describe("react-query options typing", () => {
    const schema = z.object({ filter: z.string() });

    it("should accept query options with queryFn returning SearchResult<TData>", () => {
      useTable({
        validator: schema,
        queryOptions: (props) =>
          queryOptions({
            queryKey: ["tableData", props],
            queryFn: async () => {
              return {
                data: [{ id: 1, name: "Item 1" }],
                total: 1,
              };
            },
          }),
      });
    });
    it("should accept query options where select transforms queryFn result to SearchResult<TData>", () => {
      useTable({
        validator: schema,
        queryOptions: (props) =>
          queryOptions({
            queryKey: ["tableData", props],
            queryFn: async () => {
              return {
                data: [{ id: 1, name: "Item 1" }],
                totalCount: 1,
              };
            },
            select: (result) => ({
              data: result.data,
              total: result.totalCount,
            }),
          }),
      });
    });
  });

  describe("createTableQueryOptions", () => {
    const schema = z.object({ filter: z.string() });
    type FilterValues = z.infer<typeof schema>;
    type User = { id: number; name: string };

    it("should allow colocated query options with full type safety", () => {
      // Simulates defining query options in a separate file
      const usersQueryOptions = createTableQueryOptions<FilterValues, User>()(
        (props) =>
          queryOptions({
            queryKey: ["users", props.filters],
            queryFn: async () => {
              // props.params is typed as FilterValues
              const filters = props.filters;
              expectTypeOf(filters).toEqualTypeOf<FilterValues>();
              return {
                data: [{ id: 1, name: "User 1" }],
                total: 1,
              };
            },
          }),
      );

      // Use in component
      useTable({
        validator: schema,
        queryOptions: usersQueryOptions,
      });
    });

    it("should work with select transformation", () => {
      const usersQueryOptions = createTableQueryOptions<FilterValues, User>()(
        (props) =>
          queryOptions({
            queryKey: ["users", props.filters],
            queryFn: async () => ({
              items: [{ id: 1, name: "User 1" }],
              totalCount: 1,
            }),
            select: (result) => ({
              data: result.items,
              total: result.totalCount,
            }),
          }),
      );

      useTable({
        validator: schema,
        queryOptions: usersQueryOptions,
      });
    });
  });
});
