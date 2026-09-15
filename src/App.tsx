import { useEffect } from "react";
import { Loader } from "./components/Loader";
import { NavRail } from "./components/NavRail";
import { Viewport } from "./components/Viewport";
import { RightPanel } from "./components/RightPanel";
import { PropertiesPanel } from "./components/PropertiesPanel";
import { ContextMenu } from "./components/ContextMenu";
import { Modals } from "./components/Modals";
import { Toast } from "./components/Toast";
import { useConfigurator } from "./store/ConfiguratorContext";

export default function App() {
  const { closeDropdowns, hideContextMenu, deleteSelected, setSelectedIndex, selectedIndex, logos, isEmbed } =
    useConfigurator();

  useEffect(() => {
    document.documentElement.classList.toggle("embed-active", isEmbed);
  }, [isEmbed]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      if (e.key === "Escape") {
        setSelectedIndex(-1);
        return;
      }
      if ((e.key === "Delete" || e.key === "Backspace") && selectedIndex >= 0 && !logos[selectedIndex]?.pinned) {
        deleteSelected();
      }
    };
    const onClick = () => {
      closeDropdowns();
      hideContextMenu();
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, [closeDropdowns, hideContextMenu, deleteSelected, setSelectedIndex, selectedIndex, logos]);

  return (
    <>
      <Loader />
      <NavRail />
      <Viewport />
      <RightPanel />
      <PropertiesPanel />
      <ContextMenu />
      <Modals />
      <Toast />
    </>
  );
}
