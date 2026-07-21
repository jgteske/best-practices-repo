import { forwardRef, useImperativeHandle, useRef, useState } from "react";

// Sometimes a parent needs to call INTO a child - focus it, play it, scroll it.
// Expose a small, typed imperative API with forwardRef + useImperativeHandle
// instead of leaking the raw DOM node. The handle (a set of functions) becomes
// available on the parent's ref exactly when the child has mounted.

// The API the child chooses to expose - functions, not the whole element.
export type VideoHandle = {
  play: () => void;
  pause: () => void;
};

export const Video = forwardRef<VideoHandle, { src: string }>(function Video(
  { src },
  ref,
) {
  const el = useRef<HTMLVideoElement>(null);

  // Define WHAT the parent can do; keep the actual node private.
  useImperativeHandle(
    ref,
    () => ({
      play: () => el.current?.play(),
      pause: () => el.current?.pause(),
    }),
    [],
  );

  return <video ref={el} src={src} />;
});

export function Player() {
  const videoRef = useRef<VideoHandle>(null);
  const [playing, setPlaying] = useState(false);

  // videoRef.current is null until <Video> mounts; guard with `?.`. After mount
  // the handle's functions are ready to call.
  const toggle = () => {
    if (playing) videoRef.current?.pause();
    else videoRef.current?.play();
    setPlaying((p) => !p);
  };

  return (
    <div>
      <Video ref={videoRef} src="/clip.mp4" />
      <button onClick={toggle}>{playing ? "Pause" : "Play"}</button>
    </div>
  );
}
