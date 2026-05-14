declare module "expo-auth-session/providers/google" {
  export interface GoogleAuthRequestConfig {
    clientId: string;
    scopes?: string[];
    redirectUri?: string;
  }

  export function useAuthRequest(
    config: GoogleAuthRequestConfig
  ): [any, any, any];
}