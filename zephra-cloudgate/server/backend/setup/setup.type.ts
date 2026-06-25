export interface CloudflareError {
  code: number;
  message: string;
}

export interface CloudflareVerifyTokenResponse {
  success: boolean;
  errors: CloudflareError[];
  messages: unknown[];
  result: string;
}
