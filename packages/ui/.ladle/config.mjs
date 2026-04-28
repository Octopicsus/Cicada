/** @type {import("@ladle/react").UserConfig} */
export default {
  stories: "src/**/*.stories.{ts,tsx}",
  defaultStory: "components-button--default",
  port: 61000,
  previewPort: 61001,
  addons: {
    a11y: { enabled: true },
    theme: { defaultState: "light" },
  },
};
