import { useConfigurator } from "../store/ConfiguratorContext";

export function Toast() {
  const { toast } = useConfigurator();
  return (
    <div id="toastNotification" className={`toast${toast ? " show" : ""}`}>
      <svg viewBox="0 0 24 24" fill="none" stroke="#4CAF50" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="toast-icon">
        <polyline points="20 6 9 17 4 12" />
      </svg>
      <span id="toastMessage">{toast ?? "Success!"}</span>
    </div>
  );
}
