export interface AppsScriptEmailResponse {
  status: 'success' | 'error';
  message: string;
}

export interface SendEmailResponse {
  status: 'success';
  message: string;
  provider: AppsScriptEmailResponse;
}
