import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import useForm from "./useForm";

describe("useForm", () => {
    it("should initialize with test as false", () => {
        const { result } = renderHook(() => useForm());
        expect(result.current.test).toBe(false);
    });

    it("should update test state when setTest is called", () => {
        const { result } = renderHook(() => useForm());

        act(() => {
            result.current.setTest(true);
        });

        expect(result.current.test).toBe(true);
    });

    it("should toggle test state", () => {
        const { result } = renderHook(() => useForm());

        act(() => {
            result.current.setTest((prev) => !prev);
        });

        expect(result.current.test).toBe(true);
    });
});
