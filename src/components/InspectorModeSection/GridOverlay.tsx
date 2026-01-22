const COLUMNS = [
  'c1',
  'c2',
  'c3',
  'c4',
  'c5',
  'c6',
  'c7',
  'c8',
  'c9',
  'c10',
  'c11',
  'c12',
] as const;

export function GridOverlay(): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-9998 pointer-events-none" data-inspector-overlay>
      <div className="max-w-4xl mx-auto h-full px-4 md:px-0">
        <div className="grid grid-cols-12 gap-5 h-full">
          {COLUMNS.map((col) => (
            <div key={col} className="bg-red-500/10 h-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
