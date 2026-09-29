/** The app entry's settings (src/main.tsx), read from the environment by Vite. */
interface ImportMetaEnv {
  /** "true" or "false": start the mock API. On in the dev server by default, off in a build. */
  readonly VITE_API_MOCKS?: string;
  /** The backend's base URL, passed to configureApi. Unset: `/api` on the page's origin. */
  readonly VITE_API_BASE_URL?: string;
}
