import { Panel } from '../../../components/ui';

export function DiarySkeleton() {
  return (
    <div className="flex flex-col gap-4 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-8 w-1/4 rounded bg-steel/10" />
        <div className="flex gap-2">
          <div className="h-10 w-10 rounded bg-steel/10" />
          <div className="h-10 w-10 rounded bg-steel/10" />
        </div>
      </div>
      <Panel>
        <div className="flex justify-between">
          <div className="h-16 w-24 rounded bg-steel/10" />
          <div className="h-16 w-24 rounded bg-steel/10" />
        </div>
        <div className="mt-4 grid grid-cols-3 gap-3">
          <div className="h-12 rounded bg-steel/10" />
          <div className="h-12 rounded bg-steel/10" />
          <div className="h-12 rounded bg-steel/10" />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="h-12 rounded bg-steel/10" />
          <div className="h-12 rounded bg-steel/10" />
        </div>
      </Panel>
      <Panel>
        <div className="h-6 w-32 rounded bg-steel/10 mb-4" />
        <div className="h-12 rounded bg-steel/10" />
        <div className="mt-2 h-12 rounded bg-steel/10" />
      </Panel>
      <Panel>
        <div className="h-6 w-32 rounded bg-steel/10 mb-4" />
        <div className="h-12 rounded bg-steel/10" />
        <div className="mt-2 h-12 rounded bg-steel/10" />
      </Panel>
    </div>
  );
}
