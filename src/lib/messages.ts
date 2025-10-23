import { authClient } from "~/lib/auth-client";

type AuthMessages = Record<
  keyof typeof authClient.$ERROR_CODES | string,
  string
>;

export const AUTH_MESSAGES = {
  // BETTER-AUTH MESSAGES
  ACCOUNT_NOT_FOUND: "계정을 찾을 수 없습니다",
  CREDENTIAL_ACCOUNT_NOT_FOUND: "계정을 찾을 수 없습니다",
  EMAIL_CAN_NOT_BE_UPDATED: "이메일 주소는 변경할 수 없습니다",
  EMAIL_NOT_VERIFIED:
    "이메일 주소를 확인하기 위한 이메일이 발송되었습니다. 이메일을 확인하고 인증을 완료해주세요",
  FAILED_TO_CREATE_SESSION: "세션을 생성할 수 없습니다",
  FAILED_TO_CREATE_USER: "사용자를 생성할 수 없습니다",
  FAILED_TO_GET_SESSION: "세션을 가져올 수 없습니다",
  FAILED_TO_GET_USER_INFO: "사용자 정보를 가져올 수 없습니다",
  FAILED_TO_UNLINK_LAST_ACCOUNT: "마지막 계정을 연결 해제할 수 없습니다",
  FAILED_TO_UPDATE_USER: "사용자 정보를 업데이트할 수 없습니다",
  ID_TOKEN_NOT_SUPPORTED: "ID 토큰은 지원되지 않습니다",
  INVALID_EMAIL: "올바른 이메일 주소를 입력하세요",
  INVALID_EMAIL_OR_PASSWORD: "이메일 주소나 비밀번호가 올바르지 않습니다",
  INVALID_PASSWORD: "올바른 비밀번호를 입력하세요",
  INVALID_TOKEN: "올바르지 않은 토큰입니다",
  PASSWORD_TOO_LONG: "비밀번호가 너무 깁니다",
  PASSWORD_TOO_SHORT: "비밀번호가 너무 짧습니다",
  PROVIDER_NOT_FOUND: "제공자를 찾을 수 없습니다",
  SESSION_EXPIRED: "세션이 만료되었습니다",
  SOCIAL_ACCOUNT_ALREADY_LINKED: "소셜 계정이 이미 연결되어 있습니다",
  USER_ALREADY_EXISTS: "사용자가 이미 존재합니다",
  USER_EMAIL_NOT_FOUND: "사용자 이메일을 찾을 수 없습니다",
  USER_NOT_FOUND: "사용자를 찾을 수 없습니다",

  // CUSTOM MESSAGES
  SIGN_UP_SUCCESS:
    "회원가입이 완료되었습니다. 발송된 인증 이메일을 확인해주세요",
  FORGOT_PASSWORD_SUCCESS:
    "비밀번호 재설정 이메일이 발송되었습니다. 이메일을 확인해주세요",
  RESET_PASSWORD_SUCCESS: "비밀번호가 재설정되었습니다",
} satisfies AuthMessages;

export type AuthMessageKeys = keyof typeof AUTH_MESSAGES;
