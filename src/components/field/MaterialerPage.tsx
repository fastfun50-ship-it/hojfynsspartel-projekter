"use client";

type Props = {
  jobId: string | null;
  jobName: string;
  onNeedJob: () => void;
};

export default function MaterialerPage({ jobId, jobName, onNeedJob }: Props) {
  if (!jobId) {
    return (
      <div className="field-scroll">
        <header className="field-header">
          <h1 className="field-brand">Materialer</h1>
          <p className="field-sub">Vælg job først</p>
        </header>
        <button
          type="button"
          className="btn-field btn-field-primary no-swipe"
          onClick={onNeedJob}
        >
          Gå til Job
        </button>
      </div>
    );
  }

  return (
    <div className="field-scroll">
      <header className="field-header">
        <h1 className="field-brand">Materialer</h1>
        <p className="field-sub">{jobName}</p>
      </header>
      <div className="materialer-placeholder">
        <p className="materialer-placeholder-title">Ingen materialer endnu</p>
        <p className="materialer-placeholder-copy">
          Her kommer materialeliste til jobbet. Funktionen er under opbygning.
        </p>
      </div>
    </div>
  );
}
