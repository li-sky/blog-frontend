import React, { useEffect, useRef, useState } from 'react';
import { Crepe } from '@milkdown/crepe';
import '@milkdown/crepe/theme/common/style.css';
import '@milkdown/crepe/theme/frame.css';
import './crepe-theme.css';

interface CrepeEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

export const CrepeEditor: React.FC<CrepeEditorProps> = ({ value, onChange }) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const crepeRef = useRef<Crepe | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    const crepe = new Crepe({
      root: containerRef.current,
      defaultValue: value || '',
    });

    crepeRef.current = crepe;

    crepe.on((listener) =>
      listener.markdownUpdated((_, markdown) => {
        onChange(markdown);
      })
    );

    crepe
      .create()
      .then(() => {
        setIsReady(true);
      })
      .catch((err) => {
        console.error('Failed to initialize Crepe editor', err);
      });

    return () => {
      crepe.destroy();
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, []); // Empty dependency array: only run on mount

  return (
    <div className="relative min-h-[500px]">
      {!isReady && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl border border-dashed border-indigo-200 bg-white/70 text-sm text-indigo-500">
          Initializing editor…
        </div>
      )}
      <div ref={containerRef} className="crepe-editor" data-ready={isReady} />
    </div>
  );
};
