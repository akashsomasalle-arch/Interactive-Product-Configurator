import App from "../App";
import { ConfiguratorProvider } from "../store/ConfiguratorContext";

export default function ConfiguratorTree() {
  return (
    <ConfiguratorProvider>
      <App />
    </ConfiguratorProvider>
  );
}
