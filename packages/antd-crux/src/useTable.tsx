import { StandardSchemaV1 } from "@standard-schema/spec";
import { TableProps } from "antd";
import {
  useForm,
  UseFormOptions,
  UseFormReturn,
  ResolveFormValues,
} from "./useForm";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
} from "@tanstack/react-query";
import { useState } from "react";

// ============================================================================
// Search Types
// ============================================================================

export interface SearchProps<TFormValues = unknown> {
  filters: TFormValues;
}

export interface SearchResult<TData = unknown> {
  data: Array<TData>;
  total: number;
}

// ============================================================================
// Query Options Factory
// ============================================================================

/**
 * The function signature for creating table query options.
 * Takes search props and returns React Query options.
 */
export type TableQueryOptionsFn<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
> = (
  props: SearchProps<TFormValues>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
) => UseQueryOptions<any, TError, SearchResult<TData>, any>;

/**
 * Creates a typed query options function for use with `useTable`.
 * Allows you to define query options in a separate file while maintaining full type safety.
 *
 * @example
 * ```tsx
 * // queries/users.ts
 * const schema = z.object({ search: z.string() });
 * type FilterValues = z.infer<typeof schema>;
 *
 * export const usersQueryOptions = createTableQueryOptions<FilterValues, User[]>()(
 *   (props) => queryOptions({
 *     queryKey: ['users', props.params],
 *     queryFn: () => fetchUsers(props.params),
 *   })
 * );
 *
 * // components/UsersTable.tsx
 * const { tableProps } = useTable({
 *   validator: schema,
 *   queryOptions: usersQueryOptions,
 * });
 * ```
 */
export function createTableQueryOptions<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
>() {
  return <TFn extends TableQueryOptionsFn<TFormValues, TData, TError>>(
    fn: TFn,
  ): TFn => fn;
}

// ============================================================================
// Return Type
// ============================================================================

export interface UseTableReturn<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
> extends UseFormReturn<TFormValues> {
  tableProps: TableProps<TData>;
  query: UseQueryResult<SearchResult<TData>, TError>;
  filters: TFormValues | undefined;
}

// ============================================================================
// Table-specific Options
// ============================================================================

export interface UseTableSearchOptions<TFormValues, TData> {
  /**
   * A function that fetches data based on form values.
   * Mutually exclusive with `queryOptions`.
   */
  search: (
    props: SearchProps<TFormValues>,
  ) => SearchResult<TData> | Promise<SearchResult<TData>>;
  queryOptions?: undefined;
}

export interface UseTableQueryOptions<
  TFormValues = unknown,
  TData = unknown,
  TError = Error,
> {
  /**
   * React Query options for data fetching.
   * The final selected data must be SearchResult<TData>.
   * You can use `select` to transform queryFn result into SearchResult<TData>.
   * Mutually exclusive with `search`.
   *
   * Can be created inline or using `createTableQueryOptions` for colocated definitions.
   */
  queryOptions: TableQueryOptionsFn<TFormValues, TData, TError>;
  search?: undefined;
}

// ============================================================================
// Combined Options
// ============================================================================

export type UseTableOptions<
  TFormValues = unknown,
  TSchema extends StandardSchemaV1 | undefined = undefined,
  TData = unknown,
  TError = Error,
> = UseFormOptions<TSchema, ResolveFormValues<TSchema, TFormValues>> &
  (
    | UseTableSearchOptions<ResolveFormValues<TSchema, TFormValues>, TData>
    | UseTableQueryOptions<
        ResolveFormValues<TSchema, TFormValues>,
        TData,
        TError
      >
  );

// ============================================================================
// Implementation
// ============================================================================

export function useTable<
  TFormValues = unknown,
  TSchema extends StandardSchemaV1 | undefined = undefined,
  TData = unknown,
  TError = Error,
>(
  opts: UseTableOptions<TFormValues, TSchema, TData, TError>,
): UseTableReturn<ResolveFormValues<TSchema, TFormValues>, TData, TError> {
  type TResolvedValues = ResolveFormValues<TSchema, TFormValues>;
  const formResult = useForm(opts) as UseFormReturn<TResolvedValues>;

  const [filters, setFilters] = useState<TResolvedValues>(
    formResult.formProps.initialValues as TResolvedValues,
  );

  const searchProps: SearchProps<TResolvedValues> = {
    filters: filters,
  };

  const tableQueryOptions = opts.queryOptions
    ? opts.queryOptions(searchProps)
    : {
        queryKey: ["tableData", searchProps],
        queryFn: () => opts.search!(searchProps),
      };

  const query = useQuery(tableQueryOptions);

  const onFinish = async (values: TResolvedValues) => {
    setFilters(values);
    return await opts.onFinish?.(values);
  };

  return {
    ...formResult,
    formProps: {
      ...formResult.formProps,
      onFinish,
    },
    tableProps: {
      dataSource: query.data?.data,
      loading: query.isLoading,
    },
    query,
    filters,
  };
}
