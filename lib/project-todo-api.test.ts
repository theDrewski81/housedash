import { describe, expect, it } from "vitest";
import { parseOwnerUserIdFromBody } from "./project-todo-api";

describe("parseOwnerUserIdFromBody", () => {
  it("returns omit when key absent", () => {
    expect(parseOwnerUserIdFromBody({})).toEqual({ mode: "omit" });
  });

  it("returns clear for null and empty string", () => {
    expect(parseOwnerUserIdFromBody({ ownerUserId: null })).toEqual({
      mode: "set",
      value: null,
    });
    expect(parseOwnerUserIdFromBody({ ownerUserId: "" })).toEqual({
      mode: "set",
      value: null,
    });
  });

  it("returns set for non-empty string", () => {
    expect(parseOwnerUserIdFromBody({ ownerUserId: "usr_1" })).toEqual({
      mode: "set",
      value: "usr_1",
    });
  });

  it("returns invalid for wrong types", () => {
    expect(parseOwnerUserIdFromBody({ ownerUserId: 1 })).toEqual({
      mode: "invalid",
    });
  });
});
