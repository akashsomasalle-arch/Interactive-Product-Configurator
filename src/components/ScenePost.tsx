import { EffectComposer, N8AO, SMAA } from "@react-three/postprocessing";
import { appConfig } from "../lib/appLocation";

export default function ScenePost() {
  const n8ao = appConfig.graphics.n8ao;
  return (
    <EffectComposer enableNormalPass multisampling={0}>
      <N8AO aoRadius={n8ao.aoRadius} intensity={n8ao.intensity} distanceFalloff={n8ao.distanceFalloff} quality="medium" halfRes />
      <SMAA />
    </EffectComposer>
  );
}
