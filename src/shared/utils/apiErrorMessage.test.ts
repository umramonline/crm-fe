import { AxiosError, AxiosHeaders } from "axios";
import { describe, expect, it } from "vitest";

import { readApiErrorMessage } from "@/shared/utils/apiErrorMessage";

describe("readApiErrorMessage", () => {
  it("returns envelope message when present", () => {
    const error = new AxiosError(
      "Request failed",
      "ERR_BAD_REQUEST",
      undefined,
      undefined,
      {
        status: 422,
        statusText: "Unprocessable Entity",
        headers: {},
        config: { headers: new AxiosHeaders() },
        data: { message: "IETTS kaydı geçersiz." },
      },
    );

    expect(readApiErrorMessage(error, "fallback")).toBe("IETTS kaydı geçersiz.");
  });

  it("returns fallback for non-axios errors", () => {
    expect(readApiErrorMessage(new Error("x"), "fallback")).toBe("fallback");
  });
});
