import { useEffect, useState } from "react";
import { useProgress } from "@react-three/drei";
import { useConfigurator } from "../store/ConfiguratorContext";

const LOAD_STEPS = ["Preparing your canvas", "Pitching the tent", "Calibrating materials", "Almost ready…"];

export function Loader() {
  const { progress, active } = useProgress();
  const { modelReady, loaderHidden, hideLoader } = useConfigurator();
  const [step, setStep] = useState(0);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setStep((s) => Math.min(s + 1, LOAD_STEPS.length - 1));
    }, 600);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (modelReady && !active && progress >= 100) hideLoader();
  }, [modelReady, active, progress, hideLoader]);

  useEffect(() => {
    if (!modelReady) return;
    const t = window.setTimeout(() => hideLoader(), 4000);
    return () => window.clearTimeout(t);
  }, [modelReady, hideLoader]);

  useEffect(() => {
    if (!loaderHidden) return;
    const t = window.setTimeout(() => setGone(true), 700);
    return () => window.clearTimeout(t);
  }, [loaderHidden]);

  if (gone) return null;

  const width = loaderHidden ? 100 : Math.max((step / (LOAD_STEPS.length - 1)) * 85, progress * 0.85);

  return (
    <div id="loader" className={`loader${loaderHidden ? " hidden" : ""}`}>
      <div className="loader-inner">
        <div className="loader-wordmark">TENT</div>
        <div className="loader-bar-wrap">
          <div className="loader-bar" id="loaderBar" style={{ width: `${width}%` }} />
        </div>
        <div className="loader-label" id="loaderLabel">
          {LOAD_STEPS[step]}
        </div>
      </div>
    </div>
  );
}
