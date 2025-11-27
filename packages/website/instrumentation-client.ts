import { init, getGlobalApi, setGlobalApi } from "react-grab";

if (typeof window !== "undefined") {
  const existingApi = getGlobalApi();
  if (existingApi) {
    existingApi.dispose();
  }
  const api = init({
    onActivate: () => {
      window.dispatchEvent(new CustomEvent("react-grab:activated"));
    },
    onDeactivate: () => {
      window.dispatchEvent(new CustomEvent("react-grab:deactivated"));
    },
  });
  setGlobalApi(api);
}
