import type { RunResult } from '../../engine/types';
import { formatTime } from '../utils';

const failureReasonLabel: Record<string, string> = {
  MISSING_ONE_FRAGMENT: '差一枚门禁碎片',
  MISSING_FRAGMENTS: '门禁碎片不足',
  FINAL_CHECK_FAILED: '最终判定失败',
  POLLUTION_OVERLOAD: '污染失控',
  SANITY_COLLAPSE: '理智崩溃',
  DEATH: '生命归零',
  TIMEOUT: '时间归零',
};

export function ResultSummary({ result }: { result: RunResult }) {
  return (
    <div className="panel panel-pad stack">
      <div>
        <h2 className="story-title">{result.title}</h2>
        <p className="muted">{result.status === 'LOSE' && result.failureReason ? failureReasonLabel[result.failureReason] : result.status}</p>
      </div>
      <div className="result-grid">
        <div className="result-row">
          <span>门禁碎片</span>
          <strong>
            {result.fragments}/{result.requiredFragments}
          </strong>
        </div>
        <div className="result-row">
          <span>污染值</span>
          <strong>
            {result.pollution}/{result.pollutionLimit}
          </strong>
        </div>
        <div className="result-row">
          <span>生命 / 理智</span>
          <strong>
            {result.hp} / {result.sanity}
          </strong>
        </div>
        <div className="result-row">
          <span>剩余时间</span>
          <strong>{formatTime(result.timeLeftSeconds)}</strong>
        </div>
      </div>
      <div className={`escape-readout ${result.escapeReadout.status}`}>
        <div className="result-row">
          <span>门禁诊断</span>
          <strong>{result.escapeReadout.label}</strong>
        </div>
        <div className="result-row">
          <span>链路完整度</span>
          <strong>{result.escapeReadout.value}%</strong>
        </div>
        <ul className="diagnosis-list">
          {result.escapeReadout.reasonLines.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </div>
      <p className="story-text">{result.summary}</p>
      <p className="muted">{result.suggestion}</p>
      {result.memoryCardReward ? (
        <div className="panel panel-pad">
          <h3 className="section-title">获得记忆卡</h3>
          <strong>{result.memoryCardReward.name}</strong>
          <p className="muted">{result.memoryCardReward.description}</p>
        </div>
      ) : null}
    </div>
  );
}
