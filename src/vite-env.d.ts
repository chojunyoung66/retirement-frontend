/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
  readonly VITE_AMPLITUDE_API_KEY?: string;
  readonly VITE_GA4_MEASUREMENT_ID?: string;
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  google?: {
    accounts: {
      id: {
        initialize(config: {
          client_id: string;
          callback: (response: { credential: string }) => void;
          auto_select?: boolean;
          cancel_on_tap_outside?: boolean;
        }): void;
        prompt(
          notification?: (n: {
            isNotDisplayed(): boolean;
            getNotDisplayedReason(): string;
            isSkippedMoment(): boolean;
            isDismissedMoment(): boolean;
            getDismissedReason(): string;
          }) => void,
        ): void;
        renderButton(
          parent: HTMLElement,
          options: {
            theme?: "outline" | "filled_blue" | "filled_black";
            size?: "large" | "medium" | "small";
            text?: "signin_with" | "signup_with" | "continue_with" | "signin";
            shape?: "rectangular" | "pill";
            logo_alignment?: "left" | "center";
            width?: number;
            locale?: string;
          },
        ): void;
      };
    };
  };
}
