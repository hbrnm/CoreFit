import { useEffect, useRef, useState } from 'react';
import { Notice, Sheet } from '../../components/ui';

interface DetectorLike {
  detect: (source: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>;
}
type DetectorCtor = new (options?: { formats: string[] }) => DetectorLike;

function detectorCtor(): DetectorCtor | undefined {
  return (globalThis as unknown as { BarcodeDetector?: DetectorCtor }).BarcodeDetector;
}

/** BarcodeDetector există în Chrome pe Android; pe iOS Safari nu e activ implicit. */
export const canScanBarcodes = (): boolean =>
  detectorCtor() !== undefined && typeof navigator.mediaDevices?.getUserMedia === 'function';

interface Props {
  onDetected: (code: string) => void;
  onClose: () => void;
}

export function BarcodeScanner({ onDetected, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const Ctor = detectorCtor();
    if (!Ctor) {
      setError('Acest browser nu poate citi coduri de bare. Scrie codul manual.');
      return;
    }

    let stream: MediaStream | null = null;
    let timer = 0;
    let stopped = false;

    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        const video = videoRef.current;
        if (!video || stopped) return;
        video.srcObject = stream;
        await video.play();

        const detector = new Ctor({ formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e'] });
        timer = window.setInterval(async () => {
          try {
            const codes = await detector.detect(video);
            if (codes.length > 0 && !stopped) {
              stopped = true;
              onDetected(codes[0].rawValue);
            }
          } catch {
            /* un cadru care nu poate fi analizat; încercăm la următorul */
          }
        }, 350);
      } catch {
        setError('Nu am putut porni camera. Verifică permisiunea sau scrie codul manual.');
      }
    })();

    return () => {
      stopped = true;
      window.clearInterval(timer);
      stream?.getTracks().forEach((t) => t.stop());
    };
    // onDetected vine din părinte și nu trebuie să repornească camera
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Sheet title="Scanează codul de bare" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {error ? (
          <Notice tone="error">{error}</Notice>
        ) : (
          <>
            <video ref={videoRef} playsInline muted className="aspect-[4/3] w-full bg-steel object-cover" />
            <p className="text-sm text-steel/70">Ține codul în cadru, bine luminat.</p>
          </>
        )}
        <button type="button" className="btn-quiet" onClick={onClose}>
          Închide
        </button>
      </div>
    </Sheet>
  );
}
