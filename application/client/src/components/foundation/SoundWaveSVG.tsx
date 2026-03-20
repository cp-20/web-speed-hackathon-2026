import { getSoundWaveformPath } from "@web-speed-hackathon-2026/client/src/utils/get_path";

interface Props {
  soundId: string;
}

export const SoundWaveSVG = ({ soundId }: Props) => {
  return <img alt="" className="h-full w-full" src={getSoundWaveformPath(soundId)} />;
};
