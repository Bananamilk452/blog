import * as z from "zod";
import { ko } from "zod/locales";

z.config(ko());

z.config({
  customError: (issue) => {
    if (
      issue.code === "custom" &&
      issue.params &&
      "code" in issue.params &&
      issue.params.code === "password-does-not-match"
    ) {
      return "비밀번호가 일치하지 않습니다.";
    }
  },
});
