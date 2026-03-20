import { describe, expect, it } from "vitest";
import { isAdministrationRole } from "./user-roles";

describe("isAdministrationRole", () => {
  it("allows admin and super_user", () => {
    expect(isAdministrationRole("admin")).toBe(true);
    expect(isAdministrationRole("super_user")).toBe(true);
  });

  it("denies other roles", () => {
    expect(isAdministrationRole("user")).toBe(false);
    expect(isAdministrationRole("read_only")).toBe(false);
    expect(isAdministrationRole(null)).toBe(false);
    expect(isAdministrationRole(undefined)).toBe(false);
  });
});
